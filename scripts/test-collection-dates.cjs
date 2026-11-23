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
const {businessMoment, orderCreationMoment, collectionMoment, creditPaymentMoment} = load('app/business-time');
const {applyCreditPayment, removeCreditPayment, reconcileCreditPayments, creditAccountTotals} = load('app/business-model');
const {managementCollections, managementSummary} = load('app/management-model');
const {datedCashRecords} = load('app/order-identifiers');
const plain = value => JSON.parse(JSON.stringify(value));

// UTC is already tomorrow while Paraguay is still today.
assert.deepEqual(plain(businessMoment(new Date('2026-10-14T02:59:59Z'))), {date: '2026-10-13', time: '23:59:59'});
assert.deepEqual(plain(businessMoment(new Date('2026-10-14T03:00:00Z'))), {date: '2026-10-14', time: '00:00:00'});
const order = {id: 'ORD-00100', creditAccountId: 'account', customer: 'Cliente', advisor: 'Ricardo', date: '2026-10-13', createdAt: '10:12:34', total: 100, status: 'pendiente', items: [], payments: [], paymentRecords: []};
assert.deepEqual(plain(orderCreationMoment(order, new Date('2026-10-14T15:00:00Z'))), {date: '2026-10-13', time: '10:12:34'});
assert.deepEqual(plain(orderCreationMoment(undefined, new Date('2026-10-14T15:00:00Z'))), {date: '2026-10-14', time: '12:00:00'});

// Yesterday's order: deposit today and balance tomorrow, each in its own cash day.
const deposit = {id: 'deposit', accountId: 'account', ...collectionMoment(undefined, new Date('2026-10-14T15:20:30Z')), methods: [{method: 'Efectivo', amount: 40}], cashier: 'Admi'};
const first = applyCreditPayment([order], deposit);
const balance = {id: 'balance', accountId: 'account', ...collectionMoment(undefined, new Date('2026-10-15T16:21:31Z')), methods: [{method: 'Transferencia', amount: 60}], cashier: 'Admi'};
const second = applyCreditPayment(first.orders, balance);
const saved = second.orders[0];
assert.equal(saved.date, order.date);
assert.equal(saved.createdAt, order.createdAt);
assert.deepEqual(plain(datedCashRecords(saved).map(record => [record.date, record.time, record.amount])), [['2026-10-14', '12:20:30', 40], ['2026-10-15', '13:21:31', 60]]);
const collections = managementCollections(second.orders, [first.payment, second.payment]);
assert.equal(managementSummary(second.orders, collections, '2026-10-13', '2026-10-13').collected, 0);
assert.equal(managementSummary(second.orders, collections, '2026-10-14', '2026-10-14').collected, 40);
assert.equal(managementSummary(second.orders, collections, '2026-10-15', '2026-10-15').collected, 60);
assert.deepEqual(plain(collectionMoment(deposit, new Date('2026-10-16T15:00:00Z'))), {date: deposit.date, time: deposit.time});
console.log('PASS: Paraguay midnight, original order timestamp, separate deposit/balance cash dates, credit allocations and management totals.');

// Backdated credit payments retain their selected day through allocation and reports.
const historical = {...deposit, id: 'august', ...creditPaymentMoment({date: '2026-08-12', time: '09:00:00'}, false, new Date('2026-11-17T16:30:00Z'))};
assert.equal(historical.date, '2026-08-12');
assert.equal(historical.time, '13:30:00');
const august = applyCreditPayment([order], historical);
assert.equal(august.payment.date, '2026-08-12');
assert.equal(datedCashRecords(august.orders[0])[0].date, '2026-08-12');
const augustCollections = managementCollections(august.orders, [august.payment]);
assert.equal(managementSummary(august.orders, augustCollections, '2026-08-01', '2026-08-31').collected, 40);
assert.equal(managementSummary(august.orders, augustCollections, '2026-11-17', '2026-11-17').collected, 0);
const correction = {...historical, ...creditPaymentMoment({...historical, date: '2026-08-13'}, true)};
const corrected = applyCreditPayment(august.orders, correction, august.payment);
assert.equal(corrected.orders[0].paymentRecords.length, 1);
assert.equal(corrected.orders[0].paymentRecords[0].date, '2026-08-13');
assert.throws(() => creditPaymentMoment({...historical, date: ''}));
assert.throws(() => creditPaymentMoment({...historical, date: '2026-02-30'}));
console.log('PASS: August payment date, confirmation time, historical reporting, date correction without duplicate payment, invalid dates.');

const removed = removeCreditPayment(second.orders, first.payment);
assert.equal(creditAccountTotals(removed, 'account', [second.payment]).balance, 40);
assert.equal(removed[0].paymentRecords.length, 1);
assert.equal(removed[0].paymentRecords[0].date, second.payment.date);
assert.equal(reconcileCreditPayments([first.payment, second.payment], []).length, 0);
console.log('PASS: removing a payment restores its debt and preserves other payments; deleting debt removes its payment allocations.');

const imported = {...august.payment, imported:true, unallocatedAmount:12, amount:52, methods:[{method:'No especificado',amount:52}]};
const importedCorrection = applyCreditPayment(august.orders, {...imported,date:'2026-08-14'}, imported);
assert.equal(importedCorrection.payment.unallocatedAmount,12);
assert.equal(importedCorrection.payment.amount,52);
assert.deepEqual(plain(importedCorrection.payment.allocations),plain(imported.allocations));
assert.equal(importedCorrection.orders[0].paymentRecords[0].date,'2026-08-14');
console.log('PASS: imported payment date correction preserves applications and unallocated credit.');
