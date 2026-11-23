import type { ReactNode } from 'react';

export function CajaAccessShell({title, children}: {title: string; children: ReactNode}) {
  return <main className="caja-access-screen">
    <section className="caja-access-card">
      <img src="/copy-print-logo.svg" alt="Copy Print" width={172} height={54}/>
      <h1>{title}</h1>
      {children}
    </section>
  </main>;
}
