const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
export function displayDate(value?:string){
 if(!value)return '—';const match=value.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!match)return value;
 const month=Number(match[2]);return month>=1&&month<=12?`${match[3]} - ${months[month-1]} - ${match[1].slice(-2)}`:value;
}
const timeFormatter = new Intl.DateTimeFormat('en-GB',{timeZone:'America/Asuncion',hourCycle:'h23',hour:'2-digit',minute:'2-digit'});
export function displayTime(value?:string){
 if(!value)return '—';
 if(/^\d{4}-\d{2}-\d{2}T/.test(value)){const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';return timeFormatter.format(date)+'hs';}
 const text=value.replace(/[\u200e\u200f\u202f\u00a0]/g,' ').toLowerCase(),match=text.match(/(\d{1,2}):(\d{2})/);if(!match)return value;
 let hour=Number(match[1]);const minute=Number(match[2]);if(/p\s*\.?\s*m/.test(text)&&hour<12)hour+=12;if(/a\s*\.?\s*m/.test(text)&&hour===12)hour=0;
 return hour<=23&&minute<=59?`${String(hour).padStart(2,'0')}:${match[2]}hs`:value;
}
