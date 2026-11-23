import {parseCsv,csvNumber,csvDate} from './credit-csv';
import type {Quote} from './business-model';
export function parseQuoteCsv(text:string){
 const {headers,rows}=parseCsv(text),errors:string[]=[],valid:Quote[]=[];
 const required=['N°','Cliente','Asesor','Fecha','Validez','Estado','Cantidad de ítems','Detalle','Total (Gs.)'];
 for(const key of required)if(!headers.includes(key))throw new Error(`Falta la columna ${key}`);
 rows.forEach((row,index)=>{const get=(key:string)=>row[headers.indexOf(key)]||'';try{
 const number=get('N°'),customer=get('Cliente'),total=csvNumber(get('Total (Gs.)')),count=csvNumber(get('Cantidad de ítems'),true),status=get('Estado') as Quote['status'];
 if(!number||!customer||!['Borrador','Enviado','Aprobado','Rechazado'].includes(status)||!Number.isFinite(total)||total<=0)throw new Error('Número, cliente, estado o total inválido');
 const items=get('Detalle').split(/\s+\|\s+/).map((part,i)=>{const match=part.match(/^([\d.,]+)\s*x\s+(.+)\s+\(([^()]+)\)\s*$/i);if(!match)throw new Error(`No se pudo leer el producto: ${part}`);const quantity=csvNumber(match[1]),amount=csvNumber(match[3]);if(!(quantity>0)||!Number.isFinite(amount)||amount<0)throw new Error('Cantidad o importe inválido');return {id:i+1,name:match[2].trim(),quantity,price:amount/quantity,category:'Importado CSV'};});
 if(items.length!==count)throw new Error('La cantidad de ítems no coincide con el detalle');
 if(Math.abs(items.reduce((sum,item)=>sum+item.quantity*item.price,0)-total)>0.01)throw new Error('El detalle no coincide con el total');
 const date=csvDate(get('Fecha'),''),validUntil=csvDate(get('Validez'),'');if(!date||!validUntil||validUntil<date)throw new Error('Fechas inválidas');
 valid.push({id:'',number,customer,ruc:get('RUC'),phone:get('Teléfono'),advisor:get('Asesor'),date,validUntil,status,items,total,deliveryTerms:get('Tiempo de entrega'),notes:get('Observación')});
 }catch(error){errors.push(`Fila ${index+2}: ${error instanceof Error?error.message:'Datos inválidos'}`);}});
 return {valid,errors};
}
export function mergeQuoteImport(existing:Quote[],incoming:Quote[],id:()=>string){const quotes=[...existing];let added=0,skipped=0;for(const quote of incoming){const previous=quotes.find(q=>q.number.replace(/^0+/,'')===quote.number.replace(/^0+/,''));if(previous){const {id:_,shareId:__,orderId:___,...old}=previous;const {id:____,...next}=quote;if(JSON.stringify(old)===JSON.stringify(next)){skipped++;continue;}throw new Error(`El presupuesto ${quote.number} ya existe con otros datos. No se sobrescribió.`);}quotes.push({...quote,id:id()});added++;}return {quotes,added,skipped};}
