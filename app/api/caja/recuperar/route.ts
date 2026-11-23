import { accessHeaders, cajaPinPattern, expiredCajaCookie, recoveryEmailAuthorized, resetCajaPin, sameCajaOrigin } from '../../../caja-access';

export async function POST(request: Request) {
  const headers = accessHeaders;
  if (!sameCajaOrigin(request) || !await recoveryEmailAuthorized()) {
    return Response.json({error: 'Verificá uno de los correos autorizados para recuperar el acceso.'}, {status: 403, headers});
  }
  const body = await request.json().catch(() => null) as {pin?: unknown} | null;
  const pin = body?.pin;
  if (typeof pin !== 'string' || !cajaPinPattern.test(pin)) {
    return Response.json({error: 'El PIN debe tener entre 4 y 12 números.'}, {status: 400, headers});
  }
  try {
    await resetCajaPin(pin);
    return Response.json({ok: true}, {headers: {...headers, 'Set-Cookie': expiredCajaCookie}});
  } catch {
    return Response.json({error: 'No se pudo actualizar el PIN. Probá de nuevo.'}, {status: 503, headers});
  }
}
