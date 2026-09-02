"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";
const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;
type Order={id:string;status:string;delivery_type:string;payment_method:string;subtotal:number;delivery_fee:number;total:number;created_at:string;customer?:{full_name:string;whatsapp:string;city:string;department:string}|null;shipping_company?:{name:string}|null};
const statuses=["pendiente","confirmado","preparando","enviado","entregado","cancelado"];
export default function Pedidos(){
 const [orders,setOrders]=useState<Order[]>([]); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
 async function load(){setLoading(true); const s=createClient(); const {data,error}=await s.from("orders").select("id,status,delivery_type,payment_method,subtotal,delivery_fee,total,created_at,customers(full_name,whatsapp,city,department),shipping_companies(name)").order("created_at",{ascending:false}); if(error)setMsg(error.message); else setOrders((data||[]).map((o:any)=>({...o,customer:o.customers,shipping_company:o.shipping_companies}))); setLoading(false);}
 useEffect(()=>{load()},[]);
 async function change(id:string,status:string){setMsg(""); const s=createClient(); const {error}=await s.from("orders").update({status}).eq("id",id); if(error)setMsg(error.message); else setOrders(x=>x.map(o=>o.id===id?{...o,status}:o));}
 return <section><div className="title"><div><small>ADMINISTRADOR</small><h1>Pedidos</h1></div><Link href="/admin">← Admin</Link></div>{msg&&<div className="panel">⚠️ {msg}</div>}{loading?<div className="panel">Cargando pedidos...</div>:!orders.length?<div className="empty"><h2>Aún no hay pedidos</h2><p>Los pedidos confirmados desde el checkout aparecerán aquí.</p></div>:<div className="admin-orders">{orders.map(o=><article className="panel order-card" key={o.id}><div className="order-head"><div><small>#{o.id.slice(0,8).toUpperCase()}</small><h2>{o.customer?.full_name||"Cliente"}</h2><p>{o.customer?.whatsapp||""} · {o.customer?.city||""}, {o.customer?.department||""}</p></div><strong>{money(o.total)}</strong></div><div className="order-meta"><span>📦 {o.delivery_type}</span><span>💳 {o.payment_method}</span><span>🚚 {o.shipping_company?.name||"—"}</span><span>{new Date(o.created_at).toLocaleString("es-PY")}</span></div><div className="order-actions"><label>Estado<select value={o.status} onChange={e=>change(o.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label><Link className="btn secondary" href={`/admin/pedidos/${o.id}`}>Ver detalle</Link></div></article>)}</div>}</section>;
}
