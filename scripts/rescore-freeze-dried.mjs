/**
 * Rescore all freeze_dried products with force=true
 * so the new moisture_adequacy exemption takes effect.
 *
 * Run from meowlah-web directory:
 *   node scripts/rescore-freeze-dried.mjs
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';
const PAGE_SIZE   = 200;
const DELAY_MS    = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n❄️  Rescore Freeze-Dried Products\n');

  // Fetch all freeze_dried products
  const r = await fetch(
    `${RAILWAY_URL}/products?category=freeze_dried&active_only=true&limit=${PAGE_SIZE}`,
    { headers: { 'X-Admin-Key': ADMIN_KEY }, signal: AbortSignal.timeout(15000) }
  );
  const data = await r.json();
  const products = data.items ?? [];
  console.log(`Found ${products.length} freeze_dried products\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`\r[${i+1}/${products.length}] ${(p.brand ?? '').padEnd(20)} ${(p.name_en ?? '').substring(0, 35).padEnd(35)} `);

    try {
      const res = await fetch(
        `${RAILWAY_URL}/score/${p.id}?force=true`,
        {
          method: 'GET',
          headers: { 'X-Admin-Key': ADMIN_KEY },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (res.ok) {
        const d = await res.json();
        const score = d?.report?.final_score ?? '?';
        const grade = d?.report?.grade ?? '?';
        process.stdout.write(`✓ ${grade} ${score}`);
        ok++;
      } else {
        process.stdout.write(`✗ HTTP ${res.status}`);
        fail++;
      }
    } catch (e) {
      process.stdout.write(`✗ ${e.message}`);
      fail++;
    }

    if (i < products.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n\n✅ Done: ${ok} rescored, ${fail} failed\n`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });
