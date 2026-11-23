type Method = {method: string; amount: number};
type HistoryEntry = {
  status: string; total: number; refund?: number; collectionEntry?: boolean;
  payments?: Method[];
  paymentRecords?: {amount: number; payments: Method[]}[];
};

/** Order summaries include every confirmed installment; cash rows represent one payment. */
export function historyTotals(orders: HistoryEntry[], orderSummary = false) {
  let total = 0;
  const methods: Record<string, number> = {};
  for (const order of orders) {
    if (!orderSummary && order.status !== 'cobrado' && order.status !== 'devuelto') continue;
    const records = orderSummary && !order.collectionEntry ? order.paymentRecords : undefined;
    const payments = records?.length ? records.flatMap(record => record.payments) : order.payments || [];
    const collected = records?.length ? records.reduce((sum, record) => sum + record.amount, 0) : payments.reduce((sum, payment) => sum + payment.amount, 0);
    total += (orderSummary ? collected : order.total) - (order.refund || 0);
    for (const payment of payments) methods[payment.method] = (methods[payment.method] || 0) + payment.amount;
  }
  return {total, methods};
}
