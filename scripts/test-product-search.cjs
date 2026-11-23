const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/product-model.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports, require: () => ({}) });
const { createProductSearch } = moduleUnderTest.exports;
const products = [
  { id: 1, name: 'Impresión Láser A4', category: 'Impresiones', code: '0000012345', price: 1000 },
  { id: 2, name: 'Banner', category: 'Carteles', code: '000123', price: 5000 },
  { id: 3, name: 'Sticker adhesivo', category: 'Etiquetas', code: 'AB-12', price: 500 },
  { id: 4, name: 'Papel obra', category: 'Papelería', price: 100 },
];
const search = createProductSearch(products);
for (const [query, ids] of [
  ['impresion laser', [1]], ['impresiones a4', [1]], ['stickers', [3]],
  ['papeles', [4]], ['12345', [1]], ['00123', [2]], ['000123', [2, 1]],
  ['0000012345', [1]], ['ab-12', [3]], ['carteles', [2]],
  ['a', [2, 1, 4, 3]], ['', []], ['   ', []], ['inexistente', []],
]) assert.deepEqual(Array.from(search(query), product => product.id), ids, query);
assert.deepEqual(products.map(product => product.id), [1, 2, 3, 4], 'search must not reorder the source catalog');
const updated = products.map(product => product.id === 2 ? { ...product, name: 'Lona nueva', price: 7000 } : product);
assert.equal(createProductSearch(updated)('lona')[0].price, 7000, 'catalog refresh includes edited names/prices');
console.log('PASS indexed product search: accents, plurals, codes, five-digit suffixes, alphabetical order, empty results, immutable catalog and catalog refresh.');
