/** Rank colors use only the selected comparison group. Equal values sort by name. */
export function performanceRankColors<T extends {advisor:string}>(rows:T[],metric:keyof T){
 const ranked=[...rows].sort((a,b)=>Number(b[metric])-Number(a[metric])||a.advisor.localeCompare(b.advisor,'es'));
 const colors=new Map<string,string>();
 ranked.forEach((row,index)=>{
  const band=ranked.length===1?0:ranked.length===2?(index===0?0:2):Math.min(2,Math.floor(index*3/ranked.length));
  colors.set(row.advisor,Number(row[metric])<=0?'#dc2626':['#16a34a','#eab308','#dc2626'][band]);
 });
 return colors;
}
export function advisorComparison<T extends {advisor:string;orders:number;sales:number;collected:number}>(all:T[],selected:string[]|null|undefined,metric:'orders'|'sales'|'collected'){
 const rows=selected==null?all:all.filter(row=>selected.includes(row.advisor));
 return {rows,largest:Math.max(0,...rows.map(row=>row[metric]))};
}
