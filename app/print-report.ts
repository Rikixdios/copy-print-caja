import {displayDate,displayTime} from "./date-format";
import { toast } from "sonner";

/** Reports get a standalone A4 document, independent of ticket-only print rules. */
export function printReport(area: HTMLElement | null) {
  if (!area) return toast.error("No se encontró el informe");
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return toast.error("Permití las ventanas emergentes para imprimir el informe");
  const copy = area.cloneNode(true) as HTMLElement;
  // Keep the selected date range and production states readable on paper.
  const originals = area.querySelectorAll<HTMLElement>("input,select");
  copy.querySelectorAll<HTMLElement>("input,select").forEach((node, index) => {
    const original = originals[index];
    const text = document.createElement("span");
    const live = (original || node) as unknown as HTMLInputElement | HTMLSelectElement;
    text.textContent = live instanceof HTMLSelectElement ? live.options[live.selectedIndex]?.text || "" : live.type==="date"?displayDate(live.value):live.type==="time"?displayTime(live.value):live.value;
    const wrapper=node.closest(".formatted-date-input");
    if(wrapper)wrapper.replaceWith(text);else node.replaceWith(text);
  });
  copy.querySelectorAll(".no-print,.history-print,.sale-actions,.order-icon-actions,.movement-actions,.history-row-spacer,.cash-operations,.closing-disclosure").forEach(node => node.remove());
  copy.querySelectorAll("details").forEach(details => { details.open = true; details.querySelector("summary")?.remove(); });
  copy.querySelectorAll(".table-head>span:last-child").forEach(node => node.remove());
  const heading = copy.querySelector("h1")?.textContent || "Informe de caja";
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title></title><style>
  .management-view table{width:100%;border-collapse:collapse;font-size:10px}.management-view th,.management-view td{padding:7px;text-align:left;border-bottom:1px solid #cfd9d1;vertical-align:top}.management-view th{background:#edf2ee}.management-view small{display:block;font-size:9px;color:#52665a}.management-metrics{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.management-metric{border:1px solid #cfd9d1;padding:12px;flex:1;min-width:150px}.management-metric span,.management-metric strong{display:block}.management-metric strong{font-size:18px}.management-table-scroll{max-height:none;overflow:visible}.management-help{font-size:10px}.management-overview{display:flex;gap:25px}.management-status-count{display:flex;gap:20px;padding:5px}.performance-bar{height:7px;background:#dce4de}.performance-bar span{display:block;height:7px;background:#28634d}.management-report-actions,.management-tabs,.management-filters{display:none}
  @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#17251b;background:#fff;font:11px Arial,sans-serif;line-height:1.4}h1{font-size:22px;margin:0 0 10px}h2{font-size:15px;margin:10px 0}p{margin:4px 0}svg{display:none}button{display:none}.report-brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #28634d;padding-bottom:10px;margin-bottom:16px}.report-brand img{width:145px;height:40px}.report-brand span{font-size:11px;color:#52665a}.section-head p,.eyebrow,.section-kicker{display:none}.report-date-title{display:flex;gap:15px;padding:8px 0}.cash-summary-compact,.history-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.history-metrics{grid-template-columns:repeat(4,1fr)}.metric{border:1px solid #cfd9d1;padding:10px;border-radius:5px}.metric small{display:block;color:#5a6c5f}.metric strong{font-size:16px}.payment-strip{display:flex;justify-content:space-between;gap:12px;border-block:1px solid #d8e1da;padding:10px 0;margin-bottom:12px}.payment-strip p{display:grid;gap:3px}.payment-strip small{display:none}.cash-log-row{display:grid;grid-template-columns:85px 1fr 140px;gap:10px;padding:8px 0;border-bottom:1px solid #dce4de;break-inside:avoid}.cash-log-row small{display:block;color:#63776a}.cash-log-row>b{text-align:right}.table-head,.table-row{display:grid;grid-template-columns:135px minmax(160px,1fr) 90px 110px 110px 130px;gap:10px;padding:8px;border-bottom:1px solid #d8e2db;align-items:center;break-inside:avoid}.with-production .table-head,.with-production .table-row{grid-template-columns:135px minmax(145px,1fr) 85px 110px 110px 125px 100px}.table-head{background:#edf2ee;font-weight:bold}.table-row small{display:block;color:#63776a}.history-filters,.history-type-filters{display:flex;gap:16px;margin:8px 0}.history-filters label{display:flex;gap:5px}.mobile-order-meta{display:none!important}.table-card{overflow:visible}.report-card{margin-top:12px}.history-status{font-size:10px}.empty-state{padding:15px 0;color:#65796b}
  </style></head><body><header class="report-brand"><img src="${window.location.origin}/copy-print-logo.svg" alt="Copy Print"><span>Informe de Caja · Copy Print</span></header>${copy.outerHTML}</body></html>`);
  popup.document.title = heading;
  popup.document.close();
  const run = async () => {
    await popup.document.fonts.ready;
    await Promise.all(Array.from(popup.document.images).map(img => img.decode().catch(() => {})));
    popup.focus(); popup.print();
  };
  if (popup.document.readyState === "complete") void run();
  else popup.addEventListener("load", () => { void run(); }, { once: true });
}
