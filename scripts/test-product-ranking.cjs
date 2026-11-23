const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),assert=require('node:assert/strict');
const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const mod={exports:{}};cache[file]=mod;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:name=>load(path.resolve(path.dirname(file),name)),Map,Set,Number,Math});return mod.exports;}
const {productRanking}=load('app/product-ranking');
const item=(name,quantity,price)=>({id:1,name,quantity,price});
const order=(id,items,extra={})=>({id,items,total:items.reduce((s,i)=>s+i.quantity*i.price,0),date:'2026-10-20',advisor:'Diana',status:'pendiente',...extra});
const a=order('A',[item('Banner',2,100),item(' banner ',1,120)]),b=order('B',[item('Sticker',10,5)],{status:'cobrado',paymentRecords:[{amount:20},{amount:30}]}),credit=order('C',[item('Banner',1,110)],{creditAccountId:'cuenta'});
const orders=[a,b,credit,order('return',[item('X',1000,1)],{status:'devuelto'}),order('history',[item('Y',1000,1)],{importedSummary:{paid:1000}}),order('copy',[item('Z',1000,1)],{sourceOrderId:'B'}),order('old',[item('Old',1000,1)],{date:'2026-09-01'}),order('other',[item('Other',1000,1)],{advisor:'Aide'})];
const works=[order('A',[item('Old draft',100,1)]),order('W',[item('Banner',3,90)])];
const filters={from:'2026-10-01',to:'2026-10-31',advisor:'Diana',mode:'registrados',sort:'cantidad'};
const rows=productRanking(orders,works,filters);assert.equal(rows.length,2);assert.equal(rows[0].name,'Sticker');assert.equal(rows[0].quantity,10);assert.equal(rows[0].orders,1);assert.equal(rows[1].quantity,7);assert.equal(rows[1].orders,3);assert.equal(rows[1].amount,700);
assert.equal(productRanking(orders,works,{...filters,sort:'pedidos'})[0].name,'Banner');assert.equal(productRanking(orders,works,{...filters,sort:'importe'})[0].name,'Banner');
const paid=productRanking(orders,works,{...filters,mode:'cobrados'});assert.equal(paid.length,1);assert.equal(paid[0].name,'Sticker');assert.equal(paid[0].quantity,10);
assert.equal(productRanking(orders,works,{...filters,query:' BAN '}).length,1);assert.equal(productRanking(orders,works,{...filters,from:'2026-11-01'}).length,0);
console.log('PASS product ranking: date/advisor/search filters, registered vs confirmed full payment, credit, grouped quantities/amounts, unique orders, installments, returns, imported summaries, sorting and empty periods.');
