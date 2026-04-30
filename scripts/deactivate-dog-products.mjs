/**
 * Deactivate dog/non-cat products from the MeowLah database.
 * Searches for known dog product keywords and deactivates them.
 *
 * Run from meowlah-web directory:
 *   node scripts/deactivate-dog-products.mjs
 *
 * Options:
 *   DRY_RUN=1   Print what would be deactivated without actually doing it
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DRY_RUN     = process.env.DRY_RUN === '1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Keywords in product name that indicate a dog (non-cat) product
const DOG_KEYWORDS = [
  'dog probiotic',
  'dog supplement',
  'canine',
  'for dogs',
  'dog food',
  'puppy',
  'fresh dog',
];

function isDogProduct(nameEn = '') {
  const lower = nameEn.toLowerCase();
  return DOG_KEYWORDS.some(kw => lower.includes(kw));
}

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
  if (!r.ok) throw new Error(`page ${page} → ${r.status}`);
  return r.json();
}

async function deactivateProduct(id) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ is_active: false }),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok;
}

async function main() {
  console.log(`\n🐶 MeowLah Dog-Product Deactivator`);
  console.log(`   DryRun: ${DRY_RUN}\n`);

  let page = 1, totalPages = 1;
  const toDeactivate = [];

  // Scan all active products
  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      if (isDogProduct(p.name_en)) {
        toDeactivate.push(p);
      }
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — found ${toDeactivate.length} dog products so far`);
    page++;
    if (page <= totalPages) await sleep(150);
  }

  console.log(`\n\n🔍 Found ${toDeactivate.length} dog/non-cat products:\n`);
  toDeactivate.forEach(p => console.log(`  [${p.id}] ${p.brand} — ${p.name_en}`));

  if (toDeactivate.length === 0) {
    console.log('Nothing to deactivate!');
    return;
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes made. Remove DRY_RUN=1 to apply.');
    return;
  }

  console.log('\n🗑️  Deactivating...\n');
  let ok = 0, fail = 0;
  for (const p of toDeactivate) {
    const success = await deactivateProduct(p.id);
    if (success) {
      ok++;
      console.log(`  ✓ Deactivated: ${p.brand} — ${p.name_en}`);
    } else {
      fail++;
      console.log(`  ✗ Failed:      ${p.brand} — ${p.name_en}`);
    }
    await sleep(200);
  }

  console.log(`\n📊 Done: ${ok} deactivated, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
