import { accessHeaders, expiredCajaCookie, sameCajaOrigin } from '../../../caja-access';

export async function POST(request: Request) {
  if (!sameCajaOrigin(request)) return new Response(null, {status: 403, headers: accessHeaders});
  return new Response(null, {status: 303, headers: {...accessHeaders, Location: '/', 'Set-Cookie': expiredCajaCookie}});
}
