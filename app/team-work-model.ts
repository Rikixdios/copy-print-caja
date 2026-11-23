import {displayTime} from "./date-format";
export type ProductionJob={id:string;advisor:string;responsible?:'Ricardo'|'Tahir'|'';quantity:number;description:string;orderNumber?:string;readyAt?:string;readySeenAt?:string;deliveryDate:string;deliveryTime:string;status:'Pendiente'|'En proceso'|'Listo';createdAt:string;updatedAt:string};
/** Active jobs first, newest creation first within each group. */
export function compareProductionJobs(a:Pick<ProductionJob,'id'|'status'|'createdAt'>,b:Pick<ProductionJob,'id'|'status'|'createdAt'>){
 return Number(a.status==='Listo')-Number(b.status==='Listo')||(b.createdAt||'').localeCompare(a.createdAt||'')||b.id.localeCompare(a.id);
}
export type AttendanceKind='entrada'|'almuerzo'|'regreso'|'salida';
export type AttendanceMark={id:string;advisor:string;at:string;kind:AttendanceKind|'correccion';corrects?:string};
export const attendanceLabels:Record<AttendanceKind,string>={entrada:'Marcar entrada',almuerzo:'Salir a almorzar',regreso:'Volver del almuerzo',salida:'Marcar salida'};
const teamDateFormatter = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'});
export function teamDate(at:string){return teamDateFormatter.format(new Date(at));}
export function teamTime(at?:string){return displayTime(at);}
export function activeAttendanceMarks(marks:AttendanceMark[]){
 const cancelled=new Set<string>();
 for(const correction of marks.filter(mark=>mark.kind==='correccion').sort((a,b)=>a.at.localeCompare(b.at))){
  const target=marks.find(mark=>mark.id===correction.corrects&&mark.kind!=='correccion');
  if(!target||cancelled.has(target.id)||target.advisor!==correction.advisor||!Number.isFinite(Date.parse(correction.at))||!Number.isFinite(Date.parse(target.at))||correction.at<target.at||teamDate(correction.at)!==teamDate(target.at))continue;
  const neighbors=marks.filter(mark=>mark.kind!=='correccion'&&!cancelled.has(mark.id)&&mark.advisor===target.advisor&&Number.isFinite(Date.parse(mark.at))&&teamDate(mark.at)===teamDate(target.at)&&mark.kind!==target.kind).sort((a,b)=>a.at.localeCompare(b.at));
  const before=neighbors.filter(mark=>mark.at<target.at).at(-1)?.at,after=neighbors.find(mark=>mark.at>target.at)?.at;
  for(const mark of marks)if(mark.kind===target.kind&&mark.advisor===target.advisor&&Number.isFinite(Date.parse(mark.at))&&teamDate(mark.at)===teamDate(target.at)&&(!before||mark.at>before)&&(!after||mark.at<after)&&mark.at<=correction.at)cancelled.add(mark.id);
 }
 return marks.filter((mark):mark is AttendanceMark&{kind:AttendanceKind}=>mark.kind!=='correccion'&&!cancelled.has(mark.id));
}
export type AttendanceRow={id:string;advisor:string;date:string;entrada?:string;almuerzo?:string;regreso?:string;salida?:string;lunchMinutes?:number;workMinutes?:number};
export function attendanceRows(marks:AttendanceMark[]){
 const groups=new Map<string,AttendanceRow[]>();
 for(const mark of activeAttendanceMarks(marks).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))){
  if(!Number.isFinite(Date.parse(mark.at)))continue;
  const date=teamDate(mark.at),key=JSON.stringify([mark.advisor,date]),rows=groups.get(key)||[];
  let row=rows.at(-1);
  if(!row||mark.kind==='entrada'&&!!row.salida){row={id:JSON.stringify([mark.advisor,date,mark.id]),advisor:mark.advisor,date};rows.push(row);}
  if(!row[mark.kind])row[mark.kind]=mark.at;
  groups.set(key,rows);
 }
 return [...groups.values()].flat().map(row=>{const lunchMinutes=row.almuerzo&&row.regreso?Math.max(0,Math.round((Date.parse(row.regreso)-Date.parse(row.almuerzo))/60000)):undefined;const workMinutes=row.entrada&&row.salida?Math.max(0,Math.round((Date.parse(row.salida)-Date.parse(row.entrada))/60000)-(lunchMinutes||0)):undefined;return {...row,lunchMinutes,workMinutes};}).sort((a,b)=>b.date.localeCompare(a.date)||a.advisor.localeCompare(b.advisor,'es')||(b.entrada||'').localeCompare(a.entrada||''));
}
export function lastAttendanceMark(marks:AttendanceMark[],advisor:string,at:string){
 const row=attendanceRows(marks).find(row=>row.advisor===advisor&&row.date===teamDate(at));if(!row)return undefined;
 const kind=(['entrada','almuerzo','regreso','salida'] as AttendanceKind[]).filter(kind=>row[kind]).sort((a,b)=>row[a]!.localeCompare(row[b]!)).at(-1);
 return kind?activeAttendanceMarks(marks).find(mark=>mark.advisor===advisor&&mark.kind===kind&&mark.at===row[kind]):undefined;
}
export function canMarkAttendance(marks:AttendanceMark[],advisor:string,kind:AttendanceKind,at:string){const row=attendanceRows(marks).find(row=>row.advisor===advisor&&row.date===teamDate(at));if(kind==='entrada')return !row?.entrada||!!row.salida;if(!row?.entrada||row.salida)return false;if(kind==='almuerzo')return !row.almuerzo;if(kind==='regreso')return !!row.almuerzo&&!row.regreso;return !row.almuerzo||!!row.regreso;}
export const productionResponsibles=['Ricardo','Tahir'] as const;
export function matchesProductionResponsible(job:ProductionJob,filter:string){return filter==='Todos'||(filter==='Sin asignar'?!job.responsible:job.responsible===filter);}
export function validProduction(job:Pick<ProductionJob,'responsible'|'quantity'|'description'|'deliveryDate'|'deliveryTime'|'status'>){return productionResponsibles.includes(job.responsible as 'Ricardo'|'Tahir')&&Number.isFinite(job.quantity)&&job.quantity>0&&!!job.description.trim()&&/^\d{4}-\d{2}-\d{2}$/.test(job.deliveryDate)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(job.deliveryTime)&&['Pendiente','En proceso','Listo'].includes(job.status);}
export function durationLabel(minutes?:number){return minutes===undefined?'—':`${Math.floor(minutes/60)} h ${minutes%60} min`;}

export function transferProduction(job:ProductionJob,responsible:'Ricardo'|'Tahir',at:string):ProductionJob{if(!productionResponsibles.includes(responsible))throw new Error('Elegí Ricardo o Tahir');return {...job,responsible,updatedAt:at};}

export function productionOrderLabel(job: ProductionJob) {
 const orderNumber = job.orderNumber?.trim() || job.description.match(/\bORD-\d+\b/i)?.[0];
 return orderNumber ? `Orden ${orderNumber}` : `Trabajo PROD-${job.id.slice(0, 8).toUpperCase()}`;
}

export function updateProductionJob(job: ProductionJob, previous: ProductionJob | undefined, at: string, notify: boolean): ProductionJob {
 const readyAt = job.status !== 'Listo' ? undefined
   : previous?.status === 'Listo' ? previous.readyAt
   : notify ? at : undefined;
 return { ...job, updatedAt: at, readyAt, readySeenAt: previous?.readySeenAt };
}

export function readyProductionForAdvisor(job: ProductionJob, advisor: string): job is ProductionJob & {readyAt: string} {
 return job.status === 'Listo' && !!job.readyAt && job.advisor.trim().toLowerCase() === advisor.trim().toLowerCase();
}
