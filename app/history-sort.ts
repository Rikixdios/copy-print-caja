type HistoryDate={id:string;date?:string;createdAt?:string};
function seconds(value?:string){
 const text=(value||'').toLowerCase().replace(/[.\s]/g,'');
 const match=text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(am|pm)?$/);
 if(!match)return 0;
 let hour=Number(match[1]);if(match[4])hour=hour%12+(match[4]==='pm'?12:0);
 return hour*3600+Number(match[2])*60+Number(match[3]||0);
}
export function sortHistory<T extends HistoryDate>(orders:T[],direction:'newest'|'oldest'):T[]{
 const key=(order:T)=>{if(order.createdAt?.includes('T')){const stamp=Date.parse(order.createdAt);if(Number.isFinite(stamp))return stamp;}const day=Date.parse(order.date||'');return (Number.isFinite(day)?day:0)+seconds(order.createdAt)*1000;};
 return [...orders].sort((a,b)=>{const difference=key(a)-key(b)||Number(a.id.match(/\d+/)?.[0]||0)-Number(b.id.match(/\d+/)?.[0]||0);return direction==='newest'?-difference:difference;});
}
