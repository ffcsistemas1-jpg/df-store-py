"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

export default function Notificaciones(){
  const [orders,setOrders]=useState<any[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [permission,setPermission]=useState<string>("unsupported");

  useEffect(()=>{
    if(typeof window!=="undefined"&&"Notification" in window) setPermission(Notification.permission);
    (async()=>{
      const s=createClient();
      const [a,b]=await Promise.all([
        s.from("orders").select("id,status,total,payment_method,payment_verified,created_at,customers(full_name,whatsapp)").order("created_at",{ascending:false}).limit(30),
        s.from("products").select("id,name,stock,active").eq("active",true),
      ]);
      setOrders(a.data||[]);setProducts(b.data||[]);setLoading(false);
    })();
  },[]);

  const enableNotifications=async()=>{
    if(!("Notification" in window)) return;
    const result=await Notification.requestPermission();
    setPermission(result);
  };

  const alerts:any[]=[];
  orders.filter(o=>["nuevo","pendiente"].includes(o.status)).slice(0,10).forEach(o=>alerts.push({type:"pedido",title:"Nuevo pedido pendiente",text:`${o.customers?.full_name||"Cliente"} · ₲ ${Number(o.total||0).toLocaleString("es-PY")}`,id:o.id}));
  orders.filter(o=>o.payment_method!=="Pago al recibir"&&!o.payment_verified).slice(0,10).forEach(o=>alerts.push({type:"pago",title:"Pago pendiente de verificación",text:`Pedido #${o.id.slice(0,8).toUpperCase()}`,id:o.id}));
  products.filter(p=>Number(p.stock)<=5).forEach(p=>alerts.push({type:"stock",title:"Stock bajo",text:`${p.name}: ${p.stock} unidad(es)`}));

  return <section>
    <div className="title"><div><small>ADMINISTRADOR</small><h1>Notificaciones</h1></div><Link href="/admin">← Admin</Link></div>
    <div className="panel">
      <h2>Notificaciones del teléfono</h2>
      <p>Estado del permiso: <b>{permission}</b></p>
      {permission!=="granted"&&permission!=="unsupported"&&<button type="button" className="btn" onClick={enableNotifications}>🔔 Permitir notificaciones</button>}
      {permission==="granted"&&<p>✅ Este teléfono ya permite notificaciones. El service worker está preparado para Web Push; la suscripción VAPID/backend se activará cuando se configure el envío automático de pedidos.</p>}
      {permission==="unsupported"&&<p className="muted">Este navegador no expone la API de notificaciones.</p>}
    </div>
    {loading?<div className="panel">Cargando avisos...</div>:<div className="panel"><h2>Centro de avisos</h2>{!alerts.length?<p className="muted">No hay avisos pendientes.</p>:alerts.map((a,i)=><article className="panel" key={i}><b>{a.type==="pedido"?"🛒":a.type==="pago"?"💳":"📦"} {a.title}</b><p>{a.text}</p>{a.id&&<Link className="btn secondary" href={`/admin/pedidos/${a.id}`}>Ver pedido</Link>}</article>)}</div>}
  </section>;
}
