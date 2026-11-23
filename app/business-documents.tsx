"use client";
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { OrderSummary } from './order-summary';
import { orderDocumentImageBlob } from './order-image-export';
import type { Quote } from './business-model';
export function QuoteDocument({quote}:{quote:Quote}){return <OrderSummary order={{...quote,id:quote.number,notes:[quote.deliveryTerms,quote.notes].filter(Boolean).join('\n')}} documentTitle="PRESUPUESTO" quoteTerms={{validUntil:quote.validUntil}}/>;}
export async function exportBusinessDocument(node:ReactNode,name:string,print=false){
 const popup=print?window.open('','_blank','width=900,height=850'):null;
 if(print&&!popup){toast.error('Permití las ventanas emergentes para imprimir');return;}
 if(popup){popup.document.write('<!doctype html><html><head><title>Preparando comprobante</title></head><body>Preparando comprobante…</body></html>');popup.document.close();}
 const container=document.createElement('div');Object.assign(container.style,{position:'fixed',left:'-10000px',top:'0',width:'800px'});document.body.appendChild(container);const root=createRoot(container);
 try{
  flushSync(()=>root.render(node));await document.fonts.ready;await Promise.all(Array.from(container.querySelectorAll('img')).map(img=>img.decode()));
  const documentNode=container.firstElementChild as HTMLElement;if(!documentNode)throw new Error('Comprobante no disponible');
  if(popup){
   const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map(style=>style.outerHTML).join('');
   popup.document.open();popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>${name.replace(/[<>&"']/g,'')}</title>${styles}<style>@page{size:A4;margin:12mm}html,body{background:white!important;color:#111!important;margin:0!important;width:100%!important}.order-document{width:100%!important;max-width:none!important;box-shadow:none!important} .order-document-sheet{width:100%!important}@media print{body>*{display:block!important;visibility:visible!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${documentNode.outerHTML}</body></html>`);popup.document.close();
   await Promise.all(Array.from(popup.document.querySelectorAll('link[rel="stylesheet"]')).map(link=>new Promise<void>(resolve=>{if((link as HTMLLinkElement).sheet)return resolve();link.addEventListener('load',()=>resolve(),{once:true});link.addEventListener('error',()=>resolve(),{once:true});window.setTimeout(resolve,5000);})));await popup.document.fonts.ready;await Promise.all(Array.from(popup.document.images).map(img=>img.decode().catch(()=>{})));popup.focus();popup.print();
  }else{const blob=await orderDocumentImageBlob(documentNode);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${name}.png`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000);}
 }catch{popup?.close();toast.error('No se pudo generar el comprobante. Intentá de nuevo.');}finally{root.unmount();container.remove();}
}
export function openWhatsApp(phone:string,text:string){let number=phone.replace(/\D/g,'');if(number.startsWith('0'))number='595'+number.slice(1);window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
