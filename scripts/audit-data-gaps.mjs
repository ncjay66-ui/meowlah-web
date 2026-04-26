/**
 * MeowLah Data Gap Auditor & Fixer
 * -----------------------------------
 * Scans all active products and:
 *   1. Identifies products with no nutritional data → deactivates them
 *   2. Identifies products with nutrition data but no score → triggers rescore
 *   3. Identifies products with no image → patches with DDG search
 *
 * Run from meowlah-web directory:
 *   node scripts/audit-data-gaps.mjs
 *
 * Options:
 *   DRY_RUN=1        Show what would change, don't modify DB
 *   FIX_IMAGES=1     Also try to fetch missing images (slow)
 *   FIX_SCORES=1     Trigger rescore for products with data but no grade
 *   DEACTIVATE=1     Deactivate products with no nutritional data
 *   DELAY_MS=1200    ms between image searches (default 1200)
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DRY_RUN     = process.env.DRY_RUN === '1';
const FIX_IMAGES  = process.env.FIX_IMAGES === '1';
const FIX_SCORES  = process.env.FIX_SCORES === '1';
const DEACTIVATE  = process.env.DEACTIVATE === '1';
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1200');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Railway helpers ───────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
  if (!r.ok) throw new Error(`page ${page} → ${r.status}`);
  return r.json();
}

async function fetchDetail(id) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) return null;
  return r.json();
}

async function patchProduct(id, patch) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok;
}

async function rescoreProduct(id) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15000),
  });
  return r.ok;
}

// ── Image helpers ─────────────────────────────────────────────────────────────

function isPlaceholder(url) {
  if (!url) return true;
  if (url.startsWith('data:')) return true;
  return url.includes('placehold') || url.includes('placeholder');
}

async function isImageAccessible(url) {
  if (isPlaceholder(url)) return false;
  try {
    const origin = new URL(url).origin;
    const r = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, 'Accept': 'image/*,*/*;q=0.8', 'Referer': origin + '/' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return false;
    return (r.headers.get('content-type') ?? '').startsWith('image/');
  } catch { return false; }
}

