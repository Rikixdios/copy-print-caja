import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { appState } from '../../../db/schema';
import { notFound } from 'next/navigation';
import type { Quote } from '../../business-model';
import { SharedQuote } from '../../shared-quote';
export const dynamic='force-dynamic';
export const metadata={title:'Presupuesto | Copy Print',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function QuotePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
 const [row]=await getDb().select().from(appState).where(eq(appState.id,1)).limit(1);
 const quote:Quote|undefined=row?JSON.parse(row.payload).quotes?.find((quote:Quote)=>quote.id===id):undefined;
 if(!quote)notFound();return <SharedQuote quote={quote}/>;
}
