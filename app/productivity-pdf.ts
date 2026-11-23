import {PDFDocument, StandardFonts, rgb, type PDFPage} from 'pdf-lib';
import {performanceRankColors} from './performance-bar-color';
import {displayDate} from './date-format';
import type {AdvisorPerformance} from './advisor-performance-model';
import type {AdvisorInsight} from './period-insights';

const money=(value:number)=>`${value.toLocaleString('es-PY')} Gs.`;
const clean=(value:string)=>value.normalize('NFC').replace(/[^\x20-\x7e\u00a0-\u00ff]/g,'').trim();
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);

/** Standalone vector PDF: charts stay sharp when printed or enlarged. */
export async function buildProductivityPdf(rows:AdvisorPerformance[],from:string,to:string,insights:AdvisorInsight[]=[]){
 if(!rows.length||!from||!to||from>to)throw new Error('Seleccioná asesores y un período válido');
 const doc=await PDFDocument.create();
 const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.12,.17,.25),muted=rgb(.36,.42,.50),line=rgb(.86,.89,.93);
 doc.setTitle(`Productividad Copy Print - ${from} al ${to}`);doc.setAuthor('Copy Print');
 const text=(page:PDFPage,value:string,x:number,y:number,size=10,isBold=false,tint=ink)=>page.drawText(clean(value),{x,y,size,font:isBold?bold:regular,color:tint});
 const fit=(value:string,max:number,size=9)=>{let valueFit=clean(value);while(regular.widthOfTextAtSize(valueFit,size)>max&&valueFit.length>1)valueFit=valueFit.slice(0,-1);return valueFit;};
 function page(title:string){const p=doc.addPage([841.89,595.28]);text(p,'COPY PRINT',36,554,15,true);text(p,title,36,525,21,true);text(p,`${displayDate(from)} al ${displayDate(to)} | ${rows.length} asesores seleccionados`,36,506,10,false,muted);p.drawLine({start:{x:36,y:496},end:{x:806,y:496},thickness:1,color:line});return p;}
 const totals=rows.reduce((sum,row)=>({orders:sum.orders+row.orders,sales:sum.sales+row.sales,collected:sum.collected+row.collected,pending:sum.pending+row.pending}),{orders:0,sales:0,collected:0,pending:0});
 const metrics:[string,string][]=[['Pedidos',String(totals.orders)],['Vendido',money(totals.sales)],['Cobrado',money(totals.collected)],['Saldo actual',money(totals.pending)]];
 function chart(p:PDFPage,title:string,key:'sales'|'collected'|'orders'|'delivered',data:AdvisorPerformance[],x:number,top:number){
  text(p,title,x,top,12,true);const maximum=Math.max(0,...rows.map(row=>row[key])),rankColors=performanceRankColors(rows,key);
  data.forEach((row,i)=>{const y=top-25-i*19,c=rankColors.get(row.advisor)||'#dc2626';text(p,fit(row.advisor,96),x,y,9);p.drawRectangle({x:x+104,y:y-1,width:158,height:10,color:rgb(.97,.97,.97),borderColor:color(c),borderWidth:0.5});if(maximum&&row[key]>0)p.drawRectangle({x:x+104,y:y-1,width:158*row[key]/maximum,height:10,color:color(c)});const value=key==='sales'||key==='collected'?money(row[key]):String(row[key]);text(p,value,x+272,y,9,true);});
  if(!maximum)text(p,'Sin actividad en este período',x,top-184,9,false,muted);
 }
 for(let start=0;start<rows.length;start+=8){const p=page('Productividad del equipo');metrics.forEach(([label,value],i)=>{const x=36+i*196;p.drawRectangle({x,y:440,width:182,height:43,color:rgb(.97,.98,.99)});text(p,label,x+10,468,9,false,muted);text(p,value,x+10,451,13,true);});const group=rows.slice(start,start+8);chart(p,'Ventas por asesor','sales',group,36,417);chart(p,'Cobros por asesor','collected',group,430,417);chart(p,'Cantidad de pedidos','orders',group,36,218);chart(p,'Pedidos entregados','delivered',group,430,218);text(p,'Barras por posición: verde superior, amarillo intermedio, rojo inferior o sin actividad. Empates: orden alfabético.',36,41,8,false,muted);}
 for(let start=0;start<rows.length;start+=15){const p=page('Comparación de datos por asesor');const xs=[36,185,253,316,410,537,666],widths=[147,66,61,92,125,127,140];const headers=['Asesor','Pedidos','Unidades','Entregados','Vendido','Cobrado','Saldo actual'];headers.forEach((label,i)=>text(p,label,xs[i]+7,470,10,true));p.drawLine({start:{x:36,y:459},end:{x:806,y:459},thickness:1,color:line});const group=rows.slice(start,start+15);group.forEach((row,i)=>{const y=438-i*20;const values=[row.advisor,String(row.orders),String(row.units),String(row.delivered),money(row.sales),money(row.collected),money(row.pending)];values.forEach((value,j)=>text(p,fit(value,widths[j]-15),xs[j]+(j===0?14:7),y,9));});let y=430-group.length*20;p.drawLine({start:{x:36,y:y+10},end:{x:806,y:y+10},thickness:1,color:line});const summary=['TOTAL',String(totals.orders),String(rows.reduce((s,r)=>s+r.units,0)),String(rows.reduce((s,r)=>s+r.delivered,0)),money(totals.sales),money(totals.collected),money(totals.pending)];summary.forEach((value,j)=>text(p,value,xs[j]+7,y-5,9,true));text(p,'Total de todos los asesores seleccionados.',36,y-24,9,false,muted);text(p,'Vendido y pedidos: fecha de creación. Cobrado: fecha de cada seña, abono o pago.',36,69,9,false,muted);text(p,'Saldo actual: pendiente de los pedidos del período. Entregados: pedidos del período marcados como Entregado.',36,55,9,false,muted);}
 function wrap(value:string,maxWidth:number,size=10){const lines:string[]=[];let current='';for(const word of clean(value).split(/\s+/)){let rest=word;while(regular.widthOfTextAtSize(rest,size)>maxWidth){if(current){lines.push(current);current='';}let count=1;while(count<rest.length&&regular.widthOfTextAtSize(rest.slice(0,count+1),size)<=maxWidth)count++;lines.push(rest.slice(0,count));rest=rest.slice(count);}const candidate=current?current+' '+rest:rest;if(regular.widthOfTextAtSize(candidate,size)>maxWidth){lines.push(current);current=rest;}else current=candidate;}if(current)lines.push(current);return lines;}
 for(const insight of insights){
  const title=`Tus ventas en números: ${fit(insight.advisor,435,21)}`;
  let p=page(title),y=470;
  const legend='Estas fichas comparan las ventas registradas del mismo asesor con su período anterior. Verde: subió. Rojo: bajó. Amarillo: sin cambio, sin base o período parcial. El color describe ventas, no califica el trabajo del asesor.';
  for(const lineText of wrap(legend,766,9)){text(p,lineText,36,y,9,false,muted);y-=13;}y-=14;
  for(const entry of insight.periods){
   const sections=entry.sections.map(section=>({label:section.label,lines:wrap(section.text,750,10)}));
   const height=sections.reduce((sum,section)=>sum+section.lines.length*14+19,0)+67;
   if(y-height<54){p=page(title+' (cont.)');y=470;}
   const heading=entry.period.from===entry.period.to?`Día ${displayDate(entry.period.from)}`:`${entry.period.label}: ${displayDate(entry.period.from)} al ${displayDate(entry.period.to)}`;
   const tones={verde:{ink:'#166534',fill:'#dcfce7'},rojo:{ink:'#991b1b',fill:'#fee2e2'},amarillo:{ink:'#854d0e',fill:'#fef3c7'}},tone=tones[entry.signal.color];
   text(p,heading,36,y,12,true);
   p.drawRectangle({x:493,y:y-6,width:313,height:22,color:color(tone.fill)});
   text(p,`${entry.signal.color.toUpperCase()} | ${entry.signal.label}`,501,y+1,9,true,color(tone.ink));y-=23;
   text(p,`Ventas registradas: ${money(entry.sales)} | Pedidos: ${entry.orders} | Unidades: ${entry.units.toLocaleString('es-PY')}`,36,y,10,true);y-=21;
   for(const section of sections){
    if(y-section.lines.length*14-20<54){p=page(title+' (cont.)');y=470;}
    text(p,section.label,36,y,10,true);y-=15;
    for(const lineText of section.lines){if(y<58){p=page(title+' (cont.)');y=470;}text(p,lineText,36,y,10);y-=14;}
    y-=4;
   }
   p.drawLine({start:{x:36,y:y-3},end:{x:806,y:y-3},thickness:.5,color:line});y-=23;
  }
 }
 const pages=doc.getPages();pages.forEach((p,i)=>text(p,`Copy Print - Gerencia | Página ${i+1} de ${pages.length}`,36,25,9,false,muted));
 return doc.save();
}

export async function downloadProductivityPdf(rows:AdvisorPerformance[],from:string,to:string,insights:AdvisorInsight[]=[]){
 const bytes=await buildProductivityPdf(rows,from,to,insights);
 const blob=new Blob([new Uint8Array(bytes)],{type:'application/pdf'}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=`productividad-${from}-al-${to}.pdf`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
