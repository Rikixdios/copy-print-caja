const removed=new Set(['alex','sin asesor','dianita','valdez','nicole']);
const identityFields=new Set(['advisor','asesor','cashier','user','by']);
const key=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
export const isRemovedAdvisor=(name:string)=>removed.has(key(name));
export const assignedAdvisor=(name?:string)=>!name?.trim()||isRemovedAdvisor(name)?'Admi':name;

/** Reassign identities, never customer names, IDs, amounts, dates or payment methods. */
export function reassignRemovedAdvisors<T>(value:T):T{
 function visit(item:unknown,field=''):unknown{
  if(Array.isArray(item)){
   if(field==='advisors')return item.filter(name=>typeof name!=='string'||!isRemovedAdvisor(name));
   return item.map(entry=>{const next=visit(entry);return ['orders','workOrders','quotes','productionJobs'].includes(field)&&next&&typeof next==='object'&&!Array.isArray(next)?{...next,advisor:assignedAdvisor((next as {advisor?:string}).advisor)}:next;});
  }
  if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([name,entry])=>[name,visit(entry,name)]));
  if(typeof item==='string'&&identityFields.has(field))return (field==='advisor'||field==='asesor')?assignedAdvisor(item):isRemovedAdvisor(item)?'Admi':item;
  return item;
 }
 return visit(value) as T;
}
