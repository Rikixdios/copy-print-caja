import {eq} from 'drizzle-orm';
import {getDb} from '../db';
import {appState} from '../db/schema';

export type PublicProduct = {codigo: string; nombre: string; categoria: string; precio: number};
// Publish only sale information. Never serialize the store or spread product records.
export function publicProducts(store: {products?: unknown}): PublicProduct[] {
  if (!Array.isArray(store.products)) throw new Error('Catálogo no disponible');
  return store.products.map((product: Record<string, unknown>) => {
    if (typeof product.name !== 'string' || !product.name.trim() || typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) throw new Error('Producto inválido');
    return {codigo: typeof product.code === 'string' ? product.code : '', nombre: product.name, categoria: typeof product.category === 'string' ? product.category : '', precio: product.price};
  }).sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
}
export async function readPublicCatalog() {
  const [row] = await getDb().select({payload: appState.payload, updatedAt: appState.updatedAt}).from(appState).where(eq(appState.id, 1)).limit(1);
  if (!row) throw new Error('Catálogo no disponible');
  const productos = publicProducts(JSON.parse(row.payload));
  return {negocio: 'Copy Print', moneda: 'PYG', ultima_actualizacion_caja: row.updatedAt, total: productos.length, productos};
}
export const catalogHeaders = {'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff'};
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!));
