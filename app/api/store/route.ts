import { cajaApiDenied } from '../../caja-access';
import {reassignRemovedAdvisors} from '../../advisor-reassignment';
import {ProductCodeConflict,validateProductCodes} from '../../product-model';
import { and,eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { appState } from '../../../db/schema';
import { mergeStores,StoreConflict } from '../../store-merge';
export async function GET(){
 const denied=await cajaApiDenied();if(denied)return denied;
try{const [row]=await getDb().select().from(appState).where(eq(appState.id,1)).limit(1);return Response.json({store:row?reassignRemovedAdvisors(JSON.parse(row.payload)):null},{headers:{'Cache-Control':'no-store'}});}catch(error){return Response.json({error:error instanceof Error?error.message:'No disponible'},{status:503});}}
export async function PUT(request:Request){
 const denied=await cajaApiDenied(request);if(denied)return denied;
try{
 const body=await request.json() as {store?:{orders:unknown[];customers:unknown[]};base?:{orders:unknown[];customers:unknown[]}}, {store,base}=body||{};
 if(!store||!base||!Array.isArray(store.orders)||!Array.isArray(store.customers)||!Array.isArray(base.orders)||!Array.isArray(base.customers))return Response.json({error:'Actualizá la página para usar el guardado seguro'},{status:409});
 const db=getDb();for(let attempt=0;attempt<5;attempt++){
  const [row]=await db.select().from(appState).where(eq(appState.id,1)).limit(1);
  const merged=row?mergeStores(base,store,JSON.parse(row.payload)):validateProductCodes(reassignRemovedAdvisors(store)),payload=JSON.stringify(merged);
  const changed=row?await db.update(appState).set({payload,updatedAt:new Date().toISOString()}).where(and(eq(appState.id,1),eq(appState.payload,row.payload))).returning({id:appState.id}):await db.insert(appState).values({id:1,payload}).onConflictDoNothing().returning({id:appState.id});
  if(changed.length)return Response.json({ok:true,store:merged});
 }return Response.json({error:'Hay otros registros guardándose. Se reintentará sin borrar tu cambio.'},{status:409});
}catch(error){return Response.json({error:error instanceof Error?error.message:'No disponible'},{status:error instanceof StoreConflict||error instanceof ProductCodeConflict?409:503});}}
