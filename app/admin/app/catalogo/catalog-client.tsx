"use client";
import { useMemo, useState } from "react";
import { ProductCard } from "../ui";
import type { Product } from "../../lib/products";

type Sort = "relevancia" | "recientes" | "precio-asc" | "precio-desc";
type Disponibilidad = "todos" | "disponible" | "agotado";
type Precio = "todos" | "hasta-100" | "100-180" | "mas-180";

export default function CatalogClient({ products, categories, initialQ, initialCategoria }:{
  products: Product[]; categories: string[]; initialQ: string; initialCategoria: string;
}) {
  const [q, setQ] = useState(initialQ);
  const [categoria, setCategoria] = useState(initialCategoria);
  const [sort, setSort] = useState<Sort>("relevancia");
  const [showFilters, setShowFilters] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>("todos");
  const [precio, setPrecio] = useState<Precio>("todos");

  const filtered = useMemo(() => {
    let list = [...products];
    if (categoria) list = list.filter(p => (p.category || "").toLowerCase() === categoria.toLowerCase());
    if (q.trim()) { const term = q.trim().toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(term) || (p.description || "").toLowerCase().includes(term)); }
    if (disponibilidad === "disponible") list = list.filter(p => (p.stock || 0) > 0);
    if (disponibilidad === "agotado") list = list.filter(p => (p.stock || 0) <= 0);
    if (precio === "hasta-100") list = list.filter(p => p.price <= 100000);
    if (precio === "100-180") list = list.filter(p => p.price > 100000 && p.price <= 180000);
    if (precio === "mas-180") list = list.filter(p => p.price > 180000);
    if (sort === "precio-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "precio-desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, categoria, q, disponibilidad, precio, sort]);

  const activeFilters = (disponibilidad !== "todos" ? 1 : 0) + (precio !== "todos" ? 1 : 0);

  return <section>
    <div className="title"><div><small>CATÁLOGO COMPLETO</small><h1>Productos disponibles</h1><p className="muted">Precios y disponibilidad sujetos a stock</p></div></div>

    <div className="catalog-toolbar">
      <input className="catalog-search" type="search" placeholder="Buscar producto" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar producto" />
      <select className="catalog-sort" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Ordenar">
        <option value="relevancia">Relevancia</option>
        <option value="recientes">Más recientes</option>
        <option value="precio-asc">Precio: menor a mayor</option>
        <option value="precio-desc">Precio: mayor a menor</option>
      </select>
      <button type="button" className="btn secondary" onClick={() => setShowFilters(v => !v)}>Filtrar catálogo{activeFilters > 0 ? ` (${activeFilters})` : ""}</button>
    </div>

    <div className="filters">
      <a className={!categoria ? "active" : ""} onClick={() => setCategoria("")}>Todos</a>
      {categories.map(c => <a key={c} className={categoria.toLowerCase() === c.toLowerCase() ? "active" : ""} onClick={() => setCategoria(c)}>{c}</a>)}
    </div>

    {showFilters && <div className="panel filter-panel">
      <div className="twocol">
        <label>Disponibilidad
          <select value={disponibilidad} onChange={e => setDisponibilidad(e.target.value as Disponibilidad)}>
            <option value="todos">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="agotado">Agotado</option>
          </select>
        </label>
        <label>Precio
          <select value={precio} onChange={e => setPrecio(e.target.value as Precio)}>
            <option value="todos">Todos</option>
            <option value="hasta-100">Hasta 100.000</option>
            <option value="100-180">100.001 a 180.000</option>
            <option value="mas-180">Más de 180.000</option>
          </select>
        </label>
      </div>
    </div>}

    <div className="grid">{filtered.map(p => <ProductCard key={p.id} p={p} />)}</div>
    {!filtered.length && <div className="empty">No encontramos productos con esos filtros.</div>}
  </section>;
}
