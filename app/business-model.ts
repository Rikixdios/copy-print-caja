import { paidAmount } from './order-workflow';
export type BusinessItem = {stockId?:string; id:number; name:string; quantity:number; price:number; category:string };
export type BusinessPaymentMethod = { method:string; amount:number; received?:number };
export type CreditAccount = { id:string; name:string; ruc:string; phone:string; createdDate:string };
export type CreditPayment = {imported?:boolean;unallocatedAmount?:number; id:string; accountId:string; date:string; time:string; amount:number; methods:BusinessPaymentMethod[]; cashier:string; payer:string; note:string; targetCode?:string; allocations:{orderId:string;recordId:string;amount:number}[] };
export type Quote = { id:string; number:string; customer:string; phone:string; ruc:string; advisor:string; date:string; validUntil:string; items:BusinessItem[]; total:number; deliveryTerms:string; notes:string; status:'Borrador'|'Enviado'|'Aprobado'|'Rechazado'; orderId?:string; shareId?:string };
export type CreditOrder = {importedDeclaredPaid?:number;importedPaidAdjustment?:number;importCompleteFingerprint?:string; importedSummary?:{paid:number;movements:number;balance:number}; id:string; creditAccountId?:string; creditCode?:string; withdrawnBy?:string; invoiceReference?:string; dueDate?:string; customer:string; phone?:string; ruc?:string; advisor:string; date?:string; createdAt:string; total:number; items:BusinessItem[]; status:'pendiente'|'cobrado'|'devuelto'; payments?:BusinessPaymentMethod[]; requestedPayments?:BusinessPaymentMethod[]; cashier?:string; paymentRecords?:{id:string;date:string;time:string;amount:number;kind:'Seña'|'Abono'|'Pago de saldo'|'Cobro completo';payments:BusinessPaymentMethod[];cashier:string}[] };
export const itemTotal = (items:BusinessItem[]) => items.reduce((sum,item)=>sum+item.price*item.quantity,0);
export const validItems = (items:BusinessItem[]) => items.length>0&&items.every(item=>item.name.trim()&&Number.isFinite(item.quantity)&&item.quantity>0&&Number.isFinite(item.price)&&item.price>=0)&&itemTotal(items)>0;
export function creditAccountTotals(orders:CreditOrder[],accountId:string,payments:CreditPayment[]=[]){
 const active=orders.filter(order=>order.creditAccountId===accountId&&order.status!=='devuelto');
 const unallocated=payments.filter(payment=>payment.accountId===accountId).reduce((sum,payment)=>sum+(payment.unallocatedAmount||0),0);
 return active.reduce((sum,order)=>({total:sum.total+order.total,paid:sum.paid+paidAmount(order),balance:sum.balance+order.total-paidAmount(order)}),{total:0,paid:unallocated,balance:-unallocated});
}
function withoutPayment<T extends CreditOrder>(orders:T[],payment?:CreditPayment):T[]{
 if(!payment)return orders;
 const ids=new Set(payment.allocations.map(allocation=>allocation.recordId));
 return orders.map(order=>{
  if(!order.paymentRecords?.some(record=>ids.has(record.id)))return order;
  const records=order.paymentRecords.filter(record=>!ids.has(record.id));
  const paid=records.reduce((sum,record)=>sum+record.amount,0);
  return {...order,paymentRecords:records,payments:records.flatMap(record=>record.payments),status:paid>=order.total?'cobrado':'pendiente'};
 });
}
export function applyCreditPayment<T extends CreditOrder>(orders:T[],draft:Omit<CreditPayment,'amount'|'allocations'>,previous?:CreditPayment){
 // A date or payer correction preserves the original applications, including imported balances.
 if(previous&&draft.targetCode===previous.targetCode&&draft.methods.length===previous.methods.length&&draft.methods.every((method,i)=>method.method===previous.methods[i].method&&method.amount===(previous.methods[i].received??previous.methods[i].amount))){
  const ids=new Set(previous.allocations.map(allocation=>allocation.recordId));
  return {orders:orders.map(order=>({...order,paymentRecords:order.paymentRecords?.map(record=>ids.has(record.id)?{...record,date:draft.date,time:draft.time,cashier:draft.cashier}:record)})),payment:{...previous,...draft,methods:previous.methods,amount:previous.amount,allocations:previous.allocations},change:previous.methods.reduce((sum,method)=>sum+Math.max(0,(method.received??method.amount)-method.amount),0)};
 }
 const base=withoutPayment(orders,previous);
 const candidates=base.filter(order=>order.creditAccountId===draft.accountId&&order.status!=='devuelto'&&order.total>paidAmount(order)&&(!draft.targetCode||order.creditCode?.toUpperCase()===draft.targetCode.trim().toUpperCase())).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 const outstanding=candidates.reduce((sum,order)=>sum+order.total-paidAmount(order),0);
 const received=draft.methods.reduce((sum,payment)=>sum+payment.amount,0);
 if(!Number.isFinite(received)||received<=0||draft.methods.some(payment=>!Number.isFinite(payment.amount)||payment.amount<0))throw new Error('Ingresá un monto válido');
 if(!outstanding)throw new Error(draft.targetCode?'Ese código no tiene saldo pendiente':'La cuenta no tiene saldo pendiente');
 const change=Math.max(0,received-outstanding);
 const cash=draft.methods.filter(payment=>payment.method==='Efectivo').reduce((sum,payment)=>sum+payment.amount,0);
 if(change>cash)throw new Error('Los pagos sin efectivo no pueden superar el saldo');
 let changeLeft=change;
 const methods=draft.methods.map(payment=>{if(payment.method!=='Efectivo'||!changeLeft)return {...payment};const deduction=Math.min(payment.amount,changeLeft);changeLeft-=deduction;return {...payment,amount:payment.amount-deduction,received:payment.amount};}).filter(payment=>payment.amount>0||payment.received);
 const pool=methods.map(payment=>({...payment,remaining:payment.amount}));
 let remaining=Math.min(received,outstanding);let recordIndex=0;let cashChangeAssigned=false;
 const allocations:CreditPayment['allocations']=[];
 const updated=new Map<string,T>();
 for(const order of candidates){
  if(remaining<=0)break;
  const before=paidAmount(order),amount=Math.min(remaining,order.total-before);remaining-=amount;
  let needed=amount;const allocated:BusinessPaymentMethod[]=[];
  for(const payment of pool){const part=Math.min(needed,payment.remaining);if(part>0){const entry:BusinessPaymentMethod={method:payment.method,amount:part};if(payment.method==='Efectivo'&&change>0&&!cashChangeAssigned){entry.received=part+change;cashChangeAssigned=true;}allocated.push(entry);payment.remaining-=part;needed-=part;}if(needed<=0)break;}
  if(change>0&&!cashChangeAssigned&&!methods.some(payment=>payment.method==='Efectivo'&&payment.amount>0)){allocated.push({method:'Efectivo',amount:0,received:change});cashChangeAssigned=true;}
  const recordId=`${draft.id}-${++recordIndex}`;
  const record={id:recordId,date:draft.date,time:draft.time,amount,kind:(before+amount>=order.total?before?'Pago de saldo':'Cobro completo':before?'Abono':'Seña') as 'Seña'|'Abono'|'Pago de saldo'|'Cobro completo',payments:allocated,cashier:draft.cashier};
  updated.set(order.id,{...order,status:before+amount>=order.total?'cobrado':'pendiente',payments:[...(order.payments||[]),...allocated],paymentRecords:[...(order.paymentRecords||[]),record],cashier:draft.cashier,requestedPayments:[]});
  allocations.push({orderId:order.id,recordId,amount});
 }
 const payment:CreditPayment={...draft,unallocatedAmount:0,methods,amount:Math.min(received,outstanding),allocations};
 return {orders:base.map(order=>updated.get(order.id)||order),payment,change};
}
export function removeCreditPayment<T extends CreditOrder>(orders:T[],payment:CreditPayment){return withoutPayment(orders,payment);}
export function reconcileCreditPayments(payments:CreditPayment[],orders:CreditOrder[]){
 return payments.flatMap(payment=>{const allocations=payment.allocations.filter(allocation=>orders.some(order=>order.id===allocation.orderId&&order.paymentRecords?.some(record=>record.id===allocation.recordId)));if(!allocations.length)return [];const methods=allocations.flatMap(allocation=>orders.find(order=>order.id===allocation.orderId)?.paymentRecords?.find(record=>record.id===allocation.recordId)?.payments||[]);return [{...payment,allocations,methods,amount:allocations.reduce((sum,allocation)=>sum+allocation.amount,0)}];});
}
export function nextQuoteNumber(quotes:Quote[]){return `PRE-${String(Math.max(0,...quotes.map(quote=>Number(quote.number.replace(/\D/g,''))||0))+1).padStart(4,'0')}`;}
