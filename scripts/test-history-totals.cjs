const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm'), assert = require('node:assert/strict');
const cache = {};
function load(file) {
  file = path.resolve(file);
  if (cache[file]) return cache[file].exports;
  const module = cache[file] = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(file + '.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, {module, exports: module.exports, require: name => load(path.resolve(path.dirname(file), name)), Date, Intl});
  return module.exports;
}
const {historyTotals} = load('app/history-totals');
const plain = value => JSON.parse(JSON.stringify(value));
const deposit = {status:'pendiente',total:460000,payments:[{method:'Transferencia',amount:230000}],paymentRecords:[{amount:230000,payments:[{method:'Transferencia',amount:230000}]}]};
const paid = {status:'cobrado',total:401000,payments:[{method:'Efectivo',amount:262000},{method:'QR',amount:139000}]};
const another = {status:'pendiente',total:100000,payments:[],paymentRecords:[{amount:50000,payments:[{method:'Transferencia',amount:50000}]}]};
const proposed = {status:'pendiente',total:700000,requestedPayments:[{method:'Transferencia',amount:700000}]};
assert.deepEqual(plain(historyTotals([deposit],true)),{total:230000,methods:{Transferencia:230000}});
assert.deepEqual(plain(historyTotals([deposit,paid,another,proposed],true)),{total:681000,methods:{Transferencia:280000,Efectivo:262000,QR:139000}});
// A fully paid order with multiple installments counts each confirmed record once.
const completed={...deposit,status:'cobrado',paymentRecords:[...deposit.paymentRecords,{amount:230000,payments:[{method:'Efectivo',amount:230000}]}]};
assert.equal(historyTotals([completed],true).total,460000);
assert.equal(historyTotals([{status:'guardado',total:100000,requestedPayments:[{method:'Efectivo',amount:100000}]}],true).total,0);
// The admin cash row contains a single installment, even with parent records attached.
const cashRow={...completed,collectionEntry:true,total:230000,payments:[{method:'Transferencia',amount:230000}]};
assert.deepEqual(plain(historyTotals([cashRow])),{total:230000,methods:{Transferencia:230000}});
assert.equal(historyTotals([deposit]).total,0);
assert.equal(historyTotals([{...paid,status:'devuelto',refund:1000}]).total,400000);
console.log('PASS: partial transfer, all confirmed installments, no predicted payments or double counting, original cash totals.');
