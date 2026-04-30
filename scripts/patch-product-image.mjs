/**
 * Patch a specific product's image_url by searching for it by name.
 * Use this to manually fix products that keep getting wrong images.
 *
 * Run from meowlah-web directory:
 *   node scripts/patch-product-image.mjs
 *
 * Edit the TARGETS array below to specify which products to fix and
 * what image URL to set (use null to clear the image).
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Edit this list to specify your manual fixes ──────────────────────────────
// nameFragment: partial name match (case-insensitive)
// imageUrl: the URL to set, or null to clear
const TARGETS = [
  {
    nameFragment: 'PetCubes Gently Cooked Chicken Cat Food 400g',
    brand: 'PETCUBES',
    // Use the kohepets image from the other PetCubes Chicken product (no 400g suffix)
    // which is a legitimate cat food store. Set null to show placeholder instead.
    imageUrl: null,
  },
];
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const r = await fetch(
    `${RAILWAY_URL}/products?page_size=${PAGE_SIZE}&page=${page}&active_only=true`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
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

async function main() {
  console.log('\n🔧 MeowLah Manual Image Patcher\n');

  // Build a lookup: nameFragment → target config
  const remaining = new Map(TARGETS.map(t => [t.nameFragment.toLowerCase(), t]));

  let page = 1, totalPages = 1;
  const found = [];

  while (page <= totalPages && remaining.size > 0) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      const nameLower = (p.name_en ?? '').toLowerCase();
      for (const [fragment, target] of remaining) {
        if (nameLower.includes(fragment) && (!target.brand || (p.brand ?? '').toUpperCase() === target.brand)) {
          found.push({ product: p, target });
          remaining.delete(fragment);
          console.log(`  ✓ Found: [${p.id}] ${p.brand} — ${p.name_en}`);
          console.log(`    Current image: ${p.image_url ?? '(none)'}`);
          console.log(`    New image:     ${target.imageUrl ?? '(null — will show placeholder)'}`);
        }
      }
    }

    page++;
    if (page <= totalPages) await sleep(150);
  }

  if (remaining.size > 0) {
    console.log('\n⚠️  Could not find:');
    for (const [fragment] of remaining) console.log(`  - "${fragment}"`);
  }

  if (found.length === 0) { console.log('\nNothing to patch.'); return; }

  console.log(`\n📝 Patching ${found.length} product(s)...\n`);
  let ok = 0, fail = 0;
  for (const { product, target } of found) {
    const success = await patchProduct(product.id, { image_url: target.imageUrl });
    if (success) {
      ok++;
      console.log(`  ✓ Patched: ${product.brand} — ${product.name_en}`);
    } else {
      fail++;
      console.log(`  ✗ Failed:  ${product.brand} — ${product.name_en}`);
    }
    await sleep(200);
  }

  console.log(`\n📊 Done: ${ok} patched, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
