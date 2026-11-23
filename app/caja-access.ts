import { env } from 'cloudflare:workers';
import { and, eq, lt, lte, or, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb } from '../db';
import { cajaAccess } from '../db/schema';
import { getChatGPTUser } from './chatgpt-auth';

const settings = env as unknown as Record<string, string | undefined>;
const encoder = new TextEncoder();
const sessionName = '__Host-copyprint-caja';
const sessionSeconds = 12 * 60 * 60;
const attemptWindow = 30 * 60 * 1000;
const maxAttempts = 5;
const cookieFlags = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const accessId = eq(cajaAccess.id, 1);

export const accessHeaders = {'Cache-Control': 'private, no-store'};
export const cajaPinPattern = /^[0-9]{4,12}$/;

function accessKey() {
  const secret = settings.CAJA_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error('Acceso de Caja sin configurar');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}

export function randomToken(length = 32) {
  return toHex(crypto.getRandomValues(new Uint8Array(length)));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sign(payload: string) {
  const bytes = await crypto.subtle.sign('HMAC', await accessKey(), encoder.encode(payload));
  return toHex(new Uint8Array(bytes));
}

async function verify(payload: string, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16));
  return crypto.subtle.verify('HMAC', await accessKey(), bytes, encoder.encode(payload));
}

export async function cajaSessionValid() {
  const value = (await cookies()).get(sessionName)?.value ?? '';
  const [revision, expires, nonce, signature, extra] = value.split('.');
  if (!signature || extra !== undefined || !/^\d{1,12}$/.test(revision) ||
      !/^\d{1,12}$/.test(expires) || !/^[a-f0-9]{32}$/.test(nonce) ||
      Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  if (!await verify(`session:${revision}.${expires}.${nonce}`, signature)) return false;
  const [row] = await getDb().select({revision: cajaAccess.revision}).from(cajaAccess).where(accessId).limit(1);
  return row?.revision === Number(revision);
}

export async function cajaApiDenied(request?: Request) {
  if (request && !sameCajaOrigin(request)) {
    return Response.json({error: 'Solicitud no permitida.'}, {status: 403, headers: accessHeaders});
  }
  try {
    if (await cajaSessionValid()) return null;
    return Response.json({error: 'Iniciá sesión en Copy Print Caja y volvé a intentar.'}, {status: 401, headers: accessHeaders});
  } catch {
    return Response.json({error: 'No se pudo verificar el acceso a Caja.'}, {status: 503, headers: accessHeaders});
  }
}

export function sameCajaOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

async function ensureAccessRow() {
  const pinVerifier = settings.CAJA_INITIAL_PIN_VERIFIER;
  if (!pinVerifier || !/^[a-f0-9]{64}$/.test(pinVerifier)) throw new Error('PIN inicial sin configurar');
  const db = getDb();
  await db.insert(cajaAccess).values({id: 1, pinVerifier}).onConflictDoNothing();
  return db;
}

export async function signInToCaja(username: string, pin: string) {
  const db = await ensureAccessRow();
  const now = Date.now();
  // Reserve a guess before checking the PIN, including when requests run concurrently.
  const [attempt] = await db.update(cajaAccess).set({
    attempts: sql`case when ${cajaAccess.windowUntil} <= ${now} then 1 else ${cajaAccess.attempts} + 1 end`,
    windowUntil: sql`case when ${cajaAccess.windowUntil} <= ${now} then ${now + attemptWindow} else ${cajaAccess.windowUntil} end`,
  }).where(and(accessId, or(lte(cajaAccess.windowUntil, now), lt(cajaAccess.attempts, maxAttempts))))
    .returning({pinVerifier: cajaAccess.pinVerifier, revision: cajaAccess.revision});
  if (!attempt) {
    const [limit] = await db.select({until: cajaAccess.windowUntil}).from(cajaAccess).where(accessId).limit(1);
    return {retryAfter: Math.max(1, Math.ceil(((limit?.until ?? now) - now) / 1000))};
  }
  const correctPin = await verify(`pin:${pin}`, attempt.pinVerifier);
  if (username.trim().toLowerCase() !== 'copypid' || !correctPin) return {};
  const [confirmed] = await db.update(cajaAccess).set({attempts: 0, windowUntil: 0})
    .where(and(accessId, eq(cajaAccess.revision, attempt.revision))).returning({revision: cajaAccess.revision});
  if (!confirmed) return {};
  const payload = `${confirmed.revision}.${Math.floor(now / 1000) + sessionSeconds}.${randomToken(16)}`;
  const signature = await sign(`session:${payload}`);
  return {cookie: `${sessionName}=${payload}.${signature}; ${cookieFlags}; Max-Age=${sessionSeconds}`};
}

export const expiredCajaCookie = `${sessionName}=; ${cookieFlags}; Max-Age=0`;

export async function recoveryEmailAuthorized() {
  const email = (await getChatGPTUser())?.email.trim().toLowerCase();
  return !!email && (settings.CAJA_RECOVERY_EMAILS ?? '').split(',')
    .some(allowed => allowed.trim().toLowerCase() === email);
}

export async function resetCajaPin(pin: string) {
  const db = await ensureAccessRow();
  const pinVerifier = await sign(`pin:${pin}`);
  await db.update(cajaAccess).set({
    pinVerifier, attempts: 0, windowUntil: 0, revision: sql`${cajaAccess.revision} + 1`,
  }).where(accessId);
}
