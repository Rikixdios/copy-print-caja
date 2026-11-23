import { creditAccountTotals, type CreditAccount, type CreditOrder, type CreditPayment } from './business-model';
import { paidAmount } from './order-workflow';

export type CreditStatementStore = {
  creditAccounts?: CreditAccount[];
  orders?: CreditOrder[];
  creditPayments?: CreditPayment[];
};

export const statementMoney = (amount: number) => `Gs. ${amount.toLocaleString('es-PY')}`;
export const statementBalanceLabel = (balance: number) =>
  balance < 0 ? 'Saldo a favor' : balance === 0 ? 'Sin deuda' : 'Saldo a pagar';

type CreditMovement = {
  type: 'Crédito' | 'Pago';
  date: string;
  time?: string;
  description: string;
  amount: number;
  credit?: {
    code?: string;
    paid: number;
    items: Pick<CreditOrder['items'][number], 'name' | 'quantity' | 'price'>[];
  };
};

function visiblePaymentMethod(method: string) {
  const name = method.trim();
  return /^no\s+especificado$/i.test(name) ? '' : name;
}

export function creditStatement(store: CreditStatementStore, accountId: string) {
  const account = store.creditAccounts?.find(entry => entry.id === accountId);
  if (!account) return null;
  const orders = (store.orders ?? []).filter(order =>
    order.creditAccountId === accountId && order.status !== 'devuelto');
  const payments = (store.creditPayments ?? []).filter(payment => payment.accountId === accountId);
  const coveredRecords = new Set(payments.flatMap(payment =>
    payment.allocations.map(allocation => allocation.recordId)));
  const movements: CreditMovement[] = orders.map(order => ({
    type: 'Crédito',
    date: order.importedSummary ? '' : order.date ?? '',
    time: !order.importedSummary && order.date ? order.createdAt : undefined,
    description: order.importedSummary
      ? 'Resumen de compras importado'
      : [order.creditCode, order.items.map(item => `${item.quantity} × ${item.name}`).join(' · ') || 'Compra a crédito']
        .filter(Boolean).join(' · '),
    amount: order.total,
    credit: {
      code: order.importedSummary ? undefined : order.creditCode,
      paid: paidAmount(order),
      items: order.importedSummary ? [] : order.items.map(({name, quantity, price}) => ({name, quantity, price})),
    },
  }));
  movements.push(...payments.map((payment): CreditMovement => ({
    type: 'Pago',
    date: payment.date,
    time: payment.time,
    description: payment.methods.filter(method => method.amount > 0)
      .map(method => visiblePaymentMethod(method.method)).filter(Boolean).join(', '),
    amount: payment.amount,
  })));
  for (const order of orders) {
    const detail = order.creditCode ? ` · ${order.creditCode}` : '';
    if (order.importedSummary?.paid) {
      movements.push({type: 'Pago', date: '', description: 'Pagos históricos importados', amount: order.importedSummary.paid});
    }
    if (order.importedPaidAdjustment) {
      movements.push({type: 'Pago', date: '', description: `Ajuste de pago importado${detail}`, amount: order.importedPaidAdjustment});
    }
    if (order.paymentRecords?.length) {
      for (const record of order.paymentRecords) {
        if (!coveredRecords.has(record.id)) {
          movements.push({type: 'Pago', date: record.date, time: record.time, description: `${record.kind}${detail}`, amount: record.amount});
        }
      }
    } else {
      for (const method of order.payments ?? []) {
        if (method.amount) {
          const description = [visiblePaymentMethod(method.method), order.creditCode].filter(Boolean).join(' · ');
          movements.push({type: 'Pago', date: '', description, amount: method.amount});
        }
      }
    }
  }
  movements.sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''));
  return {
    name: account.name,
    totals: creditAccountTotals(orders, accountId, payments),
    movements,
  };
}

export type CreditStatement = NonNullable<ReturnType<typeof creditStatement>>;
