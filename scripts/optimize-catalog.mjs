/**
 * MeowLah Catalog Optimizer
 * ---------------------------
 * Runs a full catalog cleanup pass in one go:
 *
 *   Phase 1 — Extended garbage brand cleanup
 *             (catches brands the generic script misses)
 *   Phase 2 — Duplicate detection & deactivation
 *             (same brand + very similar name → keep best-scored / newest)
 *   Phase 3 — Suspicious price audit
 *             (prices that are clear outliers for their brand/category)
 *
 * Run from meowlah-web directory:
 *   node scripts/optimize-catalog.mjs
 *
 * Options:
 *   DRY_RUN=1      Show what would change without writing to DB (default: 0)
 *   SKIP_BRANDS=1  Skip Phase 1
 *   SKIP_DUPES=1   Skip Phase 2
 *   SKIP_PRICES=1  Skip Phase 3
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;

const DRY_RUN     = process.env.DRY_RUN     !== '0' && process.env.DRY_RUN !== 'false';  // default ON for safety
const SKIP_BRANDS = process.env.SKIP_BRANDS === '1';
const SKIP_DUPES  = process.env.SKIP_DUPES  === '1';
const SKIP_PRICES = process.env.SKIP_PRICES === '1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Railway helpers ────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
  if (!r.ok) throw new Error(`GET /products page ${page} → HTTP ${r.status}`);
  return r.json();
}

async function fetchAllProducts() {
  let page = 1, totalPages = 1;
  const all = [];
  while (page <= totalPages) {
    const data = await fetchPage(page);
    const sz   = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / sz);
    all.push(...(data.items ?? []));
    process.stdout.write(`\r  Loaded page ${page}/${totalPages} — ${all.length} products`);
    page++;
    if (page <= totalPages) await sleep(150);
  }
  process.stdout.write('\n');
  return all;
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

// ── Phase 1 helpers: extended garbage brand detection ──────────────────────────

// Single-word / very short "brands" that are clearly not real brands
const EXTRA_GARBAGE_EXACT = new Set([
  'my', 'ship', 'free', 'yes', 'top', 'pro', 'new', 'hot', 'big', 'best',
  'cat', 'pet', 'food', 'mix', 'buy', 'set',
  'papaya group', "people's pet", 'gun pet', 'my pets', 'pet shop',
  'repackage', 'repacked', 'no brand', 'no name', 'generic',
]);

// Brand-name substrings that are dead giveaways of scraped Shopee titles
const GARBAGE_SUBSTRINGS = [
  'shopee',
  'lazada',
  'cod ready',
  'ready stock',
  'murah',
  'borong',
  'pcs)',
  'packs)',
  'units)',
  '100g)',
  '200g)',
  '500g)',
  '1kg)',
  'promo',
  'sale!',
  'new arrival',
];

function isExtendedGarbageBrand(brand) {
  if (!brand) return false;  // let other scripts handle truly-null brands
  const lower = brand.toLowerCase().trim();
  if (EXTRA_GARBAGE_EXACT.has(lower)) return true;
  // Very short non-meaningful tokens (1-2 chars or pure numbers)
  if (/^\d+$/.test(lower)) return true;
  if (lower.length <= 2 && /^[a-z]+$/.test(lower)) return true;
  // Substrings
  if (GARBAGE_SUBSTRINGS.some(s => lower.includes(s))) return true;
  return false;
}

// ── Phase 2 helpers: duplicate detection ───────────────────────────────────────

/**
 * Normalise a product name for fuzzy comparison.
 * Strips weight, punctuation, whitespace; lowercases.
 */
function normaliseName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    // remove weight tokens like "2kg", "400g", "85g", "3 kg", "3kg x 12"
    .replace(/\d+(\.\d+)?\s*(kg|g|ml|l|oz|lb)\b[\s×x\d]*/gi, '')
    // remove parenthetical notes like "(chicken)", "(tuna & salmon)"
    .replace(/\([^)]*\)/g, '')
    // collapse whitespace and punctuation
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Rough Jaccard word-set similarity (0–1).
 */
