"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const timeAgo=(iso:string)=>{
  const mins=Math.max(1,Math.round((Date.now()-new Date(iso).getTime())/60000));
  if(mins<60) return `hace ${mins} min`;
  const hs=Math.round(mins/60); if(hs<24) return `hace ${hs} h`;
  const days=Math.round(hs/24); return `hace ${days} d`;
};

type Stage={label:string;value:number};
type Draft={session:string;full_name:string|null;whatsapp:string|null;email:string|null;department:string|null;city:string|null;neighborhood:string|null;address:string|null;delivery_type:string|null;payment_method:string|null;updated_at:string};

export default function Embudo(){
 const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
 const [stages,setStages]=useState<Stage[]>([]);
 const [drafts,setDrafts]=useState<Draft[]>([]);

 async function load(){
  setLoading(true); setMsg("");
  const s=createClient();
  const [visits,views,carts,checkouts,orders,delivered,abandoned]=await Promise.all([
   s.from("analytics_events").select("session").eq("type","visit"),
   s.from("analytics_events").select("session").eq("type","product_view"),
   s.from("cart_items").select("session"),
   s.from("checkout_drafts").select("session"),
   s.from("orders").select("id",{count:"exact",head:true}),
   s.from("orders").select("id",{count:"exact",head:true}).eq("status","entregado"),
   s.from("checkout_drafts").select("session,full_name,whatsapp,email,department,city,neighborhood,address,delivery_type,payment_method,updated_at").is("completed_at",null).order("updated_at",{ascending:false}).limit(50)
  ]);
  const firstError=[visits,views,carts,checkouts,orders,delivered,abandoned].find(r=>r.error);
  if(firstError?.error){setMsg(firstError.error.message); setLoading(false); return;}
  const uniq=(rows:any[])=>new Set((rows||[]).map(r=>r.session)).size;
  setStages([
   {label:"Visitas",value:uniq(visits.data||[])},
   {label:"Productos vistos",value:uniq(views.data||[])},
   {label:"Carritos",value:uniq(carts.data||[])},
   {label:"Checkout iniciado",value:uniq(checkouts.data||[])},
   {label:"Pedidos",value:orders.count||0},
   {label:"Entregados",value:delivered.count||0},
  ]);
  setDrafts((abandoned.data||[]) as Draft[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[]);

 async function discard(session:string){
  if(!window.confirm("¿Descartar este checkout abandonado de la lista?"))return;
  const s=createClient(); const {error}=await s.from("checkout_drafts").delete().eq("session",session);
  if(error)setMsg(error.message); else setDrafts(v=>v.filter(d=>d.session!==session));
 }

 const total=stages[0]?.value||0;
 return <section>
  <div className="title"><div><small>ADMINISTRADOR</small><h1>Embudo de ventas</h1></div><Link href="/admin">← Admin</Link></div>
  {msg&&<div className="panel">⚠️ {msg}</div>}
  <div className="panel">
   <h2>Recorrido del cliente</h2>
   <p className="muted">Datos reales de tu tienda, calculados desde Supabase.</p>
   {loading?<p className="muted">Cargando...</p>:<div className="funnel-grid">
    {stages.map(st=>{const pct=total?Math.round((st.value/total)*100):0; return <div className="funnel-card" key={st.label}>
     <b>{st.value}</b>
     <span>{st.label}</span>
     <small>{pct}%</small>
     <div className="funnel-bar"><i style={{width:`${Math.min(100,pct)}%`}}/></div>
    </div>;})}
   </div>}
   <button className="btn secondary" onClick={load} disabled={loading}>{loading?"Actualizando...":"Actualizar"}</button>
  </div>

  <div className="panel">
   <h2>Checkouts abandonados</h2>
   <p className="muted">Clientes que empezaron a completar sus datos en el checkout pero no llegaron a confirmar el pedido. Podés contactarlos por WhatsApp para ayudarlos a terminar la compra.</p>
   {loading?<p className="muted">Cargando...</p>:!drafts.length?<div className="empty"><h3>No hay checkouts abandonados</h3><p>Cuando alguien empiece el checkout sin terminarlo, va a aparecer acá.</p></div>:<div className="payment-list">{drafts.map(d=><div className="panel payment-row" key={d.session}>
    <div><b>{d.full_name||"Sin nombre"}</b> · {timeAgo(d.updated_at)}<br/>{d.whatsapp&&<>📱 {d.whatsapp}<br/></>}{(d.department||d.city)&&<span className="muted">{[d.city,d.department].filter(Boolean).join(", ")}<br/></span>}{d.address&&<span className="muted">{d.address}<br/></span>}{d.delivery_type&&<span className="muted">{d.delivery_type}{d.payment_method?` · ${d.payment_method}`:""}</span>}</div>
    <div className="actions">{d.whatsapp&&<a className="btn secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${d.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${d.full_name||""}! Vimos que casi completás tu compra en DF Store PY, ¿te ayudamos a terminarla?`)}`}>Contactar por WhatsApp</a>}<button className="link-btn danger" onClick={()=>discard(d.session)}>Descartar</button></div>
   </div>)}</div>}
  </div>
 </section>
}
