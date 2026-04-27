/**
 * MeowLah Price Filler
 * ---------------------
 * Fetches products with missing price_myr from Railway,
 * then tries to find their MYR prices from:
 *   1. Petsmore.com.my  (WooCommerce Store API — free JSON endpoint)
 *   2. PetsWonderland.com (Shopify products.json)
 *   3. Hardcoded price table (common brand/size combos)
 *
 * Run from meowlah-web directory:
 *   node scripts/fill-prices.mjs
 *
 * Options:
 *   DRY_RUN=1            Print what would be saved, don't PATCH
 *   BRAND=NEKKO          Only process a specific brand
 *   DELAY_MS=1500        ms between Railway PATCHes (default 1500)
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1500');
const DRY_RUN     = process.env.DRY_RUN === '1';
const BRAND_FILTER = (process.env.BRAND ?? '').toLowerCase();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Hardcoded price table (MYR) ───────────────────────────────────────────────
// Sources: Petsmore, Pet Lovers Centre, BeesPets, BppetFood, Petico (Apr 2026)
// Note: prices are indicative mid-range retail; may vary 5-15% by retailer/promo
const PRICE_TABLE = [
  // ── NEKKO wet pouches ─────────────────────────────────────────────────────
  { brand: 'nekko', weight_min: 65, weight_max: 75, price: 2.80 },   // 70g

  // ── SHEBA ─────────────────────────────────────────────────────────────────
  { brand: 'sheba', weight_min: 82, weight_max: 88, price: 4.20 },   // 85g tin
  { brand: 'sheba', weight_min: 65, weight_max: 75, price: 2.70 },   // 70g pouch

  // ── Whiskas ───────────────────────────────────────────────────────────────
  { brand: 'whiskas', weight_min: 80, weight_max: 90, price: 1.95 }, // 85g pouch
  { brand: 'whiskas', weight_min: 390, weight_max: 410, price: 7.90 }, // 400g can
  { brand: 'whiskas', weight_min: 1400, weight_max: 1600, price: 32.90 }, // 1.5kg dry

  // ── Fancy Feast ───────────────────────────────────────────────────────────
  { brand: 'fancy feast', weight_min: 82, weight_max: 88, price: 5.60 }, // 85g tin
  { brand: 'fancy feast', weight_min: 80, weight_max: 90, price: 5.60 }, // 85g

  // ── Schesir ───────────────────────────────────────────────────────────────
  { brand: 'schesir', weight_min: 70, weight_max: 85, price: 8.20 },  // 75-80g tin
  { brand: 'schesir', weight_min: 380, weight_max: 420, price: 28.00 }, // 400g

  // ── Me-O ──────────────────────────────────────────────────────────────────
  { brand: 'me-o', weight_min: 370, weight_max: 410, price: 5.90 },  // 400g tin
  { brand: 'me-o', weight_min: 1300, weight_max: 1600, price: 28.90 }, // 1.5kg dry
  { brand: 'me-o', weight_min: 2900, weight_max: 3100, price: 49.90 }, // 3kg dry

  // ── Royal Canin dry ───────────────────────────────────────────────────────
  { brand: 'royal canin', weight_min: 850,  weight_max: 1000, price: 52.00 },   // 900g/1kg
  { brand: 'royal canin', weight_min: 1900, weight_max: 2100, price: 84.30 },   // 2kg
  { brand: 'royal canin', weight_min: 3400, weight_max: 3600, price: 138.20 },  // 3.5kg
  { brand: 'royal canin', weight_min: 3900, weight_max: 4100, price: 162.00 },  // 4kg
  { brand: 'royal canin', weight_min: 3100, weight_max: 3300, price: 120.00 },  // 3.2kg
  // Royal Canin wet (pouches / cans)
  { brand: 'royal canin', weight_min: 80,   weight_max: 95,   price: 5.50 },    // 85g

  // ── Hills Science Diet ────────────────────────────────────────────────────
  { brand: 'hills', weight_min: 1500, weight_max: 1700, price: 122.60 },  // 1.6kg
  { brand: 'hills', weight_min: 3100, weight_max: 3300, price: 192.00 },  // 3.17kg
  { brand: 'hills', weight_min: 2800, weight_max: 3000, price: 175.00 },  // 2.9kg
  { brand: 'hills', weight_min: 80,   weight_max: 95,   price: 4.80 },    // 82g wet

  // ── Purina Pro Plan ───────────────────────────────────────────────────────
  { brand: 'purina pro plan', weight_min: 1300, weight_max: 1600, price: 49.90 }, // 1.5kg
  { brand: 'purina pro plan', weight_min: 2400, weight_max: 2600, price: 75.00 }, // 2.5kg
  { brand: 'purina pro plan', weight_min: 2900, weight_max: 3100, price: 92.00 }, // 3kg

  // ── Purina ONE ────────────────────────────────────────────────────────────
  { brand: 'purina one', weight_min: 1500, weight_max: 1700, price: 49.90 },
  { brand: 'purina one', weight_min: 2900, weight_max: 3100, price: 89.90 },

  // ── Monge dry ─────────────────────────────────────────────────────────────
  { brand: 'monge', weight_min: 1400, weight_max: 1600, price: 42.00 },  // 1.5kg
  { brand: 'monge', weight_min: 3900, weight_max: 4100, price: 98.00 },  // 4kg
  { brand: 'monge', weight_min: 10000, weight_max: 10500, price: 185.00 }, // 10kg

  // ── Friskies ──────────────────────────────────────────────────────────────
  { brand: 'friskies', weight_min: 390, weight_max: 410, price: 4.50 },  // 400g
  { brand: 'friskies', weight_min: 170, weight_max: 190, price: 3.20 },  // 180g
  { brand: 'friskies', weight_min: 1300, weight_max: 1600, price: 22.90 }, // 1.5kg dry

  // ── Almo Nature ───────────────────────────────────────────────────────────
  { brand: 'almo nature', weight_min: 50,  weight_max: 80,  price: 5.90 },  // 70g
  { brand: 'almo nature', weight_min: 150, weight_max: 200, price: 14.90 }, // 175g

  // ── Applaws ───────────────────────────────────────────────────────────────
  { brand: 'applaws', weight_min: 60,  weight_max: 80,  price: 4.50 },  // 70g
  { brand: 'applaws', weight_min: 150, weight_max: 170, price: 8.90 },  // 156g
  { brand: 'applaws', weight_min: 390, weight_max: 410, price: 18.90 }, // 400g

  // ── SmartHeart ────────────────────────────────────────────────────────────
  { brand: 'smartheart', weight_min: 80,   weight_max: 90,   price: 1.80 },
  { brand: 'smartheart', weight_min: 1300, weight_max: 1600, price: 18.90 },
  { brand: 'smartheart', weight_min: 2900, weight_max: 3100, price: 35.90 },

  // ── Nutripe ───────────────────────────────────────────────────────────────
  { brand: 'nutripe', weight_min: 90,  weight_max: 100, price: 5.80 },
  { brand: 'nutripe', weight_min: 380, weight_max: 420, price: 14.90 },

  // ── Orijen ────────────────────────────────────────────────────────────────
  { brand: 'orijen', weight_min: 320, weight_max: 360, price: 35.00 },   // 340g dry
  { brand: 'orijen', weight_min: 1700, weight_max: 1900, price: 175.00 }, // 1.8kg dry
  { brand: 'orijen', weight_min: 5200, weight_max: 5600, price: 460.00 }, // 5.4kg dry

  // ── Acana ─────────────────────────────────────────────────────────────────
  { brand: 'acana', weight_min: 320, weight_max: 360, price: 30.00 },   // 340g dry
  { brand: 'acana', weight_min: 1700, weight_max: 1900, price: 145.00 }, // 1.8kg dry
  { brand: 'acana', weight_min: 4400, weight_max: 4600, price: 320.00 }, // 4.5kg dry

  // ── Ziwi Peak ─────────────────────────────────────────────────────────────
  { brand: 'ziwi', weight_min: 80,   weight_max: 90,   price: 18.90 }, // 85g can
  { brand: 'ziwi', weight_min: 180,  weight_max: 190,  price: 31.90 }, // 185g can
  { brand: 'ziwi', weight_min: 380,  weight_max: 420,  price: 52.90 }, // 400g can
  { brand: 'ziwi', weight_min: 800,  weight_max: 900,  price: 158.00 }, // 850g air-dried
  { brand: 'ziwi', weight_min: 2100, weight_max: 2300, price: 348.00 }, // 2.2kg air-dried

  // ── Taste of the Wild ─────────────────────────────────────────────────────
  { brand: 'taste of the wild', weight_min: 2700, weight_max: 2900, price: 78.00 },  // 2.8kg
  { brand: 'taste of the wild', weight_min: 6300, weight_max: 6500, price: 158.00 }, // 6.35kg

  // ── Wellness CORE ─────────────────────────────────────────────────────────
  { brand: 'wellness', weight_min: 1300, weight_max: 1600, price: 72.00 }, // 1.5kg
  { brand: 'wellness', weight_min: 2300, weight_max: 2500, price: 118.00 }, // 2.4kg

  // ── Merrick ───────────────────────────────────────────────────────────────
  { brand: 'merrick', weight_min: 1300, weight_max: 1600, price: 68.00 }, // 1.5kg

  // ── Instinct ──────────────────────────────────────────────────────────────
  { brand: 'instinct', weight_min: 1300, weight_max: 1600, price: 75.00 }, // 1.5kg
  { brand: 'instinct', weight_min: 2700, weight_max: 2900, price: 130.00 }, // 2.8kg

  // ── Feline Natural (NZ Natural) ──────────────────────────────────────────
  { brand: 'feline natural', weight_min: 170, weight_max: 185, price: 19.90 }, // 175g
  { brand: 'feline natural', weight_min: 320, weight_max: 360, price: 32.00 }, // 346g

  // ── Nulo ──────────────────────────────────────────────────────────────────
  { brand: 'nulo', weight_min: 1300, weight_max: 1600, price: 68.00 },

  // ── Tiki Cat ──────────────────────────────────────────────────────────────
  { brand: 'tiki cat', weight_min: 80, weight_max: 90, price: 6.90 },

  // ── Champion / generic estimates ──────────────────────────────────────────
  { brand: 'canagan', weight_min: 1400, weight_max: 1600, price: 88.00 },
  { brand: 'canagan', weight_min: 3800, weight_max: 4200, price: 188.00 },
];

// ── WooCommerce Store API (petsmore.com.my) ───────────────────────────────────

async function fetchPetsmoreProducts(searchQuery) {
  const url = `https://petsmore.com.my/wp-json/wc/store/v1/products?search=${encodeURIComponent(searchQuery)}&per_page=20`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const products = await r.json();
    return Array.isArray(products) ? products : [];
  } catch {
    return [];
  }
}

function parsePetsmorePrice(products, productName, weightG) {
  for (const p of products) {
    const name = (p.name ?? '').toLowerCase();
    const priceStr = p.prices?.price;
    if (!priceStr) continue;

    // WooCommerce Store API v1 returns price in currency minor units (cents for MYR)
    // currency_minor_unit = 2 → divide by 100
    const minorUnit = p.prices?.currency_minor_unit ?? 2;
    const divisor   = Math.pow(10, minorUnit);
    const priceMyr  = parseFloat(priceStr) / divisor;
    if (priceMyr <= 0 || priceMyr > 10000) continue;

    // Weight in product name should roughly match if we know the weight
    if (weightG) {
      const nameWeight = extractWeightFromText(name);
      if (nameWeight && Math.abs(nameWeight - weightG) > weightG * 0.20) continue;
    }

    return priceMyr;
  }
  return null;
}

// ── Shopify JSON API (petswonderland.com) ─────────────────────────────────────

let shopifyCache = null;

async function fetchShopifyProducts() {
  if (shopifyCache) return shopifyCache;
  shopifyCache = [];
  let page = 1;
  while (true) {
    const url = `https://petswonderland.com/products.json?limit=250&page=${page}`;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) break;
      const data = await r.json();
      const products = data.products ?? [];
      if (!products.length) break;
      shopifyCache.push(...products);
      if (products.length < 250) break;
      page++;
      await sleep(300);
    } catch {
      break;
    }
  }
  console.log(`  [Shopify] Loaded ${shopifyCache.length} products from PetsWonderland`);
  return shopifyCache;
}

function matchShopifyProduct(products, brand, nameEn, weightG) {
  const brandLow = (brand ?? '').toLowerCase();
  const nameLow  = (nameEn ?? '').toLowerCase();

  for (const p of products) {
    const title = (p.title ?? '').toLowerCase();
    if (!title.includes(brandLow)) continue;

    const variant = p.variants?.[0];
    const price = parseFloat(variant?.price ?? '0');
    if (price <= 0) continue;

    // Check weight match if we know it
    if (weightG) {
      const titleWeight = extractWeightFromText(title);
      if (titleWeight && Math.abs(titleWeight - weightG) > weightG * 0.15) continue;
    }

    return price;
  }
  return null;
}

// ── Hardcoded table lookup ─────────────────────────────────────────────────────

function brandMatches(productBrand, entryBrand) {
  const pb = (productBrand ?? '').toLowerCase().trim();
  const eb = entryBrand.toLowerCase().trim();
  // exact match
  if (pb === eb) return true;
  // product brand contains entry brand key
  if (pb.includes(eb)) return true;
  // entry brand is multi-word: every word must appear in product brand
  if (eb.includes(' ') && eb.split(' ').every(w => pb.includes(w))) return true;
  // partial: entry brand starts with product brand (e.g. entry="hills" brand="Hill's Science Diet")
  if (eb.split(' ').length === 1 && pb.startsWith(eb.replace("'", ''))) return true;
  return false;
}

function lookupHardcoded(brand, weightG) {
  if (!weightG) return null;

  for (const entry of PRICE_TABLE) {
    if (!brandMatches(brand, entry.brand)) continue;
    if (weightG >= entry.weight_min && weightG <= entry.weight_max) {
      return entry.price;
    }
  }
  return null;
}

// ── Shared weight extractor ────────────────────────────────────────────────────

function extractWeightFromText(text) {
  if (!text) return null;
  const kgMatch = text.match(/\b(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (val > 0 && val < 100) return Math.round(val * 1000);
  }
  const gMatches = [...text.matchAll(/\b(\d{2,5})\s*g(?:rams?)?\b/gi)];
  for (const m of gMatches) {
    const val = parseInt(m[1]);
    if (val >= 2020 && val <= 2030) continue;
    if (val < 20 || val > 30000) continue;
    return val;
  }
  return null;
}

// ── Railway helpers ────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(`${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`, {
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n💰 MeowLah Price Filler`);
  console.log(`   DryRun: ${DRY_RUN}`);
  console.log(`   Delay:  ${DELAY_MS}ms\n`);

  // Pre-load Shopify catalogue
  process.stdout.write('📦 Pre-loading PetsWonderland catalogue...');
  const shopifyProducts = await fetchShopifyProducts();
  console.log('');

  // Collect products needing prices
  console.log('📋 Scanning Railway products...');
  let page = 1, totalPages = 1;
  const targets = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    totalPages = Math.ceil((data.total ?? 0) / PAGE_SIZE);
    for (const p of data.items ?? []) {
      if (BRAND_FILTER && (p.brand ?? '').toLowerCase() !== BRAND_FILTER) continue;
      if (!p.price_myr) targets.push(p);
    }
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${targets.length} missing prices`);
    page++;
    await sleep(150);
  }

  console.log(`\n\n✅ Found ${targets.length} products without prices\n`);
  if (!targets.length) { console.log('Nothing to do!'); return; }

  let found = 0, failed = 0;
  const sources = { petsmore: 0, shopify: 0, hardcoded: 0 };
  const failedProducts = [];

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const label = `${p.brand ?? ''} ${(p.name_en ?? '').substring(0, 35)}`.trim();
    process.stdout.write(`\r[${i+1}/${targets.length}] ${label.padEnd(45)} `);

    const brand   = p.brand ?? '';
    const nameEn  = p.name_en ?? '';
    const weightG = p.weight_g;

    let price = null;
    let source = null;

    // Strategy 1: Petsmore WooCommerce API
    const searchQuery = `${brand} ${nameEn.split(' ').slice(0, 4).join(' ')}`;
    const pmProducts  = await fetchPetsmoreProducts(searchQuery);
    if (pmProducts.length) {
      price = parsePetsmorePrice(pmProducts, nameEn, weightG);
      if (price) { source = 'petsmore'; sources.petsmore++; }
    }
    await sleep(400);

    // Strategy 2: Shopify (PetsWonderland)
    if (!price && shopifyProducts.length) {
      price = matchShopifyProduct(shopifyProducts, brand, nameEn, weightG);
      if (price) { source = 'shopify'; sources.shopify++; }
    }

    // Strategy 3: Hardcoded table
    if (!price) {
      price = lookupHardcoded(brand, weightG);
      if (price) { source = 'hardcoded'; sources.hardcoded++; }
    }

    if (!price) {
      process.stdout.write('✗ no price found');
      failed++;
      failedProducts.push({ id: p.id, brand: p.brand, name_en: p.name_en, weight_g: p.weight_g });
    } else {
      const priceFmt = parseFloat(price.toFixed(2));
      if (DRY_RUN) {
        process.stdout.write(`✓ DRY [${source}] RM ${priceFmt}`);
      } else {
        const ok = await patchProduct(p.id, { price_myr: priceFmt });
        process.stdout.write(ok ? `✓ [${source}] RM ${priceFmt}` : '✗ PATCH failed');
        if (!ok) failed++;
      }
      found++;
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n\n📊 Summary`);
  console.log(`   Found:     ${found} / ${targets.length}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Sources:   Petsmore=${sources.petsmore}, Shopify=${sources.shopify}, Hardcoded=${sources.hardcoded}`);

  if (failedProducts.length) {
    // Group by brand for easy reading
    const byBrand = {};
    for (const p of failedProducts) {
      const b = p.brand ?? '(unknown)';
      if (!byBrand[b]) byBrand[b] = 0;
      byBrand[b]++;
    }
    console.log(`\n❌ Missing prices by brand:`);
    const sorted = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
    for (const [brand, count] of sorted) {
      console.log(`   ${brand.padEnd(30)} × ${count}`);
    }

    // Save full list to file
    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/failed-prices.json', JSON.stringify(failedProducts, null, 2));
    console.log(`\n📄 Full list saved to scripts/failed-prices.json`);
  }
  console.log('');
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
