import type {CreditOrder} from './business-model';
import {paidAmount} from './order-workflow';
export function isArchivedCredit(order:CreditOrder,today:string){
 if(order.importedSummary||order.status==='devuelto'||order.total<=0||paidAmount(order)<order.total)return false;
 const dates=(order.paymentRecords||[]).map(record=>record.date).filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date));
 const settled=dates.sort().at(-1);
 if(!settled||!/^\d{4}-\d{2}-\d{2}$/.test(settled))return false;
 const [year,month,day]=settled.split('-').map(Number),lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const archiveOn=new Date(Date.UTC(year,month,Math.min(day,lastDay))).toISOString().slice(0,10);
 return archiveOn<=today;
}
