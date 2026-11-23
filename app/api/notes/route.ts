import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { whatsappNotes } from "../../../db/schema";
import { accessHeaders, cajaApiDenied } from "../../caja-access";

const ownerSchema = z.string().regex(/^(asesor|admin|cajera):[^\r\n]+$/);
const idSchema = z.string().min(1).max(128);
const statusSchema = z.enum(["pending", "preparing", "ready", "pickup"]);
const noteFields = z.object({ name: z.string(), phone: z.string(), detail: z.string().min(1) });
const noteSchema = noteFields.extend({ id: idSchema, status: statusSchema });
const changeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("import"), offset: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 10), notes: z.array(noteSchema).min(1).max(10) }),
  z.object({ action: z.literal("create"), note: noteSchema }),
  z.object({ action: z.literal("edit"), id: idSchema, fields: noteFields }),
  z.object({ action: z.literal("status"), id: idSchema, status: statusSchema }),
  z.object({ action: z.literal("delete"), id: idSchema }),
]);

function failure(error: string, status: number) {
  return Response.json({ error }, { status, headers: accessHeaders });
}

async function readNotes(db: ReturnType<typeof getDb>, owner: string) {
  const notes = await db.select({
    id: whatsappNotes.id,
    name: whatsappNotes.name,
    phone: whatsappNotes.phone,
    detail: whatsappNotes.detail,
    status: whatsappNotes.status,
  }).from(whatsappNotes)
    .where(and(eq(whatsappNotes.owner, owner), eq(whatsappNotes.deleted, false)))
    .orderBy(desc(whatsappNotes.updatedAt), whatsappNotes.id);
  return Response.json({ notes }, { headers: accessHeaders });
}

export async function GET(request: Request) {
  const denied = await cajaApiDenied();
  if (denied) return denied;
  const owner = ownerSchema.safeParse(new URL(request.url).searchParams.get("owner"));
  if (!owner.success) return failure("Perfil de notas inválido.", 400);
  try {
    return await readNotes(getDb(), owner.data);
  } catch {
    return failure("No se pudieron cargar las notas de Caja.", 503);
  }
}

export async function POST(request: Request) {
  const denied = await cajaApiDenied(request);
  if (denied) return denied;
  const owner = ownerSchema.safeParse(new URL(request.url).searchParams.get("owner"));
  const change = changeSchema.safeParse(await request.json().catch(() => null));
  if (!owner.success || !change.success) return failure("Cambio de nota inválido.", 400);
  const input = change.data;
  try {
    const db = getDb();
    if (input.action === "import") {
      // Older browsers may retry an import. Keep server edits and deleted IDs.
      await db.insert(whatsappNotes).values(input.notes.map((note, index) => ({
        ...note, owner: owner.data, updatedAt: -(input.offset + index),
      }))).onConflictDoNothing();
    } else if (input.action === "create") {
      const inserted = await db.insert(whatsappNotes).values({
        ...input.note, owner: owner.data, updatedAt: Date.now(),
      }).onConflictDoNothing().returning({ id: whatsappNotes.id });
      if (!inserted.length) {
        const [existing] = await db.select({ deleted: whatsappNotes.deleted }).from(whatsappNotes)
          .where(and(eq(whatsappNotes.owner, owner.data), eq(whatsappNotes.id, input.note.id))).limit(1);
        if (existing?.deleted) return failure("Esta nota ya fue eliminada en otro dispositivo.", 409);
      }
    } else {
      const fields = input.action === "delete"
        ? { deleted: true, name: "", phone: "", detail: "" }
        : input.action === "status" ? { status: input.status } : input.fields;
      const update = input.action === "edit" ? { ...fields, updatedAt: Date.now() } : fields;
      const changed = await db.update(whatsappNotes).set(update).where(and(
        eq(whatsappNotes.owner, owner.data), eq(whatsappNotes.id, input.id), eq(whatsappNotes.deleted, false),
      )).returning({ id: whatsappNotes.id });
      if (!changed.length && input.action !== "delete") {
        return failure("Esta nota ya fue eliminada en otro dispositivo.", 409);
      }
    }
    if (input.action === "import") return Response.json({ ok: true }, { headers: accessHeaders });
    return await readNotes(db, owner.data);
  } catch {
    return failure("No se pudo guardar el cambio en Caja. Volvé a intentar.", 503);
  }
}
