"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;
type Order={id:string;status:string;event_id?:string;is_test?:boolean;delivery_type:string;payment_method:string;subtotal:number;delivery_fee:number;total:number;created_at:string;invoice_requested?:boolean;customer?:{full_name:string;whatsapp:string;city:string;department:string}|null;shipping_company?:{name:string}|null};
const statuses=["pendiente","confirmado","preparando","enviado","entregado","cancelado","devuelto"];
const activeStatuses=["nuevo","pendiente","confirmado","preparando","enviado"];

export default function Pedidos(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [msg,setMsg]=useState("");

 async function load(){
  setLoading(true);
  const s=createClient();
  const {data,error}=await s.from("orders")
   .select("id,status,event_id,is_test,delivery_type,payment_method,subtotal,delivery_fee,total,created_at,invoice_requested,customers(full_name,whatsapp,city,department),shipping_companies(name)")
   .eq("is_test",false)
   .in("status",activeStatuses)
   .order("created_at",{ascending:false});
  if(error)setMsg(error.message);
  else setOrders((data||[]).map((o:any)=>({...o,customer:o.customers,shipping_company:o.shipping_companies})));
  setLoading(false);
 }

 useEffect(()=>{load()},[]);

 async function change(id:string,value:string){
  setMsg("");
  const current=orders.find(o=>o.id===id);
  if(!current)return;

  const s=createClient();

  if(value==="__prueba__"){
   if(!confirm("¿Marcar este pedido como PRUEBA?\n\nNo se borrará. Quedará conservado en Historial > Pruebas y quedará fuera de Ventas/Finanzas. La información que Meta ya haya recibido no se elimina."))return;
   const {error}=await s.from("orders").update({is_test:true}).eq("id",id);
   if(error){setMsg("❌ "+error.message);return}
   setOrders(x=>x.filter(o=>o.id!==id));
   setMsg("✓ Pedido marcado como prueba y movido a Historial > Pruebas.");
   return;
  }

  const wasConfirmed=current.status==="confirmado";
  const {error}=await s.from("orders").update({status:value}).eq("id",id);
  if(error){setMsg("❌ "+error.message);return}

  if(activeStatuses.includes(value)){
   setOrders(x=>x.map(o=>o.id===id?{...o,status:value}:o));
  }else{
   setOrders(x=>x.filter(o=>o.id!==id));
  }

  if(value==="confirmado"&&!wasConfirmed){
   try{
    if(!current.event_id)throw new Error("El pedido no tiene event_id.");
    const {data,error}=await s.functions.invoke("meta-api",{body:{action:"capi",event_name:"Purchase",event_id:current.event_id,order_id:id}});
    if(error){
     let detail=error.message||"Error de Supabase Functions";
     const ctx=(error as any).context;
     if(ctx&&typeof ctx.json==="function"){try{const x=await ctx.json();detail=x?.error||x?.detail||x?.status||detail}catch{}}
     throw new Error(detail);
    }
    if(data?.status==="duplicate_or_invalid_purchase")throw new Error(`Purchase rechazado o duplicado: ${data?.event_id||current.event_id}`);
    if(data?.status!=="sent"&&data?.status!=="already_sent")throw new Error(data?.error||data?.status||"Meta no confirmó el Purchase.");
    setMsg(data?.status==="already_sent"?"✓ Pedido confirmado. Purchase ya estaba registrado, no se duplicó.":"✓ Pedido confirmado y Purchase enviado a Meta.");
   }catch(e:any){
    setMsg("⚠️ Pedido confirmado, pero no se pudo enviar Purchase a Meta: "+(e?.message||"error desconocido"));
   }
  }else if(["entregado","cancelado","devuelto"].includes(value)){
   setMsg(`✓ Pedido ${value} y movido al Historial. Sus datos siguen conservados para Ventas/Finanzas y Meta.`);
  }else{
   setMsg("✓ Estado actualizado.");
  }
 }

 return <section>
  <div className="title">
   <div><small>ADMINISTRADOR</small><h1>Pedidos</h1><p className="muted">Solo pedidos que todavía requieren acción.</p></div>
   <Link href="/admin/pedidos/historial" className="btn secondary">Historial →</Link>
  </div>

  <div className="order-tabs">
   <span className="order-tab active">Pedidos activos</span>
   <Link href="/admin/pedidos/historial" className="order-tab">Historial</Link>
  </div>

  {msg&&<div className="panel">{msg}</div>}
  <div className="order-info panel">
   <div><b>📌 Bandeja de trabajo</b><span>Confirmá, prepará, enviá y cerrá cada pedido aquí.</span></div>
   <Link href="/admin/pedidos/historial">Ver pedidos cerrados y pruebas →</Link>
  </div>

  {loading?<div className="panel">Cargando pedidos...</div>:
   !orders.length?
    <div className="empty"><h2>✓ No hay pedidos pendientes</h2><p>Los pedidos entregados, cancelados, devueltos y las pruebas están fuera de esta bandeja.</p><Link href="/admin/pedidos/historial" className="btn">Ver historial</Link></div>:
    <div className="admin-orders">
     {orders.map(o=><article className="panel order-card" key={o.id}>
      <div className="order-head">
       <div><small>#{o.id.slice(0,8).toUpperCase()}</small><h2>{o.customer?.full_name||"Cliente"}</h2><p>{o.customer?.whatsapp||""} · {o.customer?.city||""}, {o.customer?.department||""}</p></div>
       <strong>{money(o.total)}</strong>
      </div>
      <div className="order-meta"><span>📦 {o.delivery_type}</span><span>💳 {o.payment_method}</span><span>🚚 {o.shipping_company?.name||"—"}</span><span>🧾 Factura: {o.invoice_requested?"Sí":"No"}</span><span>{new Date(o.created_at).toLocaleString("es-PY")}</span></div>
      <div className="order-actions">
       <label>Estado<select value={o.status} onChange={e=>change(o.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s}</option>)}<option value="__prueba__">marcar como prueba</option></select></label>
       <Link className="btn secondary" href={`/admin/pedidos/${o.id}`}>Ver detalle</Link>
      </div>
     </article>)}
    </div>
  }
 </section>;
}
