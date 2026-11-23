"use client";
import {displayDate} from "./date-format";
import {businessMoment} from "./business-time";
import {FormattedInput} from "./formatted-input";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock3, FileText, Plus, RotateCcw, Save, Search, Send, Trash2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { OrderSummary } from "./order-summary";
import {createProductSearch,type CatalogProduct} from "./product-model";
import { paidAmount } from "./order-workflow";
import { QuantityInput } from "./quantity-input";
import { ProductSuggestions } from "./product-suggestions";
import { Input } from "@/components/ui/input";

type Product = CatalogProduct;
type CartItem = Product & { quantity: number };
type Customer = { id: number; name: string; phone: string; ruc?: string; discount: number; special: string };
export type SaleDetails = { advisor: string; invoice: string; notes: string; receivedDate: string; deliveryDate: string; deliveryTime: string; invoiceRuc: string; invoiceName: string; invoiceAddress: string };
export type SalePayment = { method: string; amount: number };
const methods = [
  { key: "Efectivo", label: "Efectivo", prompt: "Monto pagado en Efectivo (Gs)" },
  { key: "Transferencia", label: "Transf.", prompt: "Monto pagado por Transferencia (Gs)" },
  { key: "QR", label: "QR", prompt: "Monto pagado por QR (Gs)" },
  { key: "POS/Tarjeta", label: "POS", prompt: "Monto pagado con Tarjeta POS (Gs)" },
];
const money = (value: number) => `${new Intl.NumberFormat("es-PY").format(value)} Gs`;
const today = () => businessMoment().date;
const showDate = (value: string) => value ? displayDate(value) : "No especificada";
const clean = (value: string) => value.toLocaleLowerCase("es").replace(/[\s.-]/g, "");

