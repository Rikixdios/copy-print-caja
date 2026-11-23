"use client";
import {FormattedInput} from "./formatted-input";
import {displayDate,displayTime} from "./date-format";
import {performanceRankColors,advisorComparison} from "./performance-bar-color";
import {AttendanceTable} from "./team-work";
import {type AttendanceMark} from "./team-work-model";
import { useMemo, useState } from "react";
import { BarChart3, CalendarDays } from "lucide-react";
import { advisorPerformance, asuncionToday, performancePeriod, type PerformanceOrder } from "./advisor-performance-model";
const money = (value: number) => `${new Intl.NumberFormat("es-PY").format(value)} Gs.`;
const number = (value: number) => new Intl.NumberFormat("es-PY").format(value);
type Period = "hoy" | "semana" | "mes" | "personalizado";
type SortMetric = "collected" | "sales" | "orders";
export function AdvisorPerformanceView({ orders, advisors, attendanceMarks=[],fixedRange,selectedAdvisors,onSelectionChange }: { orders: PerformanceOrder[]; advisors: string[];selectedAdvisors?:string[]|null;onSelectionChange?:(names:string[])=>void;fixedRange?:{from:string;to:string};attendanceMarks?:AttendanceMark[] }) {
  const [period, setPeriod] = useState<Period>("mes");
  const [localRange, setRange] = useState(() => performancePeriod("mes", asuncionToday()));
  const range=fixedRange||localRange;
  const [sort, setSort] = useState<SortMetric>("collected");
  const invalid = range.from > range.to || !range.from || !range.to;
  const allRows = useMemo(() => advisorPerformance(orders, advisors, range.from, range.to).sort((a, b) => b[sort] - a[sort] || a.advisor.localeCompare(b.advisor, "es")), [orders, advisors, range.from, range.to, sort]);
  const {rows,largest}=advisorComparison(allRows,fixedRange?selectedAdvisors:undefined,sort);
  const names=[...allRows.map(row=>row.advisor)].sort((a,b)=>a.localeCompare(b,'es'));
  const selectedNames=selectedAdvisors==null?names:names.filter(name=>selectedAdvisors.includes(name));
  const rankColors=performanceRankColors(rows,sort);
  const totals = rows.reduce((sum, row) => ({ orders: sum.orders + row.orders, units: sum.units + row.units, delivered: sum.delivered + row.delivered, sales: sum.sales + row.sales, collected: sum.collected + row.collected, pending: sum.pending + row.pending }), { orders: 0, units: 0, delivered: 0, sales: 0, collected: 0, pending: 0 });
  const sortLabel = sort === "collected" ? "Cobrado" : sort === "sales" ? "Ventas" : "Pedidos";
  const choosePeriod = (value: Period) => { setPeriod(value); if (value !== "personalizado") setRange(performancePeriod(value, asuncionToday())); };
  return <div className="advisor-performance-view">
    <div className="section-head"><div><h1>Rendimiento por asesor</h1></div><span className="performance-caption"><BarChart3 size={16}/> Ventas y productividad</span></div>
    {!fixedRange&&<section className="performance-controls" aria-label="Período y comparación">
      <div className="performance-periods">{([{ value: "hoy", label: "Hoy" }, { value: "semana", label: "Semana" }, { value: "mes", label: "Mes" }, { value: "personalizado", label: "Fechas" }] as { value: Period; label: string }[]).map(option => <button type="button" key={option.value} aria-pressed={period === option.value} onClick={() => choosePeriod(option.value)}>{option.label}</button>)}</div>
      <label><CalendarDays size={14}/>Desde<FormattedInput type="date" value={range.from} onChange={event => { setPeriod("personalizado"); setRange({ ...range, from: event.target.value }); }}/></label>
      <label>Hasta<FormattedInput type="date" value={range.to} onChange={event => { setPeriod("personalizado"); setRange({ ...range, to: event.target.value }); }}/></label>
      <label className="performance-sort">Comparar por<select value={sort} onChange={event => setSort(event.target.value as SortMetric)}><option value="collected">Dinero cobrado</option><option value="sales">Valor de ventas</option><option value="orders">Cantidad de pedidos</option></select></label>
    </section>}
    {fixedRange&&<label className="management-performance-sort no-print">Comparar por <select value={sort} onChange={event=>setSort(event.target.value as SortMetric)}><option value="collected">Dinero cobrado</option><option value="sales">Valor de ventas</option><option value="orders">Cantidad de pedidos</option></select></label>}
    {fixedRange&&onSelectionChange&&<details className="performance-advisor-selection no-print"><summary>Asesores ({selectedNames.length}/{names.length})</summary><div className="performance-selector-panel"><div className="performance-selection-actions"><button type="button" onClick={()=>onSelectionChange(names)}>Todos</button><button type="button" onClick={()=>onSelectionChange([])}>Limpiar</button><button type="button" onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')}>Listo</button></div><div className="performance-selection-options">{names.map(name=><label key={name}><input type="checkbox" checked={selectedNames.includes(name)} onChange={event=>onSelectionChange(event.target.checked?[...selectedNames,name]:selectedNames.filter(item=>item!==name))}/>{name}</label>)}</div></div></details>}
    {fixedRange&&selectedNames.length===0&&<p className="performance-empty">Seleccioná al menos un asesor para ver la comparación.</p>}
    {invalid && <p role="alert" className="performance-validation">Elegí un período válido: la fecha desde debe ser anterior o igual a la fecha hasta.</p>}
    <div className="performance-totals"><div><span>Pedidos enviados</span><strong>{number(totals.orders)}</strong></div><div><span>Ventas del período</span><strong>{money(totals.sales)}</strong></div><div><span>Cobrado en el período</span><strong>{money(totals.collected)}</strong></div><div><span>Saldo de esos pedidos</span><strong>{money(totals.pending)}</strong></div></div>
    {fixedRange&&<p className="performance-color-key">Barras por posición: verde = grupo superior · amarillo = intermedio · rojo = inferior o sin actividad. Solo se comparan los asesores seleccionados. En empates, el orden es alfabético; los valores se muestran sin cambios.</p>}
    <div className="performance-table-scroll"><table className="performance-table"><caption>Comparación por asesor · ordenada por {sortLabel.toLocaleLowerCase("es")}</caption><thead><tr><th scope="col">Asesor</th><th scope="col">Pedidos</th><th scope="col">Unidades</th><th scope="col">Entregados</th><th scope="col">Ventas</th><th scope="col">Cobrado</th><th scope="col">Saldo pendiente</th><th scope="col">Comparación · {sortLabel}</th></tr></thead><tbody>{rows.map(row => <tr key={row.advisor}><th scope="row">{row.advisor}</th><td data-label="Pedidos">{number(row.orders)}</td><td data-label="Unidades">{number(row.units)}</td><td data-label="Entregados">{number(row.delivered)}</td><td data-label="Ventas">{money(row.sales)}</td><td className="performance-collected" data-label="Cobrado">{money(row.collected)}</td><td data-label="Saldo pendiente">{money(row.pending)}</td><td data-label={`Comparación · ${sortLabel}`}><div className="performance-bar" aria-hidden="true" style={fixedRange?{backgroundColor:`${(rankColors.get(row.advisor)||"#dc2626")}22`}:undefined}><span style={{ width: `${largest ? row[sort] / largest * 100 : 0}%`, ...(fixedRange?{background:(rankColors.get(row.advisor)||"#dc2626")}:{}) }}/></div><small>{sort === "orders" ? `${number(row.orders)} pedidos` : money(row[sort])}</small></td></tr>)}</tbody><tfoot><tr><th scope="row">Total</th><td data-label="Pedidos">{number(totals.orders)}</td><td data-label="Unidades">{number(totals.units)}</td><td data-label="Entregados">{number(totals.delivered)}</td><td data-label="Ventas">{money(totals.sales)}</td><td data-label="Cobrado">{money(totals.collected)}</td><td data-label="Saldo pendiente">{money(totals.pending)}</td><td/></tr></tfoot></table></div>
    {!totals.orders && !totals.collected && (!fixedRange||selectedNames.length>0) && <p className="performance-empty">No hay pedidos ni cobros en el período elegido.</p>}
    <section className="team-attendance-report"><h2>Horarios de los asesores</h2><p>Entrada, tiempo de almuerzo y salida del período seleccionado.</p><AttendanceTable marks={fixedRange?attendanceMarks.filter(mark=>selectedNames.includes(mark.advisor)):attendanceMarks} from={range.from} to={range.to}/></section>
    <details className="performance-explanation"><summary>Cómo se calculan los datos</summary><p><b>Ventas y pedidos:</b> pedidos enviados a caja durante estas fechas. Cada pedido se cuenta una sola vez, aunque tenga varias señas o abonos. Los pedidos guardados sin enviar y los devueltos no se cuentan.</p><p><b>Cobrado:</b> señas, abonos y pagos recibidos en estas fechas, incluso si el pedido se creó antes. Se atribuye al asesor original del pedido.</p><p><b>Saldo pendiente:</b> lo que falta cobrar actualmente de los pedidos creados en el período. <b>Entregados:</b> cuántos de esos pedidos ya tienen estado Entregado. <b>Unidades:</b> suma de las cantidades de sus productos.</p></details>
  </div>;
}
