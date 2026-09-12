"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useCart } from "../ui";
import { PARAGUAY_DEPARTAMENTOS } from "../../lib/paraguay-geo";
import { getCartSession } from "../../lib/cart-session";

const money = (n:number) => `₲ ${Number(n || 0).toLocaleString("es-PY")}`;
type Company={id:string;name:string};
type Bank={id:string;bank:string;account_type:string|null;account_number:string|null;holder_name:string|null;document:string|null;alias:string|null};
type Tigo={id:string;phone:string;holder_name:string|null;document:string|null};
type Zone={department:string;city:string|null;neighborhood:string|null;fee:number};
type OrderResult={id:string;subtotal:number;delivery_fee:number;total:number;delivery_type:string};
type FormState={full_name:string;whatsapp:string;city:string;reference:string;delivery_type:string;payment_method:string;shipping_company_id:string;invoice_requested:boolean;maps_url:string;note:string;preferred_time:string};

export default function Checkout(){
 const {items,subtotal,clear}=useCart();
 const [step,setStep]=useState(1);
 const [form,setForm]=useState<FormState>({full_name:"",whatsapp:"",city:"",reference:"",delivery_type:"delivery",payment_method:"",shipping_company_id:"",invoice_requested:false,maps_url:"",note:"",preferred_time:"Mañana"});
 const [zones,setZones]=useState<Zone[]>([]);
 const [companies,setCompanies]=useState<Company[]>([]);
 const [coverage,setCoverage]=useState<{shipping_company_id:string;department:string}[]>([]);
 const [banks,setBanks]=useState<Bank[]>([]);
 const [tigos,setTigos]=useState<Tigo[]>([]);
 const [storeWhatsapp,setStoreWhatsapp]=useState("");
 const [deliveryFee,setDeliveryFee]=useState(0);
 const [zoneReady,setZoneReady]=useState(false);
 const [locationStatus,setLocationStatus]=useState("");
 const [paymentReference,setPaymentReference]=useState("");
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const [order,setOrder]=useState<OrderResult|null>(null);
 const [more,setMore]=useState(false);
 const set=(key:keyof FormState,value:any)=>setForm(x=>({...x,[key]:value}));

 useEffect(()=>{
  const s=createClient();
  Promise.all([
   s.from("store_settings").select("whatsapp").eq("id",1).maybeSingle(),
   s.from("delivery_zones").select("department,city,neighborhood,fee").eq("active",true),
   s.from("shipping_companies").select("id,name").eq("active",true).order("name"),
   s.from("shipping_coverage").select("shipping_company_id,department"),
   s.from("bank_accounts").select("id,bank,account_type,account_number,holder_name,document,alias").eq("active",true).order("bank"),
   s.from("tigo_accounts").select("id,phone,holder_name,document").eq("active",true).order("phone")
  ]).then(([settings,z,c,cov,b,t])=>{
   setStoreWhatsapp(settings.data?.whatsapp||"");
   setZones(((z.data||[]) as any[]).map(r=>({department:r.department,city:r.city,neighborhood:r.neighborhood,fee:Number(r.fee)||0})));
   setCompanies(c.data||[]);setCoverage((cov.data||[]) as any[]);setBanks(b.data||[]);setTigos(t.data||[]);
  });
 },[]);

 const deliveryCities=useMemo(()=>Array.from(new Set(zones.map(z=>z.city).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"es")),[zones]);
 const interiorCities=useMemo(()=>PARAGUAY_DEPARTAMENTOS.flatMap(d=>d.distritos).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a.localeCompare(b,"es")),[]);
 const cityOptions=useMemo(()=>form.delivery_type==="delivery"?deliveryCities:interiorCities,[form.delivery_type,deliveryCities,interiorCities]);
 const interiorCompanies=useMemo(()=>{
  const ids=new Set(coverage.map(x=>x.shipping_company_id));
  return ids.size?companies.filter(c=>ids.has(c.id)):companies;
 },[companies,coverage]);

 useEffect(()=>{
  if(form.delivery_type!=="delivery"){setDeliveryFee(0);setZoneReady(true);return;}
  if(!form.city){setDeliveryFee(0);setZoneReady(false);return;}
  const city=form.city.toLowerCase();
  const row=zones.find(z=>z.city?.toLowerCase()===city);
  if(row){setDeliveryFee(row.fee);setZoneReady(true)}else{setDeliveryFee(0);setZoneReady(false)}
 },[form.delivery_type,form.city,zones]);

 const total=useMemo(()=>subtotal+deliveryFee,[subtotal,deliveryFee]);
 const useLocation=()=>{
  if(!navigator.geolocation){setLocationStatus("Tu navegador no permite obtener la ubicación.");return}
  setLocationStatus("Obteniendo ubicación...");
  navigator.geolocation.getCurrentPosition(p=>{set("maps_url",`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`);setLocationStatus("✓ Ubicación guardada.")},()=>setLocationStatus("No se pudo obtener. Podés pegar un enlace de Google Maps."),{enableHighAccuracy:true,timeout:10000});
 };
 const pasteMaps=()=>{const value=window.prompt("Pegá el enlace de Google Maps de la ubicación de entrega:",form.maps_url||"");if(value!==null){set("maps_url",value.trim());setLocationStatus(value.trim()?"✓ Enlace guardado.":"")}};
 const validate=()=>{
  if(!form.full_name.trim()||!form.whatsapp.trim()){setMsg("Completá nombre y WhatsApp.");return false}
  if(!form.city){setMsg("Seleccioná tu ciudad.");return false}
  if(form.delivery_type==="delivery"&&!zoneReady){setMsg("Seleccioná una ciudad con delivery disponible.");return false}
  if(form.delivery_type==="interior"&&!form.shipping_company_id){setMsg("Seleccioná una transportadora.");return false}
  setMsg("");return true;
 };
 async function submit(){
  if(!form.payment_method){setMsg("Elegí un método de pago.");return}
  setBusy(true);setMsg("");
  try{
   const s=createClient();
   const {data,error}=await s.rpc("create_order",{p_customer:{full_name:form.full_name,whatsapp:form.whatsapp,email:null,department:null,city:form.city||null,neighborhood:null,address:form.reference||null,preferred_time:form.preferred_time,invoice_requested:form.invoice_requested,maps_url:form.maps_url||null,note:form.note||null},p_items:items.map(i=>({id:i.id,quantity:i.quantity})),p_delivery_type:form.delivery_type,p_payment_method:form.payment_method,p_shipping_company_id:form.shipping_company_id||null,p_payment_reference:paymentReference.trim()||null});
   if(error)throw error;setOrder(data as OrderResult);clear();
  }catch(e:any){setMsg("❌ "+(e?.message||"No se pudo registrar el pedido."));}finally{setBusy(false)}
 }
 if(!items.length&&!order)return <section><small>CHECKOUT</small><h1>Finalizar compra</h1><div className="empty"><h2>No hay productos para comprar</h2><Link className="btn" href="/catalogo">Volver al catálogo</Link></div></section>;
 if(order)return <section><div className="checkout-shell"><div className="checkout-brand"><Link href="/">← Volver a la tienda</Link><strong>DF STORE PY</strong></div><div className="panel success"><small>COMPRA SEGURA</small><h1>¡Pedido recibido!</h1><p>Tu pedido fue registrado correctamente.</p><div className="order-summary"><p><b>Número de pedido:</b> {order.id.slice(0,8).toUpperCase()}</p><p>Subtotal: <b>{money(order.subtotal)}</b></p><p>Delivery: <b>{order.delivery_type==="delivery"?money(order.delivery_fee):"A confirmar con la transportadora"}</b></p><p>Total: <b>{money(order.total)}</b></p></div><p>Te contactaremos por WhatsApp para coordinar la entrega y el pago.</p><div className="actions"><Link className="btn" href="/catalogo">Seguir comprando</Link>{storeWhatsapp&&<a className="btn secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(`Hola, hice el pedido #${order.id.slice(0,8).toUpperCase()}.`)}`}>Consultar por WhatsApp</a>}</div></div></div></section>;
 return <section className="checkout-section"><div className="checkout-shell"><div className="checkout-brand"><Link href="/">← Volver a la tienda</Link><strong>DF STORE PY</strong></div><div className="checkout-head"><small>COMPRA SEGURA</small><h1>Completar datos</h1><div className="checkout-steps"><button type="button" className="active"><b>1</b><span>Datos</span></button><i></i><button type="button" className={step>=2?"active":""} disabled={step<2} onClick={()=>setStep(2)}><b>2</b><span>Pedido</span></button><i></i><button type="button" className={step>=3?"active":""} disabled={step<3} onClick={()=>setStep(3)}><b>3</b><span>Pago</span></button></div></div>
 {step===1&&<div className="checkout-panel panel"><div className="delivery-choice"><button type="button" className={form.delivery_type==="delivery"?"choice active":"choice"} onClick={()=>{set("delivery_type","delivery");set("shipping_company_id","")}}>🚚 <b>Delivery en Asunción y Central</b><span>Pagás al recibir</span></button><button type="button" className={form.delivery_type==="interior"?"choice active":"choice"} onClick={()=>{set("delivery_type","interior");set("payment_method","");set("shipping_company_id","");set("city","")}}>📦 <b>Envío al interior por transportadora</b><span>Pago por transferencia</span></button></div><div className="delivery-info">{form.delivery_type==="delivery"?"✓ Pagás al recibir · 🚚 Tarifa según tu ciudad":"📦 Envío por transportadora · Pago anticipado"}</div><div className="checkout-fields"><label>Nombre y apellido*<input value={form.full_name} onChange={e=>set("full_name",e.target.value)} /></label><label>Teléfono / WhatsApp*<input value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)} /></label><label>Ciudad*<select value={form.city} onChange={e=>set("city",e.target.value)}><option value="">Seleccioná tu ciudad</option>{cityOptions.map(c=><option key={c} value={c}>{c}</option>)}</select></label>{form.delivery_type==="interior"&&<label>Transportadora*<select value={form.shipping_company_id} onChange={e=>set("shipping_company_id",e.target.value)}><option value="">Seleccioná una transportadora</option>{interiorCompanies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}<div className="location-box"><h3>📍 Enviar ubicación de entrega</h3><p>Ayuda al delivery a llegar sin volver a pedírtela.</p><span className="location-recommended">Ubicación recomendada para facilitar la entrega</span><button type="button" className="location-btn" onClick={useLocation}>📍 ENVIAR MI UBICACIÓN</button>{locationStatus&&<small>{locationStatus}</small>}<button type="button" className="location-btn secondary" onClick={pasteMaps}>Pegar enlace de Google Maps</button></div><label>Referencia de la casa<input value={form.reference} onChange={e=>set("reference",e.target.value)} placeholder="Ej. casa con portón negro, al lado de la despensa" /></label><label className="invoice-check"><input type="checkbox" checked={form.invoice_requested} onChange={e=>set("invoice_requested",e.target.checked)} /> Necesito factura</label><button type="button" className="more-options" onClick={()=>setMore(!more)}>+ Agregar datos opcionales</button>{more&&<><label>Horario<select value={form.preferred_time} onChange={e=>set("preferred_time",e.target.value)}><option>Mañana</option><option>Tarde</option><option>Cualquier horario</option></select></label><label>Nota<textarea value={form.note} onChange={e=>set("note",e.target.value)} /></label></>}{msg&&<p className="checkout-error">{msg}</p>}<button type="button" className="btn checkout-continue" onClick={()=>{if(validate())setStep(2)}}>CONTINUAR</button></div></div>}
 {step===2&&<div className="checkout-panel panel"><h2>📦 Tu pedido</h2><div className="order-lines">{items.map(i=><div key={i.id}><span>{i.name} × {i.quantity}</span><b>{money(i.price*i.quantity)}</b></div>)}</div><div className="checkout-total"><span>Subtotal productos</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>Delivery</span><strong>{form.delivery_type==="delivery"?money(deliveryFee):"A confirmar"}</strong></div><div className="checkout-total grand"><span>TOTAL</span><strong>{money(total)}</strong></div><div className="step-actions"><button type="button" className="btn secondary" onClick={()=>setStep(1)}>← Volver</button><button type="button" className="btn" onClick={()=>setStep(3)}>CONTINUAR</button></div></div>}
 {step===3&&<div className="checkout-panel panel"><h2>💳 Forma de pago</h2><label>Método de pago<select value={form.payment_method} onChange={e=>{set("payment_method",e.target.value);setPaymentReference("")}}><option value="">Elegí un método de pago</option>{form.delivery_type==="delivery"&&<option value="Pago al recibir">Pago al recibir</option>}<option value="Transferencia">Transferencia bancaria</option><option value="Giro Tigo">Giro Tigo</option></select></label>{form.payment_method==="Transferencia"&&<div className="payment-instructions"><h3>Datos para transferencia</h3>{banks.map(b=><div className="payment-box" key={b.id}><b>{b.bank}</b><br/>{b.account_type||"Cuenta"}<br/>N.º {b.account_number}<br/>Titular: {b.holder_name}{b.document&&<><br/>CI/RUC: {b.document}</>}{b.alias&&<><br/>Alias: {b.alias}</>}</div>)}<label>Referencia de operación<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} /></label></div>}{form.payment_method==="Giro Tigo"&&<div className="payment-instructions"><h3>Datos para Giro Tigo</h3>{tigos.map(t=><div className="payment-box" key={t.id}><b>{t.phone}</b><br/>Titular: {t.holder_name}{t.document&&<><br/>CI/RUC: {t.document}</>}</div>)}<label>Referencia de operación<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} /></label></div>}<div className="checkout-total"><span>Subtotal productos</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>Delivery</span><strong>{form.delivery_type==="delivery"?money(deliveryFee):"A confirmar"}</strong></div><div className="checkout-total grand"><span>TOTAL</span><strong>{money(total)}</strong></div>{msg&&<p className="checkout-error">{msg}</p>}<div className="step-actions"><button type="button" className="btn secondary" onClick={()=>setStep(2)}>← Volver</button><button type="button" className="btn checkout-confirm" disabled={busy||!form.payment_method} onClick={submit}>{busy?"REGISTRANDO...":"CONFIRMAR PEDIDO"}</button></div></div>}
 <aside className="checkout-order-sticky"><b>Tu pedido · {items.length} producto(s)</b><strong>{money(total)}</strong><small>Ver detalle ▾</small></aside></div></section>;
}