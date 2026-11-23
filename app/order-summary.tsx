"use client";
import {displayDate,displayTime} from "./date-format";

type SummaryPayment = { method: string; amount: number };
export type OrderSummaryData = {
  id: string; customer: string; advisor: string; phone?: string; ruc?: string;
  date?: string; createdAt?: string; deliveryDate?: string; deliveryTime?: string; notes?: string;
  invoice?: string; invoiceName?: string; invoiceRuc?: string; invoiceAddress?: string;
  total: number; items: { id: number; name: string; quantity: number; price: number }[];
  payments?: SummaryPayment[];
  paymentRecords?: { amount: number; payments?: SummaryPayment[] }[];
  requestedPayments?: SummaryPayment[];
};
const money = (value: number) => `PYG ${new Intl.NumberFormat("es-PY").format(value)}`;
const showDate = (value?: string) => value ? displayDate(value) : "No especificada";

export function orderSummaryAmounts(order: OrderSummaryData, previewPayments?: SummaryPayment[]) {
  const hasRecords = !!order.paymentRecords?.length;
  const confirmed = hasRecords ? order.paymentRecords!.flatMap(record => record.payments || []) : order.payments || [];
  const paid = hasRecords ? order.paymentRecords!.reduce((sum, record) => sum + record.amount, 0) : confirmed.reduce((sum, payment) => sum + payment.amount, 0);
  const previewPaid = (previewPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
  const byMethod = new Map<string, number>([["Efectivo", 0], ["Transferencia", 0]]);
  [...confirmed, ...(previewPayments || [])].forEach(payment => byMethod.set(payment.method, (byMethod.get(payment.method) || 0) + payment.amount));
  const proposed = previewPayments === undefined ? (order.requestedPayments || []).reduce((sum, payment) => sum + payment.amount, 0) : previewPaid;
  return { paid, proposed, payments: [...byMethod].map(([method, amount]) => ({ method, amount })), balance: Math.max(0, order.total - paid - previewPaid), preview: previewPayments !== undefined && previewPaid > 0 };
}

export function OrderSummary({ order, previewPayments, documentTitle, quoteTerms }: { order: OrderSummaryData; previewPayments?: SummaryPayment[]; documentTitle?: string; quoteTerms?: {validUntil:string} }) {
  const amounts = orderSummaryAmounts(order, previewPayments);
  const dates = <div className="order-document-dates"><span><span className="order-document-date-label">Fecha recepción:</span><span className="order-document-date-value">{showDate(order.date)}</span>{order.createdAt && <span className="order-document-time">{displayTime(order.createdAt)}</span>}</span><span><span className="order-document-date-label">{quoteTerms ? "Válido hasta:" : "Fecha entrega:"}</span><span className="order-document-date-value">{showDate(quoteTerms?.validUntil || order.deliveryDate)}</span>{order.deliveryTime && <span className="order-document-time">{displayTime(order.deliveryTime)}</span>}</span></div>;
  return <div className="order-document"><article className={`order-document-sheet${quoteTerms ? "" : " order-document-seasonal"}`} aria-label={`Resumen del pedido ${order.id}`}>
    <header className={`order-document-header${quoteTerms ? "" : " order-document-header-christmas"}`}>
      {!quoteTerms && <img className="order-document-cover" src="/christmas/cover-navidad.png" alt="" width="2048" height="682"/>}
      <div className="order-document-heading">
      <div className={`order-document-brand${quoteTerms ? "" : " with-christmas"}`}>
        <img className="order-document-logo" src={quoteTerms ? "/copy-print-logo.svg" : "/christmas/order-logo-felices-fiestas.png"} alt={quoteTerms ? "Copy Print" : "Copy Print · Felices Fiestas"} />
      </div>
      <strong className="order-document-number" data-order-code={/^ORD-\d+$/.test(order.id) || undefined}>{documentTitle && <>{documentTitle}<br/></>}{order.id}</strong>
      <p>Tel: 0994 711 183 · Monseñor Moreno y Capitán Medina</p>
      {quoteTerms && dates}

      </div>
    </header>
    <section className="order-document-customer"><div><p><b>Cliente:</b> {order.customer || "Ocasional"}</p><p><b>Teléfono:</b> {order.phone || "Sin teléfono"}</p>{order.ruc && <p><b>CI / RUC:</b> {order.ruc}</p>}</div><p><b>Asesor:</b> {order.advisor}</p></section>
    {!quoteTerms && dates}
    {order.invoice === "Con factura" && <section className="order-document-invoice"><b>Factura a:</b> {order.invoiceName || "—"} · <b>RUC:</b> {order.invoiceRuc || "—"}{order.invoiceAddress && <p><b>Dirección:</b> {order.invoiceAddress}</p>}</section>}
    <section className="order-document-products"><table><thead><tr><th>Cant.</th><th>Producto</th><th>P. Unit.</th><th>Total</th></tr></thead><tbody>{order.items.length ? order.items.map(item => <tr key={item.id}><td>{item.quantity}</td><td>{item.name}</td><td>{money(item.price)}</td><td><b>{money(item.quantity * item.price)}</b></td></tr>) : <tr><td colSpan={4}>No hay productos agregados</td></tr>}</tbody></table>{order.notes && <p className="order-document-notes"><b>Detalles:</b> {order.notes}</p>}</section>
    <section className="order-document-totals"><div><span>Total:</span><b>{money(order.total)}</b></div>{!quoteTerms && amounts.payments.map(payment => <div key={payment.method}><span>Entrega {payment.method === "POS/Tarjeta" ? "tarjeta" : payment.method.toLocaleLowerCase("es")}:</span><span>{money(payment.amount)}</span></div>)}{amounts.preview && <p className="order-document-payment-note">Pago previsto · pendiente de confirmar en caja</p>}{!amounts.preview && amounts.proposed > 0 && <div className="order-document-proposed"><span>Pago previsto, sin cobrar:</span><span>{money(amounts.proposed)}</span></div>}{!quoteTerms && <div className="order-document-balance"><b>Saldo:</b><b>{money(amounts.balance)}</b></div>}</section>
    <footer className="order-document-footer"><strong>{quoteTerms ? "CONDICIONES DEL PRESUPUESTO:" : "INFORMACIÓN:"}</strong>{quoteTerms ? <p>Este presupuesto no registra una venta ni un pago. Precios sujetos a confirmación al vencimiento.</p> : <ul><li>Una vez abonado no se puede hacer devoluciones ni reintegros, solo se puede canjear por otro producto del mismo valor</li><li>Una vez aprobado el diseño, no se aceptan cambios ni devoluciones. Por favor, revise cuidadosamente antes de confirmar.</li></ul>}<div>Reclamos al: 0991 307 302</div></footer>
  </article></div>;
}
