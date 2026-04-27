/**
 * MeowLah Image Auditor & Repairer
 * ----------------------------------
 * Checks every active product's image_url with a HEAD request.
 * Broken/403/non-image URLs are cleared and replaced via DDG search.
 *
 * KEY INSIGHT: Images from Shopee/Lazada CDNs (susercontent.com, lazcdn.com, etc.)
 * pass local HEAD checks but FAIL when the server-side proxy tries to fetch them.
 * The CDN_BLOCKED list handles this — these are always replaced regardless of HEAD status.
 *
 * Run from meowlah-web directory:
 *   node scripts/audit-images.mjs
 *
 * Options:
 *   DRY_RUN=1          Print what would change, don't PATCH
 *   DELAY_MS=1500      ms between DDG searches (default 1500)
 *   CHECK_DELAY=200    ms between HEAD checks (default 200)
 *   PAGE=3             Only audit a specific Railway page (for resuming)
 *   BRAND=NEKKO        Only audit a specific brand
 *   FORCE=1            Skip HEAD check — re-fetch images for ALL matched products
 *                      (use with BRAND= to fix wrong-content images like motocross photos)
 */

const RAILWAY_URL  = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY    = 'meowlah-admin-secret-2024';
const PAGE_SIZE    = 100;
const DELAY_MS     = parseInt(process.env.DELAY_MS   ?? '1500');
const CHECK_DELAY  = parseInt(process.env.CHECK_DELAY ?? '200');
const DRY_RUN      = process.env.DRY_RUN === '1';
const ONLY_PAGE    = process.env.PAGE ? parseInt(process.env.PAGE) : null;
const BRAND_FILTER = (process.env.BRAND ?? '').toLowerCase();
const FORCE        = process.env.FORCE === '1';  // re-fetch even if URL is accessible

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── CDN domains that block server-side proxy fetches ─────────────────────────
// These pass local HEAD checks but fail on the Railway/Vercel server.
// Any image_url from these hosts must be replaced regardless of HEAD result.
const CDN_BLOCKED_PATTERNS = [
  'susercontent.com',    // Shopee product CDN (down-my.img.susercontent.com etc.)
  'shopee.com.my',       // Shopee direct
  'shopeemobile.com',    // Shopee mobile CDN
  'lazcdn.com',          // Lazada CDN (img.lazcdn.com, sg-live.slatic.net)
  'slatic.net',          // Lazada/AliExpress CDN
  'alicdn.com',          // Alibaba CDN (ae01.alicdn.com etc.)
  'lzd-img',             // Lazada image prefix
];

function isCdnBlocked(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return CDN_BLOCKED_PATTERNS.some(p => lower.includes(p));
}

// ── Image URL validation ──────────────────────────────────────────────────────

/** Return true only if the URL serves an actual image (not 403, not HTML) */
async function isImageAccessible(url) {
  if (!url || url.startsWith('data:') || url.includes('placehold') || url.includes('placeholder')) {
    return false;
  }
  try {
    const origin = new URL(url).origin;
    const r = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': UA,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': origin + '/',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return false;
    const ct = r.headers.get('content-type') ?? '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

// ── DDG image search ──────────────────────────────────────────────────────────

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
    const results = (await r.json()).results ?? [];
    const candidates = results
      .filter(i => i.image?.startsWith('https://') && i.width >= 100)
      .filter(i => !isCdnBlocked(i.image))   // ← reject Shopee/Lazada CDN URLs
      .filter(isRelevantResult)
      .slice(0, 10);
    for (const item of candidates) {
      if (await isImageAccessible(item.image)) return item.image;
      await sleep(100);
    }
    return null;
  } catch { return null; }
}

// Brands that are local/regional — add "Malaysia" to help DDG find them
const LOCAL_BRAND_HINTS = new Set([
  'cindy', 'cindy\'s recipe', 'prodiet', 'powercat', 'sniffly', 'my pets home',
  'icats', 'love around', 'partner', 'trial', 'kit cat', 'petcubes', 'petcube',
  'seeds', 'ciao', 'kitcat', 'absolute holistic', 'catz finefood', 'meow',
  'nutripe', 'addiction', 'black hawk', 'ivory coat',
]);

function isLocalBrand(brand) {
  return LOCAL_BRAND_HINTS.has((brand ?? '').toLowerCase().trim());
}

