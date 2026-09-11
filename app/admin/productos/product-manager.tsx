"use client";
import { useMemo, useState } from "react";
import { formatGs, parseGs } from "../../../lib/format-gs";

const CATEGORIES = ["Electrónica", "Hogar", "Herramientas", "Vestimenta", "Belleza", "Accesorios", "Tecnología", "Otros"];
const normalizeCategory = (value: string | null | undefined) => {
  if (value === "Electro") return "Electrónica";
  if (value === "Ropa") return "Vestimenta";
  return value && CATEGORIES.includes(value) ? value : "Otros";
};
type Product = { id:string; name:string; price:number; cost:number|null; stock:number; category:string|null; description:string|null; image_url:string|null; video_url:string|null; active:boolean; created_at:string; updated_at:string };

export function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<Product|null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const shown = useMemo(() => products.filter(p => {
    const matches = `${p.name} ${normalizeCategory(p.category)}`.toLowerCase().includes(query.toLowerCase());
    const state = filter === "todos" || (filter === "activos" && p.active) || (filter === "inactivos" && !p.active) || (filter === "bajo" && p.stock <= 5);
    return matches && state;
  }), [products, query, filter]);

  async function save(product: Product) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin-products", { method:"PATCH", headers:{"Content-Type":"application/json",Accept:"application/json"}, credentials:"include", cache:"no-store", body:JSON.stringify({ ...product, price:Number(product.price), cost:Number(product.cost||0), stock:Number(product.stock), category:normalizeCategory(product.category) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || `No se pudo guardar el producto (${response.status}).`);
      if (!result.product?.id) throw new Error("El servidor no devolvió el producto actualizado.");
      setProducts(list => list.map(item => item.id === result.product.id ? result.product : item));
      setEditing(null); setMessage("✅ Producto y disponibilidad actualizados correctamente.");
    } catch (e:any) { setMessage(`❌ ${e?.message || "No se pudo guardar el producto."}`); }
    finally { setBusy(false); }
  }
  async function toggle(product: Product) { await save({ ...product, active: !product.active }); }

  return <>
    <div className="panel product-toolbar" style={{borderRadius:20,boxShadow:"0 8px 28px rgba(33,23,26,.06)"}}><div className="twocol"><label>Buscar producto<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o categoría" /></label><label>Filtrar<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="bajo">Stock bajo (≤ 5)</option></select></label></div><p className="muted">{shown.length} producto(s) mostrado(s) · {products.filter(p=>p.active).length} activo(s).</p></div>
    {message && <div className="panel" role="status">{message}</div>}
    <div className="admin-products">{shown.map(p => <article className="panel admin-product" key={p.id} style={{borderRadius:20,boxShadow:"0 8px 28px rgba(33,23,26,.06)"}}>
      <div className="admin-product-media" style={{width:140,height:140,maxWidth:"100%",overflow:"hidden",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",background:"#f3ecec",flexShrink:0}}>{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"contain",padding:10}} /> : <b>DF</b>}</div>
      <div className="admin-product-main"><div className="admin-product-top"><div><small>{normalizeCategory(p.category)}</small><h2>{p.name}</h2></div><span className={p.active?"status active":"status"}>{p.active?"Activo":"Inactivo"}</span></div><div className="admin-product-data"><div><span>Precio</span><b>₲ {Number(p.price).toLocaleString("es-PY")}</b></div><div><span>Costo</span><b>₲ {Number(p.cost||0).toLocaleString("es-PY")}</b></div><div><span>Disponibilidad</span><b className={p.stock<=5?"low-stock":""}>{p.stock} unidad(es)</b></div></div><div className="actions"><button type="button" className="btn" disabled={busy} onClick={()=>{setMessage("");setEditing({...p,category:normalizeCategory(p.category)});}}>Editar producto</button><button type="button" className="btn secondary" disabled={busy} onClick={()=>toggle(p)}>{p.active?"Desactivar":"Activar"}</button></div></div>
    </article>)}</div>
    {!shown.length && <div className="empty">No encontramos productos con ese filtro.</div>}
    {editing && <EditProduct product={editing} busy={busy} onCancel={()=>setEditing(null)} onSave={save} />}
  </>;
}

function EditProduct({product,busy,onCancel,onSave}:{product:Product;busy:boolean;onCancel:()=>void;onSave:(p:Product)=>void}) {
  const [draft,setDraft] = useState({name:product.name,price:String(product.price??""),cost:String(product.cost??""),stock:String(product.stock??""),category:normalizeCategory(product.category),description:product.description||"",image_url:product.image_url||"",video_url:product.video_url||"",active:product.active});
  const set = (key:keyof typeof draft,value:string|boolean) => setDraft(old=>({...old,[key]:value}));
  const submit = () => onSave({...product,name:draft.name,price:parseGs(draft.price),cost:parseGs(draft.cost),stock:draft.stock===""?0:Math.max(0,Math.floor(Number(draft.stock))),category:normalizeCategory(draft.category),description:draft.description,image_url:draft.image_url,video_url:draft.video_url,active:draft.active});
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Editar ${draft.name}`} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(20,12,15,.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:18,overflowY:"auto"}} onMouseDown={e=>{if(e.target===e.currentTarget)onCancel();}}>
    <div className="panel edit-modal" style={{width:"min(760px,100%)",maxHeight:"calc(100vh - 36px)",overflowY:"auto",borderRadius:24,boxShadow:"0 24px 80px rgba(0,0,0,.28)",background:"#fff",padding:30}}>
      <div className="title"><div><small>EDITAR PRODUCTO</small><h2>{draft.name||"Producto"}</h2></div><button className="linkbtn" type="button" onClick={onCancel}>Cerrar ✕</button></div>
      <label>Nombre<input value={draft.name} onChange={e=>set("name",e.target.value)} /></label>
      <div className="twocol"><label>Precio<input inputMode="numeric" value={formatGs(draft.price)} onChange={e=>set("price",String(parseGs(e.target.value)))} /></label><label>Costo<input inputMode="numeric" value={formatGs(draft.cost)} onChange={e=>set("cost",String(parseGs(e.target.value)))} /></label></div>
      <div className="twocol"><label><b>Disponibilidad / Stock</b><input type="text" inputMode="numeric" pattern="[0-9]*" value={draft.stock} onChange={e=>set("stock",e.target.value.replace(/[^0-9]/g,""))} placeholder="0" /></label><label>Categoría<select value={draft.category} onChange={e=>set("category",e.target.value)}>{CATEGORIES.map(category=><option key={category} value={category}>{category}</option>)}</select></label></div>
      <label>Descripción<textarea value={draft.description} onChange={e=>set("description",e.target.value)} /></label>
      <label>URL de foto de portada<input value={draft.image_url} onChange={e=>set("image_url",e.target.value)} placeholder="https://..." /></label>
      <label>URL de video<input value={draft.video_url} onChange={e=>set("video_url",e.target.value)} placeholder="https://..." /></label>
      <label className="check"><input type="checkbox" checked={draft.active} onChange={e=>set("active",e.target.checked)} /> Producto activo</label>
      <div className="actions"><button className="btn" type="button" disabled={busy} onClick={submit}>{busy?"Guardando...":"Guardar cambios"}</button><button className="btn secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
    </div>
  </div>;
}
