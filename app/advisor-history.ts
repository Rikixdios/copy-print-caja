import {paidAmount} from './order-workflow';
type Entry={id:string;advisor:string;total:number;status:string;advisorHistoryHiddenFor?:string[];paymentRecords?:{amount:number}[];payments?:{amount:number}[];importedSummary?:{paid:number};importedPaidAdjustment?:number};
export function canHidePaidHistory(order:Entry,advisor:string){return order.advisor===advisor&&order.status==='cobrado'&&order.total>0&&paidAmount(order)>=order.total;}
export function hidePaidHistory<T extends Entry>(orders:T[],id:string,advisor:string){const order=orders.find(entry=>entry.id===id);if(!order||!canHidePaidHistory(order,advisor))throw new Error('Solo podés quitar de tu historial tus pedidos totalmente cobrados.');return orders.map(entry=>entry.id===id?{...entry,advisorHistoryHiddenFor:[...new Set([...(entry.advisorHistoryHiddenFor||[]),advisor])]}:entry);}

export function isPersonalOrder(order:{advisor:string;creditAccountId?:string;quoteId?:string;advisorHistoryHiddenFor?:string[]},advisor:string){return order.advisor===advisor&&!order.creditAccountId&&!order.quoteId&&!order.advisorHistoryHiddenFor?.includes(advisor);}

export type AdvisorSection='historial'|'ventas';
export function advisorSection(order:{id:string;advisorSection?:AdvisorSection},works:{id:string;advisorSection?:AdvisorSection}[]):AdvisorSection {
  const work=works.find(item=>item.id===order.id);
  return order.advisorSection||work?.advisorSection||'historial';
}

export function moveAdvisorSection<O extends {id:string;advisor:string;advisorSection?:AdvisorSection},W extends {id:string;advisor:string;advisorSection?:AdvisorSection}>(orders:O[],workOrders:W[],id:string,advisor:string,section:AdvisorSection){
  const order=orders.find(item=>item.id===id)||workOrders.find(item=>item.id===id);
  if(!order||!isPersonalOrder(order,advisor))throw new Error('Este pedido ya no está disponible');
  return {orders:orders.map(item=>item.id===id?{...item,advisorSection:section}:item),workOrders:workOrders.map(item=>item.id===id?{...item,advisorSection:section}:item)};
}
