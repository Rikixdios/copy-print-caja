import {asuncionToday,type PerformanceOrder} from './advisor-performance-model';
import {displayDate} from './date-format';
export type InsightPeriod={label:string;from:string;to:string};
export type PeriodSignal={color:'verde'|'amarillo'|'rojo';label:string;percent:number|null;partial:boolean};
export function periodSignal(sales:number,previousSales:number,partial=false):PeriodSignal{
 const percent=previousSales>0?(sales-previousSales)/previousSales*100:null;
 if(partial)return {color:'amarillo',label:'Período en curso / parcial',percent,partial};
 if(percent===null)return {color:'amarillo',label:sales>0?'Sin base para calcular porcentaje':'Sin ventas registradas',percent,partial};
 const rounded=Math.abs(percent).toFixed(1);
 return {color:percent>0?'verde':percent<0?'rojo':'amarillo',label:percent>0?`Subió ${rounded}%`:percent<0?`Bajó ${rounded}%`:'Se mantuvo: 0%',percent,partial};
}
export type AdvisorInsight={advisor:string;periods:{period:InsightPeriod;sales:number;orders:number;units:number;explanation:string;signal:PeriodSignal;sections:{label:string;text:string}[]}[]};
const money=(value:number)=>`${value.toLocaleString('es-PY')} Gs`;
const shift=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function monthWeeks(month:string):InsightPeriod[]{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return [];
 const [year,m]=month.split('-').map(Number),last=new Date(Date.UTC(year,m,0)).getUTCDate();
 return [1,8,15,22].map((day,index)=>({label:`Semana ${index+1}`,from:`${month}-${String(day).padStart(2,'0')}`,to:`${month}-${String(index===3?last:day+6).padStart(2,'0')}`}));
}
export function insightPeriods(from:string,to:string,granularity:'semanas'|'dias',monthly=false):InsightPeriod[]{
 if(!from||!to||from>to||!Number.isFinite(Date.parse(from+'T12:00:00Z'))||!Number.isFinite(Date.parse(to+'T12:00:00Z')))return [];
 if(granularity==='semanas'&&monthly)return monthWeeks(from.slice(0,7)).filter(p=>p.from<=to&&p.to>=from).map(p=>({...p,from:p.from<from?from:p.from,to:p.to>to?to:p.to}));
 const periods:InsightPeriod[]=[];for(let start=from;start<=to;){const end=granularity==='dias'?start:shift(start,6);periods.push({label:granularity==='dias'?displayDate(start):`Semana ${periods.length+1}`,from:start,to:end>to?to:end});start=shift(end,1);}
 return periods;
}
function details(orders:PerformanceOrder[],advisor:string,period:InsightPeriod){
 const selected=orders.filter(order=>!order.sourceOrderId&&!(order as PerformanceOrder&{importedSummary?:unknown}).importedSummary&&order.status!=='devuelto'&&(order.advisor||'Admi')===advisor&&!!order.date&&order.date>=period.from&&order.date<=period.to);
 const products=new Map<string,{name:string;quantity:number;amount:number}>();let missing=0;
 for(const order of selected){for(const item of order.items){const name=item.name?.trim().replace(/\s+/g,' ');if(!name||!Number.isFinite(item.price)||!Number.isFinite(item.quantity)){missing++;continue;}const key=name.toLocaleLowerCase('es'),entry=products.get(key)||{name,quantity:0,amount:0};entry.quantity+=item.quantity;entry.amount+=item.quantity*item.price!;products.set(key,entry);}}
 return {sales:selected.reduce((sum,o)=>sum+o.total,0),orders:selected.length,units:selected.reduce((sum,o)=>sum+o.items.reduce((n,i)=>n+i.quantity,0),0),products,missing};
}
export function advisorPeriodInsights(orders:PerformanceOrder[],advisors:string[],periods:InsightPeriod[],monthly=false,today=asuncionToday()):AdvisorInsight[]{
 const unique=[...new Map(orders.filter(order=>!order.sourceOrderId).map(order=>[order.id,order])).values()];
 return advisors.map(advisor=>({advisor,periods:periods.map((period,index)=>{
  // A selected month-week compares with the preceding named week, including when exported alone.
  const weeks=monthly?monthWeeks(period.from.slice(0,7)):[];const weekIndex=weeks.findIndex(p=>p.label===period.label);
  const days=Math.round((Date.parse(period.to+'T12:00:00Z')-Date.parse(period.from+'T12:00:00Z'))/86400000)+1;
  const previous=index>0?periods[index-1]:weekIndex>0?weeks[weekIndex-1]:{label:'Período anterior',from:shift(period.from,-days),to:shift(period.from,-1)};
  const current=details(unique,advisor,period),before=details(unique,advisor,previous),delta=current.sales-before.sales;
  const top=[...current.products.values()].sort((a,b)=>b.amount-a.amount).slice(0,2);
  const changes=[...new Set([...current.products.keys(),...before.products.keys()])].map(key=>{const now=current.products.get(key),was=before.products.get(key);return {name:now?.name||was!.name,now:now?.amount||0,was:was?.amount||0,quantity:now?.quantity||0,previousQuantity:was?.quantity||0,delta:(now?.amount||0)-(was?.amount||0)};}).filter(p=>delta>0?p.delta>0:delta<0?p.delta<0:false).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const lines=[`Registró ${current.orders} ${current.orders===1?'pedido':'pedidos'} por ${money(current.sales)}.`];
  if(top.length)lines.push('Mayor importe registrado: '+top.map(p=>`${p.name} (${p.quantity.toLocaleString('es-PY')} unidades, ${money(p.amount)})`).join('; ')+'.');
  if(!current.orders)lines.push('No hay ventas registradas para este asesor en estas fechas; esto no demuestra que no haya trabajado.');
  const percent=before.sales>0?` (${(Math.abs(delta)/before.sales*100).toFixed(1)}%)`:'';
  lines.push(`Frente al ${displayDate(previous.from)} al ${displayDate(previous.to)}: ${delta>0?'subió':delta<0?'bajó':'sin cambio de importe'}${delta!==0?' '+money(Math.abs(delta))+percent:''}. Pedidos: ${before.orders} a ${current.orders}.`);
  if(changes.length){const p=changes[0];lines.push(`La mayor ${delta>0?'suba':'baja'} por producto fue ${p.name}: ${p.previousQuantity.toLocaleString('es-PY')} a ${p.quantity.toLocaleString('es-PY')} unidades y ${money(p.was)} a ${money(p.now)}.`);}
  else if(delta!==0)lines.push('El detalle de productos disponible no alcanza para identificar el principal cambio.');
  if(current.orders&&before.orders){const a=before.sales/before.orders,b=current.sales/current.orders;lines.push(`Promedio por pedido: ${money(Math.round(a))} a ${money(Math.round(b))}.`);}
  if(current.missing||before.missing)lines.push('Hay líneas sin nombre o precio detallado; la comparación por producto es parcial.');
  const priorDays=Math.round((Date.parse(previous.to+'T12:00:00Z')-Date.parse(previous.from+'T12:00:00Z'))/86400000)+1;
  if(priorDays!==days)lines.push(`Los períodos tienen distinta duración: ${priorDays} y ${days} días; compará también el promedio por día (${money(Math.round(before.sales/priorDays))} a ${money(Math.round(current.sales/days))}).`);
  const expected=weekIndex>=0?weeks[weekIndex]:undefined;
  const partial=period.to>=today||!!expected&&(period.from!==expected.from||period.to!==expected.to);
  const signal=periodSignal(current.sales,before.sales,partial);
  const comparison=`Antes: ${money(before.sales)}. Ahora: ${money(current.sales)}. ${delta>0?'Subió':delta<0?'Bajó':'Diferencia:'} ${money(Math.abs(delta))}${before.sales>0?` (${(Math.abs(delta)/before.sales*100).toFixed(1)}%)`:'. La semana o día anterior no tiene ventas registradas para calcular un porcentaje'}. Comparación: ${displayDate(previous.from)} al ${displayDate(previous.to)}.`;
  const evidence:string[]=[];
  if(top.length)evidence.push('En este período se registró principalmente '+top.map(p=>`${p.name}: ${p.quantity.toLocaleString('es-PY')} unidades por ${money(p.amount)}`).join('; ')+'.');
  if(changes.length){const p=changes[0];evidence.push(`El producto con mayor ${delta>0?'aumento':'disminución'} de importe fue ${p.name}: ${p.previousQuantity.toLocaleString('es-PY')} a ${p.quantity.toLocaleString('es-PY')} unidades; ${money(p.was)} a ${money(p.now)}.`);}
  evidence.push(`Cantidad de pedidos: ${before.orders} antes y ${current.orders} ahora.`);
  if(before.orders&&current.orders)evidence.push(`Promedio por pedido: ${money(Math.round(before.sales/before.orders))} antes y ${money(Math.round(current.sales/current.orders))} ahora.`);
  if(!current.orders)evidence.push('No hay ventas registradas en estas fechas; esto no demuestra que no haya trabajado.');
  if(current.missing||before.missing)evidence.push('Faltan nombres o precios en algunas líneas: la explicación por producto es parcial.');
  if(!top.length&&!changes.length&&delta!==0)evidence.push('No hay detalle suficiente para explicar el cambio por producto.');
  const review:string[]=[];
  if(partial)review.push('El período todavía está en curso o está recortado. Esta diferencia es provisoria; revisala al cerrar la semana o el día.');
  if(priorDays!==days)review.push(`Se comparan ${priorDays} y ${days} días. Promedio diario: ${money(Math.round(before.sales/priorDays))} antes y ${money(Math.round(current.sales/days))} ahora.`);
  if(current.missing||before.missing)review.push('Completá el nombre, la cantidad y el precio de cada producto para poder entender mejor la diferencia.');
  else review.push(delta<0?'Revisá el detalle de los productos que bajaron y confirmá que todos los pedidos estén registrados.':delta>0?'Revisá qué productos aportaron más a la suba para tenerlos en cuenta al organizar la próxima semana.':'Revisá los productos y las cantidades: un total parecido puede incluir trabajos diferentes.');
  const sections=[{label:'Qué cambió',text:comparison},{label:'Qué muestran los pedidos',text:evidence.join(' ')},{label:'Qué revisar',text:review.join(' ')}];
  return {period,sales:current.sales,orders:current.orders,units:current.units,signal,sections,explanation:lines.join(' ')};
 })}));
}
