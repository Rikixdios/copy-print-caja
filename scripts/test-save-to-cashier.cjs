const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app/dashboard.tsx','utf8');
const save=source.slice(source.indexOf('  const saveSale ='),source.indexOf('  const editWorkOrder ='));
for(const role of ['admin','asesor'])for(const amount of [0,30000,100000]){
 let state={orders:[],workOrders:[],orderSequence:0};
 const context={role,saleNoteId:amount===30000?'note-id':undefined,user:'Diana',cashOpen:true,cart:[{id:1,name:'Banner',price:100000,quantity:1}],cartTotal:100000,customer:'Cliente',customerPhone:'',customerRuc:'',editingOrderId:null,editingWorkOrderId:null,store:state,currentStore:{current:state},orderCreationMoment:()=>({time:'12:00',date:'2026-10-20'}),nextOrderId:()=> 'CP-100',setStore:updater=>{state=updater(state)},clearSale:()=>{},setView:()=>{},hasDepositRequest:()=>amount>0&&amount<100000,toast:{success:()=>{},error:message=>{throw Error(message)}},Date};
 vm.createContext(context);vm.runInContext(ts.transpileModule(save+'\nglobalThis.saveSale=saveSale;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 assert.equal(context.saveSale({advisor:'Diana',invoice:'Sin factura',notes:''},amount?[{method:'Efectivo',amount}]:[],'guardar'),true);
 assert.equal(state.orders.length,1);assert.equal(state.workOrders.length,1);assert.equal(state.orders[0].id,state.workOrders[0].id);assert.equal(state.workOrders[0].sentToCashier,true);assert.equal(state.orders[0].total,100000);assert.equal(state.orders[0].status,'pendiente');assert(!state.orders[0].paymentRecords?.length);assert(!state.orders[0].payments?.length);
 assert.equal(state.orders[0].orderUid,context.saleNoteId); assert.equal(state.workOrders[0].orderUid,context.saleNoteId);
}
// Recover old unsent saved orders without duplicating existing cash orders or changing payments.
const migration=source.slice(source.indexOf('  const workOrders = savedWorkOrders.map'),source.indexOf('  return {\n    orderSequence:',source.indexOf('const normalizeStore')));
const paidRecord={amount:10000},savedWorkOrders=[{id:'missing',status:'pendiente',sentToCashier:false,paymentRecords:[paidRecord]},{id:'existing',status:'pendiente',sentToCashier:false},{id:'paid',status:'cobrado',sentToCashier:false},{id:'returned',status:'devuelto',sentToCashier:false},{id:'sent',status:'pendiente',sentToCashier:true}];
const context={savedWorkOrders,existingOrders:[{id:'existing'}]};vm.createContext(context);vm.runInContext(migration+'\nglobalThis.result={workOrders,forwarded};',context);assert.equal(context.result.forwarded.length,1);assert.equal(context.result.forwarded[0].id,'missing');assert.equal(context.result.forwarded[0].paymentRecords[0].amount,10000);
console.log('PASS: Guardar routes admin/advisor orders and full/partial/no proposed payment to cash without charging; old unsent orders recover without duplicates or changing payment history.');
