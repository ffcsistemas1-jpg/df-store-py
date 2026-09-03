"use client";
import Link from "next/link";
import Script from "next/script";
import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { getCartSession } from "../lib/cart-session";
import { trackVisit } from "../lib/analytics";
import { PIXEL_ID, pixelTrack, sendCapiEvent, newEventId, captureAttribution } from "../lib/meta-pixel";

export type CartItem = {
  id:string;
  name:string;
  price:number;
  image_url?:string|null;
  stock:number;
  quantity:number;
};

const CART_LOCAL_KEY = "df_store_py_cart_v2";

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
  // Accept both Supabase rows (product_id) and localStorage items (id).
  const id=row?.product_id || row?.id;
  if(!id || !row?.name) return null;
  const stock=Math.max(0, Number(row.stock)||0);
  const quantity=Math.max(1, Math.min(Number(row.quantity)||1, stock||1));
  return {id:String(id),name:String(row.name),price:Number(row.price)||0,image_url:row.image_url||null,stock,quantity};
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

     // Local fallback: the cart must work even before the final Supabase SQL is run.
     try{
       const raw=window.localStorage.getItem(CART_LOCAL_KEY);
       if(raw){
         const local=JSON.parse(raw);
         if(Array.isArray(local) && !cancelled) setItems(local.map(normalizeItem).filter(Boolean) as CartItem[]);
       }
     }catch{}

     // Do not let a stale/empty server cart overwrite the browser cart.
     if(!cancelled) setReady(true);
   })();
   return ()=>{cancelled=true};
 },[]);

 // Always keep a browser copy so navigation/reloads never lose the cart.
 useEffect(()=>{
   if(!ready) return;
   try{ window.localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(items)); }catch{}
   const session=sessionRef.current;
   if(!session || !items.length) return;
   try{
     const s=createClient();
     Promise.all(items.map(item=>s.from("cart_items").upsert({session,product_id:item.id,name:item.name,price:item.price,image_url:item.image_url||null,stock:item.stock,quantity:item.quantity,updated_at:new Date().toISOString()},{onConflict:"session,product_id"}))).catch(()=>{});
   }catch{}
 },[items,ready]);

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
   setItems(prev=>{
     const found=prev.find(x=>x.id===String(p.id));
     const next=found
       ? prev.map(x=>x.id===String(p.id)?{...x,stock,price:Number(p.price)||x.price,name:p.name||x.name,image_url:p.image_url||x.image_url,quantity:Math.min(x.quantity+qty,stock)}:x)
       : [...prev,{id:String(p.id),name:p.name,price:Number(p.price)||0,image_url:p.image_url||null,stock,quantity:Math.min(qty,stock)}];
     try{ window.localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(next)); }catch{}
     return next;
   });
   {const evId=newEventId();const params={content_ids:[String(p.id)],content_type:"product",content_name:p.name,value:Number(p.price)||0,currency:"PYG"};
   pixelTrack("AddToCart",params,evId);
   sendCapiEvent({event_name:"AddToCart",event_id:evId,value:params.value,currency:"PYG",content_ids:params.content_ids});}
 };
 const remove=(id:string)=>{setItems(prev=>prev.filter(x=>x.id!==id)); removeRemote(id);};
 const update=(id:string,q:number)=>{
   setItems(prev=>prev.map(x=>{
     if(x.id!==id) return x;
     const next=Math.floor(Number(q)||1);
     const updated={...x,quantity:Math.max(1,Math.min(next,Math.max(1,x.stock||next)))};
     return updated;
   }));
 };
 const clear=()=>{setItems([]); clearRemote();};
 const syncStock=(stocks:Record<string,number>)=>{
   setItems(prev=>prev.flatMap(x=>{
     const stock=Math.max(0,Number(stocks[x.id]));
     if(!Number.isFinite(stock)||stock<=0){removeRemote(x.id);return [];}
     const updated={...x,stock,quantity:Math.min(x.quantity,stock)};
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
  <nav className={open?"open":""}><Link onClick={()=>setOpen(false)} href="/catalogo">Catálogo</Link><Link onClick={()=>setOpen(false)} href="/catalogo?categoria=Ropa">Ropa</Link><Link onClick={()=>setOpen(false)} href="/catalogo?categoria=Hogar">Hogar</Link><Link onClick={()=>setOpen(false)} href="/carrito">🛒 Carrito{count>0?` (${count})`:""}</Link></nav></div></header>;
}
export function WhatsAppButton(){
 const [number,setNumber]=useState("");
 useEffect(()=>{(async()=>{try{const s=createClient();const {data}=await s.from("store_settings").select("whatsapp").eq("id",1).maybeSingle();setNumber(data?.whatsapp||"")}catch{}})()},[]);
 if(!number)return null;
 return <a className="whatsapp-float" href={`https://wa.me/${number}`} target="_blank" rel="noreferrer" aria-label="Contactar por WhatsApp">💬</a>;
}

export function MetaPixel(){
 const pathname=usePathname();
 useEffect(()=>{ captureAttribution(); },[]);
 useEffect(()=>{
  const id=newEventId();
  pixelTrack("PageView",{},id);
  sendCapiEvent({event_name:"PageView",event_id:id});
 },[pathname]);
 if(!PIXEL_ID) return null;
 return <>
  <Script id="meta-pixel-base" strategy="afterInteractive">{`
   !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
   n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
   n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
   t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
   'https://connect.facebook.net/en_US/fbevents.js');
   fbq('init', '${PIXEL_ID}');
   fbq('track', 'PageView');
  `}</Script>
  <noscript>
   <img height="1" width="1" style={{display:"none"}} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}/>
  </noscript>
 </>;
}

export function ServiceWorkerRegister(){
 useEffect(()=>{
  if(typeof window!=="undefined" && "serviceWorker" in navigator){
   navigator.serviceWorker.register("/sw.js").catch(()=>{});
  }
 },[]);
 return null;
}

export function InstallPrompt(){
 const [prompt,setPrompt]=useState<any>(null);
 const [installed,setInstalled]=useState(false);
 useEffect(()=>{
  const onPrompt=(e:any)=>{ e.preventDefault(); setPrompt(e); };
  const onInstalled=()=>{ setInstalled(true); setPrompt(null); };
  window.addEventListener("beforeinstallprompt",onPrompt);
  window.addEventListener("appinstalled",onInstalled);
  return ()=>{ window.removeEventListener("beforeinstallprompt",onPrompt); window.removeEventListener("appinstalled",onInstalled); };
 },[]);
 if(!prompt||installed) return null;
 const handleInstall=async()=>{ try{ prompt.prompt(); await prompt.userChoice; }catch{} setPrompt(null); };
 return <button type="button" className="install-app-btn" onClick={handleInstall}>⬇ Instalar app</button>;
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
 return <article className="card"><Link href={"/catalogo/"+p.id} className="pic">{p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}</Link><small>{p.category||"Producto"}</small><h3>{p.name}</h3><strong>₲ {Number(p.price).toLocaleString("es-PY")}</strong><div className="cart-actions"><button type="button" className="btn" disabled={stock<=0} onClick={handleAdd}>{stock<=0?"Sin stock":added?"✓ Agregado al carrito":"Agregar al carrito"}</button><BuyNowButton p={p}/></div></article>;
}

export function AddToCartButton({p}:{p:any}){
 const {add}=useCart(); const [added,setAdded]=useState(false); const stock=Number(p.stock)||0;
 const handleAdd=()=>{add(p);setAdded(true);window.setTimeout(()=>setAdded(false),1400)};
 return <div className="cart-actions">
   <button type="button" className="btn" disabled={stock<=0} onClick={handleAdd}>{stock<=0?"Sin stock":added?"✓ Agregado al carrito":"Agregar al carrito"}</button>
   <BuyNowButton p={p}/>
 </div>;
}

export function BuyNowButton({p}:{p:any}){
 const {add}=useCart(); const router=useRouter(); const stock=Number(p.stock)||0;
 const handleBuy=()=>{ if(stock<=0) return; add(p); router.push("/carrito"); };
 return <button type="button" className="btn secondary" disabled={stock<=0} onClick={handleBuy}>{stock<=0?"Sin stock":"Comprar"}</button>;
}

export function TrustBadges(){
 return <div className="trust-badges">
  <div className="trust-badge"><span>🔒</span><div><strong>Compra segura</strong><small>Conexión cifrada (HTTPS)</small></div></div>
  <div className="trust-badge"><span>🚚</span><div><strong>Delivery propio</strong><small>Asunción y Central</small></div></div>
  <div className="trust-badge"><span>💳</span><div><strong>Pagás como quieras</strong><small>Contra entrega, Tigo Money o transferencia</small></div></div>
  <div className="trust-badge"><span>💬</span><div><strong>Atención directa</strong><small>Respondemos por WhatsApp</small></div></div>
 </div>;
}

export function PaymentMethods(){
 return <div className="payment-methods">
  <span className="payment-chip">Pago al recibir</span>
  <span className="payment-chip">Transferencia bancaria</span>
  <span className="payment-chip">Giro Tigo</span>
 </div>;
}

export function SiteFooter(){
 const [whatsapp,setWhatsapp]=useState("");
 useEffect(()=>{(async()=>{try{const s=createClient();const {data}=await s.from("store_settings").select("whatsapp").eq("id",1).maybeSingle();setWhatsapp(data?.whatsapp||"")}catch{}})()},[]);
 return <footer className="site-footer">
  <div className="footer-top">
   <div className="footer-col">
    <b>DF Store PY</b>
    <span>Todo lo que buscan en un solo lugar</span>
    <PaymentMethods/>
   </div>
   <div className="footer-col">
    <strong>Ayuda</strong>
    <Link href="/#preguntas-frecuentes">Preguntas frecuentes</Link>
    <Link href="/quienes-somos">Quiénes somos</Link>
    {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}
   </div>
   <div className="footer-col">
    <strong>Legal</strong>
    <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
    <Link href="/politica-de-privacidad">Política de privacidad</Link>
   </div>
   <div className="footer-col">
    <strong>Seguinos</strong>
    <a href="https://www.facebook.com/profile.php?id=61580238164654" target="_blank" rel="noreferrer">Facebook</a>
    <a href="https://www.instagram.com/todo_tecnopy" target="_blank" rel="noreferrer">Instagram · @todo_tecnopy</a>
   </div>
  </div>
  <div className="footer-bottom">
   <span>© {new Date().getFullYear()} DF Store PY — Todos los derechos reservados</span>
  </div>
 </footer>;
}
