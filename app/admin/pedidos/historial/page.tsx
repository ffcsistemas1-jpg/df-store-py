"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase/browser";

const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;
type Order={id:string;status:string;is_test?:boolean;delivery_type:string;payment_method:string;total:number;created_at:string;invoice_requested?:boolean;customer?:{full_name:string;whatsapp:string;city:string;department:string}|null;shipping_company?:{name:string}|null};
const closedStatuses=["entregado","cancelado","devuelto"];

export default function Historial(){
 const [tab,setTab]=useState<"cerrados"|"pruebas">("cerrados");
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [msg,setMsg]=useState("");

 async function load(){
  setLoading(true);
  const s=createClient();
  let query=s.from("orders").select("id,status,is_test,delivery_type,payment_method,total,created_at,invoice_requested,customers(full_name,whatsapp,city,department),shipping_companies(name)").order("created_at",{ascending:false});
  query=tab==="pruebas"?query.eq("is_test",true):query.eq("is_test",false).in("status",closedStatuses);
  const {data,error}=await query;
  if(error)setMsg(error.message);
  else setOrders((data||[]).map((o:any)=>({...o,customer:o.customers,shipping_company:o.shipping_companies})));
  setLoading(false);
 }

 useEffect(()=>{load()},[tab]);

 async function restore(id:string,value:string){
  setMsg("");
  const s=createClient();
  const {error}=await s.from("orders").update({status:value}).eq("id",id);
  if(error){setMsg("❌ "+error.message);return}
  setMsg("✓ Pedido reabierto y devuelto a Pedidos.");
  load();
 }

 async function unmarkTest(id:string){
  if(!confirm("¿Quitar la marca de prueba? El pedido volverá a ser un pedido comercial y aparecerá en Ventas/Finanzas. Si Meta ya recibió un Purchase de este pedido, ese evento no se puede borrar desde aquí."))return;
  const s=createClient();
  const {error}=await s.from("orders").update({is_test:false,status:"pendiente"}).eq("id",id);
  if(error){setMsg("❌ "+error.message);return}
  setMsg("✓ Prueba convertida nuevamente en pedido comercial y devuelta a Pedidos.");
  load();
 }

 return <section>
  <div className="title">
   <div><small>ADMINISTRADOR</small><h1>Historial</h1><p className="muted">Los pedidos cerrados se conservan aquí. No se eliminan de Ventas, Finanzas ni del registro de Meta.</p></div>
   <Link href="/admin/pedidos" className="btn secondary">← Pedidos activos</Link>
  </div>

  <div className="order-tabs">
   <button type="button" className={tab==="cerrados"?"order-tab active":"order-tab"} onClick={()=>setTab("cerrados")}>Cerrados</button>
   <button type="button" className={tab==="pruebas"?"order-tab active":"order-tab"} onClick={()=>setTab("pruebas")}>Pruebas</button>
  </div>

  {msg&&<div className="panel">{msg}</div>}
  {loading?<div className="panel">Cargando historial...</div>:
   !orders.length?
    <div className="empty"><h2>{tab==="pruebas"?"No hay pedidos de prueba":"No hay pedidos cerrados"}</h2><p>{tab==="pruebas"?"Las pruebas marcadas se conservan aquí y no cuentan como venta comercial.":"Cuando marques un pedido como entregado, cancelado o devuelto, aparecerá aquí."}</p></div>:
    <div className="admin-orders">
     {orders.map(o=><article className="panel order-card" key={o.id}>
      <div className="order-head">
       <div><small>#{o.id.slice(0,8).toUpperCase()}</small><h2>{o.customer?.full_name||"Cliente"}</h2><p>{o.customer?.whatsapp||""} · {o.customer?.city||""}, {o.customer?.department||""}</p></div>
       <strong>{money(o.total)}</strong>
      </div>
      <div className="order-meta"><span>📌 {o.status}</span><span>📦 {o.delivery_type}</span><span>💳 {o.payment_method}</span><span>🚚 {o.shipping_company?.name||"—"}</span><span>{new Date(o.created_at).toLocaleString("es-PY")}</span></div>
      <div className="order-actions">
       {tab==="cerrados"&&<label>Estado<select value={o.status} onChange={e=>restore(o.id,e.target.value)}>{closedStatuses.map(s=><option key={s} value={s}>{s}</option>)}<option value="pendiente">reabrir pedido</option></select></label>}
       {tab==="pruebas"&&<button type="button" className="btn secondary" onClick={()=>unmarkTest(o.id)}>Volver a pedido comercial</button>}
       <Link className="btn secondary" href={`/admin/pedidos/${o.id}`}>Ver detalle</Link>
      </div>
     </article>)}
    </div>
  }
 </section>;
}
