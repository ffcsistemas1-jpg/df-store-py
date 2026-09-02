"use client";
import Link from "next/link";
import { useCart } from "../ui";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
const money=(n:number)=>`₲ ${n.toLocaleString("es-PY")}`;

export default function Cart(){
 const {items,remove,update,subtotal,syncStock}=useCart();
 const [checkingStock,setCheckingStock]=useState(true);
 useEffect(()=>{
   let cancelled=false;
   async function check(){
     if(!items.length){setCheckingStock(false);return;}
     try{
       const ids=items.map(i=>i.id).filter(id=>!id.startsWith("demo-"));
       if(ids.length){
         const {data}=await createClient().from("products").select("id,stock,active").in("id",ids);
         if(!cancelled){
           const stocks:Record<string,number>={};
           for(const row of data||[]) if(row.active) stocks[row.id]=Number(row.stock)||0;
           syncStock(stocks);
         }
       }
     }catch{}
     if(!cancelled)setCheckingStock(false);
   }
   check();
   return()=>{cancelled=true};
 },[items.length]);
 if(!items.length)return <section><small>COMPRA</small><h1>Carrito</h1><div className="empty"><h2>Tu carrito está vacío</h2><p>Agregá productos del catálogo para continuar.</p><Link className="btn" href="/catalogo">Ir al catálogo</Link></div></section>;
 return <section>
   {checkingStock&&<p className="muted" role="status">Verificando disponibilidad...</p>}
   <div className="title"><div><small>COMPRA</small><h1>Carrito</h1><p className="muted">Revisá tus productos antes de continuar.</p></div><Link href="/catalogo">← Seguir comprando</Link></div>
   <div className="cart-list">
    {items.map(i=><div className="cart-row" key={i.id}>
      <Link href={`/catalogo/${i.id}`} className="cart-thumb">{i.image_url?<img src={i.image_url} alt={i.name}/>:<b>DF</b>}</Link>
      <div className="cart-info"><Link href={`/catalogo/${i.id}`}><h3>{i.name}</h3></Link><span>{money(i.price)} c/u</span><label>Cantidad<div className="qty"><button type="button" aria-label={`Disminuir ${i.name}`} onClick={()=>update(i.id,i.quantity-1)} disabled={i.quantity<=1}>−</button><input aria-label={`Cantidad de ${i.name}`} type="number" min="1" max={i.stock||1} value={i.quantity} onChange={e=>update(i.id,Number(e.target.value)||1)}/><button type="button" aria-label={`Aumentar ${i.name}`} onClick={()=>update(i.id,i.quantity+1)} disabled={i.quantity>=i.stock}>+</button></div></label><small className="muted">{i.stock>0?`${i.stock} disponibles`:"Sin stock"}</small></div>
      <strong>{money(i.price*i.quantity)}</strong><button className="link-btn" onClick={()=>remove(i.id)}>Eliminar</button>
    </div>)}
   </div>
   <div className="cart-summary panel"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p className="muted">El costo de entrega se calculará en el checkout.</p><Link className="btn" href="/checkout" aria-disabled={checkingStock}>Continuar al checkout</Link></div>
 </section>;
}
