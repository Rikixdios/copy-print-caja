const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm'), assert = require('node:assert/strict');
const cache = {};
function load(file) {
  file = path.resolve(file);
  if (cache[file]) return cache[file].exports;
  const mod = cache[file] = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module: mod, exports: mod.exports, require: name => load(path.resolve(path.dirname(file), name)),
  });
  return mod.exports;
}
const { createCashOrderSearch } = load('app/cash-order-search');
const base = { total: 100000, status: 'pendiente', productionStatus: 'Pendiente', items: [] };
const pending = [
  {...base, id:'ORD-01234', customer:'María López', phone:'(0981) 123-456', ruc:'1234567-8'},
  {...base, id:'ORD-05678', customer:'Ana González'},
];
const pickup = {...base, id:'ORD-09000', customer:'Retiro María', status:'cobrado', productionStatus:'Listo', payments:[{method:'Efectivo',amount:100000}]};
const excluded = [
  {...pickup, id:'entregado', productionStatus:'Entregado'},
  {...pickup, id:'devuelto', status:'devuelto'},
  {...pickup, id:'resumen', importedSummary:{paid:100000}},
  {...pickup, id:'cobro', collectionEntry:true},
  {...base, id:'sin-pagar', customer:'María sin saldo pagado'},
];
const all = [...pending, pickup, ...excluded];
const search = createCashOrderSearch(pending, all);
const ids = query => Array.from(search(query), entry => entry.order.id);
assert.deepEqual(ids(''), pending.map(order => order.id));
assert.deepEqual(ids('   '), pending.map(order => order.id));
assert.deepEqual(ids('maria'), ['ORD-01234','ORD-09000']);
assert.deepEqual(ids('GONZÁLEZ'), ['ORD-05678']);
assert.deepEqual(ids('0981123456'), ['ORD-01234']);
assert.deepEqual(ids('12345678'), ['ORD-01234']);
assert.deepEqual(ids('05678'), ['ORD-05678']);
assert.equal(search('retiro')[0].pickup, true);
assert.equal(search('lopez')[0].pickup, false);
assert.equal(search('no existe').length, 0);
let reads = 0;
const large = Array.from({length:10000}, (_,i) => ({...base,id:`ORD-${i}`,get customer(){reads++;return `Cliente ${i}`;}}));
const indexed = createCashOrderSearch(large, large);
const readsAfterIndex = reads;
for(const query of ['C','Cl','Cli','Clie','Clien','Client','Cliente','Cliente 9']) indexed(query);
assert.equal(reads, readsAfterIndex, 'Typing must reuse the index, without rereading customer fields');
const updated = createCashOrderSearch(pending, [{...pickup,productionStatus:'Entregado'}]);
assert.equal(updated('retiro').length, 0, 'A data update must remove delivered orders from search');
assert.equal(createCashOrderSearch([],[])('a').length,0);
console.log('PASS cash search: accents, phone/RUC, IDs, paid pickups, exclusions, updated data and reuse across 10,000 orders.');
