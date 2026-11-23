"use client";

import { memo, useMemo, useState } from "react";
import { displayProductCode, type CatalogProduct } from "./product-model";

const PAGE_SIZE = 40;
const currency = new Intl.NumberFormat("es-PY");

export const ProductSuggestions = memo(function ProductSuggestions({ query, search, itemId, onChoose }: {
  query: string;
  search: (query: string) => CatalogProduct[];
  itemId: number;
  onChoose: (id: number, product: CatalogProduct) => void;
}) {
  const matches = useMemo(() => search(query), [search, query]);
  const [page, setPage] = useState({ query, count: PAGE_SIZE });
  const count = page.query === query ? page.count : PAGE_SIZE;
  if (!matches.length) return null;
  return <div className="order-product-suggestions" role="listbox" aria-label="Productos cargados">
    <div className="order-product-match-count" role="status">{matches.length} productos encontrados · mostrando {Math.min(count, matches.length)}</div>
    {matches.slice(0, count).map(product => <button type="button" role="option" aria-selected={false} key={product.id} onMouseDown={event => event.preventDefault()} onClick={() => onChoose(itemId, product)}>
      <span>{product.code && <b>{displayProductCode(product.code)} · </b>}{product.name}</span><small>{currency.format(product.price)} Gs c/u</small>
    </button>)}
    {count < matches.length && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setPage({ query, count: count + PAGE_SIZE })}>Ver más productos ({matches.length - count} restantes)</button>}
  </div>;
});
