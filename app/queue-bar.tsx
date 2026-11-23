"use client";
import { useEffect, useState } from "react";
import { ListStart, PhoneCall, RotateCcw, StepBack } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type Queue = { current: number; max: number };
const format = (value: number) => String(value).padStart(3, "0");
export function QueueBar() {
  const [queue, setQueue] = useState<Queue>({ current: 0, max: 100 });
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nextDraft, setNextDraft] = useState(1);
  const [maxDraft, setMaxDraft] = useState(100);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const response = await fetch("/api/queue", { cache: "no-store" }); if (response.ok) { const value = await response.json() as Queue; if (active) { setQueue(value); if (!settingsOpen) { setNextDraft(value.current + 1); setMaxDraft(value.max); } } } }
      catch { /* Keep the last visible number while offline. */ }
    };
    void refresh(); const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [settingsOpen]);
  const change = async (action: "next" | "previous" | "repeat" | "reset" | "configure") => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/queue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, next: nextDraft, max: maxDraft }) });
      const value = await response.json() as Queue & { error?: string };
      if (!response.ok) throw new Error(value.error || "No se pudo actualizar el número");
      setQueue(value);
      if (action === "configure") setSettingsOpen(false);
      if (action === "repeat") toast.info(`Número ${format(value.current)} llamado nuevamente`);
      if (action === "next" && value.current >= value.max) toast.info("Llegaste al número máximo");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo llamar el número"); }
    finally { setBusy(false); }
  };
  return <section className="queue-bar" aria-label="Turnos de atención"><div className="queue-current"><span>Turno</span><strong aria-live="polite">{format(queue.current)}</strong></div><div className="queue-controls"><button type="button" className="queue-next" disabled={busy || queue.current >= queue.max} onClick={() => change("next")}><PhoneCall size={17}/> Siguiente</button><button type="button" title="Repetir llamado" aria-label="Repetir llamado" disabled={busy || queue.current === 0} onClick={() => change("repeat")}><RotateCcw size={18}/></button><button type="button" title="Número anterior" aria-label="Número anterior" disabled={busy || queue.current === 0} onClick={() => change("previous")}><StepBack size={18}/></button><button type="button" title="Elegir rango de números" aria-label="Elegir rango de números" aria-expanded={settingsOpen} onClick={() => { setNextDraft(queue.current + 1); setMaxDraft(queue.max); setSettingsOpen(!settingsOpen); }}><ListStart size={18}/></button></div>{settingsOpen && <div className="queue-settings"><label>Siguiente número a llamar<Input type="number" min="1" max="9999" value={nextDraft} onChange={e => setNextDraft(Number(e.target.value))}/></label><label>Último número del rango<Input type="number" min="1" max="9999" value={maxDraft} onChange={e => setMaxDraft(Number(e.target.value))}/></label><button type="button" disabled={busy} onClick={() => change("configure")}>Guardar rango</button><button type="button" disabled={busy} onClick={() => change("reset")}><RotateCcw size={16}/> Reiniciar a 000</button></div>}</section>;
}
