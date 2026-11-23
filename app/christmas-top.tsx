import type { CSSProperties, ReactNode } from 'react';

/** Decoration only: the existing header and live queue remain the children. */
export function ChristmasTop({ children }: { children: ReactNode }) {
  return <section className="christmas-top" aria-label="Cabecera de Copy Print Caja">
    {children}
    <div className="christmas-snow" aria-hidden="true">{Array.from({length:32},(_,i)=><i key={i} style={{'--left':`${(i*43)%100}%`,'--duration':`${11+i%7*1.7}s`,'--delay':`${-i*2.3}s`,'--drift':`${i%2?28:-24}px`,'--size':`${4+i%4}px`} as CSSProperties}/>)}</div>
  </section>;
}
