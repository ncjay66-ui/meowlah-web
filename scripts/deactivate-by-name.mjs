/**
 * Deactivate specific products by name fragment.
 * Edit the TARGETS array below, then run:
 *   node scripts/deactivate-by-name.mjs
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Edit this list ─────────────────────────────────────────────────────────
const TARGETS = [
  { nameFragment: 'PetCubes Gently Cooked Chicken Cat Food 400g', brand: 'PETCUBES' },
];
// ──────────────────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
  if (!r.ok) throw new Error(`page ${page} → ${r.status}`);
  return r.json();
}

async function deactivate(id) {
  const r = await fetch(`${RAILWAY_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ is_active: false }),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok;
}

async function main() {
  console.log('\n🗑️  Deactivating products by name\n');

  const remaining = new Map(
    TARGETS.map(t => [t.nameFragment.toLowerCase(), t])
  );
  const found = [];

  let page = 1, totalPages = 1;
  while (page <= totalPages && remaining.size > 0) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      const nameLower = (p.name_en ?? '').toLowerCase();
      for (const [fragment, target] of remaining) {
        if (nameLower.includes(fragment.toLowerCase()) &&
            (!target.brand || (p.brand ?? '').toUpperCase() === target.brand.toUpperCase())) {
          found.push(p);
          remaining.delete(fragment);
          console.log(`  ✓ Found: [${p.id}] ${p.brand} — ${p.name_en}`);
        }
      }
    }
    page++;
    if (page <= totalPages) await sleep(150);
  }

  if (remaining.size > 0) {
    console.log('\n⚠️  Not found:');
    for (const [f] of remaining) console.log(`  - "${f}"`);
  }

  if (!found.length) { console.log('Nothing to deactivate.'); return; }

  console.log(`\n🗑️  Deactivating ${found.length} product(s)...\n`);
  let ok = 0, fail = 0;
  for (const p of found) {
    const success = await deactivate(p.id);
    console.log(success
      ? `  ✓ Deactivated: ${p.brand} — ${p.name_en}`
      : `  ✗ Failed:      ${p.brand} — ${p.name_en}`);
    if (success) ok++; else fail++;
    await sleep(200);
  }

  console.log(`\n📊 Done: ${ok} deactivated, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
