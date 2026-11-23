import type {ManagementOrder} from './management-model';
import {paidAmount} from './order-workflow';
export type ProductRankingMode='registrados'|'cobrados';
export type ProductRankingSort='cantidad'|'pedidos'|'importe';
export type ProductRankingRow={name:string;quantity:number;orders:number;amount:number};
export function productRanking(orders:ManagementOrder[],workOrders:ManagementOrder[],filters:{from:string;to:string;advisor:string;mode:ProductRankingMode;sort:ProductRankingSort;query?:string}):ProductRankingRow[]{
 if(!filters.from||!filters.to||filters.from>filters.to)return [];
 // The cash copy is authoritative; an installment is never another product sale.
 const unique=new Map([...workOrders,...orders].filter(order=>!order.sourceOrderId).map(order=>[order.id,order]));
 const products=new Map<string,ProductRankingRow>();
 for(const order of unique.values()){
  if(order.status==='devuelto'||order.importedSummary||!order.date||order.date<filters.from||order.date>filters.to||(filters.advisor!=='todos'&&order.advisor!==filters.advisor))continue;
  if(filters.mode==='cobrados'&&(order.total<=0||paidAmount(order)<order.total))continue;
  const seen=new Set<string>();
  for(const item of order.items){
   const name=item.name.trim().replace(/\s+/g,' '),key=name.toLocaleLowerCase('es');
   if(!name||!Number.isFinite(item.quantity)||item.quantity<=0||!Number.isFinite(item.price)||item.price<0)continue;
   const row=products.get(key)||{name,quantity:0,orders:0,amount:0};
   row.quantity+=item.quantity;row.amount+=item.quantity*item.price;
   if(!seen.has(key)){row.orders++;seen.add(key);}products.set(key,row);
  }
 }
 const query=(filters.query||'').trim().toLocaleLowerCase('es');
 const field=filters.sort==='cantidad'?'quantity':filters.sort==='pedidos'?'orders':'amount';
 return [...products.values()].filter(row=>!query||row.name.toLocaleLowerCase('es').includes(query)).sort((a,b)=>b[field]-a[field]||b.quantity-a.quantity||a.name.localeCompare(b.name,'es'));
}
