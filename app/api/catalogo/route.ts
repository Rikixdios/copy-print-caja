import {catalogHeaders, readPublicCatalog} from '../../public-catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await readPublicCatalog(), {headers: catalogHeaders}); }
  catch { return Response.json({error: 'No se pudo consultar el catálogo actual. Volvé a intentar; no uses precios anteriores.'}, {status: 503, headers: catalogHeaders}); }
}
