/**
 * Fix specific products with missing/broken images.
 * Finds all active products for given brands, clears bad image_url,
 * re-searches DDG with simpler query terms, and saves result.
 *
 * Run:
 *   node scripts/fix-missing-images.mjs
 *
 * Or target specific brands:
 *   BRANDS="NEKKO,SHEBA" node scripts/fix-missing-images.mjs
 *
 * Or fix ALL products whose image loads as blank (re-clears and re-fetches):
 *   RECHECK_ALL=1 node scripts/fix-missing-images.mjs
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DELAY_MS    = 2000;

// Brands to target by default — add more as needed
const TARGET_BRANDS = (process.env.BRANDS ?? 'NEKKO,SHEBA')
  .split(',').map(b => b.trim().toLowerCase());

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── DDG ─────────────────────────────────────────────────────────────────────

async function getDdgVqd(query) {
  try {
    const r = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const m = (await r.text()).match(/vqd[=\s"']+([0-9-]+)/i);
    return m ? m[1] : null;
  } catch { return null; }
}

/** Verify a URL actually returns an image (not a 403 or HTML page) */
async function isImageAccessible(url) {
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': UA,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(url).origin + '/',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return false;
    return (r.headers.get('content-type') ?? '').startsWith('image/');
  } catch { return false; }
}

async function ddgSearch(query) {
  const vqd = await getDdgVqd(query);
  if (!vqd) return null;
  const params = new URLSearchParams({ q: query, vqd, f: ',,,,,', p: '1', s: '0', u: 'bing', l: 'wt-wt' });
  try {
    const r = await fetch(`https://duckduckgo.com/i.js?${params}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://duckduckgo.com/' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const results = (await r.json()).results ?? [];
    // Try up to 8 candidates, pick first that actually loads
    const candidates = results.filter(i => i.image?.startsWith('https://') && i.width >= 100).slice(0, 8);
    for (const item of candidates) {
      if (await isImageAccessible(item.image)) return item.image;
    }
    return null;
  } catch { return null; }
}

/** Try progressively simpler queries until one returns a result */
async function findImage(brand, name) {
  const queries = [
    `${brand} ${name} cat food`,           // full name
    `${brand} ${name.split(' ').slice(0,4).join(' ')} cat food`, // shortened name
    `${brand} cat food`,                   // brand only
    `${name.split(' ').slice(0,3).join(' ')} cat food`, // product keywords only
  ];
  for (const q of queries) {
    const url = await ddgSearch(q);
    if (url) { console.log(`    query: "${q}"`); return url; }
    await sleep(800);
  }
  return null;
}

// ── Railway ──────────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(`${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`, {
    headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`page ${page} → ${r.status}`);
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 MeowLah Image Fixer`);
  console.log(`   Target brands: ${TARGET_BRANDS.join(', ')}\n`);

  // Collect all products for target brands
  let page = 1, totalPages = 1;
  const targets = [];

  console.log('📋 Scanning products...');
  while (page <= totalPages) {
    const data = await fetchPage(page);
    totalPages = Math.ceil((data.total ?? 0) / PAGE_SIZE);
    for (const p of data.items ?? []) {
      if (TARGET_BRANDS.includes((p.brand ?? '').toLowerCase())) {
        targets.push(p);
      }
    }
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${targets.length} matching`);
    page++;
    await sleep(150);
  }

  console.log(`\n\n✅ Found ${targets.length} products for target brands\n`);

  let saved = 0, skipped = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const hasImage = p.image_url && !p.image_url.startsWith('data:');

    console.log(`\n[${i+1}/${targets.length}] ${p.brand} — ${p.name_en?.substring(0, 50)}`);

    if (hasImage) {
      console.log(`  Current: ${p.image_url.substring(0, 80)}`);
      console.log(`  Clearing bad URL and re-fetching...`);
      // Clear first so the product is treated as having no image
      await patchProduct(p.id, { image_url: null });
      await sleep(300);
    } else {
      console.log(`  No image, fetching...`);
    }

    const imgUrl = await findImage(p.brand ?? '', p.name_en ?? '');

    if (imgUrl) {
      const ok = await patchProduct(p.id, { image_url: imgUrl });
      if (ok) {
        console.log(`  ✓ Saved: ${imgUrl.substring(0, 80)}`);
        saved++;
      } else {
        console.log(`  ✗ PATCH failed`);
        failed++;
      }
    } else {
      console.log(`  ✗ No image found`);
      failed++;
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Done: ${saved} saved, ${failed} failed, ${skipped} skipped\n`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });
