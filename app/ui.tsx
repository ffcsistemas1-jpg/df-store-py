"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { getCartSession } from "../lib/cart-session";
import { trackVisit } from "../lib/analytics";

export type CartItem = {
  id:string;
  name:string;
  price:number;
  image_url?:string|null;
  stock:number;
  quantity:number;
};

type CartContextType = {
  items:CartItem[];
  add:(p:any, quantity?:number)=>void;
  remove:(id:string)=>void;
  update:(id:string,q:number)=>void;
  clear:()=>void;
  syncStock:(stocks:Record<string,number>)=>void;
  count:number;
  subtotal:number;
  ready:boolean;
};
const CartContext = createContext<CartContextType>({items:[],add:()=>{},remove:()=>{},update:()=>{},clear:()=>{},syncStock:()=>{},count:0,subtotal:0,ready:false});

function normalizeItem(row:any):CartItem|null {
  if(!row?.product_id || !row?.name) return null;
  const stock=Math.max(0, Number(row.stock)||0);
  const quantity=Math.max(1, Math.min(Number(row.quantity)||1, stock||1));
  return {id:String(row.product_id),name:String(row.name),price:Number(row.price)||0,image_url:row.image_url||null,stock,quantity};
}

export function CartProvider({children}:{children:React.ReactNode}) {
 const [items,setItems]=useState<CartItem[]>([]);
 const [ready,setReady]=useState(false);
 const sessionRef=useRef<string>("");

 useEffect(()=>{
   let cancelled=false;
   (async()=>{
     const session=getCartSession();
     sessionRef.current=session;
     trackVisit();
     try{
       const s=createClient();
       const {data,error}=await s.from("cart_items").select("product_id,name,price,image_url,stock,quantity").eq("session",session);
       if(!cancelled && !error) setItems((data||[]).map(normalizeItem).filter(Boolean) as CartItem[]);
     } catch {}
     if(!cancelled) setReady(true);
   })();
   return ()=>{cancelled=true};
 },[]);

 function persist(item:CartItem){
   const session=sessionRef.current; if(!session) return;
   const s=createClient();
   s.from("cart_items").upsert({session,product_id:item.id,name:item.name,price:item.price,image_url:item.image_url||null,stock:item.stock,quantity:item.quantity,updated_at:new Date().toISOString()},{onConflict:"session,product_id"}).then(({error}:any)=>{if(error)console.error("No se pudo guardar el carrito en Supabase",error)});
 }
 function removeRemote(id:string){
   const session=sessionRef.current; if(!session) return;
   const s=createClient();
   s.from("cart_items").delete().eq("session",session).eq("product_id",id).then(({error}:any)=>{if(error)console.error("No se pudo quitar el producto del carrito",error)});
 }
 function clearRemote(){
   const session=sessionRef.current; if(!session) return;
   const s=createClient();
   s.from("cart_items").delete().eq("session",session).then(({error}:any)=>{if(error)console.error("No se pudo vaciar el carrito",error)});
 }

 const add=(p:any, quantity=1)=>{
   const stock=Math.max(0,Number(p.stock)||0);
   if(stock<=0) return;
   const qty=Math.max(1,Math.floor(Number(quantity)||1));
   let saved:CartItem|null=null;
   setItems(prev=>{
     const found=prev.find(x=>x.id===String(p.id));
     if(found){
       const updated={...found,stock,price:Number(p.price)||found.price,name:p.name||found.name,image_url:p.image_url||found.image_url,quantity:Math.min(found.quantity+qty,stock)};
       saved=updated;
       return prev.map(x=>x.id===String(p.id)?updated:x);
     }
     const created={id:String(p.id),name:p.name,price:Number(p.price)||0,image_url:p.image_url||null,stock,quantity:Math.min(qty,stock)};
     saved=created;
     return [...prev,created];
   });
   if(saved) persist(saved);
 };
 const remove=(id:string)=>{setItems(prev=>prev.filter(x=>x.id!==id)); removeRemote(id);};
 const update=(id:string,q:number)=>{
   let saved:CartItem|null=null;
   setItems(prev=>prev.map(x=>{
     if(x.id!==id) return x;
     const next=Math.floor(Number(q)||1);
     const updated={...x,quantity:Math.max(1,Math.min(next,Math.max(1,x.stock||next)))};
     saved=updated;
     return updated;
   }));
   if(saved) persist(saved);
 };
 const clear=()=>{setItems([]); clearRemote();};
 const syncStock=(stocks:Record<string,number>)=>{
   setItems(prev=>prev.flatMap(x=>{
     const stock=Math.max(0,Number(stocks[x.id]));
     if(!Number.isFinite(stock)||stock<=0){removeRemote(x.id);return [];}
     const updated={...x,stock,quantity:Math.min(x.quantity,stock)};
     if(updated.quantity!==x.quantity||updated.stock!==x.stock) persist(updated);
     return [updated];
   }));
 };
 const value=useMemo(()=>({items,add,remove,update,clear,syncStock,count:items.reduce((n,x)=>n+x.quantity,0),subtotal:items.reduce((n,x)=>n+x.price*x.quantity,0),ready}),[items,ready]);
 return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart(){return useContext(CartContext)}

export function Header() {
 const [open,setOpen]=useState(false); const [q,setQ]=useState(""); const {count}=useCart(); const router=useRouter();
 const submitSearch=(e:React.FormEvent)=>{e.preventDefault();setOpen(false);router.push(q.trim()?`/catalogo?q=${encodeURIComponent(q.trim())}`:"/catalogo")};
 return <header><div className="head"><Link href="/" className="brand" onClick={()=>setOpen(false)}><b>DF</b> Store PY</Link>
  <form className="head-search" onSubmit={submitSearch}><input type="search" placeholder="Buscar productos" value={q} onChange={e=>setQ(e.target.value)} aria-label="Buscar productos"/><button type="submit" aria-label="Buscar">🔎</button></form>
  <button className="hamb" aria-label="Abrir menú" onClick={()=>setOpen(!open)}>☰</button>
  <nav className={open?"open":""}><Link onClick={()=>setOpen(false)} href="/catalogo">Catálogo</Link><Link onClick={()=>setOpen(false)} href="/catalogo?categoria=Ropa">Ropa</Link><Link onClick={()=>setOpen(false)} href="/catalogo?categoria=Hogar">Hogar</Link><Link onClick={()=>setOpen(false)} href="/carrito">🛒 Carrito{count>0?` (${count})`:""}</Link><Link onClick={()=>setOpen(false)} href="/admin">Admin</Link></nav></div></header>;
}
export function WhatsAppButton(){
 const [number,setNumber]=useState("");
 useEffect(()=>{(async()=>{try{const s=createClient();const {data}=await s.from("store_settings").select("whatsapp").eq("id",1).maybeSingle();setNumber(data?.whatsapp||"")}catch{}})()},[]);
 if(!number)return null;
 return <a className="whatsapp-float" href={`https://wa.me/${number}`} target="_blank" rel="noreferrer" aria-label="Contactar por WhatsApp">💬</a>;
}

export function TopBanner(){
 const [text,setText]=useState("");
 useEffect(()=>{(async()=>{try{const s=createClient();const {data}=await s.from("store_settings").select("banner_text").eq("id",1).maybeSingle();setText(data?.banner_text||"")}catch{}})()},[]);
 if(!text)return null;
 return <div className="top-banner">{text}</div>;
}

export function ProductCard({p}:{p:any}) {
 const {add}=useCart(); const [added,setAdded]=useState(false); const stock=Number(p.stock)||0;
 const handleAdd=()=>{add(p);setAdded(true);window.setTimeout(()=>setAdded(false),1400)};
 return <article className="card"><Link href={"/catalogo/"+p.id} className="pic">{p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}</Link><small>{p.category||"Producto"}</small><h3>{p.name}</h3><strong>₲ {Number(p.price).toLocaleString("es-PY")}</strong><button className="btn" disabled={stock<=0} onClick={handleAdd}>{stock<=0?"Sin stock":added?"✓ Agregado al carrito":"Agregar al carrito"}</button></article>;
}

export function AddToCartButton({p}:{p:any}){
 const {add}=useCart(); const [added,setAdded]=useState(false); const stock=Number(p.stock)||0;
 const handleAdd=()=>{add(p);setAdded(true);window.setTimeout(()=>setAdded(false),1400)};
 return <button className="btn" disabled={stock<=0} onClick={handleAdd}>{stock<=0?"Sin stock":added?"✓ Agregado al carrito":"Agregar al carrito"}</button>;
}
