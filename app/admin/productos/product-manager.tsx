"use client";
import { useMemo, useState } from "react";
import { formatGs, parseGs } from "../../../lib/format-gs";

type Product = { id:string; name:string; price:number; cost:number|null; stock:number; category:string|null; description:string|null; image_url:string|null; video_url:string|null; active:boolean; created_at:string; updated_at:string };

export function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<Product|null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const shown = useMemo(() => products.filter((p) => {
    const matches = `${p.name} ${p.category || ""}`.toLowerCase().includes(query.toLowerCase());
    const state = filter === "todos" || (filter === "activos" && p.active) || (filter === "inactivos" && !p.active) || (filter === "bajo" && p.stock <= 5);
    return matches && state;
  }), [products, query, filter]);

  async function save(product: Product) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin-products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          cost: Number(product.cost || 0),
          stock: Number(product.stock),
          category: product.category,
          description: product.description,
          image_url: product.image_url,
          video_url: product.video_url,
          active: product.active,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "No se pudo guardar el producto.");
      const updated = result.product as Product;
      setProducts((list) => list.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      setMessage("✅ Producto y disponibilidad actualizados correctamente.");
    } catch (e:any) {
      setMessage(`❌ ${e?.message || "No se pudo guardar el producto."}`);
    } finally { setBusy(false); }
  }

  async function toggle(product: Product) {
    await save({ ...product, active: !product.active });
  }

  return <>
    <div className="panel product-toolbar">
      <div className="twocol">
        <label>Buscar producto<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o categoría" /></label>
        <label>Filtrar<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="bajo">Stock bajo (≤ 5)</option></select></label>
      </div>
      <p className="muted">{shown.length} producto(s) mostrado(s) · {products.filter((p) => p.active).length} activo(s).</p>
    </div>
    {message && <div className="panel">{message}</div>}
    <div className="admin-products">
      {shown.map((p) => <article className="panel admin-product" key={p.id}>
        <div className="admin-product-media">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <b>DF</b>}</div>
        <div className="admin-product-main">
          <div className="admin-product-top"><div><small>{p.category || "Sin categoría"}</small><h2>{p.name}</h2></div><span className={p.active ? "status active" : "status"}>{p.active ? "Activo" : "Inactivo"}</span></div>
          <div className="admin-product-data"><div><span>Precio</span><b>₲ {Number(p.price).toLocaleString("es-PY")}</b></div><div><span>Costo</span><b>₲ {Number(p.cost || 0).toLocaleString("es-PY")}</b></div><div><span>Disponibilidad</span><b className={p.stock <= 5 ? "low-stock" : ""}>{p.stock} unidad(es)</b></div></div>
          <div className="actions"><button className="btn" disabled={busy} onClick={() => setEditing({ ...p })}>Editar disponibilidad</button><button className="btn secondary" disabled={busy} onClick={() => toggle(p)}>{p.active ? "Desactivar" : "Activar"}</button></div>
        </div>
      </article>)}
    </div>
    {!shown.length && <div className="empty">No encontramos productos con ese filtro.</div>}
    {editing && <EditProduct product={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}
  </>;
}

function EditProduct({ product, busy, onCancel, onSave }: { product:Product; busy:boolean; onCancel:()=>void; onSave:(p:Product)=>void }) {
  const [draft, setDraft] = useState<Product>({ ...product });
  const set = (key:keyof Product, value:any) => setDraft((old) => ({ ...old, [key]: value }));
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="panel edit-modal">
      <div className="title"><div><small>EDITAR PRODUCTO</small><h2>{draft.name}</h2></div><button className="linkbtn" type="button" onClick={onCancel}>Cerrar ✕</button></div>
      <label>Nombre<input value={draft.name} onChange={(e) => set("name", e.target.value)} /></label>
      <div className="twocol"><label>Precio<input inputMode="numeric" value={formatGs(draft.price)} onChange={(e) => set("price", parseGs(e.target.value))} /></label><label>Costo<input inputMode="numeric" value={formatGs(draft.cost || 0)} onChange={(e) => set("cost", parseGs(e.target.value))} /></label></div>
      <div className="twocol"><label><b>Disponibilidad / Stock</b><input type="number" min="0" step="1" value={draft.stock} onChange={(e) => set("stock", e.target.value === "" ? 0 : Math.max(0, Math.floor(Number(e.target.value))))} /></label><label>Categoría<select value={draft.category || "Otros"} onChange={(e) => set("category", e.target.value)}><option>Ropa</option><option>Hogar</option><option>Electro</option><option>Otros</option></select></label></div>
      <label>Descripción<textarea value={draft.description || ""} onChange={(e) => set("description", e.target.value)} /></label>
      <label>URL de foto de portada<input value={draft.image_url || ""} onChange={(e) => set("image_url", e.target.value)} /></label>
      <label>URL de video<input value={draft.video_url || ""} onChange={(e) => set("video_url", e.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} /> Producto activo</label>
      <div className="actions"><button className="btn" type="button" disabled={busy} onClick={() => onSave({ ...draft, price:Number(draft.price)||0, cost:Number(draft.cost)||0, stock:Math.max(0, Math.floor(Number(draft.stock)||0)) })}>{busy ? "Guardando..." : "Guardar cambios"}</button><button className="btn secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
    </div>
  </div>;
}
