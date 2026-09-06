"use client";
import Link from "next/link"; import {useEffect,useState} from "react"; import {useParams} from "next/navigation"; import {createClient} from "../../../../lib/supabase/browser"; import {normalizePyWhatsapp} from "../../../../lib/phone-py";
const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;
export default function Detalle(){const p=useParams();const id=String(p.id);const [o,setO]=useState<any>(null),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState(""),[saving,setSaving]=useState(false),[deliveryWhatsapp,setDeliveryWhatsapp]=useState("");
 useEffect(()=>{(async()=>{const s=createClient();const [a,b,c]=await Promise.all([s.from("orders").select("*,customers(*),shipping_companies(name)").eq("id",id).single(),s.from("order_items").select("*").eq("order_id",id),s.from("store_settings").select("whatsapp_delivery").eq("id",1).maybeSingle()]);if(a.error||b.error)setMsg(a.error?.message||b.error?.message||"");else{setO({...a.data,customer:a.data.customers,shipping_company:a.data.shipping_companies});setItems(b.data||[])}setDeliveryWhatsapp(c.data?.whatsapp_delivery||"");setLoading(false)})()},[id]);
 async function verify(value:boolean){setSaving(true);setMsg("");const s=createClient();const {data,error}=await s.from("orders").update({payment_verified:value,payment_verified_at:value?new Date().toISOString():null}).eq("id",id).select("*").single();if(error)setMsg(error.message);else setO((x:any)=>({...x,...data}));setSaving(false)}
 if(loading)return <section><div className="panel">Cargando...</div></section>;if(!o)return <section><div className="panel">{msg||"Pedido no encontrado"}</div></section>;
 const deliveryMessage=()=>{
  const lines=[
   `📦 *Nuevo pedido para delivery* #${id.slice(0,8).toUpperCase()}`,
   ``,
   `👤 *Cliente:* ${o.customer?.full_name||"—"}`,
   `📱 *WhatsApp:* ${o.customer?.whatsapp||"—"}`,
   `📍 *Dirección:* ${o.customer?.address||"—"}`,
   `${o.customer?.neighborhood?`🏘️ *Barrio:* ${o.customer.neighborhood}\n`:""}${o.customer?.city?`🏙️ *Ciudad:* ${o.customer.city}`:""}`,
   o.maps_url?`🗺️ *Ubicación GPS:* ${o.maps_url}`:``,
   ``,
   `🛒 *Productos:*`,
   ...items.map(i=>`• ${i.product_name} × ${i.quantity} — ${money(i.subtotal)}`),
   ``,
   `💰 *Total:* ${money(o.total)}`,
   `💳 *Pago:* ${o.payment_method}`,
  ].filter(Boolean);
  return lines.join("\n");
 };
 const canSendDelivery=o.delivery_type==="delivery"&&!!deliveryWhatsapp;
 const sendToDelivery=()=>{const url=`https://wa.me/${normalizePyWhatsapp(deliveryWhatsapp)}?text=${encodeURIComponent(deliveryMessage())}`;window.open(url,"_blank")};
 const confirmMessage=()=>[
  `¡Hola ${o.customer?.full_name?.split(" ")[0]||""}! 👋`,
  ``,
  `Te escribimos de *DF Store PY* para confirmarte que tu pedido *#${id.slice(0,8).toUpperCase()}* fue recibido correctamente. ✅`,
  ``,
  `Nuestro equipo de logística ya lo está preparando y va a ser incluido en el reparto en el horario que corresponda según tu zona.`,
  ``,
  `Cualquier consulta sobre tu pedido, estamos a disposición por este mismo medio. ¡Gracias por tu compra! 🙌`,
 ].join("\n");
 const sendConfirmation=()=>{if(!o.customer?.whatsapp)return;const url=`https://wa.me/${normalizePyWhatsapp(o.customer.whatsapp)}?text=${encodeURIComponent(confirmMessage())}`;window.open(url,"_blank")};
 return <section><div className="title"><div><small>PEDIDO #{id.slice(0,8).toUpperCase()}</small><h1>Detalle</h1></div><Link href="/admin/pedidos">← Pedidos</Link></div><div className="formgrid"><div className="panel"><h2>Cliente</h2><p><b>{o.customer?.full_name}</b></p><p>WhatsApp: {o.customer?.whatsapp}</p><p>Email: {o.customer?.email||"—"}</p><p>{o.customer?.department}, {o.customer?.city}</p><p>{o.customer?.neighborhood||""}</p><p>{o.customer?.address||"—"}</p>{o.maps_url&&<p><a href={o.maps_url} target="_blank" rel="noreferrer">📍 Ver ubicación en el mapa</a></p>}
  <button type="button" className="btn secondary" disabled={!o.customer?.whatsapp} onClick={sendConfirmation}>✅ Avisar al cliente que su pedido fue recibido</button>
  <h2>Entrega</h2><p>{o.delivery_type} · {o.shipping_company?.name||"Sin transportadora"}</p>
  {o.delivery_type==="delivery"&&(canSendDelivery?<button type="button" className="btn" onClick={sendToDelivery}>📦 Enviar pedido al delivery por WhatsApp</button>:<p className="muted">Configurá el WhatsApp de delivery en <Link href="/admin/configuracion">Configuración</Link> para poder enviar este pedido.</p>)}
  </div><div className="panel"><h2>Productos</h2>{items.map(i=><div className="checkout-total" key={i.id}><span>{i.product_name} × {i.quantity}</span><strong>{money(i.subtotal)}</strong></div>)}<div className="checkout-total"><span>Subtotal</span><strong>{money(o.subtotal)}</strong></div><div className="checkout-total"><span>Delivery</span><strong>{money(o.delivery_fee)}</strong></div><div className="checkout-total grand"><span>Total</span><strong>{money(o.total)}</strong></div><h2>Pago</h2><p>Método: <b>{o.payment_method}</b></p><p>Referencia: <b>{o.payment_reference||"No informada"}</b></p><p>Estado del pago: <b>{o.payment_verified?"VERIFICADO":"PENDIENTE DE VERIFICACIÓN"}</b></p>{o.payment_method!=="Pago al recibir"&&<button className="btn" disabled={saving} onClick={()=>verify(!o.payment_verified)}>{saving?"Guardando...":o.payment_verified?"Marcar como pendiente":"Verificar pago"}</button>}<p>Estado del pedido: <b>{o.status}</b></p></div></div></section>}
