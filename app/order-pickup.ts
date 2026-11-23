import { paidAmount, productionStatus } from './order-workflow';

export type DeliveryConfirmation = { by: string; date: string; time: string };
type PickupOrder = Parameters<typeof paidAmount>[0] & {
  id: string; productionStatus?: string; deliveryConfirmation?: DeliveryConfirmation;
  importedSummary?: { paid: number }; collectionEntry?: boolean;
};
export function isPickupOrder(order: PickupOrder) {
  return order.status !== 'devuelto' && !order.importedSummary && !order.collectionEntry;
}
export function pickupBlockReason(order: PickupOrder): string | null {
  if (!isPickupOrder(order)) return 'Este pedido no está disponible para retirar';
  if (productionStatus(order.productionStatus) === 'Entregado') return 'Este pedido ya fue entregado';
  if (!Number.isFinite(order.total) || order.total <= 0 || !Number.isFinite(paidAmount(order)) || paidAmount(order) < order.total) return 'Primero cobrá el saldo pendiente';
  if (productionStatus(order.productionStatus) !== 'Listo') return 'El trabajo todavía no está listo para retirar';
  return null;
}
/** Delivery only changes fulfillment metadata; collections keep their original dates and amounts. */
export function confirmOrderPickup<T extends PickupOrder>(order: T, confirmation: DeliveryConfirmation): T {
  const reason = pickupBlockReason(order);
  if (reason) throw new Error(reason);
  return { ...order, productionStatus: 'Entregado', deliveryConfirmation: confirmation };
}
