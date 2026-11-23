import { cajaApiDenied } from '../../caja-access';
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { appState } from "../../../db/schema";

async function ensureQueue() {
  const db = getDb();
  await db.insert(appState).values({ id: 2, payload: JSON.stringify({ current: 0, max: 100 }) }).onConflictDoNothing();
  return db;
}
async function readQueue(db: ReturnType<typeof getDb>) {
  const [row] = await db.select({ payload: appState.payload }).from(appState).where(eq(appState.id, 2)).limit(1);
  const parsed = row ? JSON.parse(row.payload) : { current: 0, max: 100 };
  return { current: Number(parsed.current) || 0, max: Number(parsed.max) || 100 };
}
export async function GET() {
 const denied=await cajaApiDenied();if(denied)return denied;

  try { return Response.json(await readQueue(await ensureQueue()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No disponible" }, { status: 503 }); }
}
export async function POST(request: Request) {
 const denied=await cajaApiDenied(request);if(denied)return denied;

  try {
    const input = await request.json() as { action?: string; max?: number; next?: number };
    const db = await ensureQueue();
    switch (input.action) {
      case "next":
        await db.update(appState).set({ payload: sql`json_set(${appState.payload}, '$.current', min(json_extract(${appState.payload}, '$.max'), json_extract(${appState.payload}, '$.current') + 1))` }).where(eq(appState.id, 2));
        break;
      case "previous":
        await db.update(appState).set({ payload: sql`json_set(${appState.payload}, '$.current', max(0, json_extract(${appState.payload}, '$.current') - 1))` }).where(eq(appState.id, 2));
        break;
      case "reset":
        await db.update(appState).set({ payload: sql`json_set(${appState.payload}, '$.current', 0)` }).where(eq(appState.id, 2));
        break;
      case "max": {
        const max = Number(input.max);
        if (!Number.isInteger(max) || max < 1 || max > 9999) return Response.json({ error: "El máximo debe estar entre 1 y 9999" }, { status: 400 });
        await db.update(appState).set({ payload: sql`json_set(json_set(${appState.payload}, '$.max', ${max}), '$.current', min(json_extract(${appState.payload}, '$.current'), ${max}))` }).where(eq(appState.id, 2));
        break;
      }
      case "configure": {
        const next = Number(input.next), max = Number(input.max);
        if (!Number.isInteger(next) || !Number.isInteger(max) || next < 1 || max < next || max > 9999)
          return Response.json({ error: "Indicá un siguiente número y un máximo válido (hasta 9999)" }, { status: 400 });
        await db.update(appState).set({ payload: sql`json_set(json_set(${appState.payload}, '$.max', ${max}), '$.current', ${next - 1})` }).where(eq(appState.id, 2));
        break;
      }
      case "repeat": break;
      default: return Response.json({ error: "Acción inválida" }, { status: 400 });
    }
    return Response.json(await readQueue(db), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No disponible" }, { status: 503 }); }
}
