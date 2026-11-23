import { cajaApiDenied } from '../../caja-access';
import {reassignRemovedAdvisors} from '../../advisor-reassignment';
import { and,eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { appState } from '../../../db/schema';
import { applyQuickEntry,quickCashOpen,quickToday,type QuickStore,type QuickDraft } from '../../quick-entry-model';
const normalize=(store:Partial<QuickStore>):QuickStore=>reassignRemovedAdvisors({...store,orders:store.orders||[],workOrders:store.workOrders||[],quotes:store.quotes||[],advisors:store.advisors||[],cashMovements:store.cashMovements||[]});
export async function GET(){
 const denied=await cajaApiDenied();if(denied)return denied;
try{const [row]=await getDb().select().from(appState).where(eq(appState.id,1)).limit(1);if(!row)return Response.json({error:'Abrí Copy Print Caja una vez para iniciar sus datos.'},{status:503});const store=normalize(JSON.parse(row.payload));return Response.json({products:store.products||[],customers:store.customers||[],advisors:['Admi',...store.advisors],cashOpen:quickCashOpen(store,quickToday())},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'No se pudo cargar el catálogo'},{status:503});}}
export async function POST(request:Request){
 const denied=await cajaApiDenied(isExtensionRequest(request) ? undefined : request);if(denied)return denied;
try{const draft=reassignRemovedAdvisors(await request.json()) as QuickDraft;const db=getDb();for(let attempt=0;attempt<5;attempt++){const [row]=await db.select().from(appState).where(eq(appState.id,1)).limit(1);if(!row)return Response.json({error:'Abrí Copy Print Caja primero.'},{status:503});const result=applyQuickEntry(normalize(JSON.parse(row.payload)),draft,quickToday(),new Date().toLocaleTimeString('es-PY',{hourCycle:'h23',timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit',second:'2-digit'}));if(result.result.repeated)return Response.json({ok:true,...result.result});const changed=await db.update(appState).set({payload:JSON.stringify(result.store),updatedAt:new Date().toISOString()}).where(and(eq(appState.id,1),eq(appState.payload,row.payload))).returning({id:appState.id});if(changed.length)return Response.json({ok:true,...result.result});}return Response.json({error:'Hay otros registros guardándose. Reintentá; se conserva el mismo pedido.'},{status:503});}catch(error){return Response.json({error:error instanceof Error?error.message:'No se pudo guardar'},{status:400});}}

function isExtensionRequest(request: Request) {
 return /^chrome-extension:\/\/[a-p]{32}$/.test(request.headers.get('origin') ?? '') &&
  request.headers.get('content-type') === 'application/json';
}