/** Try progressively simpler queries, with regional hints for local brands */
async function findImage(brand, name) {
  const local = isLocalBrand(brand);
  const shortName = name.split(' ').slice(0, 4).join(' ');

  const queries = [
    `${brand} ${name} cat food`,
    `${brand} ${shortName} cat food`,
    local ? `${brand} ${shortName} makanan kucing` : null,
    `${brand} cat food`,
    local ? `${brand} cat food Malaysia` : null,
    // Last resort: just the first 3 words of the product name
    `${name.split(' ').slice(0, 3).join(' ')} cat food`,
  ].filter(Boolean);

  for (const q of queries) {
    const url = await ddgImageSearch(q);
    if (url) return url;
    await sleep(500);
  }
  return null;
}

// ── Railway helpers ───────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 MeowLah Image Auditor`);
  console.log(`   DryRun:  ${DRY_RUN}`);
  console.log(`   Force:   ${FORCE}${FORCE ? ' (re-fetch all, skip HEAD check)' : ''}`);
  console.log(`   Delay:   ${DELAY_MS}ms  CheckDelay: ${CHECK_DELAY}ms`);
  if (ONLY_PAGE) console.log(`   Page:    ${ONLY_PAGE} only`);
  if (BRAND_FILTER) console.log(`   Brand:   ${BRAND_FILTER}`);
  console.log('');

  // ── Phase 1: HEAD-check all image URLs ──────────────────────────────────────
  console.log('📋 Phase 1: Checking all image URLs...');
  let page = 1, totalPages = 1;
  const broken  = [];  // has URL but it's bad
  const missing = [];  // no URL at all

  while (page <= totalPages) {
    if (ONLY_PAGE && page !== ONLY_PAGE) {
      const data = await fetchPage(page);
      const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);
      page++;
      continue;
    }

    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      if (BRAND_FILTER && (p.brand ?? '').toLowerCase() !== BRAND_FILTER) continue;

      const url = p.image_url;
      if (!url || url.startsWith('data:')) {
        missing.push(p);
        continue;
      }

      // FORCE mode: treat everything as missing (re-fetch regardless)
      if (FORCE) {
        missing.push(p);
        continue;
      }

      // CDN-blocked: passes local HEAD check but server proxy will get 403
      if (isCdnBlocked(url)) {
        broken.push(p);
        process.stdout.write(`\r  [page ${page}] cdn-blocked: ${broken.length}  missing: ${missing.length}  `);
        await sleep(CHECK_DELAY);
        continue;
      }

      // HEAD check existing URL
      const ok = await isImageAccessible(url);
      if (!ok) {
        broken.push(p);
        process.stdout.write(`\r  [page ${page}] broken: ${broken.length}  missing: ${missing.length}  `);
      }
      await sleep(CHECK_DELAY);
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — broken: ${broken.length}, missing: ${missing.length}  `);
    page++;
    if (page <= totalPages) await sleep(200);
  }

  const toFix = [...broken, ...missing];
  console.log(`\n\n✅ Audit complete`);
  console.log(`   Broken/CDN-blocked URLs: ${broken.length}  (includes Shopee/Lazada CDN — server proxy can't load these)`);
  console.log(`   Missing URLs:            ${missing.length}`);
  console.log(`   Total to fix:            ${toFix.length}\n`);

  if (!toFix.length) { console.log('All images look good!'); return; }

  // ── Phase 2: Fetch new images for everything that needs one ─────────────────
  console.log('🖼️  Phase 2: Fetching replacement images...\n');

  let fixed = 0, failed = 0;

  for (let i = 0; i < toFix.length; i++) {
    const p = toFix[i];
    const wasBroken = broken.includes(p);
    const tag = wasBroken ? '⚠️ broken' : '❌ missing';
    console.log(`[${i+1}/${toFix.length}] ${tag} — ${p.brand ?? ''} ${(p.name_en ?? '').substring(0, 45)}`);

    // Clear broken URL first so DB is consistent during search
    if (wasBroken && !DRY_RUN) {
      await patchProduct(p.id, { image_url: null });
      await sleep(150);
    }

    const imgUrl = await findImage(p.brand ?? '', p.name_en ?? '');

    if (!imgUrl) {
      console.log(`  ✗ No image found`);
      failed++;
    } else if (DRY_RUN) {
      console.log(`  ✓ DRY: ${imgUrl.substring(0, 80)}`);
      fixed++;
    } else {
      const ok = await patchProduct(p.id, { image_url: imgUrl });
      if (ok) {
        console.log(`  ✓ Saved: ${imgUrl.substring(0, 80)}`);
        fixed++;
      } else {
        console.log(`  ✗ PATCH failed`);
        failed++;
      }
    }

    if (i < toFix.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Done: ${fixed} fixed, ${failed} failed\n`);
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