async function getDdgVqd(query) {
  try {
    const r = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const m = (await r.text()).match(/vqd[=\s"']+([0-9-]+)/i);
    return m ? m[1] : null;
  } catch { return null; }
}

const PET_KEYWORDS = [
  'cat', 'pet', 'food', 'feline', 'kitten', 'feed', 'treat', 'nutrition',
  'makanan', 'kucing', 'paw', 'meow', 'shop', 'store', 'lazada', 'shopee',
  'amazon', 'chewy', 'petco', 'petsmart', 'zooplus', 'kohepets', 'petsmore',
];
const NON_PET_DOMAINS = [
  'motocross', 'moto', 'sport', 'news', 'nytimes', 'bbc', 'cnn',
  'facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'reddit',
];
function isRelevantResult(item) {
  const combined = [item.title ?? '', item.url ?? '', item.source ?? ''].join(' ').toLowerCase();
  if (NON_PET_DOMAINS.some(kw => combined.includes(kw))) return false;
  return PET_KEYWORDS.some(kw => combined.includes(kw));
}

async function ddgImageSearch(query) {
  const vqd = await getDdgVqd(query);
  if (!vqd) return null;
  const params = new URLSearchParams({ q: query, vqd, f: ',,,,,', p: '1', s: '0', u: 'bing', l: 'wt-wt' });
  try {
    const r = await fetch(`https://duckduckgo.com/i.js?${params}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://duckduckgo.com/' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const candidates = ((await r.json()).results ?? [])
      .filter(i => i.image?.startsWith('https://') && i.width >= 100)
      .filter(isRelevantResult)
      .slice(0, 10);
    for (const item of candidates) {
      if (await isImageAccessible(item.image)) return item.image;
      await sleep(100);
    }
    return null;
  } catch { return null; }
}

const LOCAL_BRAND_HINTS = new Set([
  'cindy', "cindy's recipe", 'prodiet', 'powercat', 'sniffly', 'my pets home',
  'icats', 'love around', 'partner', 'trial', 'kit cat', 'petcubes', 'petcube',
  'seeds', 'ciao', 'kitcat', 'absolute holistic', 'catz finefood', 'meow',
  'nutripe', 'addiction', 'black hawk', 'ivory coat', 'petcoco',
]);

async function findImage(brand, name) {
  const local = LOCAL_BRAND_HINTS.has((brand ?? '').toLowerCase().trim());
  const shortName = name.split(' ').slice(0, 4).join(' ');
  const queries = [
    `${brand} ${name} cat food`,
    `${brand} ${shortName} cat food`,
    local ? `${brand} ${shortName} makanan kucing` : null,
    local ? `${brand} cat food Malaysia` : `${brand} cat food`,
    `${name.split(' ').slice(0, 3).join(' ')} cat food`,
  ].filter(Boolean);

  for (const q of queries) {
    const url = await ddgImageSearch(q);
    if (url) return url;
    await sleep(400);
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 MeowLah Data Gap Auditor`);
  console.log(`   DryRun:     ${DRY_RUN}`);
  console.log(`   FixImages:  ${FIX_IMAGES}`);
  console.log(`   FixScores:  ${FIX_SCORES}`);
  console.log(`   Deactivate: ${DEACTIVATE}\n`);

  // ── Phase 1: collect all active products ─────────────────────────────────
  console.log('📋 Phase 1: Scanning all active products...');
  let page = 1, totalPages = 1;
  const allProducts = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);
    allProducts.push(...(data.items ?? []));
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${allProducts.length} products loaded`);
    page++;
    if (page <= totalPages) await sleep(150);
  }

  console.log(`\n  Total active products: ${allProducts.length}\n`);

  // Categorise by available data (using grade as proxy for "has been scored")
  const noGrade      = allProducts.filter(p => !p.grade && !p.final_score);
  const hasGrade     = allProducts.filter(p => p.grade || p.final_score);
  const noImage      = allProducts.filter(p => isPlaceholder(p.image_url));
  const hasImage     = allProducts.filter(p => !isPlaceholder(p.image_url));

  console.log('📊 Summary:');
  console.log(`  Has grade/score:    ${hasGrade.length}`);
  console.log(`  No grade/score:     ${noGrade.length}  ← need investigation`);
  console.log(`  Has image:          ${hasImage.length}`);
  console.log(`  No/placeholder img: ${noImage.length}  ← need image fetch`);
  console.log('');

  // Brand breakdown for no-grade products
  const brandCounts = {};
  for (const p of noGrade) {
    const b = p.brand ?? '(none)';
    brandCounts[b] = (brandCounts[b] ?? 0) + 1;
  }
  const topBrands = Object.entries(brandCounts).sort((a,b) => b[1]-a[1]).slice(0, 20);
  console.log('Top brands with no grade (sample):');
  for (const [brand, count] of topBrands) {
    console.log(`  ${brand.padEnd(30)} ${count}`);
  }
  console.log('');

  // ── Phase 2: check no-grade products for nutrition data ──────────────────
  console.log('🔬 Phase 2: Checking nutrition data for unscored products...');
  console.log('  (fetching detail for each — this takes a while)\n');

  const noNutrition  = [];  // grade=null AND nutrition=null → deactivate
  const needsRescore = [];  // grade=null BUT nutrition exists → rescore

  for (let i = 0; i < noGrade.length; i++) {
    const p = noGrade[i];
    process.stdout.write(`\r  [${i+1}/${noGrade.length}] ${(p.brand ?? '').padEnd(20)} ${(p.name_en ?? '').substring(0,30).padEnd(30)}`);
    const detail = await fetchDetail(p.id);
    if (!detail) {
      noNutrition.push(p);
    } else if (!detail.nutrition || detail.nutrition.protein_pct == null) {
      noNutrition.push(p);
    } else {
      needsRescore.push(p);
    }
    await sleep(120);
  }

  console.log(`\n\n  No nutrition data:  ${noNutrition.length}  → will deactivate`);
  console.log(`  Has data, no score: ${needsRescore.length}  → will rescore`);
  console.log('');

  // ── Phase 3: deactivate products with no nutrition data ──────────────────
  if (noNutrition.length > 0) {
    console.log('🗑️  Phase 3: Deactivating products with no nutritional data...');
    let deactivated = 0, failed = 0;

    for (let i = 0; i < noNutrition.length; i++) {
      const p = noNutrition[i];
      const label = `[${p.brand ?? '—'}] ${(p.name_en ?? '').substring(0, 45)}`;

      if (DRY_RUN) {
        console.log(`  DRY: would deactivate — ${label}`);
        deactivated++;
      } else if (!DEACTIVATE) {
        // Just report, don't act unless DEACTIVATE=1
        if (i < 30) console.log(`  ⚠ no data — ${label}`);
        else if (i === 30) console.log(`  ... and ${noNutrition.length - 30} more`);
      } else {
        const ok = await patchProduct(p.id, { is_active: false });
        if (ok) { deactivated++; process.stdout.write(`\r  [${i+1}/${noNutrition.length}] ✓ deactivated`); }
        else    { failed++;      process.stdout.write(`\r  [${i+1}/${noNutrition.length}] ✗ failed    `); }
        await sleep(150);
      }
    }

    if (DEACTIVATE || DRY_RUN) {
      console.log(`\n  Done: ${deactivated} deactivated, ${failed} failed\n`);
    } else {
      console.log(`\n  Run with DEACTIVATE=1 to deactivate these ${noNutrition.length} products.\n`);
    }
  }

  // ── Phase 4: rescore products that have data but no grade ─────────────────
  if (needsRescore.length > 0 && FIX_SCORES) {
    console.log(`♻️  Phase 4: Rescoring ${needsRescore.length} products with data but no grade...`);
    let rescored = 0, failed = 0;

    for (let i = 0; i < needsRescore.length; i++) {
      const p = needsRescore[i];
      process.stdout.write(`\r  [${i+1}/${needsRescore.length}] ${p.brand ?? ''} ${(p.name_en ?? '').substring(0,30).padEnd(30)}`);
      if (!DRY_RUN) {
        const ok = await rescoreProduct(p.id);
        if (ok) rescored++; else failed++;
      } else {
        rescored++;
      }
      await sleep(200);
    }
    console.log(`\n  Done: ${rescored} rescored, ${failed} failed\n`);
  } else if (needsRescore.length > 0) {
    console.log(`  Run with FIX_SCORES=1 to rescore these ${needsRescore.length} products.\n`);
  }

  // ── Phase 5: fetch missing images ─────────────────────────────────────────
  if (noImage.length > 0 && FIX_IMAGES) {
    console.log(`🖼️  Phase 5: Fetching images for ${noImage.length} products with no image...\n`);
    let fixed = 0, notFound = 0, failed = 0;

    for (let i = 0; i < noImage.length; i++) {
      const p = noImage[i];
      console.log(`[${i+1}/${noImage.length}] ${p.brand ?? ''} — ${(p.name_en ?? '').substring(0, 50)}`);

      const imgUrl = await findImage(p.brand ?? '', p.name_en ?? '');

      if (!imgUrl) {
        console.log(`  ✗ Not found`);
        notFound++;
      } else if (DRY_RUN) {
        console.log(`  ✓ DRY: ${imgUrl.substring(0, 80)}`);
        fixed++;
      } else {
        const ok = await patchProduct(p.id, { image_url: imgUrl });
        if (ok) { console.log(`  ✓ Saved: ${imgUrl.substring(0, 70)}`); fixed++; }
        else    { console.log(`  ✗ PATCH failed`); failed++; }
      }

      if (i < noImage.length - 1) await sleep(DELAY_MS);
    }

    console.log(`\n  Images: ${fixed} fixed, ${notFound} not found, ${failed} errors\n`);
  } else if (noImage.length > 0) {
    console.log(`  Run with FIX_IMAGES=1 to fetch images for these ${noImage.length} products.\n`);
  }

  console.log('✅ Audit complete.\n');
  console.log('Quick summary:');
  console.log(`  Active products:    ${allProducts.length}`);
  console.log(`  No nutrition data:  ${noNutrition.length}  → run with DEACTIVATE=1 to clean up`);
  console.log(`  Need rescore:       ${needsRescore.length} → run with FIX_SCORES=1 to fix`);
  console.log(`  Missing images:     ${noImage.length}      → run with FIX_IMAGES=1 to fetch`);
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
