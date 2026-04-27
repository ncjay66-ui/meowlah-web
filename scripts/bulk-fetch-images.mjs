/**
 * Bulk Image Fetcher for MeowLah
 * --------------------------------
 * Finds all active products with no image_url, searches DuckDuckGo for
 * a product photo, and saves the result back to the Railway DB.
 *
 * Run from the meowlah-web directory:
 *   node scripts/bulk-fetch-images.mjs
 *
 * Options (env vars):
 *   DELAY_MS=1500     ms to wait between DDG requests (default 1500)
 *   START_PAGE=1      page to start from (default 1)
 *   DRY_RUN=1         print what would be saved, don't actually PATCH
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1500');
const DRY_RUN     = process.env.DRY_RUN === '1';
const START_PAGE  = parseInt(process.env.START_PAGE ?? '1');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── DDG helpers ─────────────────────────────────────────────────────────────

async function getDdgVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images&iax=images`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/vqd[=\s"']+([0-9-]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
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

// CDN domains that block server-side proxy fetches — never save these as image_url
const CDN_BLOCKED_PATTERNS = [
  'susercontent.com', 'shopee.com.my', 'shopeemobile.com',
  'lazcdn.com', 'slatic.net', 'alicdn.com', 'lzd-img',
];
function isCdnBlocked(url) {
  if (!url) return false;
  return CDN_BLOCKED_PATTERNS.some(p => url.toLowerCase().includes(p));
}

// Keywords that indicate an image result is pet/food related
const PET_KEYWORDS = [
  'cat', 'pet', 'food', 'feline', 'kitten', 'feed', 'treat', 'nutrition',
  'makanan', 'kucing', 'paw', 'meow', 'shop', 'store', 'lazada', 'shopee',
  'amazon', 'chewy', 'petco', 'petsmart', 'zooplus', 'kohepets', 'petsmore',
];

const NON_PET_DOMAINS = [
  'motocross', 'moto', 'bike', 'sport', 'news', 'nytimes', 'bbc', 'cnn',
  'facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'reddit',
];

/** Returns true if a DDG result looks like it's actually about pet food */
function isRelevantResult(item) {
  const combined = [
    item.title ?? '',
    item.url ?? '',
    item.source ?? '',
  ].join(' ').toLowerCase();

  // Reject if source domain looks non-pet
  if (NON_PET_DOMAINS.some(kw => combined.includes(kw))) return false;

  // Accept if any pet keyword found
  return PET_KEYWORDS.some(kw => combined.includes(kw));
}

async function ddgImageSearch(query) {
  const vqd = await getDdgVqd(query);
  if (!vqd) return null;

  const params = new URLSearchParams({ q: query, vqd, f: ',,,,,', p: '1', s: '0', u: 'bing', l: 'wt-wt' });
  try {
    const r = await fetch(`https://duckduckgo.com/i.js?${params}`, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const results = data.results ?? [];
    // Filter: must look pet-related AND have a valid image URL
    const candidates = results
      .filter(i => i.image?.startsWith('https://') && i.width >= 100)
      .filter(i => !isCdnBlocked(i.image))   // reject Shopee/Lazada CDN
      .filter(isRelevantResult)
      .slice(0, 10);
    for (const item of candidates) {
      if (await isImageAccessible(item.image)) return item.image;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Railway helpers ──────────────────────────────────────────────────────────

async function fetchPage(page) {
  const url = `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`;
  const r = await fetch(url, { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`GET /products page ${page} → ${r.status}`);
  return r.json();
}

async function patchImageUrl(id, imageUrl) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ image_url: imageUrl }),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🐱 MeowLah Bulk Image Fetcher`);
  console.log(`   Railway: ${RAILWAY_URL}`);
  console.log(`   Delay:   ${DELAY_MS}ms between requests`);
  console.log(`   DryRun:  ${DRY_RUN}\n`);

  // Step 1: collect all products with no image_url
  console.log('📋 Collecting products with missing images...');
  let page = START_PAGE;
  let totalPages = 1;
  const missing = [];

  while (page <= totalPages) {
    let data;
    try {
      data = await fetchPage(page);
    } catch (e) {
      console.error(`  ✗ Failed to fetch page ${page}: ${e.message}`);
      page++;
      continue;
    }

    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);
    const items = data.items ?? [];

    for (const p of items) {
      if (!p.image_url || p.image_url.startsWith('data:')) {
        missing.push({ id: p.id, brand: p.brand ?? '', name: p.name_en ?? '' });
      }
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — ${missing.length} missing so far`);
    page++;

    if (page <= totalPages) await sleep(200); // gentle pacing for the API
  }

  console.log(`\n\n✅ Found ${missing.length} products with no image\n`);
  if (missing.length === 0) {
    console.log('Nothing to do!');
    return;
  }

  // Step 2: DDG search + save for each
  let saved = 0, failed = 0, notFound = 0;

  const LOCAL_BRANDS = new Set([
    'cindy', "cindy's recipe", 'prodiet', 'powercat', 'sniffly', 'my pets home',
    'icats', 'love around', 'partner', 'trial', 'kit cat', 'petcubes',
    'nutripe', 'absolute holistic', 'catz finefood',
  ]);

  for (let i = 0; i < missing.length; i++) {
    const { id, brand, name } = missing[i];
    const isLocal = LOCAL_BRANDS.has((brand ?? '').toLowerCase().trim());
    const baseQuery = `${brand} ${name} cat food`.trim();
    const queries = [
      baseQuery,
      isLocal ? `${brand} cat food Malaysia` : `${brand} cat food`,
    ];

    process.stdout.write(`\r  [${i + 1}/${missing.length}] ${brand} ${name.substring(0, 30).padEnd(30)} `);

    let imgUrl = null;
    for (const q of queries) {
      imgUrl = await ddgImageSearch(q);
      if (imgUrl) break;
      await sleep(500);
    }

    if (!imgUrl) {
      notFound++;
      process.stdout.write('✗ not found');
    } else if (DRY_RUN) {
      saved++;
      process.stdout.write(`✓ DRY: ${imgUrl.substring(0, 60)}`);
    } else {
      const ok = await patchImageUrl(id, imgUrl);
      if (ok) {
        saved++;
        process.stdout.write('✓ saved');
      } else {
        failed++;
        process.stdout.write('✗ patch failed');
      }
    }

    // Throttle to avoid DDG rate-limiting
    if (i < missing.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n\n📊 Summary`);
  console.log(`   Saved:     ${saved}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors:    ${failed}`);
  console.log(`   Total:     ${missing.length}\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
