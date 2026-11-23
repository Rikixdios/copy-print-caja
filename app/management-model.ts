import {paidAmount} from './order-workflow';
import type {CreditOrder,CreditPayment} from './business-model';
export type ManagementOrder=CreditOrder&{sourceOrderId?:string;productionStatus?:string;deliveryDate?:string;deliveryTime?:string;refund?:number};
export type ManagementCollection={id:string;orderId:string;customer:string;advisor:string;date:string;time:string;amount:number;methods:{method:string;amount:number}[];cashier:string};
export function previousManagementPeriod(from:string,to:string){
 const first=Date.parse(from+'T12:00:00Z'),last=Date.parse(to+'T12:00:00Z');
 if(!Number.isFinite(first)||!Number.isFinite(last)||first>last)return {from:'',to:''};
 const duration=last-first+86400000;return {from:new Date(first-duration).toISOString().slice(0,10),to:new Date(first-86400000).toISOString().slice(0,10)};
}
export function managementCollections(orders:ManagementOrder[],payments:CreditPayment[]):ManagementCollection[]{
 const rows:ManagementCollection[]=[],seen=new Set<string>();
 for(const order of orders){if(order.sourceOrderId||order.status==='devuelto')continue;
  if(order.paymentRecords?.length){for(const record of order.paymentRecords){if(seen.has(record.id))continue;seen.add(record.id);rows.push({id:record.id,orderId:order.id,customer:order.customer,advisor:order.advisor,date:record.date,time:record.time,amount:record.amount,methods:record.payments,cashier:record.cashier});}}
  else if(order.date&&!order.importedSummary&&paidAmount(order)>0)rows.push({id:'legacy-'+order.id,orderId:order.id,customer:order.customer,advisor:order.advisor,date:order.date,time:order.createdAt,amount:paidAmount(order),methods:order.payments||[],cashier:order.cashier||'No registrado'});
 }
 for(const payment of payments){if((payment.unallocatedAmount||0)<=0)continue;const amount=payment.unallocatedAmount!;const allocationIds=new Set(payment.allocations.map(allocation=>allocation.recordId));const allocated=orders.filter(order=>!order.sourceOrderId).flatMap(order=>(order.paymentRecords||[]).filter(record=>allocationIds.has(record.id))).flatMap(record=>record.payments);const methods=payment.methods.map(method=>({method:method.method,amount:Math.max(0,method.amount-allocated.filter(item=>item.method===method.method).reduce((sum,item)=>sum+item.amount,0))})).filter(method=>method.amount>0);rows.push({id:'unallocated-'+payment.id,orderId:'Sin aplicar',customer:payment.payer||'Pago de cuenta',advisor:'Admi',date:payment.date,time:payment.time,amount,methods,cashier:payment.cashier});}
 return rows;
}
export function managementSummary(orders:ManagementOrder[],collections:ManagementCollection[],from:string,to:string,advisor='todos'){
 const inRange=(date?:string)=>!!from&&!!to&&from<=to&&!!date&&date>=from&&date<=to;
 const selected=orders.filter(order=>!order.sourceOrderId&&!order.importedSummary&&order.status!=='devuelto'&&(advisor==='todos'||order.advisor===advisor)&&inRange(order.date));
 const collected=collections.filter(row=>(advisor==='todos'||row.advisor===advisor)&&inRange(row.date));
 return {orders:selected.length,sales:selected.reduce((sum,order)=>sum+order.total,0),collected:collected.reduce((sum,row)=>sum+row.amount,0),pending:selected.reduce((sum,order)=>sum+Math.max(0,order.total-paidAmount(order)),0),undelivered:selected.filter(order=>!order.creditAccountId&&order.productionStatus!=='Entregado').length};
}
