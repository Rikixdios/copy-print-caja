import {orderSequence,nextOrderId} from './order-identifiers';
type Row=Record<string,unknown>;
const rows=(value:unknown):Row[]=>Array.isArray(value)?value:[];
const entries=(state:Row)=>[...rows(state.orders),...rows(state.workOrders)];
const identity=(order:Row)=>order.orderUid||JSON.stringify([order.advisor,order.customer,order.createdAt,order.date,order.items,order.total]);
function remap<T>(value:T,mapping:Map<string,string>):T{
 if(!mapping.size||!value||typeof value!=='object')return value;
 const source=value as Row;
 const references=(value:unknown):unknown=>{if(Array.isArray(value))return value.map(references);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['orderId','sourceOrderId','originalOrderId'].includes(key)&&typeof item==='string'?(mapping.get(item)||item):references(item)]));return value;};
 const result=references(source) as Row;
 for(const key of ['orders','workOrders'])if(Array.isArray(source[key]))result[key]=rows(result[key]).map(order=>({...order,id:mapping.get(String(order.id))||order.id}));
 result.orderSequence=orderSequence(entries(result),Number(source.orderSequence)||0);
 return result as T;
}
// Called before the three-way merge and again on every database CAS retry.
export function reconcileOrderNumbers<T>(base:T,local:T,remote:T):{base:T;local:T}{
 if(!base||!local||!remote||typeof base!=='object'||typeof local!=='object'||typeof remote!=='object')return {base,local};
 const b=base as Row,l=local as Row,r=remote as Row,remoteEntries=entries(r),mapping=new Map<string,string>();
 const remoteUid=new Map(remoteEntries.filter(order=>order.orderUid).map(order=>[order.orderUid,String(order.id)]));
 for(const order of entries(l)){const id=remoteUid.get(order.orderUid);if(id&&id!==order.id)mapping.set(String(order.id),id);}
 let adjustedBase=remap(base,mapping),adjustedLocal=remap(local,mapping);
 const before=new Set(entries(adjustedBase as Row).map(order=>String(order.id))),used=[...entries(adjustedLocal as Row),...remoteEntries];
 let sequence=orderSequence(used,Math.max(Number(b.orderSequence)||0,Number(l.orderSequence)||0,Number(r.orderSequence)||0));
 const collisionMap=new Map<string,string>();
 for(const order of entries(adjustedLocal as Row)){
  const id=String(order.id);if(before.has(id)||collisionMap.has(id))continue;
  const existing=remoteEntries.find(candidate=>candidate.id===id);
  if(existing&&identity(existing)!==identity(order)){const replacement=nextOrderId(used,sequence);sequence++;collisionMap.set(id,replacement);used.push({...order,id:replacement});}
 }
 adjustedLocal=remap(adjustedLocal,collisionMap);
 return {base:adjustedBase,local:adjustedLocal};
}
