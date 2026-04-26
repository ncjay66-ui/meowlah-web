/**
 * Deactivate Bad/Dirty Products
 * --------------------------------
 * Finds and deactivates products that clearly don't belong:
 *   1. Brand is "UNKNOWN", "unknown", empty, or null
 *   2. name_en contains non-Latin characters (Bengali, Arabic, Chinese, Thai, etc.)
 *   3. name_en is empty or null
 *
 * Run from meowlah-web directory:
 *   node scripts/deactivate-bad-products.mjs
 *
 * Options:
 *   DRY_RUN=1    Show what would be deactivated without touching DB
 */

const RAILWAY_URL  = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY    = 'meowlah-admin-secret-2024';
const PAGE_SIZE    = 100;
const DRY_RUN      = process.env.DRY_RUN === '1';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Detection helpers ─────────────────────────────────────────────────────────

/** Returns true if string contains non-Latin script characters */
function hasNonLatinScript(text) {
  if (!text) return false;
  // Matches: Bengali, Arabic, Hebrew, Devanagari, Thai, CJK, Cyrillic, Hangul, etc.
  return /[\u0080-\u024F\u0370-\u03FF\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F\u1000-\u109F\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(text);
}

/** Returns true if this product is clearly bad data */
function isBadProduct(p) {
  const brand  = (p.brand ?? '').trim();
  const nameEn = (p.name_en ?? '').trim();

  // Bad brand
  if (!brand || brand.toLowerCase() === 'unknown') return true;

  // Non-Latin characters in the English name
  if (hasNonLatinScript(nameEn)) return true;

  // Empty English name
  if (!nameEn) return true;

  return false;
}

// ── Railway helpers ───────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧹 MeowLah Bad Product Cleaner`);
  console.log(`   DryRun: ${DRY_RUN}\n`);

  // Collect all bad products
  console.log('📋 Scanning all active products...');
  let page = 1, totalPages = 1;
  const bad = [];

  while (page <= totalPages) {
    const data = await fetchPage(page);
    const actualSize = data.page_size ?? PAGE_SIZE;
    totalPages = Math.ceil((data.total ?? 0) / actualSize);
    for (const p of data.items ?? []) {
      if (isBadProduct(p)) bad.push(p);
    }
    process.stdout.write(`\r  Page ${page}/${totalPages} — ${bad.length} bad products found`);
    page++;
    await sleep(150);
  }

  console.log(`\n\n❌ Found ${bad.length} bad products\n`);

  if (!bad.length) { console.log('Nothing to clean!'); return; }

  // Show breakdown before acting
  const byReason = { unknown_brand: 0, non_latin: 0, empty_name: 0 };
  for (const p of bad) {
    const brand  = (p.brand ?? '').trim();
    const nameEn = (p.name_en ?? '').trim();
    if (!brand || brand.toLowerCase() === 'unknown') byReason.unknown_brand++;
    else if (hasNonLatinScript(nameEn)) byReason.non_latin++;
    else byReason.empty_name++;
  }

  console.log('Breakdown:');
  console.log(`  Unknown/empty brand:  ${byReason.unknown_brand}`);
  console.log(`  Non-Latin name_en:    ${byReason.non_latin}`);
  console.log(`  Empty name_en:        ${byReason.empty_name}`);
  console.log('');

  // Sample: show first 20
  console.log('Sample (first 20):');
  for (const p of bad.slice(0, 20)) {
    console.log(`  [${p.brand ?? '—'}] ${(p.name_en ?? '(empty)').substring(0, 60)}`);
  }
  if (bad.length > 20) console.log(`  ... and ${bad.length - 20} more`);
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN — no changes made. Remove DRY_RUN=1 to deactivate.');
    return;
  }

  // Deactivate
  console.log('🔴 Deactivating...');
  let ok = 0, fail = 0;

  for (let i = 0; i < bad.length; i++) {
    const p = bad[i];
    process.stdout.write(`\r  [${i+1}/${bad.length}] ${(p.brand ?? '—').padEnd(20)} ${(p.name_en ?? '').substring(0, 35).padEnd(35)} `);
    const success = await deactivate(p.id);
    if (success) { ok++; process.stdout.write('✓'); }
    else          { fail++; process.stdout.write('✗'); }
    await sleep(200);
  }

  console.log(`\n\n✅ Done: ${ok} deactivated, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥', e); process.exit(1); });
