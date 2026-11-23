"use client";
import {displayDate,displayTime} from "./date-format";
import { useState, type ReactNode } from "react";
import { PackageCheck, Pencil, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { paidAmount, productionStatus } from "./order-workflow";
import { pickupBlockReason } from "./order-pickup";

type OrderDetail = Omit<Parameters<typeof pickupBlockReason>[0], "paymentRecords"> & {
  paymentRecords?: {id:string;kind:string;date:string;time:string;amount:number;cashier:string}[];
  cashierNotice?: {by:string};
};
const money=(value:number)=>`${new Intl.NumberFormat("es-PY").format(value)} Gs.`;
export function OrderDetails({order,children,close,edit,notify,cashOpen,onConfirmPickup}:{
  order:OrderDetail|null; children:ReactNode; close:()=>void; edit?:()=>void; notify?:()=>void;
  cashOpen:boolean; onConfirmPickup?:()=>boolean;
}){
  const [confirming, setConfirming] = useState(false);
  if(!order)return null;
  const paid=paidAmount(order),balance=Math.max(0,order.total-paid);
  const status = productionStatus(order.productionStatus);
  const offerPickup = !!onConfirmPickup && status !== "Entregado";
  const blockReason = offerPickup ? pickupBlockReason(order) : null;
  return <Dialog open onOpenChange={open=>!open&&close()}><DialogContent className="order-consult-dialog"><DialogHeader><DialogTitle>Pedido {order.id}</DialogTitle></DialogHeader>
    <p className="consult-notice">Estado del pedido <b>{status === "Listo" ? "Listo para retirar" : status}</b></p>
    {order.deliveryConfirmation&&<p className="consult-notice">Entregado por {order.deliveryConfirmation.by} · {displayDate(order.deliveryConfirmation.date)} · {displayTime(order.deliveryConfirmation.time)}</p>}
    {children}
    {!!order.paymentRecords?.length&&<details className="consult-payments"><summary>Ver señas y abonos ({order.paymentRecords.length})</summary>{order.paymentRecords.map(record=><div key={record.id}><span>{record.kind}<small>{displayDate(record.date)} · {displayTime(record.time)} · {record.cashier}</small></span><b>{money(record.amount)}</b></div>)}</details>}
    {edit&&balance===0&&order.status==="cobrado"&&<p className="consult-notice">Cobro completo. Si el cliente lleva algo más, agregalo al pedido.</p>}
    {order.cashierNotice&&<p className="consult-notice">Caja avisada por {order.cashierNotice.by}. El cobro está pendiente de confirmar.</p>}
    <div className="consult-actions">
      {edit && <Button variant="outline" onClick={edit}><Pencil/>Editar / agregar productos</Button>}
      {notify && <Button disabled={!cashOpen||balance<=0||order.status==="devuelto"} onClick={notify}><Send/>Avisar a caja: pagar saldo</Button>}
      {offerPickup && (confirming ? <>
        <Button variant="outline" onClick={() => setConfirming(false)}>Cancelar</Button>
        <Button disabled={!!blockReason} onClick={() => { if (onConfirmPickup?.()) setConfirming(false); }}><PackageCheck/>Confirmar entrega</Button>
      </> : <Button disabled={!!blockReason} onClick={() => setConfirming(true)}><PackageCheck/>Registrar entrega</Button>)}
    </div>
    {offerPickup && blockReason && <small className="consult-help">{blockReason}.</small>}
    {offerPickup && confirming && !blockReason && <p className="consult-notice">Confirmá cuando hayas entregado el pedido al cliente.</p>}
    {notify&&!cashOpen&&<small className="consult-help">La caja debe estar abierta para avisar el cobro.</small>}
  </DialogContent></Dialog>;
}
