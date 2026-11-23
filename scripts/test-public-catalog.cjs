const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm'), assert = require('node:assert/strict');
let row;
const db = {select: () => ({from: () => ({where: () => ({limit: async () => row ? [row] : []})})})};
const cache = {};
function load(file) {
  if (cache[file]) return cache[file].exports;
  const mod = {exports: {}}; cache[file] = mod;
  const code = ts.transpileModule(fs.readFileSync(file + '.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const req = name => name === 'drizzle-orm' ? {eq: () => true} : name.endsWith('/db/schema') ? {appState: {id: 'id', payload: 'payload', updatedAt: 'updatedAt'}} : name.endsWith('/db') ? {getDb: () => db} : load(require('node:path').resolve(require('node:path').dirname(file), name));
  vm.runInNewContext(code, {module: mod, exports: mod.exports, require: req, Response, Request, URL}); return mod.exports;
}
(async () => {
  const html = load('app/catalogo/route'), json = load('app/api/catalogo/route');
  const product = {id: 1, code: '001', name: '<script>alert(1)</script>', category: 'Impresiones', price: 5000, purchasePrice: 1234, stockId: 'private-stock'};
  row = {payload: JSON.stringify({products: [product], customers: [{name: 'PRIVATE_CUSTOMER'}], orders: ['PRIVATE_ORDER'], creditAccounts: ['PRIVATE_DEBT']}), updatedAt: '2026-11-18 13:00:00'};
  const response = await json.GET(); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json(); assert.equal(data.total, 1); assert.equal(data.productos[0].precio, 5000); assert.deepEqual(Object.keys(data.productos[0]).sort(), ['categoria', 'codigo', 'nombre', 'precio']);
  const page = await (await html.GET(new Request('https://example.com/catalogo'))).text(); assert(page.includes('&lt;script&gt;')); assert(!page.includes('<script>alert')); for (const secret of ['PRIVATE_CUSTOMER','PRIVATE_ORDER','PRIVATE_DEBT','purchasePrice','private-stock','1234']) assert(!page.includes(secret));
  row.payload = JSON.stringify({products: [{...product, price: 7000}]});
  assert.equal((await (await json.GET()).json()).productos[0].precio, 7000);
  const text = await (await html.GET(new Request('https://example.com/catalogo?formato=txt'))).text(); assert(text.includes('7000 PYG')); assert(!text.includes('purchasePrice'));
  row = undefined; assert.equal((await json.GET()).status, 503); assert.equal((await html.GET(new Request('https://example.com/catalogo'))).status, 503);
  row = {payload: JSON.stringify({products: [{...product, price: 'bad'}]})}; assert.equal((await json.GET()).status, 503);
  console.log('Public catalog: anonymous read, live price updates, escaping, private-field isolation and unavailable-data checks passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
