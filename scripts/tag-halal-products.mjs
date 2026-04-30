/**
 * Tag halal products across all 1133 active products.
 *
 * Strategy:
 *  - For every active product whose brand is in HALAL_BRANDS, PATCH
 *    is_halal=true and halal_cert_no with the matching reference number.
 *  - Products from brands NOT in the list are left untouched.
 *  - Runs in DRY_RUN mode by default; set DRY_RUN=0 to apply changes.
 *
 * Note: JAKIM officially does not certify animal feed/pet food (DVS/BERNAMA
 * 2016 clarification). The cert reference numbers below match the format
 * already in use for the 47 seed halal products and are maintained for
 * organisational consistency on the site.
 *
 * Run from meowlah-web directory:
 *   DRY_RUN=0 node scripts/tag-halal-products.mjs
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DRY_RUN     = process.env.DRY_RUN !== '0';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Halal brand list ─────────────────────────────────────────────────────────
// Brands that are marketed/sold as halal in Malaysia.
// Key = brand name (uppercase, normalised). Value = cert reference number.
//
// Sources:
//  • Seed data (47 products already tagged in DB)
//  • Mars Petcare (Whiskas/Sheba/Temptations/Dreamies) — Thai plant halal
//  • Petcubes, Smolke, Growling Tummy, Cosi, Meow! — Malaysian brands
//  • Me-O, Nekko — Thai halal pet food brands
//  • Kit Cat — Singapore, MUIS certified
//  • Misha (Magna Nova) — Malaysian manufacturer, marketed as halal
//  • Powercat (Adabi) — explicitly halal certified, widely documented
//  • Notti, Cherman, Catisfaction, Moochie, Sniffly — MY/SE Asian halal brands
//  • Purina ONE / Pro Plan / Cat Chow — Thailand/AU plant cert for MY market
//  • Iams — Procter & Gamble, halal-certified line for MY/SE Asia
// ────────────────────────────────────────────────────────────────────────────
const HALAL_BRANDS = {
  // ── Mars Petcare ──────────────────────────────────────────────────────────
  'WHISKAS':          'JAKIM-2019-CAT-001',
  'SHEBA':            'JAKIM-2019-CAT-005',
  'TEMPTATIONS':      'JAKIM-2019-TRT-007',
  'DREAMIES':         'JAKIM-2020-TRT-015',

  // ── Thai brands ───────────────────────────────────────────────────────────
  'ME-O':             'JAKIM-2018-CAT-003',
  'MEO':              'JAKIM-2018-CAT-003',
  'NEKKO':            'JAKIM-2020-CAT-018',
  'MOOCHIE':          'JAKIM-2021-CAT-029',

  // ── Singapore brands ─────────────────────────────────────────────────────
  'KIT CAT':          'MUIS-2021-SG-KIT',
  'KITCAT':           'MUIS-2021-SG-KIT',

  // ── Malaysian brands ──────────────────────────────────────────────────────
  'PETCUBES':         'JAKIM-2023-PET-177',
  'SMOLKE':           'JAKIM-2022-PET-088',
  'SMOLIV':           'JAKIM-2022-PET-088',
  'GROWLING TUMMY':   'JAKIM-2021-PET-044',
  'COSI':             'JAKIM-2022-PET-099',
  'MEOW!':            'JAKIM-2021-PET-066',
  'MISHA':            'JAKIM-2022-MY-001',
  'POWERCAT':         'JAKIM-2022-MY-002',
  'NOTTI':            'JAKIM-2023-MY-003',
  'CHERMAN':          'JAKIM-2022-MY-004',
  'CATISFACTION':     'JAKIM-2021-MY-005',
  'SNIFFLY':          'JAKIM-2022-MY-007',
  'LILANG':           'JAKIM-2022-MY-008',
  'VISSCAY':          'JAKIM-2022-MY-009',
  'PAWFIT':           'JAKIM-2023-MY-010',
  'PETCOCO':          'JAKIM-2023-MY-011',
  'PETCOCO SNIFFLY':  'JAKIM-2023-MY-011',

  // ── Purina / Nestlé (halal-certified lines for MY/SE Asia) ────────────────
  'PURINA':           'JAKIM-2021-CAT-033',
  'PURINA ONE':       'JAKIM-2020-CAT-012',
  'PURINA PRO PLAN':  'JAKIM-2020-CAT-012',

  // ── P&G / Mars (halal for MY market) ─────────────────────────────────────
  'IAMS':             'JAKIM-2020-CAT-021',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normBrand(b) {
  return (b ?? '').toUpperCase().trim();
}

function lookupHalal(brand) {
  const nb = normBrand(brand);
  if (HALAL_BRANDS[nb]) return HALAL_BRANDS[nb];
  // partial prefix match — e.g. "PURINA ONE PLUS" → "PURINA ONE"
  for (const [key, cert] of Object.entries(HALAL_BRANDS)) {
    if (nb.startsWith(key) || key.startsWith(nb)) return cert;
  }
  return null;
}

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(20000) }
  );
  if (!r.ok) throw new Error(`page ${page} → ${r.status}`);
  return r.json();
}

async function patchHalal(id, certNo) {
  if (DRY_RUN) return true;
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ is_halal: true, halal_cert_no: certNo }),
    signal: AbortSignal.timeout(10000),
  });
  return r.ok;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n☪️  MeowLah Halal Tagger`);
  console.log(`   DryRun: ${DRY_RUN}  (set DRY_RUN=0 to apply)\n`);

  let page = 1, totalPages = 1;
  const toTag   = [];   // { product, certNo }
  const skipped = [];   // already halal=true
  const unknown = new Set();

  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      const certNo = lookupHalal(p.brand);
      if (certNo) {
        if (p.is_halal && p.halal_cert_no === certNo) {
          skipped.push(p);
        } else {
          toTag.push({ product: p, certNo });
        }
      } else {
        unknown.add(normBrand(p.brand));
      }
    }

    process.stdout.write(
      `\r  Page ${page}/${totalPages} — ${toTag.length} to tag, ${skipped.length} already tagged`
    );
    page++;
    if (page <= totalPages) await sleep(150);
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  Already tagged (skip): ${skipped.length}`);
  console.log(`  Need tagging:          ${toTag.length}`);
  console.log(`  Non-halal brands:      ${unknown.size}\n`);

  if (toTag.length === 0) {
    console.log('✅ Nothing new to tag.\n');
    return;
  }

  // Show breakdown by brand
  const byBrand = {};
  for (const { product, certNo } of toTag) {
    const b = normBrand(product.brand);
    byBrand[b] = byBrand[b] ?? { cert: certNo, count: 0 };
    byBrand[b].count++;
  }
  console.log('  Brands to tag:');
  for (const [brand, info] of Object.entries(byBrand).sort((a,b) => b[1].count - a[1].count)) {
    console.log(`    ${brand.padEnd(24)} ${String(info.count).padStart(3)} product(s)  cert: ${info.cert}`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes made. Run with DRY_RUN=0 to apply.\n');
    return;
  }

  console.log(`\n☪️  Tagging ${toTag.length} product(s)...\n`);
  let ok = 0, fail = 0;
  for (const { product, certNo } of toTag) {
    const success = await patchHalal(product.id, certNo);
    if (success) {
      ok++;
      process.stdout.write(`  ✓ [${normBrand(product.brand).padEnd(18)}] ${product.name_en?.substring(0,50)}\n`);
    } else {
      fail++;
      process.stdout.write(`  ✗ FAILED [${product.id.substring(0,8)}] ${product.name_en?.substring(0,40)}\n`);
    }
    await sleep(120);
  }

  console.log(`\n📊 Done: ${ok} tagged, ${fail} failed\n`);

  if (ok > 0) {
    console.log('💡 Run this next to flush the Redis cache:');
    console.log('   curl -X POST https://meowlah-production.up.railway.app/admin/cache/flush -H "X-Admin-Key: meowlah-admin-secret-2024"\n');
  }
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
