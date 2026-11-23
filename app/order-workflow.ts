export type ProductionStatus = "Pendiente" | "En proceso" | "Listo" | "Entregado";
export const productionStatuses: ProductionStatus[] = ["Pendiente", "En proceso", "Listo", "Entregado"];
export function productionStatus(value?: string): ProductionStatus {
  return value === "Terminado" ? "Listo" : productionStatuses.includes(value as ProductionStatus) ? value as ProductionStatus : "Pendiente";
}
type PaymentOrder = { importedPaidAdjustment?:number; importedSummary?:{paid:number}; total: number; status: string; collectionLane?: "senas" | "pendientes"; paymentRecords?: { amount: number }[]; payments?: { amount: number }[]; requestedPayments?: { amount: number }[] };
export function paidAmount(order: PaymentOrder): number {
  return (order.importedPaidAdjustment||0) + (order.importedSummary?.paid || 0) + (order.paymentRecords?.length ? order.paymentRecords : order.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}
export function collectionLane(order: PaymentOrder): "senas" | "pendientes" {
  if (order.collectionLane) return order.collectionLane;
  const proposed = (order.requestedPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return order.paymentRecords?.length || (proposed > 0 && proposed < order.total) ? "senas" : "pendientes";
}
export function editedPaymentStatus(order: PaymentOrder, total: number): "pendiente" | "cobrado" | "devuelto" {
  if (order.status === "devuelto") return "devuelto";
  return paidAmount(order) > 0 && paidAmount(order) >= total ? "cobrado" : "pendiente";
}

export function removeFromOrderHistories<T extends { id: string; sourceOrderId?: string }, W extends { id: string; sourceOrderId?: string }>(orders: T[], workOrders: W[], id: string) {
  return { orders: orders.filter(order => order.id !== id && order.sourceOrderId !== id), workOrders: workOrders.filter(order => order.id !== id && order.sourceOrderId !== id) };
}

export type CashierNotice = { by: string; at: string; reason: "saldo" | "actualizado" };
export function requestBalanceCollection<T extends PaymentOrder>(order: T, by: string, at: string) {
  if (order.status === "devuelto" || order.total - paidAmount(order) <= 0) return null;
  return { ...order, collectionLane: collectionLane(order), requestedPayments: [], cashierNotice: { by, at, reason: "saldo" as const } };
}

/** Update the order total and details without creating or altering a collection. */
export function updateWithoutPayment<T extends PaymentOrder>(previous:T,draft:T):T {
 if(!Number.isFinite(draft.total)||draft.total<paidAmount(previous))throw new Error('El total no puede ser menor que lo ya abonado');
 const financialKeys=['payments','paymentRecords','cashier','refund','advisorSection','requestedPayments','cashierNotice','importedSummary','importedPaidAdjustment'];
 const updated={...draft,status:previous.status === "pendiente" ? "pendiente" : editedPaymentStatus(previous,draft.total)} as T;
 for(const key of financialKeys){if(key in previous)(updated as Record<string,unknown>)[key]=(previous as Record<string,unknown>)[key];else delete (updated as Record<string,unknown>)[key];}
 return updated;
}

