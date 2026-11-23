import { accessHeaders, cajaPinPattern, sameCajaOrigin, signInToCaja } from '../../../caja-access';

export async function POST(request: Request) {
  const headers = accessHeaders;
  if (!sameCajaOrigin(request)) return Response.json({error: 'Solicitud no permitida.'}, {status: 403, headers});
  const body = await request.json().catch(() => null) as {username?: unknown; pin?: unknown} | null;
  const {username, pin} = body ?? {};
  if (typeof username !== 'string' || !username.trim() || username.length > 64 ||
      typeof pin !== 'string' || !cajaPinPattern.test(pin)) {
    return Response.json({error: 'Ingresá el usuario y el PIN.'}, {status: 400, headers});
  }
  try {
    const result = await signInToCaja(username, pin);
    if (result.cookie) return Response.json({ok: true}, {headers: {...headers, 'Set-Cookie': result.cookie}});
    if (result.retryAfter) {
      return Response.json({error: `Demasiados intentos. Probá en ${Math.ceil(result.retryAfter / 60)} min o recuperá el acceso.`},
        {status: 429, headers: {...headers, 'Retry-After': String(result.retryAfter)}});
    }
    return Response.json({error: 'Usuario o PIN incorrecto.'}, {status: 401, headers});
  } catch {
    return Response.json({error: 'No se pudo verificar el acceso. Probá de nuevo.'}, {status: 503, headers});
  }
}
