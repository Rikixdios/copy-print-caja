"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Pencil, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const noteStatuses = {
  pending: "Por hacer",
  preparing: "En proceso",
  ready: "Listo",
  pickup: "A entregar",
} as const;
type NoteStatus = keyof typeof noteStatuses;
const noteStatusOrder = Object.keys(noteStatuses) as NoteStatus[];
export type WhatsAppNote = { id: string; name: string; phone: string; detail: string; status?: NoteStatus; owner?: string };
const storageKey = "copyprint-whatsapp-notes";
const legacyOwner = "asesor:Ricardo";
const emptyNote: WhatsAppNote = { id: "", name: "", phone: "", detail: "" };
const statusOf = (note: WhatsAppNote) => note.status && noteStatusOrder.includes(note.status) ? note.status : "pending";

type NoteChange =
  | { action: "import"; offset: number; notes: WhatsAppNote[] }
  | { action: "create"; note: WhatsAppNote }
  | { action: "edit"; id: string; fields: Pick<WhatsAppNote, "name" | "phone" | "detail"> }
  | { action: "status"; id: string; status: NoteStatus }
  | { action: "delete"; id: string };

async function requestNotes(owner: string, change?: NoteChange) {
  const response = await fetch(`/api/notes?owner=${encodeURIComponent(owner)}`, change
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) }
    : { cache: "no-store" });
  const result = await response.json() as { error?: string; notes?: WhatsAppNote[]; ok?: boolean };
  if (!response.ok) throw new Error(result.error || "No se pudieron sincronizar las notas");
  if (change?.action === "import") {
    if (result.ok !== true) throw new Error("Caja no confirmó la importación de las notas");
    return [];
  }
  if (!Array.isArray(result.notes)) throw new Error("Caja devolvió una lista de notas inválida");
  return result.notes;
}

function readLegacyNotes(): WhatsAppNote[] {
  const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(value)) throw new Error("Formato de notas inválido");
  return value;
}

function isLegacyNoteForOwner(note: WhatsAppNote, owner: string) {
  return note && (note.owner || legacyOwner) === owner &&
    typeof note.id === "string" && note.id.length > 0 && note.id.length <= 128 &&
    typeof note.detail === "string" && note.detail.length > 0;
}

async function migrateLegacyNotes(owner: string) {
  const originals = readLegacyNotes().filter(note => isLegacyNoteForOwner(note, owner));
  if (!originals.length) return true;

  const notes = originals.map(note => ({
    ...note,
    name: typeof note.name === "string" ? note.name : "",
    phone: typeof note.phone === "string" ? note.phone : "",
    status: statusOf(note),
  }));
  for (let index = 0; index < notes.length; index += 10) {
    await requestNotes(owner, { action: "import", offset: index, notes: notes.slice(index, index + 10) });
  }

  // Delete only the confirmed copies. Another tab may have changed browser storage during the upload.
  const confirmed = new Set(originals.map(note => JSON.stringify(note)));
  const removeConfirmed = () => {
    const current = readLegacyNotes();
    const remaining = current.filter(note => !confirmed.has(JSON.stringify(note)));
    if (remaining.length === 0) localStorage.removeItem(storageKey);
    else if (remaining.length !== current.length) localStorage.setItem(storageKey, JSON.stringify(remaining));
    return !remaining.some(note => isLegacyNoteForOwner(note, owner));
  };
  return navigator.locks ? navigator.locks.request(storageKey, removeConfirmed) : removeConfirmed();
}

