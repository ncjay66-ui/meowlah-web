/**
 * MeowLah Price & Weight Scraper
 * --------------------------------
 * Fetches products with missing price_myr or weight_g from Railway,
 * tries to extract price/weight from their Lazada or Shopee URLs,
 * then PATCHes the data back.
 *
 * Usage:
 *   node scripts/scrape-prices.mjs
 *
 * Options:
 *   DELAY_MS=2000        ms between requests (default 2000)
 *   DRY_RUN=1            print what would be saved, don't PATCH
 *   TARGET=price         only fill missing prices (skip weight)
 *   TARGET=weight        only fill missing weights
 *   BRAND=NEKKO          only process a specific brand
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DELAY_MS    = parseInt(process.env.DELAY_MS  ?? '2000');
const DRY_RUN     = process.env.DRY_RUN === '1';
const TARGET      = process.env.TARGET ?? 'both';   // 'price' | 'weight' | 'both'
const BRAND_FILTER = (process.env.BRAND ?? '').toLowerCase();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Scraper helpers ──────────────────────────────────────────────────────────

/** Fetch a URL and return HTML string, or null on failure */
async function fetchHtml(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

/** Extract price (MYR) from Lazada product page HTML */
function extractLazadaPrice(html) {
  // JSON-LD first (most reliable)
  const ldMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (ldMatch) {
    for (const block of ldMatch) {
      try {
        const json = JSON.parse(block.replace(/<\/?script[^>]*>/gi, ''));
        const price = json?.offers?.price ?? json?.price;
        if (price && Number(price) > 0) return Number(price);
      } catch {}
    }
  }
  // Meta tag fallback
  const metaPrice = html.match(/["']price["']\s*:\s*["']?([\d.]+)["']?/i);
  if (metaPrice) return Number(metaPrice[1]);
  // Open graph
  const ogPrice = html.match(/product:price:amount["'][^>]*content="([\d.]+)"/i);
  if (ogPrice) return Number(ogPrice[1]);
  return null;
}

/** Extract weight (grams) from Lazada product page HTML */
function extractLazadaWeight(html) {
  // Look for weight patterns: "200g", "500 g", "1kg", "1.5 kg"
  const patterns = [
    /(?:net\s+)?weight\s*:?\s*([\d.]+)\s*(kg|g)\b/i,
    /\b([\d.]+)\s*(kg|g)\s*(?:net|pack|bag|pouch|can|tin|box)?(?:\s*x\s*\d+)?\b/,
    /"weight"\s*:\s*"([\d.]+)\s*(kg|g)"/i,
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) {
      const val = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      if (unit === 'kg') return Math.round(val * 1000);
      if (unit === 'g' && val > 0 && val < 50000) return Math.round(val);
    }
  }
  return null;
}

/** Extract price from Shopee product page HTML */
function extractShopeePrice(html) {
  // Shopee embeds price in window.__INITIAL_STATE__
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const price = state?.pageData?.product?.price;
      if (price) return price / 100000; // Shopee prices are in cent units
    } catch {}
  }
  // Fallback: meta og:price
  const m = html.match(/product:price:amount["'][^>]*content="([\d.]+)"/i);
  if (m) return Number(m[1]);
  return null;
}

/** Extract weight from Shopee product page */
function extractShopeeWeight(html) {
  return extractLazadaWeight(html); // same patterns work
}

/** Try to get price + weight from product URLs */
async function scrapeProduct(product) {
  const results = { price: null, weight: null, source: null };

  // Try Lazada first (more structured HTML, JSON-LD)
  const lazadaUrl = product.lazada_url || product.affiliate_lazada;
  if (lazadaUrl) {
    const html = await fetchHtml(lazadaUrl);
    if (html) {
      results.price  = extractLazadaPrice(html);
      results.weight = extractLazadaWeight(html);
      results.source = 'lazada';
      if (results.price || results.weight) return results;
    }
    await sleep(500);
  }

  // Fall back to Shopee
  const shopeeUrl = product.shopee_url || product.affiliate_shopee;
  if (shopeeUrl) {
    const html = await fetchHtml(shopeeUrl);
    if (html) {
      results.price  = extractShopeePrice(html);
      results.weight = extractShopeeWeight(html);
      results.source = 'shopee';
    }
  }

  return results;
}

// ── Railway helpers ──────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(`${RAILWAY_URL}/products?limit=${PAGE_SIZE}&page=${page}&active_only=true`, {
    headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`GET /products page ${page} → ${r.status}`);
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
  console.log(`\n💰 MeowLah Price & Weight Scraper`);
  console.log(`   Target:  ${TARGET}`);
  console.log(`   DryRun:  ${DRY_RUN}`);
  console.log(`   Delay:   ${DELAY_MS}ms\n`);

  // Collect products needing data
  console.log('📋 Scanning products...');
  let page = 1, totalPages = 1;
  const targets = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    totalPages = Math.ceil((data.total ?? 0) / PAGE_SIZE);
    for (const p of data.items ?? []) {
      if (BRAND_FILTER && (p.brand ?? '').toLowerCase() !== BRAND_FILTER) continue;
      const needsPrice  = !p.price_myr  && (TARGET === 'both' || TARGET === 'price');
      const needsWeight = !p.weight_g   && (TARGET === 'both' || TARGET === 'weight');
      const hasUrl      = p.lazada_url || p.affiliate_lazada || p.shopee_url || p.affiliate_shopee;
      if ((needsPrice || needsWeight) && hasUrl) {
        targets.push({ ...p, needsPrice, needsWeight });
      }
    }
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${targets.length} need data`);
    page++;
    await sleep(150);
  }

  console.log(`\n\n✅ Found ${targets.length} products to process\n`);
  if (!targets.length) { console.log('Nothing to do!'); return; }

  let priceFound = 0, weightFound = 0, bothFound = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const label = `${p.brand ?? ''} ${(p.name_en ?? '').substring(0, 35)}`.trim();
    process.stdout.write(`\r[${i+1}/${targets.length}] ${label.padEnd(45)} `);

    const { price, weight, source } = await scrapeProduct(p);

    const patch = {};
    if (p.needsPrice  && price  && price > 0)    patch.price_myr = parseFloat(price.toFixed(2));
    if (p.needsWeight && weight && weight > 0)    patch.weight_g  = weight;

    if (!Object.keys(patch).length) {
      process.stdout.write('✗ nothing found');
      failed++;
    } else {
      const parts = [];
      if (patch.price_myr)  { parts.push(`RM ${patch.price_myr}`); priceFound++; }
      if (patch.weight_g)   { parts.push(`${patch.weight_g}g`);   weightFound++; }
      if (patch.price_myr && patch.weight_g) bothFound++;

      if (DRY_RUN) {
        process.stdout.write(`✓ DRY [${source}] ${parts.join(', ')}`);
      } else {
        const ok = await patchProduct(p.id, patch);
        process.stdout.write(ok ? `✓ [${source}] ${parts.join(', ')}` : '✗ PATCH failed');
        if (!ok) failed++;
      }
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n\n📊 Summary`);
  console.log(`   Prices found:  ${priceFound}`);
  console.log(`   Weights found: ${weightFound}`);
  console.log(`   Both found:    ${bothFound}`);
  console.log(`   Failed/empty:  ${failed}`);
  console.log(`   Total:         ${targets.length}\n`);
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
