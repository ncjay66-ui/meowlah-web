/**
 * Clear Shopee/Lazada CDN image URLs from all active products.
 * These URLs pass local HEAD checks but fail on the server-side proxy.
 * Run this, then run audit-images.mjs to replace with working images.
 *
 *   node scripts/clear-cdn-images.mjs
 *   DRY_RUN=1 node scripts/clear-cdn-images.mjs
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 100;
const DRY_RUN     = process.env.DRY_RUN === '1';

const CDN_BLOCKED_PATTERNS = [
  'susercontent.com', 'shopee.com.my', 'shopeemobile.com',
  'lazcdn.com', 'slatic.net', 'alicdn.com', 'lzd-img',
];
function isCdnBlocked(url) {
  if (!url) return false;
  return CDN_BLOCKED_PATTERNS.some(p => url.toLowerCase().includes(p));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  console.log(`\n🧹 Clear CDN-blocked image URLs  DryRun: ${DRY_RUN}\n`);

  let page = 1, totalPages = 1;
  const toFix = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);
    for (const p of data.items ?? []) {
      if (isCdnBlocked(p.image_url)) toFix.push(p);
    }
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${toFix.length} CDN-blocked found`);
    page++;
    if (page <= totalPages) await sleep(150);
  }

  console.log(`\n\n  Found ${toFix.length} products with Shopee/Lazada CDN image URLs\n`);
  if (!toFix.length) { console.log('Nothing to do!'); return; }

  // Sample
  for (const p of toFix.slice(0, 10)) {
    console.log(`  [${p.brand}] ${(p.name_en ?? '').substring(0, 40)}`);
    console.log(`     ${(p.image_url ?? '').substring(0, 80)}`);
  }
  if (toFix.length > 10) console.log(`  ... and ${toFix.length - 10} more\n`);

  if (DRY_RUN) { console.log('\nDRY RUN — no changes. Remove DRY_RUN=1 to clear.'); return; }

  console.log('\nClearing...');
  let ok = 0, fail = 0;
  for (let i = 0; i < toFix.length; i++) {
    const p = toFix[i];
    process.stdout.write(`\r  [${i+1}/${toFix.length}] ${(p.brand ?? '').padEnd(20)}`);
    const success = await patchProduct(p.id, { image_url: null });
    if (success) ok++; else fail++;
    await sleep(100);
  }

  console.log(`\n\n✅ Cleared ${ok} CDN URLs (${fail} failed)`);
  console.log('Now run: node scripts/audit-images.mjs');
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
