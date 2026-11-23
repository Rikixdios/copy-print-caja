import {usedStock,type StockProduct} from './inventory-model';
export type CatalogProduct={id:number;name:string;category:string;price:number;code?:string;purchasePrice?:number;vat?:number|null;stockQuantity?:number;stockId?:string};
export const productKey=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
export const codeKey=(value:string)=>value.trim().toUpperCase().replace(/^0+(?=\d)/,'');
type SearchEntry = { product: CatalogProduct; haystack: string; code: string; originalCode: string };
function searchEntry(product: CatalogProduct): SearchEntry {
  return { product, haystack: productKey(`${product.name} ${product.code || ''} ${product.category}`), code: codeKey(product.code || '').toLowerCase(), originalCode: product.code?.trim() || '' };
}
function queryMatcher(query: string) {
  const typed = query.trim();
  if (/^\d{5}$/.test(typed)) return (entry: SearchEntry) => /^\d+$/.test(entry.originalCode) && (entry.originalCode.slice(-5) === typed || codeKey(entry.originalCode) === codeKey(typed));
  const tokens = productKey(query).split(/\s+/).filter(Boolean).map(token => {
    const variants = [token];
    if (/^[a-z]{3,}s$/.test(token)) variants.push(token.slice(0, -1));
    if (/^[a-z]{3,}es$/.test(token)) variants.push(token.slice(0, -2));
    return { variants, code: /^\d+$/.test(token) ? codeKey(token) : token };
  });
  return (entry: SearchEntry) => tokens.every(token => token.variants.some(value => entry.haystack.includes(value)) || entry.code.includes(token.code));
}
export function productMatches(product: CatalogProduct, query: string) { return queryMatcher(query)(searchEntry(product)); }
// Build once per catalog update; keystrokes only scan prepared strings.
export function createProductSearch(products: CatalogProduct[]) {
  const collator = new Intl.Collator('es');
  const entries = products.map(searchEntry).sort((a, b) => collator.compare(a.product.name, b.product.name));
  return (query: string) => query.trim() ? entries.filter(queryMatcher(query)).map(entry => entry.product) : [];
}

export type ProductSource=Omit<CatalogProduct,'id'|'stockId'>;
export function mergeProductSource<T extends {products:CatalogProduct[];stockProducts?:StockProduct[];orders:Parameters<typeof usedStock>[0]}>(before:T,source:ProductSource[],makeId:()=>string){const products=before.products.map(p=>({...p})),stocks=(before.stockProducts||[]).map(s=>({...s}));let serial=Math.max(10000,...products.map(p=>p.id)),updated=0,added=0;const usedIds=new Set<number>(),incomingCodes=new Set<string>();
 for(const row of source){if(!row.code||incomingCodes.has(codeKey(row.code))||!row.name.trim()||!Number.isFinite(row.price)||row.price<0||!Number.isFinite(row.purchasePrice)||row.purchasePrice!<0||!Number.isFinite(row.stockQuantity))throw new Error(`Producto inválido o código duplicado: ${row.code||row.name}`);incomingCodes.add(codeKey(row.code));const sameName=products.filter(p=>!usedIds.has(p.id)&&!p.code&&productKey(p.name)===productKey(row.name));let existing=products.find(p=>p.code&&codeKey(p.code||'')===codeKey(row.code||''))||sameName.find(p=>p.price===row.price)||sameName[0];
 const id=existing?.id||++serial;let stock=stocks.find(s=>s.id===existing?.stockId)||stocks.find(s=>s.catalogProductId===id);const stockId=stock?.id||makeId();const product:CatalogProduct={...existing,...row,id,stockId,vat:row.vat??existing?.vat??null};const updatedStock:StockProduct={...stock,id:stockId,catalogProductId:id,name:row.name,category:row.category,code:row.code,purchasePrice:row.purchasePrice,vat:product.vat,price:row.price,baseQuantity:row.stockQuantity!+usedStock(before.orders,stockId),importedStock:true,archived:false};if(stock)stocks[stocks.indexOf(stock)]=updatedStock;else stocks.push(updatedStock);if(existing){products[products.indexOf(existing)]=product;updated++;}else{products.push(product);added++;}usedIds.add(id);
 }
 return {store:{...before,products,stockProducts:stocks},updated,added};
}

export function displayProductCode(value?:string){const text=value?.trim()||'';return /^\d+$/.test(text)?text.replace(/^0+(?=\d)/,''):text;}

export class ProductCodeConflict extends Error {
  constructor(){super('Ese código ya existe. Escribí otro código o dejá el campo vacío para generar uno automático.');this.name='ProductCodeConflict';}
}
export function resolveProductCode(products:Pick<CatalogProduct,'id'|'code'>[],value?:string,id?:number):string {
  const manual=value?.trim();
  if(manual){if(products.some(product=>product.id!==id&&product.code&&codeKey(product.code)===codeKey(manual)))throw new ProductCodeConflict();return manual;}
  const used=new Set(products.filter(product=>product.id!==id&&product.code).map(product=>codeKey(product.code!)));
  // Keep automatic codes short even when imported products use full barcodes.
  const shortNumbers=[...used].filter(code=>/^\d{1,5}$/.test(code)).map(Number);
  let next=Math.max(0,...shortNumbers)+1;
  while(used.has(String(next))||products.some(product=>/^\d+$/.test(product.code||'')&&product.code!.slice(-5)===String(next).padStart(5,'0')))next++;
  return String(next);
}
export function validateProductCodes<T>(state:T):T {
  const products=(state as {products?:CatalogProduct[]})?.products;
  const used=new Set<string>();
  for(const product of products||[]){if(!product.code?.trim())continue;const key=codeKey(product.code);if(used.has(key))throw new ProductCodeConflict();used.add(key);}
  return state;
}
