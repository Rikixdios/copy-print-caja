import {nextOrderId,orderSequence} from './order-identifiers';
import { itemTotal,validItems,nextQuoteNumber,type BusinessItem,type Quote } from './business-model';
export type QuickDraft={id:string;kind:'order'|'quote';destination:'guardar'|'enviar';advisor:string;customer:string;phone:string;ruc:string;date:string;deliveryDate:string;deliveryTime:string;notes:string;validUntil:string;deliveryTerms:string;items:BusinessItem[];requestedPayments:{method:string;amount:number}[]};
export type QuickStore={orderSequence?:number;orders:Record<string,unknown>[];workOrders:Record<string,unknown>[];quotes:Quote[];advisors:string[];cashMovements:{date:string;type:string}[];[key:string]:unknown};
export const quickToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function quickCashOpen(store:QuickStore,today:string){const control=store.cashMovements.find(movement=>movement.date===today&&['apertura','reapertura','cierre'].includes(movement.type));return !!control&&control.type!=='cierre';}
function validDate(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const value=new Date(date+'T12:00:00Z');return Number.isFinite(value.getTime())&&value.toISOString().slice(0,10)===date;}
export function applyQuickEntry(store:QuickStore,draft:QuickDraft,today:string,time:string){
 if(!draft||typeof draft.id!=='string'||!/^[a-f0-9-]{36}$/i.test(draft.id)||!['order','quote'].includes(draft.kind)||!['guardar','enviar'].includes(draft.destination))throw new Error('Solicitud inválida');
 const previous=[...store.orders,...store.workOrders,...store.quotes].find(entry=>(entry as Record<string,unknown>).extensionRequestId===draft.id);if(previous)return {store,result:{id:String(previous.id),kind:'number' in previous?'quote':'order',number:'number' in previous?String(previous.number):String(previous.id),repeated:true}};
 for(const key of ['advisor','customer','phone','ruc','date','deliveryDate','deliveryTime','notes','validUntil','deliveryTerms'] as const)if(typeof draft[key]!=='string'||draft[key].length>4000)throw new Error('Completá los datos del formulario');
 if(!draft.customer.trim())throw new Error('Ingresá el nombre del cliente');if(!['Admi',...store.advisors].includes(draft.advisor))throw new Error('Elegí un asesor registrado');
 if(!validDate(draft.date)||draft.deliveryDate&&!validDate(draft.deliveryDate))throw new Error('Elegí una fecha válida');
 if(!Array.isArray(draft.items)||draft.items.length>100||!validItems(draft.items)||!Number.isFinite(itemTotal(draft.items)))throw new Error('Revisá los productos, cantidades y precios');
 const total=itemTotal(draft.items),items=draft.items.map((item,index)=>({...item,id:index+1,category:item.category||'Manual'}));
 if(draft.kind==='quote'){
  if(!validDate(draft.validUntil)||draft.validUntil<draft.date)throw new Error('Revisá la vigencia del presupuesto');
  const quote={id:draft.id,extensionRequestId:draft.id,number:nextQuoteNumber(store.quotes),customer:draft.customer.trim(),phone:draft.phone,ruc:draft.ruc,advisor:draft.advisor,date:draft.date,validUntil:draft.validUntil,items,total,deliveryTerms:draft.deliveryTerms,notes:draft.notes,status:(draft.destination==='guardar'?'Borrador':'Enviado') as Quote['status']};
  return {store:{...store,quotes:[quote,...store.quotes]},result:{id:quote.id,kind:'quote',number:quote.number,repeated:false}};
 }
 if(!Array.isArray(draft.requestedPayments)||draft.requestedPayments.some(payment=>!['Efectivo','Transferencia','QR','POS/Tarjeta'].includes(payment.method)||!Number.isFinite(payment.amount)||payment.amount<0))throw new Error('Revisá el pago previsto');
 const requested=draft.requestedPayments.filter(payment=>payment.amount>0),proposed=requested.reduce((sum,payment)=>sum+payment.amount,0);if(proposed>total)throw new Error('El pago previsto no puede superar el total');
 if(draft.destination==='enviar'&&!quickCashOpen(store,today))throw new Error('La caja está cerrada. Abrila en Copy Print o guardá el pedido sin pago previsto.');
 const order={id:nextOrderId([...store.orders,...store.workOrders],store.orderSequence),extensionRequestId:draft.id,customer:draft.customer.trim(),phone:draft.phone,ruc:draft.ruc,advisor:draft.advisor,date:draft.date,createdAt:time,deliveryDate:draft.deliveryDate,deliveryTime:draft.deliveryTime,notes:draft.notes,items,total,status:'pendiente',productionStatus:'Pendiente',payments:[],paymentRecords:[],requestedPayments:requested,collectionLane:proposed>0&&proposed<total?'senas':'pendientes'};
 if([...store.orders,...store.workOrders].some(entry=>entry.id===order.id))throw new Error('El identificador ya está en uso. Creá un formulario nuevo.');
 const work={...order,progress:'Esperando',sentToCashier:true};
 const next=draft.destination==='guardar'?{...store,workOrders:[work,...store.workOrders],orders:[order,...store.orders]}:{...store,orders:[order,...store.orders]};
 return {store:{...next,orderSequence:orderSequence([order],store.orderSequence||0)},result:{id:order.id,kind:'order',number:order.id,repeated:false}};
}
