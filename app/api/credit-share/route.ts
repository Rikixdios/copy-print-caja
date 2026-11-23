import { cajaApiDenied } from '../../caja-access';
import { creditTokenPattern, disableCreditLink, getOrCreateCreditLink, readCreditStore, statementHeaders } from '../../credit-share-server';

export async function POST(request: Request) {
  const denied = await cajaApiDenied(request);
  if (denied) return denied;
  const headers = statementHeaders;
  const body = await request.json().catch(() => null) as {accountId?: unknown} | null;
  const accountId = body?.accountId;
  if (typeof accountId !== 'string' || !accountId || accountId.length > 200) {
    return Response.json({error: 'Cuenta inválida.'}, {status: 400, headers});
  }

  try {
    const store = await readCreditStore();
    if (!store.creditAccounts?.some(account => account.id === accountId)) {
      return Response.json({error: 'No se encontró la cuenta.'}, {status: 404, headers});
    }
    const token = await getOrCreateCreditLink(accountId);
    if (!token) throw new Error('El enlace se desactivó mientras se generaba');
    return Response.json({path: `/estado-de-cuenta/${token}`}, {headers});
  } catch {
    return Response.json({error: 'No se pudo generar el enlace. Volvé a intentar.'}, {status: 503, headers});
  }
}

export async function DELETE(request: Request) {
  const denied = await cajaApiDenied(request);
  if (denied) return denied;
  const headers = statementHeaders;
  const body = await request.json().catch(() => null) as {token?: unknown} | null;
  const token = body?.token;
  if (typeof token !== 'string' || !creditTokenPattern.test(token)) {
    return Response.json({error: 'Enlace inválido.'}, {status: 400, headers});
  }
  try {
    await disableCreditLink(token);
    return Response.json({ok: true}, {headers});
  } catch {
    return Response.json({error: 'No se pudo desactivar el enlace.'}, {status: 503, headers});
  }
}
