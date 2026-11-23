"use client";
import {FormattedInput} from "./formatted-input";
import {displayDate,displayTime} from "./date-format";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import {sortHistory} from "./history-sort";
import {historyTotals} from "./history-totals";
import {ticketLabel} from "./order-identifiers";
import { paidAmount, productionStatus, productionStatuses, type ProductionStatus } from "./order-workflow";
import { createCashOrderSearch } from "./cash-order-search";
import { PickupSearchResult } from "./pickups-view";
import {
  Banknote,
  ArrowLeftRight,
  Check,
  CircleDollarSign,
  CreditCard,
  FileDown,
  Eye,
  Pencil,
  Send,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { printReport } from "./print-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Product = { id: number; name: string; price: number; category: string };
type CartItem = Product & { quantity: number };
type Payment = { method: string; amount: number; received?: number };
type PaymentRecord = {
  id: string;
  date: string;
  time: string;
  amount: number;
  kind: "Seña" | "Abono" | "Pago de saldo" | "Cobro completo";
  payments: Payment[];
  cashier: string;
};
type Order = { sourceOrderId?:string;
  id: string;
  customer: string;
  phone?: string;
  ruc?: string;
  productionStatus?: ProductionStatus | "Terminado";
  collectionLane?: "senas" | "pendientes";
  cashierNotice?: { by:string; at:string; reason:"saldo"|"actualizado" };
  advisor: string;
  createdAt: string;
  date?: string;
  items: CartItem[];
  total: number;
  status: "pendiente" | "cobrado" | "devuelto";
  payments?: Payment[];
  refund?: number;
  paymentRecords?: PaymentRecord[];
  requestedPayments?: Payment[];
  receiptKind?: PaymentRecord["kind"];
  collectionEntry?: boolean;
};
type Movement = {
  id: number;
  date: string;
  type: "apertura" | "gasto" | "retiro" | "cierre";
  amount: number;
  detail: string;
  user: string;
};
type HistoryOrder = Omit<Order, "status"> & { status: Order["status"] | "guardado"; sentToCashier?: boolean };
const isSeñaPropuesta = (order: HistoryOrder) => {
  const proposed = (order.requestedPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return order.status === "pendiente" && !order.paymentRecords?.length && proposed > 0 && proposed < order.total;
};
const moneyFormatter = new Intl.NumberFormat("es-PY");
const money = (value: number) => `${moneyFormatter.format(value)} Gs.`;
function collectionColor(order: Order) {
  const paid = paidAmount(order);
  const proposed = (order.requestedPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
  return proposed > 0 && (paid > 0 || proposed < order.total) ? "sena" : paid > 0 ? "abono" : "completo";
}
const today = () => new Date().toISOString().slice(0, 10);

const paymentMethods = ["Efectivo", "QR", "POS/Tarjeta", "Transferencia"];

export function InlinePendingPayment({
  order,
  cashOpen,
  editOrder,
  confirm,
  fullPaymentOnly = false,
}: {
  fullPaymentOnly?: boolean;
  order: Order;
  cashOpen: boolean;
  editOrder: (order: Order) => void;
  confirm: (order: Order, payments: Payment[]) => void;
}) {
  const [payments, setPayments] = useState<Payment[]>(order.requestedPayments?.length ? order.requestedPayments.map(payment => ({ ...payment })) : [
    { method: "Efectivo", amount: 0 },
  ]);
  useEffect(() => { if (order.cashierNotice) setPayments(order.requestedPayments?.length ? order.requestedPayments.map(payment=>({...payment})) : [{ method: "Efectivo", amount: 0 }]); }, [order.cashierNotice?.at]);
  const previouslyPaid = paidAmount(order);
  const proposed = (order.requestedPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(0, order.total - previouslyPaid);
  const received = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const remaining = Math.max(0, outstanding - received),
    change = Math.max(0, received - outstanding);
  const updateMethod = (index: number, method: string) =>
    setPayments((list) =>
      list.map((payment, i) => {
        if (i !== index) return payment;
        const other = list.reduce(
          (sum, item, j) =>
            j === index ? sum : sum + Number(item.amount || 0),
          0,
        );
        return {
          method,
          amount: method === "Efectivo" ? 0 : Math.max(0, outstanding - other),
        };
      }),
    );
  const updateAmount = (index: number, amount: number) =>
    setPayments((list) =>
      list.map((payment, i) =>
        i === index ? { ...payment, amount: Math.max(0, amount) } : payment,
      ),
    );
  const addPayment = () =>
    setPayments((list) => [
      ...list,
      { method: "QR", amount: Math.max(0, outstanding - received) },
    ]);
  const collectionKind = collectionColor(order);
  const collectionLabel = collectionKind === "sena" ? (previouslyPaid > 0 ? "Nuevo abono por registrar" : "Seña por registrar") : collectionKind === "abono" ? "Seña registrada · cobro posterior" : "Cobro completo";
  const actionLabel =
    received > 0 && remaining > 0
      ? previouslyPaid
        ? "Registrar abono"
        : "Registrar seña"
      : previouslyPaid
        ? "Cobrar saldo restante"
        : "Cobrar";
  return (
    <article className="order-card inline-order-card">
      <div className={`order-accent collection-${collectionKind}`} aria-hidden="true" />
      <div className="order-main">
        {order.cashierNotice && <p className="cashier-notice"><Send size={13}/>{order.cashierNotice.reason === "saldo" ? "Cliente quiere pagar el saldo" : "Pedido actualizado para cobrar"}<small>Avisó {order.cashierNotice.by}</small></p>}
        <div className="order-top">
          <div className="order-created-meta">
            <Badge variant="secondary">{order.id}</Badge>
            <span title="Fecha y hora de creación del pedido">{displayDate(order.date)} · {displayTime(order.createdAt)}</span>
          </div>
          <Badge className="advisor-highlight">Asesor: {order.advisor}</Badge>
        </div>
        <div className="pending-customer">
          <h2>{order.customer}</h2>
          <Badge className="pending-badge">
            {collectionLabel}
          </Badge>
        </div>
        <div className="mini-items">
          {order.items.map((item) => (
            <span key={item.id}>
              {item.quantity} × {item.name}
              <b>{money(item.price * item.quantity)}</b>
            </span>
          ))}
        </div>
      </div>
      <section className="inline-checkout orderly-checkout" aria-label="Resumen y registro del cobro">
        <dl className="checkout-amounts">
          <div className="checkout-total"><dt>Total del pedido</dt><dd>{money(order.total)}</dd></div>
          <div><dt>Abonado / seña</dt><dd>{money(previouslyPaid)}</dd></div>
          <div className="checkout-balance"><dt>Saldo por cobrar</dt><dd>{money(outstanding)}</dd></div>
        </dl>
        {!!order.requestedPayments?.length && <p className="checkout-proposal">{proposed < order.total ? "Seña a confirmar" : "Pago a confirmar"}: <b>{money(proposed)}</b> · Sin cobrar</p>}
        {outstanding === 0 ? <div className="inline-payment-actions"><p>Pago completo registrado. Al confirmar, podés encontrar el pedido en este buscador para entregarlo.</p><Button disabled={!cashOpen} onClick={()=>confirm(order,[])}><Check/>Cobrar completo</Button></div> : <>
        <h3 className="checkout-payment-heading">Registrar pago</h3>
        <div className="inline-payment-list">
          {payments.map((payment, index) => (
            <div
              className={`inline-payment-row ${payments.length > 1 ? "has-remove" : ""}`}
              key={index}
            >
              <label className="checkout-method"><span>Medio</span><Select
                value={payment.method}
                onValueChange={(method) => updateMethod(index, method)}
              >
                <SelectTrigger aria-label="Medio de pago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select></label>
              <label className="checkout-entry"><span>{payment.method === "Efectivo" ? "Efectivo recibido" : "Monto pagado"}</span><Input
                aria-label={
                  payment.method === "Efectivo"
                    ? "Monto que entrega el cliente"
                    : "Monto pagado"
                }
                type="number"
                min="0"
                placeholder={
                  payment.method === "Efectivo" ? "Monto que da" : "Monto"
                }
                value={payment.amount || ""}
                onChange={(event) =>
                  updateAmount(index, Number(event.target.value))
                }
              /></label>
              {payments.length > 1 && (
                <Button
                  className="inline-remove-payment"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar medio"
                  onClick={() =>
                    setPayments((list) => list.filter((_, i) => i !== index))
                  }
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="checkout-other-methods"><button type="button" onClick={addPayment}><Plus size={15}/> Otro medio de pago</button></div>
        {received > 0 && <dl className="checkout-payment-result" aria-live="polite"><div><dt>Este pago</dt><dd>{money(Math.min(received, outstanding))}</dd></div>{change > 0 ? <div><dt>Vuelto</dt><dd>{money(change)}</dd></div> : <div><dt>Saldo después del pago</dt><dd>{money(remaining)}</dd></div>}</dl>}
        <div className="inline-payment-actions">
          <Button
            disabled={!cashOpen || received <= 0 || (fullPaymentOnly && remaining > 0)}
            onClick={() => confirm(order, payments)}
          >
            <Check />
            {fullPaymentOnly ? "Confirmar cobro completo" : actionLabel}
          </Button>
        </div>
        </>}
      </section>
    </article>
  );
}

function OrderActions({ order, onEdit, onTicket, onDownload, onDelete }: { order: Order; onEdit?: (order: Order) => void; onTicket?: (order: Order) => void; onDownload?: (order: Order) => void; onDelete?: (order: Order) => void }) {
  return <div className="order-icon-actions">
    {onEdit && <Button variant="ghost" size="icon" title="Editar pedido" aria-label="Editar pedido" onClick={() => onEdit(order)}><Pencil/></Button>}
    {onTicket && <Button variant="ghost" size="icon" title="Ver pedido" aria-label="Ver pedido" onClick={() => onTicket(order)}><Eye/></Button>}
    {onDownload && <Button variant="ghost" size="icon" title="Descargar pedido" aria-label="Descargar pedido" onClick={() => onDownload(order)}><FileDown/></Button>}
    {onDelete && <Button variant="ghost" size="icon" title="Eliminar pedido" aria-label="Eliminar pedido" className="quick-delete" onClick={() => onDelete(order)}><Trash2/></Button>}
  </div>;
}

export function PendingEditView({
  orders,
  editOrder,
  cashOpen,
  confirmPayment,
  onTicket, onDownload, onDelete,
}: {
  onTicket?: (order: Order) => void;
  onDownload?: (order: Order) => void;
  onDelete?: (order: Order) => void;
  orders: Order[];
  editOrder: (order: Order) => void;
  cashOpen: boolean;
  confirmPayment: (order: Order, payments: Payment[]) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("es");
  const filtered = orders.filter(
    (order) =>
      !normalized ||
      [ticketLabel(order), order.id, order.customer, order.phone || "", order.ruc || ""].some(
        (value) => value.toLocaleLowerCase("es").includes(normalized),
      ),
  );
  return (
    <div className="pending-compact">
      <div className="section-head">
        <div>
          <span className="eyebrow">ACTUALIZACIÓN EN TIEMPO REAL</span>
          <h1>Pedidos para cobrar</h1>
          <p>Recibidos de todos los asesores.</p>
        </div>
        <Badge className={cashOpen ? "live-badge" : "refund-badge"}>
          {cashOpen ? `${orders.length} pendientes` : "Caja cerrada"}
        </Badge>
      </div>
      <div className="deposit-search search-box">
        <Search />
        <Input
          aria-label="Buscar pedidos para cobrar"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por cliente, CI/RUC, celular o pedido…"
        />
      </div>
      <div className="queue">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Check />
            <h2>{orders.length ? "No encontramos ese pedido" : "Todo al día"}</h2>
            <p>{orders.length ? "Probá con otro nombre, documento o número." : "No hay pedidos esperando cobro."}</p>
          </div>
        ) : (
          filtered.map((order) => (
            <div key={order.id} className="cash-order-entry"><OrderActions order={order} onEdit={editOrder} onTicket={onTicket} onDownload={onDownload} onDelete={onDelete}/><InlinePendingPayment key={`${order.id}-${paidAmount(order)}`}
              order={order}
              cashOpen={cashOpen}
              editOrder={editOrder}
              confirm={confirmPayment}
            /></div>
          ))
        )}
      </div>
    </div>
  );
}

type DepositsViewProps = {
  onTicket?: (order: Order) => void;
  onDownload?: (order: Order) => void;
  onDelete?: (order: Order) => void;
  initialQuery?: string;
  orders: Order[];
  searchOrders?: Order[];
  confirmPickup?: (order: Order) => boolean;
  editOrder: (order: Order) => void;
  cashOpen: boolean;
  confirmPayment: (order: Order, payments: Payment[]) => void;
  onPrintDeposit?: (order: Order, record: PaymentRecord) => void;
};
const emptyCashOrders: Order[] = [];
const CASH_RESULT_PAGE_SIZE = 20;

export function DepositsView({
  orders,
  searchOrders = emptyCashOrders,
  confirmPickup,
  initialQuery = "",
  editOrder,
  cashOpen,
  confirmPayment,
  onTicket, onDownload, onDelete,
  onPrintDeposit,
}: DepositsViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [colorFilter, setColorFilter] = useState("todos");
  const deferredQuery = useDeferredValue(query);
  const search = useMemo(() => createCashOrderSearch(orders, searchOrders), [orders, searchOrders]);
  return (
    <div className="pending-compact deposits-view">
      <div className="section-head">
        <div>
          <span className="eyebrow">TODOS LOS PEDIDOS EN CAJA</span>
          <h1>Cobrar</h1>
          <p>Naranja: seña o abono por registrar · Azul: seña registrada, cobro posterior · Verde: cobro completo sin seña.</p>
        </div>
        <Badge className={cashOpen ? "live-badge" : "refund-badge"}>
          {cashOpen ? `${orders.length} pendientes` : "Caja cerrada"}
        </Badge>
      </div>
      <div className="cash-search-filters"><div className="deposit-search search-box">
        <Search />
        <Input
          aria-label="Buscar pedidos y retiros"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por cliente, CI/RUC, celular o pedido…"
        />
      </div><label className="cash-color-filter"><span className="sr-only">Filtrar por color</span><select aria-label="Filtrar pedidos por color" value={colorFilter} onChange={event=>setColorFilter(event.target.value)}><option value="todos">Todos los colores</option><option value="sena">🟠 Naranja · Por registrar</option><option value="abono">🔵 Azul · Seña registrada</option><option value="completo">🟢 Verde · Cobro completo</option></select></label></div>
      <CashSearchResults
        query={deferredQuery} colorFilter={colorFilter} search={search} orders={orders}
        confirmPickup={confirmPickup} editOrder={editOrder} cashOpen={cashOpen}
        confirmPayment={confirmPayment} onTicket={onTicket} onDownload={onDownload}
        onDelete={onDelete} onPrintDeposit={onPrintDeposit}
      />
    </div>
  );
}

// The input can commit immediately while React schedules the matching cards separately.
const CashSearchResults = memo(function CashSearchResults({
  query, colorFilter, search, orders, confirmPickup, editOrder, cashOpen,
  confirmPayment, onTicket, onDownload, onDelete, onPrintDeposit,
}: DepositsViewProps & { query: string; colorFilter: string; search: ReturnType<typeof createCashOrderSearch<Order>> }) {
  const [page, setPage] = useState({ query, colorFilter, limit: CASH_RESULT_PAGE_SIZE });
  const limit = page.query === query && page.colorFilter === colorFilter ? page.limit : CASH_RESULT_PAGE_SIZE;
  const filtered = useMemo(() => search(query).filter(({ order, pickup }) =>
    pickup || colorFilter === "todos" || collectionColor(order) === colorFilter,
  ), [search, query, colorFilter]);
  const normalized = query.trim();
  const hasPickup = filtered.some(result => result.pickup);
  const visible = filtered.slice(0, limit);
  return <>
      <p className="cash-filter-count" role="status">{normalized ? `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}` : `${filtered.length} de ${orders.length} pedidos`}</p>
      {normalized && hasPickup && <p className="cash-search-pickup-hint">Lila: pagado completo, pendiente de retiro.</p>}
      <div className="queue">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Check />
            <h2>{normalized || orders.length ? "No encontramos ese pedido" : "No hay pedidos pendientes"}</h2>
            <p>{normalized || orders.length ? "Probá con otro nombre, documento, número o color." : "Aquí aparecerán los pedidos enviados a caja, las señas y los saldos pendientes."}</p>
          </div>
        ) : (
          visible.map(({ order, pickup }) => pickup ? (
            <PickupSearchResult key={order.id} order={order} onTicket={onTicket} onConfirm={confirmPickup}/>
          ) : (
            <div key={order.id} className="deposit-entry"><OrderActions order={order} onEdit={editOrder} onTicket={onTicket} onDownload={onDownload} onDelete={onDelete}/>
              <InlinePendingPayment key={`${order.id}-${paidAmount(order)}`}
                order={order}
                cashOpen={cashOpen}
                editOrder={editOrder}
                confirm={confirmPayment}
              />
              {onPrintDeposit && !!order.paymentRecords?.length && <details className="deposit-tickets compact-deposit-tickets">
                <summary>Tickets de señas y abonos ({order.paymentRecords.length})</summary>
                {order.paymentRecords.map(record => <button key={record.id} type="button" onClick={() => onPrintDeposit(order, record)}><Printer size={16}/> {record.kind} · {money(record.amount)} · {displayDate(record.date)} · Imprimir</button>)}
              </details>}
            </div>
          ))
        )}
      </div>
      {visible.length < filtered.length && <div className="cash-results-more">
        <p>Mostrando {visible.length} de {filtered.length} pedidos</p>
        <Button variant="outline" onClick={() => setPage({ query, colorFilter, limit: limit + CASH_RESULT_PAGE_SIZE })}>Mostrar más pedidos</Button>
      </div>}
  </>;
});

export function SalePreviewDialog({
  open,
  customer,
  phone,
  ruc,
  items,
  total,
  close,
  confirm,
  confirmLabel = "Enviar a cobrar",
}: {
  open: boolean;
  customer: string;
  phone: string;
  ruc: string;
  items: CartItem[];
  total: number;
  close: () => void;
  confirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Previsualización del cobro</DialogTitle>
        </DialogHeader>
        <div className="sale-preview">
          <div className="sale-preview-client">
            <span>Cliente</span>
            <strong>{customer || "Ocasional"}</strong>
            {phone && <small>Celular: {phone}</small>}
            {ruc && <small>CI/RUC: {ruc}</small>}
          </div>
          <div className="sale-preview-head">
            <span>Producto</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span>Total</span>
          </div>
          {items.map((item) => (
            <div className="sale-preview-row" key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.quantity}</span>
              <span>{money(item.price)}</span>
              <b>{money(item.price * item.quantity)}</b>
            </div>
          ))}
          <div className="sale-preview-total">
            <span>Total a cobrar</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
        <div className="sale-preview-actions">
          <Button variant="outline" onClick={close}>
            Volver a editar
          </Button>
          <Button disabled={!items.length} onClick={confirm}>
            <Check />
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{money(value)}</strong>
      </div>
    </div>
  );
}

export function PaymentEditor({
  open,
  order,
  products,
  updateOrder,
  payments,
  setPayments,
  paid,
  close,
  confirm,
}: any) {
  const [manual, setManual] = useState({ name: "", price: 0 });
  if (!order)
    return (
      <Dialog open={open} onOpenChange={(value) => !value && close()}>
        <DialogContent />
      </Dialog>
    );
  const total = order.total || 0,
    remaining = Math.max(0, total - paid),
    change = Math.max(0, paid - total);
  const setItems = (items: CartItem[]) => updateOrder({ ...order, items });
  const addManual = () => {
    if (!manual.name.trim()) return toast.error("Escribí el producto");
    setItems([
      ...order.items,
      {
        id: Date.now(),
        name: manual.name.trim(),
        price: Number(manual.price) || 0,
        quantity: 1,
        category: "Manual",
      },
    ]);
    setManual({ name: "", price: 0 });
  };
  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Revisar y cobrar {order.id}</DialogTitle>
        </DialogHeader>
        <div className="payment-editor">
          <section>
            <h3 className="subheading">Editar pedido antes de cobrar</h3>
            <div className="pending-edit-list">
              {order.items.map((item: CartItem) => (
                <div className="pending-edit-row" key={item.id}>
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      setItems(
                        order.items.map((x: CartItem) =>
                          x.id === item.id ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Input
                    aria-label="Cantidad"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems(
                        order.items.map((x: CartItem) =>
                          x.id === item.id
                            ? {
                                ...x,
                                quantity: Math.max(1, Number(e.target.value)),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <Input
                    aria-label="Precio unitario"
                    type="number"
                    min="0"
                    value={item.price}
                    onChange={(e) =>
                      setItems(
                        order.items.map((x: CartItem) =>
                          x.id === item.id
                            ? {
                                ...x,
                                price: Math.max(0, Number(e.target.value)),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <strong>{money(item.price * item.quantity)}</strong>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="quick-delete"
                    onClick={() =>
                      setItems(
                        order.items.filter((x: CartItem) => x.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <div className="manual-inline">
              <Input
                placeholder="Producto o servicio adicional"
                value={manual.name}
                onChange={(e) => setManual({ ...manual, name: e.target.value })}
              />
              <Input
                placeholder="Precio"
                type="number"
                value={manual.price || ""}
                onChange={(e) =>
                  setManual({ ...manual, price: Number(e.target.value) })
                }
              />
              <Button variant="outline" onClick={addManual}>
                <Plus />
                Agregar
              </Button>
            </div>
            <div className="catalog-quick">
              <span>Agregar del catálogo:</span>
              {products.slice(0, 6).map((product: Product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    setItems([
                      ...order.items,
                      { ...product, id: Date.now() + product.id, quantity: 1 },
                    ])
                  }
                >
                  {product.name}
                </button>
              ))}
            </div>
            <h3 className="subheading">Métodos de pago</h3>
            {payments.map((payment: Payment, index: number) => (
              <div className="payment-row" key={index}>
                <Select
                  value={payment.method}
                  onValueChange={(method) =>
                    setPayments((list: Payment[]) =>
                      list.map((item, i) =>
                        i === index ? { ...item, method } : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Efectivo", "QR", "POS/Tarjeta", "Transferencia"].map(
                      (method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={
                    payment.method === "Efectivo"
                      ? "Monto que entrega"
                      : "Monto pagado"
                  }
                  value={payment.amount || ""}
                  onChange={(e) =>
                    setPayments((list: Payment[]) =>
                      list.map((item, i) =>
                        i === index
                          ? { ...item, amount: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                {payments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setPayments((list: Payment[]) =>
                        list.filter((_: Payment, i: number) => i !== index),
                      )
                    }
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() =>
                setPayments((list: Payment[]) => [
                  ...list,
                  { method: "QR", amount: remaining },
                ])
              }
            >
              <Plus />
              Otro medio de pago
            </Button>
          </section>
          <aside className="payment-summary">
            <span>Total a cobrar</span>
            <strong>{money(total)}</strong>
            <div>
              <p>
                Entregado <b>{money(paid)}</b>
              </p>
              <p>
                Falta <b>{money(remaining)}</b>
              </p>
              <p className="change">
                Vuelto <b>{money(change)}</b>
              </p>
            </div>
            <Button
              className="send-button"
              disabled={remaining > 0 || !order.items.length}
              onClick={confirm}
            >
              <Check />
              Confirmar cobro
            </Button>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SalesHistory({
  title,
  orders,
  onTicket,
  onEdit, onDownload, onProductionChange, onNotify, advisorFilter, orderSummary = false,
  onRefund,
  onRedo,
  onDelete, onHidePaid, onReturnSaved, onMoveMany, moveLabel="Mover al Historial",
  onEditSaved,
  onSendSaved,
  showAllDates = false, showSorting=false, disableDateFilter = false, searchAllDates = false,
  canPrintReport = true, personalAdvisorOnly=false, searchAndDatesOnly = false, lookupOrders,
}: {
  onNotify?: (order: HistoryOrder) => void;
  onEdit?: (order: HistoryOrder) => void;
  onDownload?: (order: HistoryOrder) => void;
  onProductionChange?: (order: HistoryOrder, value: ProductionStatus) => void;
  advisorFilter?: string;
  orderSummary?: boolean;
  title: string;
  orders: HistoryOrder[];
  onTicket?: (o: any) => void;
  canPrintReport?: boolean;personalAdvisorOnly?:boolean;
  onRefund?: (o: any) => void;
  onRedo?: (o: any) => void;
  onDelete?: (o: any) => void;
  onHidePaid?: (order:HistoryOrder)=>void;
  onReturnSaved?: (order:HistoryOrder)=>void;
  moveLabel?:string;
  onMoveMany?:(ids:string[])=>void;
  onEditSaved?: (o: HistoryOrder) => void;
  onSendSaved?: (o: HistoryOrder) => void;
  showAllDates?: boolean;
  disableDateFilter?: boolean;
  searchAllDates?: boolean;
  showSorting?:boolean;
  searchAndDatesOnly?: boolean;
  lookupOrders?: HistoryOrder[];
}) {
  const [sortDirection,setSortDirection]=useState<"newest"|"oldest">("newest");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState(advisorFilter || "todos");
  const [type, setType] = useState("todos");
  const [productionFilter,setProductionFilter]=useState("todos");
  const [from, setFrom] = useState(showAllDates ? "" : today());
  const [to, setTo] = useState(showAllDates ? "" : today());
  const normalized = query.trim().toLocaleLowerCase("es");
  const ignoreDateFilter = disableDateFilter || (searchAllDates && !!normalized);
  const searchingOtherOrders = !!normalized && lookupOrders !== undefined;
  const candidates = searchingOtherOrders ? [...orders, ...lookupOrders] : orders;
  const canManage = (order: HistoryOrder) => !personalAdvisorOnly || order.advisor === advisorFilter;
  const filtered = candidates.filter(
    (order) =>
      (personalAdvisorOnly ? canManage(order) || searchingOtherOrders : selectedAdvisor === "todos" || order.advisor === selectedAdvisor) &&
      (productionFilter==="todos"||productionStatus(order.productionStatus)===productionFilter) &&
      (type === "todos" ||
        (type === "guardados" && order.status === "guardado" && !('sentToCashier' in order && order.sentToCashier)) ||
        (type === "enviados" && ((order.status === "pendiente" && !isSeñaPropuesta(order)) || (order.status === "guardado" && 'sentToCashier' in order && order.sentToCashier))) ||
        (type === "senas" && (isSeñaPropuesta(order) || (orderSummary ? order.status === "pendiente" && paidAmount(order) > 0 : ["Seña", "Abono"].includes(order.receiptKind || "")))) ||
        (type === "cobrados" && order.status === "cobrado" && !["Seña", "Abono"].includes(order.receiptKind || ""))) &&
      (ignoreDateFilter || !from || (order.date || today()) >= from) &&
      (ignoreDateFilter || !to || (order.date || today()) <= to) &&
      (!normalized ||
        [ticketLabel(order), order.id, order.customer, order.advisor, order.ruc || "", order.phone || "", ...order.items.map(item => item.name)].some(
          (value) => value.toLocaleLowerCase("es").includes(normalized),
        )),
  );
  const sortedOrders=sortHistory(filtered,sortDirection);
  const selectable = filtered.filter(canManage);
  const selectedVisible=selectable.filter(order=>selectedIds.includes(order.id)).map(order=>order.id);
  const totals = searchAndDatesOnly ? null : historyTotals(filtered, orderSummary);
  const by = (method: string) => totals?.methods[method] || 0;
  return (
    <div className={`print-area sales-history-view ${onMoveMany?"advisor-selectable-history":""}`}>
      <div className="section-head history-head">
        <div>
          {!searchAndDatesOnly && <span className="eyebrow">CONSULTA POR FECHA</span>}
          <h1>{title}</h1>
          {!searchAndDatesOnly && <p>Buscá por cliente, CI/RUC, teléfono, producto o número de pedido.</p>}
        </div>
        {!searchAndDatesOnly && canPrintReport && <Button className="history-print" onClick={e => printReport(e.currentTarget.closest<HTMLElement>(".print-area"))}>
          <Printer />
          Imprimir reporte
        </Button>}
      </div>
      {!searchAndDatesOnly && <>
        <div className="history-type-filters">{advisorFilter&&!personalAdvisorOnly && <><label htmlFor="history-advisor">Asesor</label><select id="history-advisor" aria-label="Buscar pedidos por asesor" value={selectedAdvisor} onChange={e => setSelectedAdvisor(e.target.value)}><option value="todos">Todos los asesores</option>{[...new Set([advisorFilter, ...orders.map(order => order.advisor)])].map(name => <option key={name} value={name}>{name}</option>)}</select></>}<label htmlFor="history-type">Mostrar</label><select id="history-type" value={type} onChange={e => setType(e.target.value)}><option value="todos">Todos</option><option value="guardados">Pedidos guardados</option><option value="enviados">Enviados a caja</option><option value="senas">Señas y abonos</option><option value="cobrados">Cobrados</option></select></div>
        <div className="history-type-filters">{onProductionChange&&<><label htmlFor="history-production-filter">Estado del pedido</label><select id="history-production-filter" value={productionFilter} onChange={e=>setProductionFilter(e.target.value)}><option value="todos">Todos los estados</option>{productionStatuses.map(value=><option key={value} value={value}>{value==="En proceso"?"Preparando":value}</option>)}</select></>}</div>
        {showSorting&&<div className="history-type-filters"><label htmlFor="history-sort">Ordenar registros</label><select id="history-sort" value={sortDirection} onChange={e=>setSortDirection(e.target.value as "newest"|"oldest")}><option value="newest">Más recientes primero</option><option value="oldest">Más antiguos primero</option></select></div>}
      </>}
      <div className="history-filters">
        <div className="search-box">
          <Search />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (advisorFilter && !personalAdvisorOnly && e.target.value.trim()) setSelectedAdvisor("todos"); }}
            aria-label={lookupOrders ? "Buscar pedidos de cualquier asesor" : "Buscar pedidos"}
            placeholder={personalAdvisorOnly && !lookupOrders ? "Buscar en mis pedidos…" : advisorFilter ? "Buscar cliente o pedido de cualquier asesor…" : "Cliente, producto, CI/RUC o pedido…"}
          />
        </div>
        {!disableDateFilter && <>
        <label>
          Desde
          <FormattedInput
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <FormattedInput
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        </>}
      </div>
      {totals && <div className="metric-grid history-metrics">
        <Metric icon={<Banknote />} label="Efectivo" value={by("Efectivo")} />
        <Metric icon={<ArrowLeftRight />} label="Transferencia" value={by("Transferencia")} />
        <Metric icon={<QrCode />} label="QR" value={by("QR")} />
        <Metric
          icon={<CreditCard />}
          label="POS / Tarjeta"
          value={by("POS/Tarjeta")}
        />
        <Metric icon={<WalletCards />} label="Total general" value={totals.total} />
      </div>}
      {onMoveMany&&<div className="history-bulk-actions"><label><input type="checkbox" aria-label="Seleccionar todos los pedidos filtrados" checked={selectable.length>0&&selectedVisible.length===selectable.length} onChange={e=>setSelectedIds(e.target.checked?selectable.map(order=>order.id):[])}/> {lookupOrders ? "Seleccionar mis resultados" : "Seleccionar todos los resultados"} ({selectable.length})</label><span>{selectedVisible.length} seleccionados</span><Button disabled={!selectedVisible.length} onClick={()=>onMoveMany(selectedVisible)}><RotateCcw/>{moveLabel} ({selectedVisible.length})</Button>{selectedIds.length>0&&<Button variant="outline" onClick={()=>setSelectedIds([])}>Limpiar selección</Button>}</div>}
      <div className={`table-card history-table ${onProductionChange ? "with-production" : ""}`}>
        <div className="table-head">
          <span>Fecha / ticket</span>
          <span>Cliente</span>
          <span>Asesor</span>
          <span>Medio</span>
          <span>Total</span>
          <span>Cobro</span>
          {onProductionChange && <span>Trabajo</span>}
          <span>Acciones</span>
        </div>
        {sortedOrders.map((order) => {
          const manageable = canManage(order);
          const status = productionStatus(order.productionStatus);
          const statusLabel = status === "En proceso" ? "Preparando" : status;
          return (
          <div className="table-row" key={order.id}>
            <span className="history-ticket">
              {onMoveMany&&manageable&&<input className="history-row-select" type="checkbox" aria-label={`Seleccionar ${ticketLabel(order)}`} checked={selectedIds.includes(order.id)} onChange={e=>setSelectedIds(ids=>e.target.checked?[...new Set([...ids,order.id])]:ids.filter(id=>id!==order.id))}/>}

              <b title={ticketLabel(order)}>{ticketLabel(order)}</b>
              <small>
                {displayDate(order.date)} · {displayTime(order.createdAt)}
              </small>
            </span>
            <span className="history-client">
              {order.customer}
              <small>{order.ruc || order.phone || ""}</small>
              <small className="mobile-order-meta">
                {order.advisor} ·{" "}
                {order.payments?.map((p) => p.method).join(" + ") || "—"}
              </small>
            </span>
            <span className="history-advisor">{order.advisor}</span>
            <span className="history-payment">
              {order.payments?.map((p) => p.method).join(" + ") || "—"}
            </span>
            <strong className="history-total">
              {money(order.total - (order.refund || 0))}
              {orderSummary && <small className="history-balance">Abonado {money(paidAmount(order))}<br/>Saldo {money(Math.max(0, order.total - paidAmount(order)))}</small>}
            </strong>
            <Badge
              className={`history-status ${order.status === "cobrado" ? "paid-badge" : order.status === "devuelto" ? "refund-badge" : "pending-badge"}`}
            >
                {order.status === "guardado" ? "Pedido guardado" : orderSummary && order.status === "cobrado" ? "Cobro completo" : orderSummary && order.status === "pendiente" && paidAmount(order) > 0 ? "Seña / abono" : isSeñaPropuesta(order) ? "Seña por confirmar" : order.receiptKind || (order.status === "pendiente" ? "En caja · sin cobrar" : order.status === "cobrado" ? "Cobro completo" : order.status)}
            </Badge>
            {onProductionChange && (manageable ? (
              <select className={`production-select production-${status.toLowerCase().replace(/ /g,"-")}`} aria-label={`Estado del trabajo ${order.id}`} value={status} onChange={e => onProductionChange(order, e.target.value as ProductionStatus)}>{productionStatuses.map(value => <option key={value} value={value}>{value==="En proceso"?"Preparando":value}</option>)}</select>
            ) : <Badge className={`production-select production-${status.toLowerCase().replace(/ /g,"-")}`}>{statusLabel}</Badge>)}
            <span className="sale-actions">
              {manageable && (onEdit || onEditSaved) && <Button variant="ghost" size="icon" title="Editar pedido" aria-label="Editar pedido" onClick={() => (onEdit || onEditSaved)?.(order)}><Pencil/></Button>}
              {onTicket && <Button variant="ghost" size="icon" title="Ver pedido" aria-label="Ver pedido" onClick={() => onTicket(order)}><Eye/></Button>}
              {manageable && onDownload && <Button variant="ghost" size="icon" title="Descargar pedido" aria-label="Descargar pedido" onClick={() => onDownload(order)}><FileDown/></Button>}
              {manageable && onReturnSaved&&<Button variant="ghost" size="icon" title={moveLabel} aria-label={moveLabel} onClick={()=>onReturnSaved(order)}><RotateCcw/></Button>}
              {manageable && onHidePaid&&<Button disabled={!(order.status==="cobrado"&&order.total>0&&paidAmount(order)>=order.total)} variant="ghost" size="icon" title={order.status==="cobrado"&&paidAmount(order)>=order.total?"Eliminar de mi lista (conservar pago en caja)":"Disponible cuando el pedido esté totalmente cobrado"} aria-label="Eliminar de mi lista" className="quick-delete" onClick={()=>onHidePaid(order)}><Trash2/></Button>}
              {manageable && onDelete && <Button variant="ghost" size="icon" title="Eliminar" aria-label="Eliminar" className="quick-delete" onClick={() => onDelete(order)}><Trash2/></Button>}
              {manageable && onNotify && order.status === "pendiente" && order.total > paidAmount(order) && <Button variant="ghost" size="icon" title="Avisar a caja para pagar saldo" aria-label="Avisar a caja para pagar saldo" onClick={() => onNotify(order)}><Send/></Button>}
              {manageable && order.status === "guardado" && onSendSaved && <Button variant="ghost" size="icon" title="Enviar a caja" aria-label="Enviar a caja" onClick={() => onSendSaved(order)}><Send/></Button>}
            </span>
          </div>
          );
        })}
        {!filtered.length && (
          <div className="empty-state">
            <Search />
            <h2>Sin registros encontrados</h2>
            <p>Cambiá la fecha o el dato buscado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CashControl({
  orders,
  movements,
  onMovement,
  onPrint,
}: {
  orders: Order[];
  movements: Movement[];
  onMovement: (m: any) => void;
  onPrint: () => void;
}) {
  const [opening, setOpening] = useState(0),
    [amount, setAmount] = useState(0),
    [detail, setDetail] = useState(""),
    [type, setType] = useState<"gasto" | "retiro">("gasto");
  const current = today();
  const dailyOrders = orders.filter(
      (order) => order.date === current && order.status !== "pendiente",
    ),
    daily = movements.filter((movement) => movement.date === current);
  const openingTotal = daily
      .filter((m) => m.type === "apertura")
      .reduce((sum, m) => sum + m.amount, 0),
    out = daily
      .filter((m) => m.type !== "apertura")
      .reduce((sum, m) => sum + m.amount, 0),
    cashSales = dailyOrders.reduce(
      (sum, order) =>
        sum +
        (order.payments || [])
          .filter((p) => p.method === "Efectivo")
          .reduce((value, p) => value + p.amount, 0),
      0,
    ),
    expected = openingTotal + cashSales - out;
  return (
    <div className="print-area">
      <div className="section-head">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN · ADMI</span>
          <h1>Control de caja</h1>
          <p>Apertura, gastos, retiros y resumen completo del día.</p>
        </div>
        <div className="head-actions">
          <Button variant="outline" onClick={onPrint}>
            <FileDown />
            Descargar A4
          </Button>
          <Button onClick={onPrint}>
            <Printer />
            Imprimir
          </Button>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          icon={<CircleDollarSign />}
          label="Apertura"
          value={openingTotal}
        />
        <Metric
          icon={<Banknote />}
          label="Ventas en efectivo"
          value={cashSales}
        />
        <Metric icon={<Minus />} label="Dinero que salió" value={out} />
        <Metric
          icon={<WalletCards />}
          label="Efectivo esperado"
          value={expected}
        />
      </div>
      <div className="cash-admin-grid">
        <section className="report-card">
          <h2>Apertura de caja</h2>
          <p className="card-help">
            Registrá el efectivo disponible al comenzar el turno.
          </p>
          <label className="field-label">
            Monto inicial
            <Input
              type="number"
              value={opening || ""}
              onChange={(e) => setOpening(Number(e.target.value))}
              placeholder="Ej.: 300000"
            />
          </label>
          <Button
            onClick={() => {
              onMovement({
                type: "apertura",
                amount: opening,
                detail: "Apertura de caja",
              });
              setOpening(0);
            }}
          >
            <Plus />
            Registrar apertura
          </Button>
        </section>
        <section className="report-card">
          <h2>Registrar salida de dinero</h2>
          <div className="cash-out-form">
            <Select
              value={type}
              onValueChange={(value: "gasto" | "retiro") => setType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gasto">Gasto de caja</SelectItem>
                <SelectItem value="retiro">Retiro / pago</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Motivo o detalle"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Monto"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                onMovement({
                  type,
                  amount,
                  detail: detail.trim() || "Sin detalle",
                });
                setAmount(0);
                setDetail("");
              }}
            >
              <Minus />
              Registrar salida
            </Button>
          </div>
        </section>
      </div>
      <section className="report-card cash-log">
        <div className="report-title">
          <h2>Movimientos de hoy</h2>
          <Badge variant="secondary">{daily.length} registros</Badge>
        </div>
        {daily.map((movement) => (
          <div className="cash-log-row" key={movement.id}>
            <Badge
              className={
                movement.type === "apertura" ? "paid-badge" : "refund-badge"
              }
            >
              {movement.type}
            </Badge>
            <span>
              <strong>{movement.detail}</strong>
              <small>{movement.user}</small>
            </span>
            <b className={movement.type === "apertura" ? "" : "negative"}>
              {movement.type === "apertura" ? "+ " : "− "}
              {money(movement.amount)}
            </b>
          </div>
        ))}
        {!daily.length && (
          <p className="card-help">
            Todavía no hay movimientos registrados hoy.
          </p>
        )}
      </section>
    </div>
  );
}

export function CatalogView({
  products,
  onAdd,
  onDelete,
  onEdit,
  onImport,
  BaseView,stocks=[],orders=[],
}: any) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState({ name: "", price: 0, category: "General",code:"",stockQuantity:"",purchasePrice:0,vat:"" });
  const save = () => {
    if (!draft.name.trim())
      return toast.error("Escribí el nombre del producto");
    const saved=onAdd({
      id: Date.now(),
      name: draft.name.trim(),
      price: Number(draft.price) || 0,
      category: draft.category.trim() || "General",code:draft.code.trim()||undefined,stockQuantity:draft.stockQuantity===""?undefined:Number(draft.stockQuantity),purchasePrice:Number(draft.purchasePrice),vat:draft.vat===""?null:Number(draft.vat),
    });
    if(saved!==true)return;
    setDraft({ name: "", price: 0, category: "General",code:"",stockQuantity:"",purchasePrice:0,vat:"" });
    setOpen(false);
  };
  return (
    <>
      <div className="catalog-manual-bar">
        <div>
          <strong>Catálogo de productos</strong>
          <span>Agregá productos y precios manualmente.</span>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nuevo producto
        </Button>
      </div>
      <BaseView
        products={products}
        stocks={stocks} orders={orders}
        onDelete={onDelete}
        onEdit={onEdit}
        onImport={onImport}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <label className="field-label">Código (manual o automático)<Input placeholder="Vacío: generar automáticamente" value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})}/></label>
          <label className="field-label">Cantidad de stock<Input type="number" min="0" step="any" value={draft.stockQuantity} onChange={e=>setDraft({...draft,stockQuantity:e.target.value})}/></label>
          <label className="field-label">Precio de compra<Input type="number" min="0" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)})}/></label>
          <label className="field-label">IVA (%)<Input type="number" min="0" max="100" placeholder="Sin especificar" value={draft.vat} onChange={e=>setDraft({...draft,vat:e.target.value})}/></label>
          <div className="grid gap-4">
            <label className="field-label">
              Nombre
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="field-label">
              Categoría
              <Input
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
            </label>
            <label className="field-label">
              Precio
              <Input
                type="number"
                value={draft.price || ""}
                onChange={(e) =>
                  setDraft({ ...draft, price: Number(e.target.value) })
                }
              />
            </label>
            <Button onClick={save}>Guardar producto</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
