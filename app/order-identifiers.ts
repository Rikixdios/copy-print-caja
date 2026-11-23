type Identified={id?:unknown;creditCode?:string};
export function orderSequence(entries:Identified[],saved=0){return entries.reduce((highest,entry)=>{const match=String(entry.id||'').match(/^ORD-(\d+)$/i);return match?Math.max(highest,Number(match[1])):highest;},saved);}
export function nextOrderId(entries:Identified[],saved=0){return `ORD-${String(orderSequence(entries,saved)+1).padStart(5,'0')}`;}
export function nextCreditCode(entries:Identified[],random:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){const used=new Set(entries.map(entry=>entry.creditCode?.toUpperCase())),letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ',digits='0123456789',alphabet=letters+digits;for(let attempt=0;attempt<10000;attempt++){const chars=[letters[Math.floor(random()*26)],digits[Math.floor(random()*10)],...Array.from({length:4},()=>alphabet[Math.floor(random()*36)])];for(let i=chars.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[chars[i],chars[j]]=[chars[j],chars[i]];}const code=chars.join('');if(!used.has(code))return code;}throw new Error('No se pudo generar un código único. Intentá de nuevo.');}
export function datedCashRecords<R extends {date:string}>(order:{paymentRecords?:R[]}){return (order.paymentRecords||[]).filter(record=>/^\d{4}-\d{2}-\d{2}$/.test(record.date));}
export function includeLegacyCashOrder(order:{creditAccountId?:string;importedSummary?:unknown;date?:string}){return !order.creditAccountId&&!order.importedSummary&&!!order.date;}

export function ticketLabel(order:{id:string;sourceOrderId?:string}){return order.sourceOrderId||order.id;}
