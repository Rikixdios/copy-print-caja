"use client";
import { useState } from 'react';
import { Check, PackageCheck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { paidAmount, productionStatus } from './order-workflow';
import { pickupBlockReason } from './order-pickup';
import { displayDate, displayTime } from './date-format';

type PickupOrder = Omit<Parameters<typeof paidAmount>[0], 'paymentRecords' | 'payments'> & {
  id: string; customer: string; phone?: string; advisor: string; date?: string; createdAt: string;
  productionStatus?: string; collectionEntry?: boolean;
  items: { id: number; name: string; quantity: number; price: number }[];
  paymentRecords?: { id: string; amount: number; date: string; time: string; kind: string; cashier: string; payments: { method: string; amount: number }[] }[];
  payments?: { method: string; amount: number }[];
};
const money = (value: number) => `${new Intl.NumberFormat('es-PY').format(value)} Gs.`;
/** Rendered only as a matching result in the existing Cobrar search. */
export function PickupSearchResult<T extends PickupOrder>({ order, onTicket, onConfirm }: {
  order: T; onTicket?: (order: T) => void; onConfirm?: (order: T) => boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const paid = paidAmount(order), balance = Math.max(0, order.total - paid);
  const status = productionStatus(order.productionStatus), reason = pickupBlockReason(order);
  return <>
    <article className="order-card inline-order-card pickup-search-result">
      <div className="order-accent collection-pickup" aria-hidden="true"/>
      <div className="order-main">
        <div className="order-top"><div className="order-created-meta"><Badge variant="secondary">{order.id}</Badge><span>{displayDate(order.date)} · {displayTime(order.createdAt)}</span></div><Badge className="advisor-highlight">Asesor: {order.advisor}</Badge></div>
        <div className="pending-customer"><h2>{order.customer}</h2><Badge className="pickup-search-badge">Pagado completo · pendiente de retiro</Badge></div>
        {order.phone && <p className="pickup-help">{order.phone}</p>}
        <div className="mini-items">{order.items.map((item, index) => <span key={`${item.id}-${index}`}>{item.quantity} × {item.name}<b>{money(item.quantity * item.price)}</b></span>)}</div>
        <p className="pickup-help">Estado del trabajo: <b>{status === 'Listo' ? 'Listo para retirar' : status}</b></p>
        <details className="pickup-payments"><summary>Ver pagos registrados</summary>{order.paymentRecords?.length ? order.paymentRecords.map(record => <p key={record.id}><span>{record.kind} · {displayDate(record.date)} · {displayTime(record.time)} · {record.cashier}<small>{record.payments.map(payment => `${payment.method}: ${money(payment.amount)}`).join(' · ')}</small></span><b>{money(record.amount)}</b></p>) : order.payments?.map((payment, index) => <p key={index}><span>{payment.method}</span><b>{money(payment.amount)}</b></p>)}</details>
      </div>
      <section className="inline-checkout orderly-checkout" aria-label="Pedido pagado pendiente de retiro">
        <dl className="checkout-amounts"><div className="checkout-total"><dt>Total del pedido</dt><dd>{money(order.total)}</dd></div><div><dt>Pagado completo</dt><dd>{money(paid)}</dd></div><div className="checkout-balance"><dt>Saldo por cobrar</dt><dd>{money(balance)}</dd></div></dl>
        <div className="inline-payment-actions">{onTicket && <Button variant="outline" onClick={() => onTicket(order)}><Printer/>Ver / reimprimir ticket</Button>}{onConfirm && <Button className="pickup-confirm-button" disabled={!!reason} onClick={() => setConfirming(true)}><PackageCheck/>Confirmar entrega</Button>}</div>
        {reason && <p className="pickup-help">{reason}.</p>}
      </section>
    </article>
    <Dialog open={confirming} onOpenChange={setConfirming}><DialogContent><DialogHeader><DialogTitle>Confirmar entrega</DialogTitle></DialogHeader><p>Pedido <b>{order.id}</b> · {order.customer}</p><p>Pagado: <b>{money(paid)}</b> · Saldo: <b>{money(balance)}</b></p><p>Confirmá cuando entregues el trabajo a la clienta.</p>{reason && <p role="alert">{reason}</p>}<div className="pickup-confirm-actions"><Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button><Button disabled={!!reason} onClick={() => { if (onConfirm?.(order)) setConfirming(false); }}><Check/>Confirmar entrega</Button></div></DialogContent></Dialog>
  </>;
}
