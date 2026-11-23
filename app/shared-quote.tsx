"use client";
import { CalendarDays, Download, FileText, Printer, UserRound } from 'lucide-react';
import type { Quote } from './business-model';
import { QuoteDocument, exportBusinessDocument } from './business-documents';
import { displayDate } from './date-format';

const money = (value:number) => `Gs. ${value.toLocaleString('es-PY')}`;

export function SharedQuote({quote}:{quote:Quote}){
 const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const datePart = (type:string) => today.find(part=>part.type===type)?.value || '';
 const expired = !!quote.validUntil && quote.validUntil < `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
 const status = quote.orderId ? 'Convertido a pedido' : quote.status;
 return <main className="shared-credit shared-quote-page">
  <header className="shared-credit-banner shared-quote-banner">
   <img className="shared-quote-cover" src="/christmas/cover-navidad.png" alt="Personajes de Copy Print celebrando la Navidad" width={2048} height={682}/>
   <div className="shared-quote-brand">
    <img className="shared-quote-logo" src="/christmas/order-logo-felices-fiestas.png" alt="Copy Print · Felices Fiestas" width={2048} height={822}/>
    <p><FileText size={16} aria-hidden="true"/> Consulta de presupuesto</p>
   </div>
  </header>
  <div className="shared-credit-content">
   <section className="shared-credit-card shared-credit-identity">
    <span className="shared-credit-icon"><UserRound size={20} aria-hidden="true"/></span>
    <div><h1>{quote.customer}</h1><p>Presupuesto {quote.number}</p>{quote.ruc&&<p>CI / RUC: {quote.ruc}</p>}{quote.phone&&<p>Teléfono: {quote.phone}</p>}</div>
    <div className="shared-quote-downloads">
     <button className="shared-credit-download" onClick={()=>void exportBusinessDocument(<QuoteDocument quote={quote}/>,quote.number,true)}><Printer size={16} aria-hidden="true"/> Imprimir / guardar PDF</button>
     <button className="shared-credit-download" onClick={()=>void exportBusinessDocument(<QuoteDocument quote={quote}/>,quote.number)}><Download size={16} aria-hidden="true"/> Descargar imagen</button>
    </div>
   </section>
   <section className="shared-credit-totals" aria-label="Resumen del presupuesto">
    <div className="shared-credit-card"><span className="shared-credit-icon"><FileText size={20} aria-hidden="true"/></span><dl><dt>Total del presupuesto</dt><dd className="shared-quote-total">{money(quote.total)}</dd><dd className="shared-credit-total-note">{quote.items.length} {quote.items.length===1?'producto / servicio':'productos / servicios'}</dd></dl></div>
    <div className="shared-credit-card"><span className="shared-credit-icon"><CalendarDays size={20} aria-hidden="true"/></span><dl><dt>Válido hasta</dt><dd>{displayDate(quote.validUntil)}</dd><dd className="shared-credit-total-note">{expired?'Vigencia vencida · Consultá los precios':`Emitido el ${displayDate(quote.date)}`}</dd></dl></div>
   </section>
   <section className="shared-credit-card shared-credit-ledger">
    <div className="shared-quote-detail-heading"><h2><FileText size={19} aria-hidden="true"/> Detalle del presupuesto</h2><span className={`shared-credit-status ${quote.status==='Aprobado'||quote.orderId?'is-paid':quote.status==='Rechazado'?'is-pending':'is-partial'}`}>{status}</span></div>
    <div className="shared-quote-table-wrap"><table className="shared-quote-table"><thead><tr><th scope="col">Producto / servicio</th><th scope="col">Cant.</th><th scope="col">Precio unitario</th><th scope="col">Total</th></tr></thead><tbody>{quote.items.map((item,index)=><tr key={`${item.id}-${index}`}><td>{item.name}</td><td>{item.quantity.toLocaleString('es-PY')}</td><td>{money(item.price)}</td><td>{money(item.quantity*item.price)}</td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={3}>Total del presupuesto</th><td>{money(quote.total)}</td></tr></tfoot></table></div>
    <p className="shared-quote-advisor">Asesor: <strong>{quote.advisor}</strong></p>
   </section>
   {(quote.deliveryTerms||quote.notes)&&<section className="shared-credit-card shared-credit-ledger shared-quote-notes"><h2>Entrega y observaciones</h2>{quote.deliveryTerms&&<div><h3>Plazo / condiciones de entrega</h3><p>{quote.deliveryTerms}</p></div>}{quote.notes&&<div><h3>Observaciones</h3><p>{quote.notes}</p></div>}</section>}
   <section className="shared-credit-card shared-credit-ledger shared-quote-conditions"><h2>Condiciones del presupuesto</h2><p>Este presupuesto no registra una venta ni un pago. Precios sujetos a confirmación al vencimiento.</p><p>Tel.: 0994 711 183 · Monseñor Moreno y Capitán Medina</p><p>Reclamos al: 0991 307 302</p></section>
   <footer>Copy Print · Presupuesto actualizado al consultar</footer>
  </div>
 </main>;
}
