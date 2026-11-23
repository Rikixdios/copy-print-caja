import {reassignRemovedAdvisors} from './advisor-reassignment';
import {reconcileOrderNumbers} from './reconcile-order-numbers';
import {validateProductCodes} from './product-model';
import {validateStock} from "./inventory-model";
import {reconcileCreditImport} from './reconcile-credit-import';
export class StoreConflict extends Error { constructor(public path:string){super('Hay otro cambio en '+path+'. El registro sigue pendiente en este equipo.');this.name='StoreConflict';} }
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function mergeStores<T>(base:T,local:T,remote:T):T{
 base=reassignRemovedAdvisors(base);local=reassignRemovedAdvisors(local);remote=reassignRemovedAdvisors(remote);
 // Normalize new optional fields before root-level fast paths, including older clients.
 if(object(base)&&object(local)&&object(remote)&&[base,local,remote].some(state=>'attendanceMarks' in state||'productionJobs' in state)){
  const attendance=merge(base.attendanceMarks,local.attendanceMarks,remote.attendanceMarks,'datos.attendanceMarks');
  const baseJobs=base.productionJobs||[];
  const normalizedBase={...base,attendanceMarks:attendance,productionJobs:baseJobs};
  const normalizedLocal={...local,attendanceMarks:attendance,productionJobs:local.productionJobs===undefined?baseJobs:local.productionJobs};
  const normalizedRemote={...remote,attendanceMarks:attendance,productionJobs:remote.productionJobs||[]};
  base=normalizedBase as T;local=normalizedLocal as T;remote=normalizedRemote as T;
 }
 const aligned=reconcileOrderNumbers(reconcileCreditImport(base,remote),reconcileCreditImport(local,remote),remote);return validateProductCodes(validateStock(merge(aligned.base,aligned.local,remote,'datos') as T));}
function merge(base:unknown,local:unknown,remote:unknown,path:string):unknown{
 // Attendance is an immutable log. Older clients may omit the new field entirely.
 if(path==='datos.attendanceMarks'&&[base,local,remote].every(value=>value===undefined||Array.isArray(value))){const records=new Map<string,unknown>();for(const values of [base,remote,local])for(const mark of Array.isArray(values)?values:[]){if(!object(mark)||typeof mark.id!=='string')throw new StoreConflict(path);const previous=records.get(mark.id);if(previous&&!equal(previous,mark))throw new StoreConflict(path+'.'+mark.id);records.set(mark.id,mark);}return [...records.values()];}
 if(path==='datos.productionJobs'&&[base,local,remote].every(value=>value===undefined||Array.isArray(value)))return merge(base||[],local===undefined?base||[]:local,remote||[],path+'.entries');

 // sentToCashier is routing metadata, not a change to the work itself. A stale
 // browser or migration can toggle it while another device removes the saved copy.
 // Honor that removal only if every substantive field is unchanged. The canonical
 // cash order is merged independently, so concurrent collections still conflict.
 if(/^datos\.workOrders\.[^.]+$/.test(path)&&object(base)){
  const unchangedWork=(value:unknown)=>object(value)&&Object.keys({...base,...value}).every(key=>key==='sentToCashier'||equal(base[key],value[key]));
  if(local===undefined&&unchangedWork(remote)||remote===undefined&&unchangedWork(local))return undefined;
 }
 if(/^datos\.(orders|workOrders)\.[^.]+\.advisorSection$/.test(path)&&['historial','ventas'].includes(String(local))){if(equal(local,base))return remote;return local;}
 if(path==='datos.stockProducts'&&[base,local,remote].every(value=>value===undefined||Array.isArray(value)))return merge(base||[],local||[],remote||[],path+'.entries');
 if(path==='datos.orderSequence'){const values=[base,local,remote].filter((value):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0);return values.length?Math.max(...values):undefined;}if(equal(local,base))return remote;if(equal(remote,base)||equal(local,remote))return local;
 if(Array.isArray(local)&&Array.isArray(remote)&&(base===undefined||Array.isArray(base))){
  const before=Array.isArray(base)?base:[];
  if([...before,...local,...remote].every(value=>object(value)&&('id' in value))){const key=(value:unknown)=>String((value as Record<string,unknown>).id),b=new Map(before.map(value=>[key(value),value])),l=new Map(local.map(value=>[key(value),value])),r=new Map(remote.map(value=>[key(value),value]));return [...new Set([...local.map(key),...remote.map(key),...before.map(key)])].flatMap(id=>{const value=merge(b.get(id),l.get(id),r.get(id),`${path}.${id}`);return value===undefined?[]:[value];});}
  if([...before,...local,...remote].every(value=>typeof value==='string'))return [...new Set([...local,...remote])].filter(value=>!before.includes(value)||local.includes(value)&&remote.includes(value));
 }
 if(object(local)&&object(remote)&&(base===undefined||object(base))){const before=object(base)?base:{};const result:Record<string,unknown>={};const recordedOrder='total' in local&&'items' in local&&'status' in local&&((Array.isArray(local.paymentRecords)&&local.paymentRecords.length>0)||(Array.isArray(remote.paymentRecords)&&remote.paymentRecords.length>0));
  for(const key of new Set([...Object.keys(before),...Object.keys(local),...Object.keys(remote)])){if(recordedOrder&&['payments','status','cashier'].includes(key))continue;const value=merge(before[key],local[key],remote[key],`${path}.${key}`);if(value!==undefined)result[key]=value;}
  if(recordedOrder){const records=(result.paymentRecords||[]) as {amount:number;payments:unknown[];cashier:string;date:string;time:string}[];const paid=records.reduce((sum,record)=>sum+record.amount,0);if(paid>Number(result.total))throw new StoreConflict(path+'.saldo');result.payments=records.flatMap(record=>record.payments||[]);result.status=local.status==='devuelto'||remote.status==='devuelto'?'devuelto':paid>=Number(result.total)?'cobrado':'pendiente';result.cashier=[...records].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).at(-1)?.cashier;}
  return result;
 }
 throw new StoreConflict(path);
}
