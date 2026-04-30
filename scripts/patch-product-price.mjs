/**
 * Directly insert a price for specific products by ID.
 * Use this for products whose weight_g is null or whose size doesn't
 * match any PRICE_TABLE entry in fill-prices.mjs.
 *
 * Run from meowlah-web directory:
 *   node scripts/patch-product-price.mjs
 *
 * Edit the TARGETS array below to add products to fix.
 */

const RAILWAY_URL = 'https://meowlah-production.up.railway.app';
const ADMIN_KEY   = 'meowlah-admin-secret-2024';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Edit this list ────────────────────────────────────────────────────────────
// id:       product UUID from the Railway DB
// priceMyr: indicative retail price in RM
// note:     optional reminder of why this is here
const TARGETS = [
  // Previously patched — kept for reference
  { id: '659584a4-83c8-4bbc-a05a-91137c8181db', priceMyr: 4.50,  note: 'Applaws Kitten Tin 70g (null weight_g)' },

  // Null weight_g products that can't be matched by weight lookup
  { id: 'e322aaea-8c58-467c-8b4c-40f9a2e121ed', priceMyr: 18.90, note: 'PAWFIT Catty Flossy Freeze Dried Topper' },
  { id: '1f9891c3-1106-49c0-bdfa-5aa4800bcf8f', priceMyr: 5.90,  note: '7o Chicken & Fish Oil Wet Cat Food' },
  { id: '89539a85-43e1-4a27-8910-43af4dd4a8c2', priceMyr: 65.00, note: 'Taste of the Wild Rocky Mountain 2KG/7KG' },
  { id: 'a6135cb6-327c-4a9f-91ec-8deded0e637e', priceMyr: 120.00,note: "Hill's Science Diet Adult (null weight)" },
  { id: 'ebe4ed21-1e28-4175-8c30-547576e9cfe9', priceMyr: 120.00,note: "Hill's Science Diet Hairball (null weight)" },
  { id: '828ab1ec-3fe7-4b90-97cd-75f407ab46e8', priceMyr: 120.00,note: 'Hills Prescription Diet W/D 1.5kg (null weight)' },
  { id: '5658576a-4a91-4fcf-bef6-6b903aef1935', priceMyr: 6.90,  note: 'Ishtar Creamy Cat Treats Stick' },
  { id: '66036b6a-72b3-472a-b372-eef7420b100a', priceMyr: 29.90, note: 'PETSEE ISHTAR Cat Stick Bundle 50pcs' },
  { id: '9b68294a-48f3-4f46-b795-70da2d333687', priceMyr: 9.90,  note: 'WANPY CREAMY 5×14g' },
  { id: '85254b5e-a2fa-4307-844e-5b1e39d65a29', priceMyr: 8.90,  note: 'PetCoCo Sniffly 400g (null weight)' },
  { id: 'dc4b7a1d-1f40-4ab1-8f49-feed479de178', priceMyr: 3.50,  note: 'Paw-cipes 16g Creamy Cat Stick' },
  { id: '982522c4-08f4-4991-8540-c7f609c1d912', priceMyr: 35.00, note: 'Sniffly Cat Dry Food (no weight in name)' },
  { id: 'f83c00ff-d874-4112-abc2-8f6db6282bd5', priceMyr: 12.90, note: 'Ikan Salmon freeze dried booster' },
  { id: 'd0d857a7-106c-4678-a533-122d3257617c', priceMyr: 14.90, note: 'WANPY Canned Chunks 375g (null weight_g)' },
  { id: '1538ccdd-5701-4f2c-868a-7595e65463a1', priceMyr: 6.90,  note: 'Health+ 85g wet (brand "Health+" not matching)' },
  { id: '27d33951-306e-4176-85c1-f4640348b75c', priceMyr: 55.90, note: 'ALPHA PETS MISHA 8kg reseller listing' },
  { id: '474e6fde-11dd-4a86-a3c5-eaa2214c22c0', priceMyr: 65.00, note: 'POODEE PETS Belif 2.5kg reseller' },
  { id: 'dba74ad4-2e2f-4468-a512-ba9aea79becd', priceMyr: 168.00,note: 'PAPAYA GROUP Carnilove 6kg reseller' },
];
// ─────────────────────────────────────────────────────────────────────────────

async function insertPrice(productId, priceMyr) {
  const r = await fetch(`${RAILWAY_URL}/admin/prices/${productId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
    body: JSON.stringify({ price_myr: priceMyr, platform: 'other' }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.log(`  ✗ HTTP ${r.status}: ${body.substring(0, 120)}`);
  }
  return r.ok;
}

async function main() {
  console.log('\n💰 MeowLah Direct Price Patcher\n');

  let ok = 0, fail = 0;
  for (const t of TARGETS) {
    process.stdout.write(`  [${t.id.substring(0, 8)}...] RM ${t.priceMyr}  ${t.note ?? ''}  `);
    const success = await insertPrice(t.id, t.priceMyr);
    console.log(success ? '✓ inserted' : '✗ failed');
    if (success) ok++; else fail++;
    await sleep(300);
  }

  console.log(`\n📊 Done: ${ok} inserted, ${fail} failed\n`);
}

main().catch(e => { console.error('\n💥 Fatal:', e); process.exit(1); });