function similarity(a, b) {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

/**
 * Words that, when present in one product name but absent in the other,
 * signal these are genuinely different products rather than duplicates.
 * This prevents mis-flagging different flavours / life stages as duplicates.
 */
const DIFFERENTIATING_TERMS = new Set([
  // proteins / seafood
  'salmon', 'chicken', 'tuna', 'beef', 'lamb', 'duck', 'turkey',
  'shrimp', 'prawn', 'pork', 'rabbit', 'venison', 'cod', 'mackerel',
  'sardine', 'anchovy', 'crab', 'scallop', 'octopus', 'herring', 'trout',
  'tilapia', 'snapper', 'catfish', 'whitebait', 'yellowfin',
  // life stages / formula variants
  'kitten', 'senior', 'junior',
  // health / diet variants
  'urinary', 'renal', 'hepatic', 'diabetic', 'dental', 'gastrointestinal',
  'hairball', 'indoor', 'outdoor', 'sterilised', 'neutered', 'lite', 'light',
  'persian', 'siamese', 'maine', 'ragdoll', 'bengal', 'british',
  // product line / quality tier
  'plus', 'ultra', 'naturelle', 'holistic', 'organic', 'grain',
  // ingredients that create distinct flavour profiles
  'rice', 'milk', 'egg', 'liver', 'heart', 'kidney', 'lung',
  'spinach', 'pumpkin', 'carrot', 'broccoli', 'apple', 'blueberry',
]);

/**
 * Returns true if the two normalised names differ by at least one
 * DIFFERENTIATING_TERM — meaning they are likely different products.
 */
function hasDifferentiatingDifference(normA, normB) {
  const wA = new Set(normA.split(' ').filter(Boolean));
  const wB = new Set(normB.split(' ').filter(Boolean));
  for (const w of wA) if (!wB.has(w) && DIFFERENTIATING_TERMS.has(w)) return true;
  for (const w of wB) if (!wA.has(w) && DIFFERENTIATING_TERMS.has(w)) return true;
  return false;
}

const DUPE_THRESHOLD = 0.75;  // ≥75% word overlap → candidate duplicate

/**
 * Group products into duplicate clusters.
 * Within each brand, compare every pair of (normalised) names.
 * Products that differ by a DIFFERENTIATING_TERM are never grouped.
 */
function findDuplicateClusters(products) {
  // Group by brand (case-insensitive)
  const byBrand = new Map();
  for (const p of products) {
    const key = (p.brand ?? '').toLowerCase().trim();
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key).push(p);
  }

  const clusters = [];
  for (const [, group] of byBrand) {
    if (group.length < 2) continue;

    // Build an adjacency list then find connected components
    const n = group.length;
    const adj = Array.from({ length: n }, () => new Set());

    for (let i = 0; i < n; i++) {
      const ni = normaliseName(group[i].name_en);
      for (let j = i + 1; j < n; j++) {
        const nj = normaliseName(group[j].name_en);
        if (similarity(ni, nj) >= DUPE_THRESHOLD && !hasDifferentiatingDifference(ni, nj)) {
          adj[i].add(j);
          adj[j].add(i);
        }
      }
    }

    // BFS to collect connected components with ≥2 members
    const visited = new Array(n).fill(false);
    for (let start = 0; start < n; start++) {
      if (visited[start] || adj[start].size === 0) { visited[start] = true; continue; }
      const component = [];
      const queue = [start];
      while (queue.length) {
        const cur = queue.shift();
        if (visited[cur]) continue;
        visited[cur] = true;
        component.push(group[cur]);
        for (const nb of adj[cur]) if (!visited[nb]) queue.push(nb);
      }
      if (component.length >= 2) clusters.push(component);
    }
  }

  return clusters;
}

/**
 * Within a duplicate cluster, pick the "best" product to keep:
 * 1. Prefers highest final_score
 * 2. Ties broken by non-null image_url
 * 3. Then by non-null price_myr
 * Returns { keep, deactivate[] }
 */
