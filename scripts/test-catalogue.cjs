const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function compile(file, requires={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('module','exports','require',js)(module,module.exports,id=>Object.hasOwn(requires,id)?requires[id]:require(id));return module.exports;}
const library=JSON.parse(fs.readFileSync('src/data/product-library.json','utf8'));
const market=JSON.parse(fs.readFileSync('src/data/malaysia-products.json','utf8'));
const supplies=JSON.parse(fs.readFileSync('src/data/cat-supplies.json','utf8'));
const shopping=compile('src/lib/shopping.ts');
const malaysia=compile('src/lib/malaysia.ts',{'@/data/malaysia-products.json':market,'@/data/cat-supplies.json':supplies});
const catalogue=compile('src/lib/catalogue.ts',{'@/data/product-library.json':library,'./malaysia':malaysia,'./shopping':shopping});
assert.equal(new Set(catalogue.catalogueProducts.map(p=>p.id)).size,catalogue.catalogueProducts.length);
assert.ok(catalogue.catalogueProducts.length < library.length+market.length+supplies.length,'duplicates and products missing affiliate offers must be removed');
assert.ok(catalogue.catalogueProducts.every(p=>p.image_url && fs.existsSync(`public${p.image_url}`)), 'every displayed product image must exist locally');
assert.ok(catalogue.catalogueProducts.every(p=>shopping.merchantLink(p,'shopee')?.affiliate || shopping.merchantLink(p,'lazada')?.affiliate), 'every displayed product must have at least one valid affiliate offer');
assert.ok(supplies.every(p=>p.species==='cat'),'non-food supplies must be explicitly cat-only');
assert.ok(catalogue.catalogueProducts.every(p=>['wet','dry','freeze_dried','treat','supplement','toys','litter','litter_box','scratchers','carrier'].includes(p.category)));
assert.ok(!catalogue.catalogueProducts.some(p=>p.id==='my-catit-magic-blue'),'observed out-of-stock listings must be held out');
const noAffiliate=market.filter(p=>!shopping.merchantLink(p,'shopee')?.affiliate&&!shopping.merchantLink(p,'lazada')?.affiliate);
console.log(`PASS: ${catalogue.catalogueProducts.length} displayed products all have local images and valid affiliate offers; ${noAffiliate.length} direct-only MY products plus observed out-of-stock items are held out; ${supplies.length} cat-only supplies checked.`);
