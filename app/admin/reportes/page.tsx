"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n:number) => `₲ ${Number(n||0).toLocaleString("es-PY")}`;
const pct = (n:number) => `${Number(n||0).toLocaleString("es-PY", {maximumFractionDigits:1})}%`;

type Period = "7d" | "30d" | "all";
type Order = {id:string;status:string;total:number;subtotal:number;delivery_fee:number;payment_verified:boolean;payment_method?:string|null;created_at:string};
type Item = {order_id:string;product_id?:string|null;product_name:string;quantity:number;unit_price:number;subtotal:number};
type Product = {id:string;name:string;stock:number;active:boolean;price:number;cost:number;image_url?:string|null};

function inPeriod(date:string, period:Period){
  if(period==="all") return true;
  const days=period==="7d"?7:30;
  return new Date(date).getTime() >= Date.now()-days*86400000;
}

export default function Reportes(){
 const [orders,setOrders]=useState<Order[]>([]),[items,setItems]=useState<Item[]>([]),[products,setProducts]=useState<Product[]>([]);
 const [loading,setLoading]=useState(true),[msg,setMsg]=useState(""),[period,setPeriod]=useState<Period>("7d");
 const [adSpend,setAdSpend]=useState<number|null>(null),[metaConnected,setMetaConnected]=useState(false);

 useEffect(()=>{(async()=>{
   try{
    const s=createClient();
    const [a,b,c]=await Promise.all([
      s.from("orders").select("id,status,total,subtotal,delivery_fee,payment_verified,payment_method,created_at"),
      s.from("order_items").select("order_id,product_id,product_name,quantity,unit_price,subtotal"),
      s.from("products").select("id,name,stock,active,price,cost,image_url")
    ]);
    if(a.error||b.error||c.error) setMsg(a.error?.message||b.error?.message||c.error?.message||"No se pudieron cargar los datos.");
    setOrders((a.data||[]) as Order[]);setItems((b.data||[]) as Item[]);setProducts((c.data||[]) as Product[]);
   } catch(e:any){setMsg(e?.message||"Error al cargar reportes.")}
   finally{setLoading(false)}
 })()},[]);

 useEffect(()=>{
   let cancelled=false;
   (async()=>{
    const end=new Date(); const start=new Date(end);
    if(period==="7d") start.setDate(start.getDate()-6);
    else if(period==="30d") start.setDate(start.getDate()-29);
    else start.setFullYear(start.getFullYear()-5);
    const fmt=(d:Date)=>d.toISOString().slice(0,10);
    try{
      const r=await fetch(`/api/meta-insights?since=${fmt(start)}&until=${fmt(end)}`,{cache:"no-store"});
      const data=await r.json();
      if(!cancelled){setMetaConnected(Boolean(data?.connected));setAdSpend(data?.connected?Number(data.spend||0):null)}
    }catch{if(!cancelled){setMetaConnected(false);setAdSpend(null)}}
   })();
   return()=>{cancelled=true};
 },[period]);

 const stats=useMemo(()=>{
   const scopedOrders=orders.filter(o=>inPeriod(o.created_at,period));
   const valid=scopedOrders.filter(o=>String(o.status||"").toLowerCase()!=="cancelado");
   const validIds=new Set(valid.map(o=>o.id));
   const scopedItems=items.filter(i=>validIds.has(i.order_id));
   const sales=valid.reduce((n,o)=>n+Number(o.subtotal||0),0);
   const delivery=valid.reduce((n,o)=>n+Number(o.delivery_fee||0),0);
   const productMap=new Map(products.map(p=>[p.id,p]));
   const nameMap=new Map(products.map(p=>[p.name,p]));
   const costs=scopedItems.reduce((n,i)=>{
     const p=(i.product_id&&productMap.get(i.product_id))||nameMap.get(i.product_name);
     const unitCost=Number(p?.cost||0);
     return n+unitCost*Number(i.quantity||0);
   },0);
   const units=scopedItems.reduce((n,i)=>n+Number(i.quantity||0),0);
   const gross=sales-costs;
   const ads=adSpend??0;
   const net=gross-ads;
   const avg=valid.length?sales/valid.length:0;
   const grossMargin=sales?(gross/sales)*100:0;
   const netMargin=sales?(net/sales)*100:0;
   const adRatio=sales?(ads/sales)*100:0;
   const delivered=valid.filter(o=>["entregado","entregada","completado","completada"].includes(String(o.status||"").toLowerCase())).length;
   const pendingPayments=valid.filter(o=>o.payment_method!=="Pago al recibir"&&!o.payment_verified).length;
   const byProduct=new Map<string,{name:string,units:number,sales:number,cost:number,image?:string|null}>();
   scopedItems.forEach(i=>{
     const p=(i.product_id&&productMap.get(i.product_id))||nameMap.get(i.product_name);
     const key=i.product_id||i.product_name; const row=byProduct.get(key)||{name:i.product_name,units:0,sales:0,cost:0,image:p?.image_url};
     row.units+=Number(i.quantity||0); row.sales+=Number(i.subtotal||0); row.cost+=Number(p?.cost||0)*Number(i.quantity||0); byProduct.set(key,row);
   });
   const productProfit=[...byProduct.values()].map(x=>({...x,gross:x.sales-x.cost,margin:x.sales?((x.sales-x.cost)/x.sales)*100:0})).sort((a,b)=>b.gross-a.gross);
   const counts=valid.reduce((a:any,o)=>{a[o.status]=(a[o.status]||0)+1;return a},{});
   return {scopedOrders,valid,sales,delivery,costs,units,gross,ads,net,avg,grossMargin,netMargin,adRatio,delivered,pendingPayments,productProfit,counts};
 },[orders,items,products,period,adSpend]);

 const low=products.filter(p=>p.active&&Number(p.stock)<=5).sort((a,b)=>Number(a.stock)-Number(b.stock));
 const periodLabel=period==="7d"?"Últimos 7 días":period==="30d"?"Últimos 30 días":"Todo el período";

 if(loading) return <section><div className="panel finance-loading">Cargando tu tablero financiero...</div></section>;

 return <section className="finance-page">
   <div className="title finance-title"><div><small>CONTROL DEL NEGOCIO</small><h1>Finanzas</h1><p className="muted">Una vista clara de ventas, costos, publicidad y rentabilidad.</p></div><Link href="/admin" className="finance-back">← Admin</Link></div>

   <div className="finance-period-bar">
     <div><b>Período</b><span>{periodLabel}</span></div>
     <div className="finance-periods">
       {([['7d','7 días'],['30d','30 días'],['all','Todo']] as [Period,string][]).map(([v,l])=><button key={v} className={period===v?'active':''} onClick={()=>setPeriod(v)}>{l}</button>)}
     </div>
   </div>

   <div className="finance-main-grid">
    <div className="finance-card sales-card"><span>🛍️ VENTAS DE PRODUCTOS</span><strong>{money(stats.sales)}</strong><small>{stats.valid.length} pedidos no cancelados</small></div>
    <div className="finance-card cost-card"><span>📦 COSTO DE MERCADERÍA</span><strong>{money(stats.costs)}</strong><small>{stats.units} unidades vendidas</small></div>
    <div className="finance-card gross-card"><span>↗ GANANCIA BRUTA</span><strong>{money(stats.gross)}</strong><small>Margen bruto: {pct(stats.grossMargin)}</small></div>
    <div className="finance-card ad-card"><span>📣 GASTO EN PUBLICIDAD</span><strong>{adSpend===null?"—":money(stats.ads)}</strong><small>{metaConnected?`Meta Ads · ${pct(stats.adRatio)} de ventas`:`Conectá Meta Ads para traer el gasto real`}</small></div>
   </div>

   <div className="finance-net-card">
     <div className="finance-net-head"><div><span>GANANCIA REAL (Neta)</span><small>{adSpend===null?"Sin descontar publicidad hasta conectar Meta Ads":"Ventas − mercadería − publicidad"}</small></div><strong>{money(stats.net)}</strong></div>
     <div className="finance-net-breakdown">
       <div><span>💰</span><b>Ventas</b><strong>{money(stats.sales)}</strong></div>
       <div><span>📦</span><b>Costo</b><strong>{money(stats.costs)}</strong></div>
       <div><span>📣</span><b>Publicidad</b><strong>{adSpend===null?"—":money(stats.ads)}</strong></div>
       <div><span>🧾</span><b>Otros gastos</b><strong>₲ 0</strong></div>
     </div>
   </div>

   <div className="finance-kpis">
     <div><span>📦 PEDIDOS ENTREGADOS</span><b>{stats.delivered}</b></div>
     <div><span>🛍️ UNIDADES VENDIDAS</span><b>{stats.units}</b></div>
     <div><span>🏷️ TICKET PROMEDIO</span><b>{money(stats.avg)}</b></div>
     <div><span>📈 % MARGEN BRUTO</span><b>{pct(stats.grossMargin)}</b></div>
     <div><span>💚 % MARGEN NETO</span><b>{pct(stats.netMargin)}</b></div>
     <div><span>📣 PUBLICIDAD / VENTAS</span><b>{adSpend===null?"—":pct(stats.adRatio)}</b></div>
   </div>

   <div className="finance-columns">
    <div className="panel finance-panel">
      <div className="finance-panel-head"><div><small>PRODUCTOS</small><h2>Rentabilidad por producto</h2></div><Link href="/admin/productos">Ver productos →</Link></div>
      {stats.productProfit.length?<div className="profit-list">{stats.productProfit.slice(0,8).map((p,i)=><div className="profit-row" key={p.name}><div className="profit-product"><span>{i+1}</span>{p.image?<img src={p.image} alt=""/>:<i>DF</i>}<div><b>{p.name}</b><small>{p.units} unidades · ventas {money(p.sales)}</small></div></div><div className="profit-value"><strong>{money(p.gross)}</strong><small>{pct(p.margin)} margen</small></div></div>)}</div>:<p className="muted">Todavía no hay ventas en este período.</p>}
    </div>
    <div className="panel finance-panel">
      <div className="finance-panel-head"><div><small>OPERACIÓN</small><h2>Estado de pedidos</h2></div></div>
      <div className="status-list">{Object.entries(stats.counts).length?Object.entries(stats.counts).map(([k,v])=><div key={k}><span>{k}</span><strong>{String(v)}</strong></div>):<p className="muted">Sin pedidos en el período.</p>}</div>
      <div className="finance-alerts"><div><b>Pagos pendientes</b><strong>{stats.pendingPayments}</strong></div><div><b>Stock ≤ 5</b><strong>{low.length}</strong></div></div>
    </div>
   </div>

   <div className="panel finance-panel"><div className="finance-panel-head"><div><small>INVENTARIO</small><h2>Stock bajo</h2></div><Link href="/admin/productos">Gestionar →</Link></div>{low.length?<div className="low-stock-grid">{low.slice(0,10).map(p=><div key={p.id}><span>{p.image_url?<img src={p.image_url} alt=""/>:<i>DF</i>}</span><div><b>{p.name}</b><small>Stock disponible</small></div><strong>{p.stock}</strong></div>)}</div>:<p className="muted">No hay productos con stock de 5 o menos.</p>}</div>

   {msg&&<div className="panel finance-error">⚠️ {msg}</div>}
 </section>;
}
