const assert = require('node:assert/strict');
const fs = require('node:fs');
const market = JSON.parse(fs.readFileSync('src/data/malaysia-products.json', 'utf8'));
const library = JSON.parse(fs.readFileSync('src/data/product-library.json', 'utf8'));
const featured = market.find(item => item.id === 'f9143d81-5e07-4a56-a7a2-f5fce61802a4');
assert.ok(featured, 'Applaws tuna and prawn SKU exists in Malaysia picks');
assert.equal(featured.food_purpose, 'complementary');
assert.equal(featured.grade, null);
assert.equal(featured.final_score, null);
assert.equal(featured.review.halal_status, 'unverified');
const applaws = library.filter(item => item.brand === 'Applaws');
assert.equal(applaws.length, 4);
for (const item of applaws) {
  assert.equal(item.grade, null, 'Unsupported score cleared for ' + item.name_en);
  assert.equal(item.final_score, null, 'Unsupported score cleared for ' + item.name_en);
}
console.log('PASS: All 4 Applaws catalogue cards have no unsupported MeowLah score; the MY-pick SKU remains halal-unverified.');
