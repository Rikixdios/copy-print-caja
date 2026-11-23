const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function load(file, requireFn) {
  const context = { exports: {}, require: requireFn };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const workflow = load('app/order-workflow.ts');
const pickup = load('app/order-pickup.ts', () => workflow);
const confirmation = { by: 'Cajera', date: '2026-10-28', time: '13:45:00' };
const order = { id: 'CP-125', customer: 'María', advisor: 'Aide', date: '2026-10-20', createdAt: '09:00', total: 100000, status: 'cobrado', productionStatus: 'Listo', items: [{ id: 1, name: 'Tarjetas', quantity: 1, price: 100000 }], paymentRecords: [{ id: 'pago', date: '2026-10-20', time: '09:05', amount: 100000, payments: [{ method: 'Efectivo', amount: 100000 }], cashier: 'Cajera' }], payments: [{ method: 'Efectivo', amount: 100000 }] };
const original = JSON.stringify(order);
assert.equal(pickup.isPickupOrder(order), true);
assert.equal(pickup.pickupBlockReason(order), null);
const delivered = pickup.confirmOrderPickup(order, confirmation);
assert.equal(delivered.productionStatus, 'Entregado');
assert.equal(delivered.deliveryConfirmation, confirmation);
assert.equal(JSON.stringify(order), original);
for (const field of ['status', 'total', 'payments', 'paymentRecords', 'date', 'createdAt', 'items']) assert.equal(delivered[field], order[field]);
assert.equal(workflow.paidAmount(delivered), 100000);
assert.throws(() => pickup.confirmOrderPickup(delivered, confirmation), /ya fue entregado/);
assert.throws(() => pickup.confirmOrderPickup({ ...order, productionStatus: 'En proceso' }, confirmation), /no está listo/);
assert.throws(() => pickup.confirmOrderPickup({ ...order, status: 'pendiente', paymentRecords: [{ amount: 50000 }] }, confirmation), /saldo/);
assert.throws(() => pickup.confirmOrderPickup({ ...order, status: 'devuelto' }, confirmation), /no está disponible/);
assert.throws(() => pickup.confirmOrderPickup({ ...order, total: NaN }, confirmation), /saldo/);
assert.equal(pickup.isPickupOrder({ ...order, importedSummary: { paid: 100000 } }), false);
assert.equal(pickup.isPickupOrder({ ...order, collectionEntry: true }), false);
// A fully paid order saved before final cashier closure is also eligible.
assert.equal(pickup.pickupBlockReason({ ...order, status: 'pendiente' }), null);
console.log('PASS: prepaid order stays findable; delivery records cashier/time, preserves original collections, rejects duplicate delivery, unpaid and unfinished work.');
// Exercise the actual cashier callback against a refreshed store, including its saved-work copy.
const source = fs.readFileSync('app/dashboard.tsx', 'utf8');
const callback = source.slice(source.indexOf('  const confirmPickup ='), source.indexOf('  const orderHistory ='));
let state = { orders: [order], workOrders: [{ ...order, progress: 'Listo' }], cashMovements: [{ id: 1, amount: 0, type: 'cierre' }] };
const ctx = { role: 'cajera', user: 'Laura', businessMoment: () => ({ date: '2026-10-28', time: '13:45' }), confirmOrderPickup: pickup.confirmOrderPickup, setStore: fn => { state = fn(state); }, toast: { success() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(ts.transpileModule(callback + '\nglobalThis.confirm = confirmPickup;', {}).outputText, ctx);
const beforeCash = JSON.stringify(state.cashMovements);
assert.equal(ctx.confirm(order), true);
assert.equal(state.orders[0].productionStatus, 'Entregado');
assert.equal(state.workOrders[0].productionStatus, 'Entregado');
assert.equal(state.workOrders[0].deliveryConfirmation.by, 'Laura');
assert.equal(JSON.stringify(state.cashMovements), beforeCash);
assert.equal(state.orders[0].paymentRecords, order.paymentRecords);
assert.equal(ctx.confirm(order), false);
state = { ...state, orders: [{ ...order, productionStatus: 'En proceso' }] };
assert.equal(ctx.confirm(order), false); // Stale ready screen cannot deliver unfinished work.
state = { ...state, orders: [{ ...order, paymentRecords: [{ amount: 50000 }] }] };
assert.equal(ctx.confirm(order), false); // Stale zero-balance screen rechecks the latest payment.
ctx.role = 'asesor';
ctx.user = 'Ricardo';
const otherAdvisorOrder = { ...order, advisor: 'Tahir' };
state = { ...state, orders: [otherAdvisorOrder] };
assert.equal(ctx.confirm(otherAdvisorOrder), true);
assert.equal(state.orders[0].deliveryConfirmation.by, 'Ricardo');
assert.equal(state.orders[0].advisor, 'Tahir');
assert.equal(state.orders[0].paymentRecords, order.paymentRecords);
assert.equal(ctx.confirm(otherAdvisorOrder), false);
ctx.role = 'gerencia';
state = { ...state, orders: [otherAdvisorOrder] };
assert.equal(ctx.confirm(otherAdvisorOrder), false);
console.log('PASS: cashier callback rechecks current order, updates both copies, works with closed cash, and leaves cash movements/payment dates unchanged.');
