const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('app/order-image-export.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function capture({fail=false,prior='',width=800}={}) {
 const vars = new Map(prior ? [['--order-unit',prior]] : []);
 let decoded=false,options;
 const blob={type:'image/png'};
 const node={style:{getPropertyValue:key=>vars.get(key)||'',getPropertyPriority:()=>'',setProperty:(key,value)=>vars.set(key,value),removeProperty:key=>vars.delete(key)},querySelectorAll:()=>[{decode:async()=>{decoded=true}}],getBoundingClientRect:()=>({width,height:1000}),get scrollHeight(){assert.equal(vars.get('--order-unit'),`${width/100}px`);return 1400}};
 const context={exports:{},document:{fonts:{ready:Promise.resolve()}},require:name=>{assert.equal(name,'html-to-image');return {toBlob:async(received,settings)=>{assert(decoded,'Image must decode before capture');assert.equal(received,node);assert.equal(vars.get('--order-unit'),`${width/100}px`);options=settings;if(fail)throw Error('capture failed');return blob;}}}};
 vm.runInNewContext(code,context);
 if(fail||width===0)await assert.rejects(context.exports.orderDocumentImageBlob(node));
 else{assert.equal(await context.exports.orderDocumentImageBlob(node),blob);assert.equal(options.width,width);assert.equal(options.height,1400);assert.equal(options.style.width,`${width}px`);assert.equal(options.style.height,'1400px');assert.equal(options.pixelRatio,2);}
 assert.equal(vars.get('--order-unit')||'',prior,'Capture must restore responsive preview units');
}
(async()=>{await capture();await capture({prior:'1cqw',width:420});await capture({fail:true,prior:'1cqw'});await capture({width:0});console.log('PASS: stable PNG dimensions, decoded images and restored responsive units, including capture failure.');})().catch(error=>{console.error(error);process.exit(1)});
