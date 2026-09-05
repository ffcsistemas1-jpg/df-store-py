"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {createClient} from "../../../lib/supabase/browser";

type Promo={id:string;badge:string|null;title:string;description:string|null;price_text:string|null;cta_text:string|null;category:string|null;image_url:string|null;active:boolean;sort_order:number};
const empty={badge:"",title:"",description:"",price_text:"",cta_text:"",category:"",image_url:""};

export default function Promociones(){
 const [items,setItems]=useState<Promo[]>([]),[form,setForm]=useState(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState("");
 async function load(){
  setLoading(true); setMsg("");
  const s=createClient();
  const {data,error}=await s.from("promotions").select("id,badge,title,description,price_text,cta_text,category,image_url,active,sort_order").order("sort_order").order("created_at",{ascending:false});
  if(error)setMsg(error.message); else setItems((data||[]) as Promo[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function add(e:React.FormEvent){
  e.preventDefault(); setSaving(true); setMsg("");
  const s=createClient();
  const {error}=await s.from("promotions").insert({
   badge:form.badge.trim()||null, title:form.title.trim(), description:form.description.trim()||null,
   price_text:form.price_text.trim()||null, cta_text:form.cta_text.trim()||null, category:form.category.trim()||null,
   image_url:form.image_url.trim()||null, active:true, sort_order:items.length
  });
  if(error)setMsg(error.message); else {setForm(empty); await load();}
  setSaving(false);
 }
 async function toggle(x:Promo){
  setMsg(""); const s=createClient(); const {error}=await s.from("promotions").update({active:!x.active}).eq("id",x.id);
  if(error)setMsg(error.message); else setItems(v=>v.map(i=>i.id===x.id?{...i,active:!x.active}:i));
 }
 async function remove(x:Promo){
  if(!window.confirm(`¿Eliminar la promoción "${x.title}"?`))return;
  const s=createClient(); const {error}=await s.from("promotions").delete().eq("id",x.id);
  if(error)setMsg(error.message); else setItems(v=>v.filter(i=>i.id!==x.id));
 }
 return <section>
  <div className="title"><div><small>ADMINISTRADOR</small><h1>Promociones</h1></div><Link href="/admin">← Admin</Link></div>
  {msg&&<div className="panel">⚠️ {msg}</div>}
  <div className="panel">
   <h2>Nueva promoción</h2>
   <p className="muted">Aparecen en la home, dentro de "Promociones de la semana", en el orden en que fueron creadas.</p>
   <form className="product-form" onSubmit={add}>
    <div className="twocol">
     <label>Etiqueta<input value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="Ej. MÁS ELEGIDO"/></label>
     <label>Título*<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ej. Conjuntos deportivos"/></label>
    </div>
    <label>Descripción<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Comodidad y estilo para todos los días."/></label>
    <div className="twocol">
     <label>Precio o condición<input value={form.price_text} onChange={e=>setForm({...form,price_text:e.target.value})} placeholder="Ej. Hasta 3 por Gs. 165.000"/></label>
     <label>Texto del botón<input value={form.cta_text} onChange={e=>setForm({...form,cta_text:e.target.value})} placeholder="Ej. Comprar promoción"/></label>
    </div>
    <div className="twocol">
     <label>Categoría a la que enlaza<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Ej. Ropa (opcional)"/></label>
     <label>URL de imagen<input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://... (opcional)"/></label>
    </div>
    <button className="btn" disabled={saving}>{saving?"Guardando...":"+ Agregar promoción"}</button>
   </form>
  </div>
  <div className="panel">
   <h2>Promociones cargadas</h2>
   {loading?<p className="muted">Cargando...</p>:!items.length?<div className="empty"><h3>No hay promociones</h3><p>Agregá la primera arriba.</p></div>:<div className="payment-list">{items.map(x=><div className="panel payment-row" key={x.id}>
    <div><b>{x.title}</b> · {x.active?<span>Activa</span>:<span>Inactiva</span>}<br/>{x.badge&&<span className="muted">{x.badge} · </span>}{x.price_text&&<span className="muted">{x.price_text}</span>}</div>
    <div className="actions"><button className="btn secondary" onClick={()=>toggle(x)}>{x.active?"Desactivar":"Activar"}</button><button className="link-btn danger" onClick={()=>remove(x)}>Eliminar</button></div>
   </div>)}</div>}
  </div>
 </section>
}