export function WhatsAppNotes({ owner, user, converted, makeOrder }: {
  owner: string;
  user: string;
  converted: Set<string>;
  makeOrder: (note: WhatsAppNote) => void;
}) {
  const [notes, setNotes] = useState<WhatsAppNote[]>([]);
  const [draft, setDraft] = useState<WhatsAppNote | null>(null);
  const [available, setAvailable] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const active = useRef(false);
  const writing = useRef(false);
  const requestVersion = useRef(0);
  const imported = useRef(false);
  const newId = useRef("");
  const sortedNotes = [...notes]
    .sort((a, b) => noteStatusOrder.indexOf(statusOf(a)) - noteStatusOrder.indexOf(statusOf(b)));

  useEffect(() => {
    active.current = true;
    let loading = false;
    const load = async () => {
      if (loading || writing.current || document.visibilityState === "hidden") return;
      loading = true;
      const version = ++requestVersion.current;
      try {
        let migrationError = "";
        if (!imported.current) {
          try {
            imported.current = await migrateLegacyNotes(owner);
          } catch {
            migrationError = "No se pudo completar la importación de notas anteriores. Caja volverá a intentar.";
          }
        }
        const result = await requestNotes(owner);
        if (active.current && version === requestVersion.current) {
          setNotes(result);
          setAvailable(true);
          setLoadError(migrationError);
        }
      } catch {
        if (active.current && version === requestVersion.current) {
          setLoadError("No se pudieron sincronizar las notas. Caja volverá a intentar.");
        }
      } finally {
        loading = false;
      }
    };
    void load();
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    const interval = window.setInterval(load, 15000);
    return () => {
      active.current = false;
      requestVersion.current++;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
      window.clearInterval(interval);
    };
  }, [owner]);

  const persistNotes = async (change: NoteChange) => {
    if (writing.current) return false;
    writing.current = true;
    requestVersion.current++;
    setSaving(true);
    try {
      const result = await requestNotes(owner, change);
      if (active.current) {
        setNotes(result);
        setLoadError("");
      }
      return active.current;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cambio en Caja");
      return false;
    } finally {
      writing.current = false;
      if (active.current) setSaving(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || saving) return;
    const makeNewOrder = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "order";
    const note = {
      id: draft.id || (newId.current ||= crypto.randomUUID()),
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      detail: draft.detail.trim(),
      owner,
    };
    if (!note.detail) {
      toast.error("Escribí el detalle de la consulta");
      return;
    }
    const { name, phone, detail } = note;
    if (!await persistNotes(draft.id
      ? { action: "edit", id: draft.id, fields: { name, phone, detail } }
      : { action: "create", note: { ...note, status: "pending" } })) return;
    setDraft(null);
    if (makeNewOrder) {
      makeOrder(note);
    } else {
      toast.success("Nota guardada");
    }
  };
  return <section className="order-page notes-page" aria-label={`Notas de ${user}`}>
    <div className="notes-heading">
      <Button type="button" size="icon" aria-label="Nueva nota" title="Nueva nota" disabled={!available || !!draft || saving} onClick={() => { newId.current = ""; setDraft(emptyNote); }}><Plus /></Button>
    </div>
    {loadError && <p className="consult-help" role="status">{loadError}</p>}
    {draft && <section className="order-form-card">
      <div className="order-gradient-head"><div><h2>{draft.id ? "Editar nota" : "Nueva nota"}</h2></div></div>
      <form onSubmit={save} className="order-form-body grid gap-4">
        <div className="order-fields two">
          <label>Nombre<Input autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Teléfono<Input type="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></label>
        </div>
        <label className="grid gap-2 text-sm font-medium">Detalle de la consulta
          <Textarea rows={4} value={draft.detail} onChange={e => setDraft({ ...draft, detail: e.target.value })} placeholder="Qué pidió el cliente…" required />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setDraft(null)}>Cancelar</Button>
          <Button type="submit" disabled={!available || saving}><Save />Guardar nota</Button>
          <Button type="submit" variant="outline" value="order" disabled={!available || saving || converted.has(draft.id)}><ShoppingCart />Hacer pedido</Button>
        </div>
      </form>
    </section>}
    {sortedNotes.length ? <ul className="notes-list">{sortedNotes.map(note => {
      const isConverted = converted.has(note.id);
      const noteStatus = statusOf(note);
      return <li key={note.id}>
        <article className="order-form-card notes-card" data-status={noteStatus}>
          <div className="notes-card-body">
            {(note.name || note.phone) && <header className="notes-contact">
              {note.name && <strong className="max-w-full break-words rounded bg-muted px-1.5 py-0.5">{note.name}</strong>}
              {note.phone && <span className="max-w-full break-words rounded bg-muted px-1.5 py-0.5 tabular-nums">{note.phone}</span>}
            </header>}
            <p className="notes-description">{note.detail}</p>
            <footer className="notes-card-footer">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="notes-status-trigger" aria-label={`Estado de la nota: ${noteStatuses[noteStatus]}`} title={noteStatuses[noteStatus]} disabled={!available || saving}><ChevronDown /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup value={noteStatus} onValueChange={value => {
                    const nextStatus = value as NoteStatus;
                    return persistNotes({ action: "status", id: note.id, status: nextStatus });
                  }}>
                    {noteStatusOrder.map(value => <DropdownMenuRadioItem key={value} value={value}>{noteStatuses[value]}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="notes-card-actions">
                <Button type="button" variant="ghost" size="icon" title="Editar nota" aria-label="Editar nota" disabled={!!draft || saving} onClick={() => setDraft(note)}><Pencil /></Button>
                <Button type="button" variant="ghost" size="icon" title="Eliminar nota" aria-label="Eliminar nota" disabled={!available || saving} onClick={async () => {
                  if (!await persistNotes({ action: "delete", id: note.id })) return;
                  if (draft?.id === note.id) setDraft(null);
                  toast.success("Nota eliminada");
                }}><Trash2 /></Button>
                {isConverted && <span className="notes-status text-muted-foreground">Convertida</span>}
                {!isConverted && <Button type="button" variant="ghost" size="icon" aria-label="Hacer pedido" title="Hacer pedido" disabled={!!draft || saving} onClick={() => makeOrder(note)}><ShoppingCart /></Button>}
              </div>
            </footer>
          </div>
        </article>
      </li>;
    })}</ul> : !loadError && <p className="consult-help">{available ? "Todavía no hay notas. Tocá + para agregar una." : "Cargando notas…"}</p>}
  </section>;
}
