import {compactImportFingerprint} from './import-fingerprint';
type Row=Record<string,unknown>;
const rows=(value:unknown):Row[]=>Array.isArray(value)?value:[];
const sameImport=(a:Row,b:Row)=>typeof a.importCompleteFingerprint==='string'&&typeof b.importCompleteFingerprint==='string'&&compactImportFingerprint(a.importCompleteFingerprint)===compactImportFingerprint(b.importCompleteFingerprint);
// Match identical imports across devices by their source credit code, independent of generated IDs.
export function reconcileCreditImport<T>(value:T,remoteValue:T):T{
 if(!value||typeof value!=='object'||!remoteValue||typeof remoteValue!=='object')return value;
 const source=value as Row,remote=remoteValue as Row,accountIds=new Map<string,string>(),orderIds=new Map<string,string>();
 for(const order of rows(source.orders)){const match=rows(remote.orders).find(candidate=>candidate.creditCode===order.creditCode&&sameImport(order,candidate));if(match){orderIds.set(String(order.id),String(match.id));if(order.creditAccountId&&match.creditAccountId)accountIds.set(String(order.creditAccountId),String(match.creditAccountId));}}
 if(!orderIds.size)return value;
 const remapAccount=(row:Row)=>{const match=rows(remote.creditAccounts).find(candidate=>candidate.id===accountIds.get(String(row.id)));return match?{...row,id:match.id,createdDate:match.createdDate}:row;};
 return {...source,creditAccounts:rows(source.creditAccounts).map(remapAccount),orders:rows(source.orders).map(row=>({...row,id:orderIds.get(String(row.id))||row.id,creditAccountId:accountIds.get(String(row.creditAccountId))||row.creditAccountId,...(typeof row.importCompleteFingerprint==='string'?{importCompleteFingerprint:compactImportFingerprint(row.importCompleteFingerprint)}:{})})),creditPayments:rows(source.creditPayments).map(row=>({...row,accountId:accountIds.get(String(row.accountId))||row.accountId,allocations:rows(row.allocations).map(allocation=>({...allocation,orderId:orderIds.get(String(allocation.orderId))||allocation.orderId}))}))} as T;
}
