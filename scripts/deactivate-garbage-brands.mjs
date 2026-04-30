/**
 * Deactivate products whose brand/name clearly indicates garbage scraped data
 * (Shopee listing titles used as brand names, emoji-filled brands, etc.)
 *
 * Run from meowlah-web directory:
 *   node scripts/deactivate-garbage-brands.mjs
 *
 * Options:
 *   DRY_RUN=1   Print what would be deactivated without actually doing it
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DRY_RUN     = process.env.DRY_RUN === '1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Brand names that are clearly garbage (Shopee listing titles, promo text, etc.)
const GARBAGE_BRANDS_EXACT = new Set([
  'unknown', 'snacks', 'carton', 'offer', 'repack', 'freeze', 'bundle',
  'ready', 'family', '2026', 'harga', 'jiang', 'beast', 'aaoo',
]);

// Brand name patterns that indicate garbage data
const GARBAGE_BRAND_PATTERNS = [
  /\p{Emoji}/u,              // contains any emoji
  /[\[\]【】〔〕]/,           // contains Chinese/Shopee bracket chars
  /\w\s*\|\s*\w.*\w\s*\|/,  // multiple pipes (like "XUESHANZHIXING|Freeze-dried|...")
  /^\d{4}$/,                 // 4-digit year as brand (e.g. "2026")
  /\(http/,                  // markdown links embedded in brand name
  /^[\w\s]+\|[\w\s]{10,}/,   // pipe followed by long description (Shopee title used as brand)
];

function isGarbageBrand(brand) {
  if (!brand) return true;
  const lower = brand.toLowerCase().trim();
  if (GARBAGE_BRANDS_EXACT.has(lower)) return true;
  if (GARBAGE_BRAND_PATTERNS.some(p => p.test(brand))) return true;
  return false;
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
  console.log(`\n🗑️  MeowLah Garbage Brand Deactivator`);
  console.log(`   DryRun: ${DRY_RUN}\n`);

  let page = 1, totalPages = 1;
  const toDeactivate = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);

    for (const p of data.items ?? []) {
      if (isGarbageBrand(p.brand)) {
        toDeactivate.push(p);
      }
    }

    process.stdout.write(`\r  Page ${page}/${totalPages} — found ${toDeactivate.length} garbage products`);
    page++;
    if (page <= totalPages) await sleep(150);
  }

  console.log(`\n\n🔍 Found ${toDeactivate.length} garbage-brand products:\n`);
  toDeactivate.forEach(p => console.log(`  [${p.id}] brand="${p.brand}" — ${(p.name_en ?? '').substring(0, 60)}`));

  if (!toDeactivate.length) { console.log('Nothing to deactivate!'); return; }

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
      console.log(`  ✓ Deactivated: "${p.brand}" — ${(p.name_en ?? '').substring(0, 50)}`);
    } else {
      fail++;
      console.log(`  ✗ Failed:      "${p.brand}" — ${(p.name_en ?? '').substring(0, 50)}`);
    }
    await sleep(200);
  }

  console.log(`\n📊 Done: ${ok} deactivated, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
