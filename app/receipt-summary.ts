type ReceiptPayment = { method: string; amount: number; received?: number };
type ReceiptAmounts = {
  total: number; status?: string; payments?: ReceiptPayment[];
  receiptKind?: string; receiptSaleTotal?: number; receiptPaidNow?: number;
  receiptPaidBefore?: number; receiptPaidTotal?: number; receiptBalance?: number;
};
export function receiptSummary(order: ReceiptAmounts) {
  const total = order.receiptSaleTotal ?? order.total;
  const applied = (order.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
  const current = order.receiptPaidNow ?? (applied || (order.status === "cobrado" ? total : 0));
  const before = order.receiptPaidBefore ?? Math.max(0, (order.receiptPaidTotal ?? current) - current);
  const balance = order.receiptBalance ?? Math.max(0, total - before - current);
  const byMethod = new Map<string, number>();
  (order.payments || []).filter(payment => payment.amount > 0).forEach(payment => byMethod.set(payment.method, (byMethod.get(payment.method) || 0) + payment.amount));
  const change = (order.payments || []).reduce((sum, payment) => sum + Math.max(0, (payment.received ?? payment.amount) - payment.amount), 0);
  const label = order.receiptKind === "Seña" ? "SEÑA" : order.receiptKind === "Abono" ? "ABONO" : order.receiptKind === "Pago de saldo" ? "PAGO DEL SALDO" : balance === 0 && current > 0 ? "PAGO COMPLETO" : "ABONADO";
  return { total, current, before, balance, change, label, methods: [...byMethod].map(([method, amount]) => ({ method, amount })) };
}
