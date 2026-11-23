"use client";
import {useDeferredValue,useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import {createProductSearch,displayProductCode,type CatalogProduct} from './product-model';

export function HeaderProductSearch({products,onConsult}:{products:CatalogProduct[];onConsult:(query:string)=>void}){
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false);
  const search=useMemo(()=>createProductSearch(products),[products]);
  const deferredQuery=useDeferredValue(query);
  const results=useMemo(()=>search(deferredQuery),[search,deferredQuery]);
  const consult=()=>{setOpen(false);onConsult(query.trim());};
  return <div className="header-product-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <form onSubmit={event=>{event.preventDefault();consult();}}>
      <Search size={18}/><input aria-label="Buscar productos por código o nombre" placeholder="Buscar producto o código…" value={query} autoComplete="off" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}/>
      <button type="submit" aria-label="Consultar productos" title="Consultar productos"><Search size={17}/></button>
    </form>
    {open&&query.trim()&&<div className="header-product-results" aria-label="Resultados de productos">
      {results.slice(0,10).map(product=><button type="button" key={product.id} onClick={()=>{setOpen(false);onConsult(product.code||product.name);}}><span><small>{displayProductCode(product.code)||'Sin código'}</small><b>{product.name}</b></span><strong>{product.price.toLocaleString('es-PY')} Gs.</strong></button>)}
      {!results.length&&<p>No hay productos con ese código o nombre.</p>}
      <button className="header-search-all" type="button" onClick={consult}>Ver todos los resultados ({results.length})</button>
    </div>}
  </div>;
}