export function NewSaleView(p: any) {
  const { products, initialOrder, cart, total, customer, setCustomer, customerPhone, setCustomerPhone, customerRuc, setCustomerRuc, customers, selectCustomer, add, updateQty, updatePrice, updateName, chooseProduct, remove, save, clear, editing, saveCustomer, cashOpen, advisor, advisors } = p;
  const [details, setDetails] = useState<SaleDetails>({ advisor: initialOrder?.advisor || advisor, invoice: initialOrder?.invoice || "Sin factura", notes: initialOrder?.notes || "", receivedDate: initialOrder?.date || today(), deliveryDate: initialOrder ? initialOrder.deliveryDate || "" : today(), deliveryTime: initialOrder?.deliveryTime || "", invoiceRuc: initialOrder?.invoiceRuc || "", invoiceName: initialOrder?.invoiceName || "", invoiceAddress: initialOrder?.invoiceAddress || "" });
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [amounts, setAmounts] = useState<Record<string, number>>({ Efectivo: 0, Transferencia: 0, QR: 0, "POS/Tarjeta": 0, ...Object.fromEntries((initialOrder?.requestedPayments || []).map((payment: SalePayment) => [payment.method, payment.amount])) });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [compactMore, setCompactMore] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const searchProducts = useMemo(() => createProductSearch(products), [products]);
  const activeQuery = (cart as CartItem[]).find(item => item.id === activeProductId)?.name || "";
  const suggestionQuery = useDeferredValue(activeQuery);
  const selectSuggestion = useCallback((id: number, product: Product) => {
    chooseProduct(id, product);
    setActiveProductId(null);
  }, [chooseProduct]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [pricePerMinute, setPricePerMinute] = useState(500);
  const [freeMinutes, setFreeMinutes] = useState(5);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setElapsed(v => v + 1), 1000); return () => window.clearInterval(timer); }, [running]);
  useEffect(() => { if (cart.length === 0) add({ id: -Date.now(), name: "", price: 0, quantity: 1, category: "Manual" }); }, [cart.length, add]);
  const paid = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const alreadyPaid = initialOrder ? paidAmount(initialOrder) : 0;
  const balance = Math.max(0, total - alreadyPaid - paid);
  const validItems = (cart as CartItem[]).filter(item => item.name.trim() && item.quantity > 0);
  const customerMatches = useMemo(() => {
    if (!customerOpen) return [];
    const queries = [customer === "Ocasional" ? "" : customer, customerPhone, customerRuc].map(clean).filter(Boolean);
    return (customers as Customer[]).filter(item => item.name !== "Ocasional" && (queries.length === 0 || queries.some(query => [item.name, item.phone, item.ruc || ""].some(value => clean(value).includes(query))))).slice(0, 6);
  }, [customerOpen, customers, customer, customerPhone, customerRuc]);
  const choose = (field: "name" | "phone" | "ruc", value: string) => {
    if (field === "name") setCustomer(value); else if (field === "phone") setCustomerPhone(value); else setCustomerRuc(value);

  };
  const reset = () => {
    clear(); setDetails({ advisor, invoice: "Sin factura", notes: "", receivedDate: today(), deliveryDate: today(), deliveryTime: "", invoiceRuc: "", invoiceName: "", invoiceAddress: "" });
    setAmounts({ Efectivo: 0, Transferencia: 0, QR: 0, "POS/Tarjeta": 0 }); setPaymentMethod("Efectivo"); setActiveProductId(null); setCustomerOpen(false); setRunning(false); setElapsed(0); setPricePerMinute(500); setFreeMinutes(5);
  };
  const submit = (destination: "guardar" | "enviar" | "cobrar" | "actualizar" | "abonar") => {
    if (destination !== "guardar" && destination !== "actualizar" && !cashOpen) return toast.error("La caja debe estar abierta para enviar a cobrar");
    if (!validItems.length || validItems.length !== cart.length) return toast.error("Completá la descripción de cada producto");
    if (destination !== "actualizar" && paid > total - alreadyPaid && amounts.Efectivo < paid - (total - alreadyPaid)) return toast.error("El pago supera el total. Revisá los importes");
    if (details.deliveryTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(details.deliveryTime)) return toast.error("Escribí la hora en formato de 24 horas, por ejemplo 12:00 o 18:30");
    const saved = save(details, methods.map(method => ({ method: method.key, amount: amounts[method.key] || 0 })).filter(payment => payment.amount > 0), destination);
    if (!saved) return;
    setAmounts({ Efectivo: 0, Transferencia: 0, QR: 0, "POS/Tarjeta": 0 });
    setDetails({ advisor, invoice: "Sin factura", notes: "", receivedDate: today(), deliveryDate: today(), deliveryTime: "", invoiceRuc: "", invoiceName: "", invoiceAddress: "" });
    setPaymentMethod("Efectivo");
    setCustomerOpen(false);
  };
  const seconds = String(elapsed % 60).padStart(2, "0");
  const minutes = String(Math.floor(elapsed / 60) % 60).padStart(2, "0");
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const billableMinutes = Math.max(0, Math.ceil(elapsed / 60) - freeMinutes);
  return <div className={`order-page ${previewOpen ? "compact-preview-open" : ""}`}>
    <div className="order-layout">
      <section className="order-form-card">
        <div className="order-gradient-head"><span className="order-head-icon"><FileText size={22}/></span><div><h1>{editing ? "Editar Orden" : "Nueva Orden"}</h1></div><span className="order-number">{editing ? "EDITANDO" : "NUEVA"}</span><button className="order-clear-button" type="button" onClick={reset} title="Limpiar el formulario y empezar un nuevo pedido"><RotateCcw size={16}/>Limpiar</button></div>
        <div className="order-form-body">
          {!cashOpen && <p className="order-closed">Caja cerrada. Podés guardar el pedido.</p>}
          <h2><FileText/> Cliente</h2>
          <div className="order-fields three"><label>Nombre<Input value={customer === "Ocasional" ? "" : customer} onChange={e => choose("name", e.target.value)} placeholder="Nombre del cliente" /></label><label>Teléfono<Input value={customerPhone} onChange={e => choose("phone", e.target.value)} placeholder="Teléfono del cliente" /></label><label>Asesor<div className="order-advisor"><select disabled={editing} value={details.advisor} onChange={e => setDetails({ ...details, advisor: e.target.value })}>{[...new Set([details.advisor, advisor, ...(advisors as string[])])].map(name => <option key={name} value={name}>{name}</option>)}</select><button type="button" title="Guardar cliente" aria-label="Guardar cliente" onClick={saveCustomer}><UserRoundPlus size={17}/></button></div></label></div>
          <div className="order-product-actions"><button type="button" aria-expanded={customerOpen} aria-controls="order-customer-results" onClick={() => setCustomerOpen(open => !open)}><Search size={16}/>{customerOpen ? "Cerrar búsqueda de clientes" : "Buscar entre mis clientes"}<ChevronDown size={16}/></button></div>
          {customerOpen && <div id="order-customer-results" className="order-customer-results" role="region" aria-label="Buscar entre mis clientes">{customerMatches.length ? customerMatches.map(item => <button type="button" key={item.id} onClick={() => { selectCustomer(item); setCustomerOpen(false); }}><strong>{item.name}</strong><span>{item.phone}{item.ruc ? ` · ${item.ruc}` : ""}</span><Check size={16}/></button>) : <p className="consult-help">No se encontraron clientes. Podés continuar con el nombre que escribiste.</p>}</div>}
          <details className="optional-fields" open={details.invoice === "Con factura" || undefined}><summary>Factura y notas</summary><div className="order-fields two"><label>CI / RUC del cliente<Input value={customerRuc} onChange={e => choose("ruc", e.target.value)} placeholder="CI o RUC del cliente"/></label></div>
          <div className="order-fields two"><label>Factura<select value={details.invoice} onChange={e => setDetails({ ...details, invoice: e.target.value })}><option>Sin factura</option><option>Con factura</option></select></label><label>Detalles adicionales<Input value={details.notes} onChange={e => setDetails({ ...details, notes: e.target.value })} placeholder="Especificaciones del cliente" /></label></div>
          {details.invoice === "Con factura" && <div className="order-fields three order-invoice-fields"><label>Número de RUC<Input value={details.invoiceRuc} onChange={e => setDetails({ ...details, invoiceRuc: e.target.value })} placeholder="RUC"/></label><label>Factura a nombre de<Input value={details.invoiceName} onChange={e => setDetails({ ...details, invoiceName: e.target.value })} placeholder="Nombre o razón social"/></label><label>Dirección<Input value={details.invoiceAddress} onChange={e => setDetails({ ...details, invoiceAddress: e.target.value })} placeholder="Dirección"/></label></div>}
          </details><section className="order-delivery-fields" aria-label="Fecha y hora de entrega">
          <div className="order-fields three"><label>Fecha del pedido<FormattedInput type="date" value={initialOrder?.date || today()} readOnly title="Se registra automáticamente al guardar el pedido"/></label><label>Fecha Entrega<FormattedInput type="date" value={details.deliveryDate} onChange={e => setDetails({ ...details, deliveryDate: e.target.value })}/></label><label>Hora Entrega<Input type="text" inputMode="numeric" placeholder="12:00" maxLength={5} aria-label="Hora de entrega en formato de 24 horas" value={details.deliveryTime} onChange={e => { const value = e.target.value.replace(/[^0-9:]/g, ""); const formatted = !value.includes(":") && value.length > 2 ? `${value.slice(0, 2)}:${value.slice(2, 4)}` : value; setDetails({ ...details, deliveryTime: formatted }); }}/></label></div>
          </section><h2><FileText/> Productos</h2>
          <div className="order-product-scroll"><div className="order-product-table"><div className="order-product-header"><span>CANT.</span><span>DESCRIPCIÓN</span><span>PRECIO (GS)</span><span>TOTAL (GS)</span><span>ACCIÓN</span></div>{(cart as CartItem[]).map(item => { return <div className="order-product-row" key={item.id}><QuantityInput value={item.quantity} onChange={quantity => updateQty(item.id, quantity - item.quantity)}/><div className="order-description-cell"><Input aria-label="Descripción del producto" autoComplete="off" value={item.name} onFocus={() => setActiveProductId(item.id)} onBlur={() => window.setTimeout(() => setActiveProductId(current => current === item.id ? null : current), 160)} onChange={e => { updateName(item.id, e.target.value); setActiveProductId(item.id); }} placeholder="Código, últimos 5 dígitos o nombre"/>{activeProductId === item.id && <ProductSuggestions query={suggestionQuery} search={searchProducts} itemId={item.id} onChoose={selectSuggestion}/>}</div><Input aria-label="Precio unitario" type="number" min="0" value={item.price || ""} onChange={e => updatePrice(item.id, Number(e.target.value))} placeholder="Precio unitario"/><output>{money(item.price * item.quantity)}</output><button type="button" aria-label={`Quitar ${item.name || "producto"}`} onClick={() => remove(item.id)}><Trash2 size={17}/></button></div>; })}</div></div>
          <div className="order-product-actions"><button type="button" onClick={() => add({ id: -Date.now(), name: "", price: 0, quantity: 1, category: "Manual" })}><Plus size={17}/> Agregar producto</button></div>
          <h2><FileText/> {alreadyPaid > 0 ? "Resumen de pago" : "Pago previsto"}</h2>
          <div className="order-cost"><span>Total</span><strong>{money(total)}</strong></div>
          <div className="order-payment-summary"><div><span>Ya abonado</span><strong>{money(alreadyPaid)}</strong></div><div><span>Saldo actual</span><strong>{money(Math.max(0,total-alreadyPaid))}</strong></div></div>
          <p className="consult-help">Ingresá solamente el nuevo monto recibido. Guardar actualiza los pagos. Cobrar completo cierra el pedido y lo pasa al historial de caja.</p>
          <div className="order-payment-tabs" role="tablist" aria-label="Formas de pago">{methods.map(method => <button type="button" role="tab" aria-selected={paymentMethod === method.key} className={paymentMethod === method.key ? "selected" : ""} key={method.key} onClick={() => setPaymentMethod(method.key)}>{method.label}</button>)}</div>
          <label className="order-amount">{methods.find(method => method.key === paymentMethod)?.prompt}<Input type="number" min="0" value={amounts[paymentMethod] || ""} onChange={e => setAmounts({ ...amounts, [paymentMethod]: Math.max(0, Number(e.target.value)) })} placeholder="0"/></label>
          <div className="order-payment-summary"><div><span>{alreadyPaid > 0 ? "Nuevo abono" : "Pago previsto"}</span><strong>{money(paid)}</strong></div><div><span>Falta cobrar</span><strong>{money(balance)}</strong></div></div>
          <div className="order-main-actions">{p.onlySend&&<button className="order-save" type="button" onClick={()=>submit(p.canRegisterPayment && paid > 0 ? "abonar" : "actualizar")}><Save size={16}/>Guardar</button>}{!p.onlySend && <button className="order-save" type="button" onClick={() => submit("guardar")}><Save size={16}/> Guardar</button>}<button className="order-save" type="button" onClick={() => submit("enviar")}><Send size={16}/> Enviar a caja</button>{p.directCheckout && <button className="order-save" type="button" onClick={() => submit("cobrar")}><Check size={16}/> Cobrar completo</button>}</div>
        </div>
      </section>
      <button className="compact-preview-toggle" type="button" aria-expanded={previewOpen} aria-controls="order-print-preview" onClick={()=>setPreviewOpen(!previewOpen)}><FileText size={18}/>{previewOpen ? "Ocultar nota" : "Ver nota"}</button>
      <aside className="order-preview-card" id="order-print-preview"><div className="order-preview-title">Resumen del pedido</div><OrderSummary order={{ ...initialOrder, id: initialOrder?.id || "NUEVO PEDIDO", customer: customer === "Ocasional" ? "No especificado" : customer, phone: customerPhone, ruc: customerRuc, advisor: details.advisor, date: initialOrder?.date || today(), deliveryDate: details.deliveryDate, deliveryTime: details.deliveryTime, notes: details.notes, invoice: details.invoice, invoiceRuc: details.invoiceRuc, invoiceName: details.invoiceName, invoiceAddress: details.invoiceAddress, items: validItems, total }} previewPayments={methods.map(method => ({ method: method.key, amount: amounts[method.key] || 0 })).filter(payment => payment.amount > 0)}/></aside>
    </div>
    <div className="compact-order-bar">
      <div className="compact-order-totals"><span>Total <strong>{money(total)}</strong></span><span>Saldo <strong>{money(balance)}</strong></span></div>
      <div className="compact-order-buttons"><button type="button" className="compact-primary-save" onClick={()=>submit(p.onlySend ? (p.canRegisterPayment && paid > 0 ? "abonar" : "actualizar") : "guardar")}><Save size={18}/>Guardar</button><button type="button" aria-expanded={compactMore} aria-controls="compact-order-options" onClick={()=>setCompactMore(!compactMore)}>Más opciones</button></div>
      {compactMore && <div className="compact-order-options" id="compact-order-options"><button type="button" onClick={()=>{setCompactMore(false);submit("enviar");}}><Send size={16}/>Enviar a caja</button>{p.directCheckout && <button type="button" onClick={()=>{setCompactMore(false);submit("cobrar");}}><Check size={16}/>Cobrar completo</button>}<button type="button" onClick={()=>{setCompactMore(false);setPreviewOpen(true);requestAnimationFrame(()=>document.getElementById("order-print-preview")?.scrollIntoView({behavior:"smooth"}));}}>Ver nota</button></div>}
    </div>
    <details className="timer-disclosure"><summary>Tiempo de atención</summary><section className="order-timer"><div className="order-gradient-head"><span className="order-head-icon"><Clock3 size={20}/></span><div><h2>Temporizador de Atención</h2><small>Estación de trabajo</small></div></div><div className="order-timer-body"><div className="order-timer-fields"><label>Precio por minuto (Gs)<Input type="number" min="0" value={pricePerMinute} onChange={e => setPricePerMinute(Math.max(0, Number(e.target.value)))}/></label><label>Minutos gratis<Input type="number" min="0" value={freeMinutes} onChange={e => setFreeMinutes(Math.max(0, Number(e.target.value)))}/></label></div><div className="order-timer-actions"><button type="button" disabled={running} onClick={() => setRunning(true)}>▶ Iniciar</button><button type="button" disabled={!running} onClick={() => setRunning(false)}>⏸ Detener</button><button type="button" onClick={() => { setRunning(false); setElapsed(0); }}>↻ Reiniciar</button></div><div className="order-timer-clock"><strong>{hours}:{minutes}:{seconds}</strong><span>{billableMinutes ? `${billableMinutes} min facturables · ${money(billableMinutes * pricePerMinute)}` : `¡Tiempo gratis! (${Math.max(0, freeMinutes - Math.floor(elapsed / 60))} min restantes)`}</span></div></div></section></details>
  </div>;
}
