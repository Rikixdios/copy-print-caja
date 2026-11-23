import { isPickupOrder } from './order-pickup';
import { paidAmount, productionStatus } from './order-workflow';
import { ticketLabel } from './order-identifiers';

type SearchOrder = Parameters<typeof isPickupOrder>[0] & {
  customer: string; phone?: string; ruc?: string; sourceOrderId?: string;
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export function isPaidPickup(order: SearchOrder) {
  const paid = paidAmount(order);
  return isPickupOrder(order) && productionStatus(order.productionStatus) !== 'Entregado'
    && Number.isFinite(order.total) && order.total > 0 && Number.isFinite(paid) && paid >= order.total;
}
/** Build normalized fields once per data update, rather than once per typed letter. */
export function createCashOrderSearch<T extends SearchOrder>(pending: T[], all: T[]) {
  const defaults = pending.map(order => ({ order, pickup: false }));
  const candidates = new Map(pending.map(order => [order.id, order]));
  for (const order of all) if (isPaidPickup(order)) candidates.set(order.id, order);
  const index = [...candidates.values()].map(order => ({
    result: { order, pickup: isPaidPickup(order) },
    fields: [ticketLabel(order), order.id, order.customer, order.phone || '', order.ruc || ''].map(value => ({
      text: normalize(value), digits: value.replace(/\D/g, ''),
    })),
  }));
  return (query: string): { order: T; pickup: boolean }[] => {
    const term = normalize(query.trim());
    if (!term) return defaults;
    const digits = /^[\d\s()+.-]+$/.test(term) && /\d/.test(term) ? term.replace(/\D/g, '') : '';
    return index.filter(entry => entry.fields.some(field =>
      field.text.includes(term) || !!digits && field.digits.includes(digits),
    )).map(entry => entry.result);
  };
}
/** The default queue stays unchanged; paid orders only join explicit search results. */
export function searchCashOrders<T extends SearchOrder>(pending: T[], all: T[], query: string): { order: T; pickup: boolean }[] {
  return createCashOrderSearch(pending, all)(query);
}
