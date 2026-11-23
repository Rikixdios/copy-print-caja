import { notFound } from 'next/navigation';
import { readCreditStatement } from '../../credit-share-server';
import { statementBalanceLabel, statementMoney, type CreditStatement } from '../../credit-statement';
import { displayDate } from '../../date-format';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Estado de cuenta | Copy Print',
  robots: {index: false, follow: false},
  referrer: 'no-referrer',
};

const consultedAt = new Intl.DateTimeFormat('es-PY', {
  timeZone: 'America/Asuncion', dateStyle: 'long', timeStyle: 'short',
});

const iconPaths = {
  payment: 'm5 5 14 14m0-9v9h-9',
  credit: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 5h20',
  balance: 'M3 6h18v12H3zM8 12h.01M16 12h.01M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z',
  chevron: 'm9 18 6-6-6-6',
  download: 'M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4',
  shield: 'M12 22s7-3 7-9V5l-7-3-7 3v8c0 6 7 9 7 9Zm-3-10 2 2 4-4',
};

function StatementIcon({name, size = 16, className}: {name: keyof typeof iconPaths; size?: number; className?: string}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={iconPaths[name]}/>
  </svg>;
}

function StatementMovement({movement}: {movement: CreditStatement['movements'][number]}) {
  const {credit, date, description, amount} = movement;
  const dateLabel = date ? displayDate(date) : 'Sin fecha';
  if (!credit) {
    return <li className="shared-credit-movement shared-credit-payment">
      <div className="shared-credit-row">
        <StatementIcon name="payment" size={16}/>
        <div className="shared-credit-description"><b>Pago</b>{description && <span>{description}</span>}<small>{dateLabel}</small></div>
        <strong>{statementMoney(amount)}</strong>
      </div>
    </li>;
  }

  const paid = credit.paid >= amount;
  const partial = !paid && credit.paid > 0;
  const status = paid ? 'Pagado' : partial ? 'Pago parcial' : 'Pendiente';
  const title = credit.items.map(item => item.name).join(' · ') || description;
  return <li className="shared-credit-movement">
    <details>
      <summary className="shared-credit-row">
        <StatementIcon name="chevron" size={16} className="shared-credit-chevron"/>
        <span className="shared-credit-description">
          {credit.code && <span className="shared-credit-code">{credit.code}</span>} <b>{title}</b>
          <small>{dateLabel}</small>
        </span>
        <span className={`shared-credit-status ${paid ? 'is-paid' : partial ? 'is-partial' : 'is-pending'}`}>{status}</span>
        <strong>{statementMoney(amount)}</strong>
      </summary>
      <div className="shared-credit-details">
        {credit.items.length > 0 && <div className="shared-credit-items"><table>
          <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Precio unitario</th></tr></thead>
          <tbody>{credit.items.map((item, index) => <tr key={index}>
            <td>{item.name}</td><td>{item.quantity}</td><td>{Number.isFinite(item.price) ? statementMoney(item.price) : "—"}</td>
          </tr>)}</tbody>
        </table></div>}
        <div className="shared-credit-progress">
          <div><b>Progreso de pago</b><span>{statementMoney(credit.paid)} / {statementMoney(amount)}</span></div>
          {amount > 0 && <progress aria-label="Progreso de pago" max={amount} value={Math.max(0, Math.min(credit.paid, amount))}/>}
        </div>
      </div>
    </details>
  </li>;
}

export default async function CreditStatementPage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const statement = await readCreditStatement(token);
  if (!statement) notFound();
  const {totals, movements} = statement;

  return <main className="shared-credit">
    <header className="shared-credit-banner">
      <img src="/copy-print-logo.svg" alt="Copy Print" width={300} height={40}/>
      <p><StatementIcon name="shield" size={16}/> Consulta de estado de cuenta</p>
    </header>
    <div className="shared-credit-content">
      <section className="shared-credit-card shared-credit-identity">
        <span className="shared-credit-icon"><StatementIcon name="credit" size={19}/></span>
        <div><h1>{statement.name}</h1><p>Consultado el {consultedAt.format(new Date())}</p></div>
        <a className="shared-credit-download" href={`/estado-de-cuenta/${token}/pdf`}><StatementIcon name="download" size={16}/> Descargar PDF</a>
      </section>
      <section className="shared-credit-totals" aria-label="Resumen de la cuenta">
        <div className="shared-credit-card">
          <span className="shared-credit-icon is-green"><StatementIcon name="payment" size={20}/></span>
          <dl><dt>Total de pagos</dt><dd className="shared-credit-green">{statementMoney(totals.paid)}</dd></dl>
        </div>
        <div className="shared-credit-card">
          <span className="shared-credit-icon"><StatementIcon name="balance" size={19}/></span>
          <dl><dt>{statementBalanceLabel(totals.balance)}</dt>
            <dd className={totals.balance > 0 ? 'shared-credit-red' : 'shared-credit-green'}>{statementMoney(Math.abs(totals.balance))}</dd>
            <dd className="shared-credit-total-note">Total de créditos {statementMoney(totals.total)}</dd>
          </dl>
        </div>
      </section>
      <section className="shared-credit-card shared-credit-ledger">
        <h2><StatementIcon name="credit" size={19}/> Movimientos de la cuenta ({movements.length})</h2>
        {movements.length
          ? <ul>{movements.map((movement, index) => <StatementMovement key={index} movement={movement}/>)}</ul>
          : <p>Todavía no hay movimientos registrados.</p>}
      </section>
      <footer>Copy Print · Estado de cuenta en tiempo real</footer>
    </div>
  </main>;
}
