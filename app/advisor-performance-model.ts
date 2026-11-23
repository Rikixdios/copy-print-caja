import { paidAmount } from "./order-workflow";
export type PerformanceOrder = {
  id: string; advisor: string; date?: string; total: number; status: string;
  productionStatus?: string; sourceOrderId?: string;
  items: { quantity: number; name?: string; price?: number }[]; payments?: { amount: number }[];
  paymentRecords?: { id: string; date: string; amount: number }[];
};
export type AdvisorPerformance = { advisor: string; orders: number; units: number; delivered: number; sales: number; collected: number; pending: number };
export function advisorPerformance(orders: PerformanceOrder[], advisors: string[], from: string, to: string): AdvisorPerformance[] {
  const rows = new Map<string, AdvisorPerformance>();
  const get = (advisor: string) => {
    const name = advisor || "Admi";
    if (!rows.has(name)) rows.set(name, { advisor: name, orders: 0, units: 0, delivered: 0, sales: 0, collected: 0, pending: 0 });
    return rows.get(name)!;
  };
  advisors.forEach(get);
  if (!from || !to || from > to) return [...rows.values()];
  const inPeriod = (date?: string) => !!date && date >= from && date <= to;
  const originals = new Map(orders.filter(order => !order.sourceOrderId).map(order => [order.id, order]));
  originals.forEach(order => {
    if (order.status === "devuelto") return;
    const row = get(order.advisor);
    if (inPeriod(order.date)) {
      row.orders += 1;
      row.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
      row.delivered += order.productionStatus === "Entregado" ? 1 : 0;
      row.sales += order.total;
      row.pending += Math.max(0, order.total - paidAmount(order));
    }
    if (order.paymentRecords?.length) {
      const records = new Map(order.paymentRecords.map(record => [record.id, record]));
      records.forEach(record => { if (inPeriod(record.date)) row.collected += record.amount; });
    } else if (inPeriod(order.date)) {
      row.collected += paidAmount(order);
    }
  });
  return [...rows.values()];
}
export function asuncionToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function performancePeriod(period: "hoy" | "semana" | "mes", today: string) {
  if (period === "hoy") return { from: today, to: today };
  if (period === "mes") return { from: today.slice(0, 8) + "01", to: today };
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return { from: date.toISOString().slice(0, 10), to: today };
}