function chooseSurvivor(cluster) {
  const scored = [...cluster].sort((a, b) => {
    // Higher score wins
    const sd = (b.final_score ?? 0) - (a.final_score ?? 0);
    if (sd !== 0) return sd;
    // Has image is better
    const ia = a.image_url ? 1 : 0;
    const ib = b.image_url ? 1 : 0;
    if (ib !== ia) return ib - ia;
    // Has price is better
    const pa = a.price_myr ? 1 : 0;
    const pb = b.price_myr ? 1 : 0;
    return pb - pa;
  });
  const [keep, ...deactivate] = scored;
  return { keep, deactivate };
}

// ── Phase 3 helpers: suspicious price detection ────────────────────────────────

/**
 * We flag a price as suspicious if it's more than OUTLIER_FACTOR × the brand's
 * median price for the same category.  This catches bundle prices and mis-entered
 * values while ignoring genuine premium products.
 */
const OUTLIER_FACTOR = 4;   // >4× median → suspicious
const MIN_GROUP_SIZE = 3;   // need at least 3 peers to compute a median

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function findSuspiciousPrices(products) {
  // Group by brand + category
  const groups = new Map();
  for (const p of products) {
    if (!p.price_myr) continue;
    const key = `${(p.brand ?? '').toLowerCase()}::${p.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const suspicious = [];
  for (const [, group] of groups) {
    if (group.length < MIN_GROUP_SIZE) continue;
    const prices = group.map(p => p.price_myr);
    const med = median(prices);
    if (!med) continue;
    for (const p of group) {
      if (p.price_myr > med * OUTLIER_FACTOR) {
        suspicious.push({ product: p, median: med, ratio: (p.price_myr / med).toFixed(1) });
      }
    }
  }

  return suspicious.sort((a, b) => b.ratio - a.ratio);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🐱 MeowLah Catalog Optimizer');
  console.log(`   DRY_RUN:     ${DRY_RUN} ${DRY_RUN ? '(safe preview — set DRY_RUN=0 to apply)' : '⚠️  LIVE MODE'}`);
  console.log(`   Phases:      ${[!SKIP_BRANDS && 'brands', !SKIP_DUPES && 'dupes', !SKIP_PRICES && 'prices'].filter(Boolean).join(', ')}\n`);

  // ── Load all products ──────────────────────────────────────────────────────
  console.log('📋 Loading all active products...');
  const products = await fetchAllProducts();
  console.log(`   Total: ${products.length}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: Extended garbage brand cleanup
  // ─────────────────────────────────────────────────────────────────────────
  if (!SKIP_BRANDS) {
    console.log('═══════════════════════════════════════════════');
    console.log('Phase 1 — Extended garbage brand cleanup');
    console.log('═══════════════════════════════════════════════\n');

    const garbage = products.filter(p => isExtendedGarbageBrand(p.brand));
    console.log(`Found ${garbage.length} products with extended-garbage brand names:\n`);

    const byBrand = {};
    for (const p of garbage) {
      const b = p.brand ?? '(null)';
      if (!byBrand[b]) byBrand[b] = [];
      byBrand[b].push(p);
    }
    for (const [brand, items] of Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  "${brand}" (${items.length} products)`);
      for (const p of items.slice(0, 3))
        console.log(`    → ${(p.name_en ?? '').substring(0, 70)}`);
      if (items.length > 3) console.log(`    → … and ${items.length - 3} more`);
    }

    if (!garbage.length) {
      console.log('  Nothing to clean!\n');
    } else if (DRY_RUN) {
      console.log(`\n  DRY RUN — would deactivate ${garbage.length} products.\n`);
    } else {
      console.log(`\n  Deactivating ${garbage.length} products...\n`);
      let ok = 0, fail = 0;
      for (let i = 0; i < garbage.length; i++) {
        const p = garbage[i];
        process.stdout.write(`\r  [${i + 1}/${garbage.length}] "${p.brand}" `);
        const success = await patchProduct(p.id, { is_active: false });
        if (success) { ok++; process.stdout.write('✓'); }
        else          { fail++; process.stdout.write('✗'); }
        await sleep(200);
      }
      console.log(`\n  Done: ${ok} deactivated, ${fail} failed\n`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: Duplicate detection & deactivation
  // ─────────────────────────────────────────────────────────────────────────
  if (!SKIP_DUPES) {
    console.log('═══════════════════════════════════════════════');
    console.log('Phase 2 — Duplicate detection');
    console.log('═══════════════════════════════════════════════\n');

    // Work on the freshest view — exclude products already flagged as garbage in Phase 1
    const garbageBrands = SKIP_BRANDS
      ? new Set()
      : new Set(products.filter(p => isExtendedGarbageBrand(p.brand)).map(p => p.id));
    const eligible = products.filter(p => !garbageBrands.has(p.id));

    console.log(`  Checking ${eligible.length} products for duplicates...\n`);
    const clusters = findDuplicateClusters(eligible);

    if (!clusters.length) {
      console.log('  No duplicate clusters found!\n');
    } else {
      console.log(`  Found ${clusters.length} duplicate clusters:\n`);

      const allToDeactivate = [];

      for (let ci = 0; ci < clusters.length; ci++) {
        const cluster = clusters[ci];
        const { keep, deactivate } = chooseSurvivor(cluster);

        console.log(`  Cluster ${ci + 1}: [${keep.brand}]`);
        console.log(`    ✅ KEEP  — score:${(keep.final_score ?? 0).toFixed(0).padStart(3)}  "${(keep.name_en ?? '').substring(0, 65)}"`);
        for (const d of deactivate) {
          console.log(`    ❌ DROP  — score:${(d.final_score ?? 0).toFixed(0).padStart(3)}  "${(d.name_en ?? '').substring(0, 65)}"`);
          allToDeactivate.push(d);
        }
        console.log('');
      }

      console.log(`  → ${allToDeactivate.length} duplicates to deactivate\n`);

      if (DRY_RUN) {
        console.log('  DRY RUN — no changes made.\n');
      } else {
        let ok = 0, fail = 0;
        for (let i = 0; i < allToDeactivate.length; i++) {
          const p = allToDeactivate[i];
          process.stdout.write(`\r  [${i + 1}/${allToDeactivate.length}] "${(p.name_en ?? '').substring(0, 50).padEnd(50)} "`);
          const success = await patchProduct(p.id, { is_active: false });
          if (success) { ok++; process.stdout.write('✓'); }
          else          { fail++; process.stdout.write('✗'); }
          await sleep(250);
        }
        console.log(`\n  Done: ${ok} deactivated, ${fail} failed\n`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3: Suspicious price audit
  // ─────────────────────────────────────────────────────────────────────────
  if (!SKIP_PRICES) {
    console.log('═══════════════════════════════════════════════');
    console.log('Phase 3 — Suspicious price audit');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`  (flagging prices >${OUTLIER_FACTOR}× the brand+category median)\n`);

    const suspicious = findSuspiciousPrices(products);

    if (!suspicious.length) {
      console.log('  No suspicious prices detected!\n');
    } else {
      console.log(`  Found ${suspicious.length} suspicious prices:\n`);
      for (const { product: p, median: med, ratio } of suspicious) {
        console.log(`  ⚠  [${p.brand}] ${(p.name_en ?? '').substring(0, 55)}`);
        console.log(`     Price: RM${p.price_myr?.toFixed(2)}  |  Median for group: RM${med.toFixed(2)}  |  ${ratio}× median`);
        console.log(`     ID: ${p.id}  Category: ${p.category}`);
        console.log('');
      }
      console.log('  These prices are NOT automatically fixed — review and patch manually:');
      console.log('    node scripts/patch-product-price.mjs <id> <correct_price>\n');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Final summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Optimization pass complete');
  console.log('═══════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. To apply changes:\n');
    console.log('   DRY_RUN=0 node scripts/optimize-catalog.mjs\n');
  }
}

main().catch(e => { console.error('\n💥 Fatal error:', e); process.exit(1); });
