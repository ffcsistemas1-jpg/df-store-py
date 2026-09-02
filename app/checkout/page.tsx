"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useCart } from "../ui";
import { PARAGUAY_DEPARTAMENTOS } from "../../lib/paraguay-geo";
import { getCartSession } from "../../lib/cart-session";

const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;
type Company={id:string;name:string};
type GeoDistrict={name:string;barrios:string[]};
type GeoDepartment={name:string;distritos:GeoDistrict[]};
type Bank={id:string;bank:string;account_type:string|null;account_number:string|null;holder_name:string|null;document:string|null;alias:string|null};
type Tigo={id:string;phone:string;holder_name:string|null;document:string|null};
type Zone={department:string;city:string|null;neighborhood:string|null;fee:number};
type OrderResult={id:string;subtotal:number;delivery_fee:number;total:number;delivery_type:string};

type FormState={full_name:string;whatsapp:string;email:string;department:string;city:string;neighborhood:string;address:string;delivery_type:string;payment_method:string;shipping_company_id:string;preferred_time:string;invoice_requested:boolean;maps_url:string;note:string};

// Cobertura propia para "Asunción y Central". Villa Hayes queda incluida como zona de cobertura.
const DELIVERY_CITIES = [
 "Asunción","Areguá","Capiatá","Fernando de la Mora","Guarambaré","Itá","Itauguá",
 "J. Augusto Saldívar","Lambaré","Limpio","Luque","Mariano Roque Alonso","Nueva Italia",
 "Ñemby","San Antonio","San Lorenzo","Villa Elisa","Villeta","Ypacaraí","Villa Hayes"
];
const DELIVERY_CITY_DEPARTMENT: Record<string,string> = {
 "Asunción":"Asunción",
 "Areguá":"Central","Capiatá":"Central","Fernando de la Mora":"Central","Guarambaré":"Central",
 "Itá":"Central","Itauguá":"Central","J. Augusto Saldívar":"Central","Lambaré":"Central","Limpio":"Central",
 "Luque":"Central","Mariano Roque Alonso":"Central","Nueva Italia":"Central","Ñemby":"Central",
 "San Antonio":"Central","San Lorenzo":"Central","Villa Elisa":"Central","Villeta":"Central","Ypacaraí":"Central",
 "Villa Hayes":"Presidente Hayes"
};
const normGeo=(v:string)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

export default function Checkout(){
 const {items,subtotal,clear}=useCart();
 const [step,setStep]=useState(1);
 const [form,setForm]=useState<FormState>({full_name:"",whatsapp:"",email:"",department:"",city:"",neighborhood:"",address:"",delivery_type:"delivery",payment_method:"Pago al recibir",shipping_company_id:"",preferred_time:"Mañana",invoice_requested:false,maps_url:"",note:""});
 const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(""); const [order,setOrder]=useState<OrderResult|null>(null);
 const [shippingCompanies,setShippingCompanies]=useState<Company[]>([]); const [geoDepartments,setGeoDepartments]=useState<GeoDepartment[]>(PARAGUAY_DEPARTAMENTOS.map(d=>({name:d.name,distritos:d.distritos.map(name=>({name,barrios:[]}))}))); const [coverage,setCoverage]=useState<{shipping_company_id:string;department:string}[]>([]);
 const [banks,setBanks]=useState<Bank[]>([]); const [tigos,setTigos]=useState<Tigo[]>([]); const [zones,setZones]=useState<Zone[]>([]); const [zonesLoading,setZonesLoading]=useState(true);
 const [deliveryFee,setDeliveryFee]=useState(0); const [zoneMsg,setZoneMsg]=useState(""); const [zoneResolved,setZoneResolved]=useState(false); const [paymentReference,setPaymentReference]=useState(""); const [whatsapp,setWhatsapp]=useState("");
 const [locationStatus,setLocationStatus]=useState(""); const [showNote,setShowNote]=useState(false); const sessionRef=useRef(""); const draftReady=useRef(false); const [restoredDraft,setRestoredDraft]=useState(false);

 useEffect(()=>{(async()=>{const session=getCartSession();sessionRef.current=session;try{const s=createClient();const {data}=await s.from("checkout_drafts").select("full_name,whatsapp,email,department,city,neighborhood,address,delivery_type,payment_method,shipping_company_id,preferred_time,invoice_requested,maps_url,note,completed_at").eq("session",session).maybeSingle();if(data){setForm(x=>({...x,full_name:data.full_name||x.full_name,whatsapp:data.whatsapp||x.whatsapp,email:data.email||x.email,department:data.department||x.department,city:data.city||x.city,neighborhood:data.neighborhood||x.neighborhood,address:data.address||x.address,delivery_type:data.delivery_type||x.delivery_type,payment_method:data.payment_method||x.payment_method,shipping_company_id:data.shipping_company_id||x.shipping_company_id,preferred_time:data.preferred_time||x.preferred_time,invoice_requested:Boolean(data.invoice_requested),maps_url:data.maps_url||x.maps_url,note:data.note||x.note}));if(!data.completed_at)setRestoredDraft(true)}}catch{}draftReady.current=true})()},[]);
 useEffect(()=>{if(!draftReady.current)return;if(!form.full_name.trim()&&!form.whatsapp.trim()&&!form.address.trim())return;const timer=window.setTimeout(()=>{const session=sessionRef.current;if(!session)return;const s=createClient();s.from("checkout_drafts").upsert({session,full_name:form.full_name||null,whatsapp:form.whatsapp||null,email:form.email||null,department:form.department||null,city:form.city||null,neighborhood:form.neighborhood||null,address:form.address||null,delivery_type:form.delivery_type||null,payment_method:form.payment_method||null,shipping_company_id:form.shipping_company_id||null,preferred_time:form.preferred_time||null,invoice_requested:form.invoice_requested,maps_url:form.maps_url||null,note:form.note||null,updated_at:new Date().toISOString()}).then(({error}:any)=>{if(error)console.error("No se pudo guardar el borrador",error)})},700);return()=>window.clearTimeout(timer)},[form]);
 useEffect(()=>{const s=createClient();Promise.all([s.from("store_settings").select("whatsapp").eq("id",1).maybeSingle(),s.from("shipping_companies").select("id,name").eq("active",true).order("name"),s.from("bank_accounts").select("id,bank,account_type,account_number,holder_name,document,alias").eq("active",true).order("bank"),s.from("tigo_accounts").select("id,phone,holder_name,document").eq("active",true).order("phone"),s.from("delivery_zones").select("department,city,neighborhood,fee").eq("active",true),s.from("shipping_coverage").select("shipping_company_id,department")]).then(([settings,c,b,t,z,cov])=>{setWhatsapp(settings.data?.whatsapp||"");setShippingCompanies(c.data||[]);setBanks(b.data||[]);setTigos(t.data||[]);setZones(((z.data||[]) as any[]).map(r=>({department:r.department,city:r.city,neighborhood:r.neighborhood,fee:Number(r.fee)||0})));setZonesLoading(false);setCoverage((cov.data||[]) as any[])})},[]);
 useEffect(()=>{
  // Departamento y distrito siempre existen localmente. Los barrios se enriquecen
  // con la base oficial del INE mediante nuestra API, y quedan cacheados en el navegador.
  const base=PARAGUAY_DEPARTAMENTOS.map(d=>({name:d.name,distritos:d.distritos.map(name=>({name,barrios:[]}))}));
  setGeoDepartments(base);
  const mergeGeo=(api:GeoDepartment[])=>{
    const norm=(v:string)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    return base.map(baseDep=>{
      const ad=api.find(x=>norm(x.name)===norm(baseDep.name));
      const districts=baseDep.distritos.map(d=>{
        const found=ad?.distritos?.find(x=>norm(x.name)===norm(d.name));
        return {name:d.name,barrios:Array.isArray(found?.barrios)?found!.barrios:[]};
      });
      const extras=(ad?.distritos||[]).filter(x=>!districts.some(d=>norm(d.name)===norm(x.name))).map(x=>({name:x.name,barrios:Array.isArray(x.barrios)?x.barrios:[]}));
      return {name:baseDep.name,distritos:[...districts,...extras].sort((a,b)=>a.name.localeCompare(b.name,"es"))};
    });
  };
  try{const cached=localStorage.getItem("df_py_geo_v1");if(cached){const parsed=JSON.parse(cached);if(Array.isArray(parsed)&&parsed.length)setGeoDepartments(mergeGeo(parsed));}}catch{}
  fetch("/api/paraguay-geo",{cache:"force-cache"}).then(r=>r.ok?r.json():null).then(data=>{
    if(!data?.departments?.length)return;
    setGeoDepartments(mergeGeo(data.departments as GeoDepartment[]));
    try{localStorage.setItem("df_py_geo_v1",JSON.stringify(data.departments));}catch{}
  }).catch(()=>{});
 },[]);
 const departments=useMemo(()=>geoDepartments.map(d=>d.name).sort((a,b)=>a.localeCompare(b,"es")),[geoDepartments]);
 const citiesForDept=useMemo(()=>{if(!form.department)return[];const dep=geoDepartments.find(d=>d.name.toLowerCase()===form.department.toLowerCase());return dep?.distritos.map(x=>x.name).sort((a,b)=>a.localeCompare(b,"es"))||[]},[geoDepartments,form.department]);
 const neighborhoodsForCity=useMemo(()=>{if(!form.department||!form.city)return[];const dep=geoDepartments.find(d=>d.name.toLowerCase()===form.department.toLowerCase());const city=dep?.distritos.find(x=>x.name.toLowerCase()===form.city.toLowerCase());return city?.barrios||[]},[geoDepartments,form.department,form.city]);
 const deliveryCities=useMemo(()=>DELIVERY_CITIES.slice().sort((a,b)=>a.localeCompare(b,"es")),[]);
 const deliveryCityFee=(city:string)=>{const rows=zones.filter(z=>normGeo(z.city||"")===normGeo(city)&&!z.neighborhood);if(!rows.length)return null;const active=rows.find(z=>z.fee>=0);return active?Number(active.fee)||0:null};
 const companiesForInteriorDept=useMemo(()=>{
  if(!shippingCompanies.length)return [];
  if(!form.department)return shippingCompanies;
  const ids=new Set(coverage.filter(x=>x.department.toLowerCase()===form.department.toLowerCase()).map(x=>x.shipping_company_id));
  return ids.size?shippingCompanies.filter(x=>ids.has(x.id)):shippingCompanies;
 },[shippingCompanies,coverage,form.department]);
 useEffect(()=>{
  if(form.delivery_type!=="delivery"){setDeliveryFee(0);setZoneMsg("");setZoneResolved(true);return}
  if(!form.city){setDeliveryFee(0);setZoneMsg("Elegí tu ciudad para calcular el delivery.");setZoneResolved(false);return}
  const dep=form.department.toLowerCase(),city=form.city.trim().toLowerCase(),n=form.neighborhood.trim().toLowerCase();
  const rows=zones.filter(z=>z.department.toLowerCase()===dep);
  const exact=n?rows.find(r=>r.city?.toLowerCase()===city&&r.neighborhood?.toLowerCase()===n):undefined;
  const cityRow=rows.find(r=>r.city?.toLowerCase()===city&&!r.neighborhood);
  const depRow=rows.find(r=>!r.city&&!r.neighborhood);
  const found=exact||cityRow||depRow;
  if(found){setDeliveryFee(found.fee);setZoneMsg(`Delivery: ${money(found.fee)}`);setZoneResolved(true)}
  else{setDeliveryFee(0);setZoneMsg("No tenemos una tarifa configurada para esa zona. El administrador debe agregarla antes de confirmar.");setZoneResolved(false)}
 },[form.delivery_type,form.department,form.city,form.neighborhood,zones]);
 const total=useMemo(()=>subtotal+deliveryFee,[subtotal,deliveryFee]);
 const set=(k:keyof FormState,v:any)=>setForm(x=>({...x,[k]:v}));
 const setDepartment=(v:string)=>setForm(x=>({...x,department:v,city:"",neighborhood:"",shipping_company_id:""}));
 const setCity=(v:string)=>setForm(x=>({...x,city:v,neighborhood:""}));
 const setDeliveryCity=(v:string)=>{
   const dep=DELIVERY_CITY_DEPARTMENT[v]||"";
   setForm(x=>({...x,city:v,department:dep,neighborhood:"",shipping_company_id:""}));
 };
 const location=()=>{if(!navigator.geolocation){setLocationStatus("Tu navegador no permite obtener la ubicación.");return}setLocationStatus("Obteniendo ubicación...");navigator.geolocation.getCurrentPosition(pos=>{const {latitude,longitude}=pos.coords;set("maps_url",`https://www.google.com/maps?q=${latitude},${longitude}`);setLocationStatus("✓ Ubicación guardada para facilitar la entrega.")},()=>setLocationStatus("No pudimos obtener tu ubicación. Podés pegar un enlace de Google Maps."),{enableHighAccuracy:true,timeout:10000})};
 const pasteMaps=()=>{const v=window.prompt("Pegá aquí el enlace de Google Maps de la ubicación de entrega:",form.maps_url||"");if(v!==null){set("maps_url",v.trim());setLocationStatus(v.trim()?"✓ Enlace de Google Maps guardado.":"")}};
 const canContinueStep1=useMemo(()=>{if(!form.full_name.trim()||!form.whatsapp.trim())return false;if(form.delivery_type==="delivery"&&(!form.city||!form.neighborhood||!form.address.trim()))return false;if(form.delivery_type==="interior"&&(!form.department||!form.city||!form.address.trim()))return false;if(form.delivery_type==="delivery"&&!zoneResolved)return false;if(form.delivery_type==="interior"&&!form.shipping_company_id)return false;return true},[form.full_name,form.whatsapp,form.delivery_type,form.department,form.city,form.address,zoneResolved,form.shipping_company_id]);
 const validateStep1=()=>{if(!form.full_name.trim()||!form.whatsapp.trim()){setMsg("Completá nombre y WhatsApp.");return false}if(form.delivery_type==="delivery"&&(!form.city||!form.neighborhood||!form.address.trim())){setMsg("Completá ciudad, barrio/localidad y dirección para el delivery.");return false}if(form.delivery_type==="interior"&&(!form.department||!form.city||!form.address.trim())){setMsg("Completá los datos de entrega obligatorios.");return false}if(form.delivery_type==="delivery"&&!zoneResolved){setMsg("Seleccioná una zona con tarifa de delivery disponible.");return false}if(form.delivery_type==="interior"&&!form.shipping_company_id){setMsg("Seleccioná una transportadora.");return false}setMsg("");return true};
 if(!items.length&&!order)return <section><small>CHECKOUT</small><h1>Finalizar compra</h1><div className="empty"><h2>No hay productos para comprar</h2><Link className="btn" href="/catalogo">Volver al catálogo</Link></div></section>;
 async function submit(){setBusy(true);setMsg("");try{const s=createClient();const {data,error}=await s.rpc("create_order",{p_customer:{full_name:form.full_name,whatsapp:form.whatsapp,email:form.email||null,department:form.department,city:form.city,neighborhood:form.neighborhood,address:form.address,preferred_time:form.preferred_time,invoice_requested:form.invoice_requested,maps_url:form.maps_url||null,note:form.note||null},p_items:items.map(i=>({id:i.id,quantity:i.quantity})),p_delivery_type:form.delivery_type,p_payment_method:form.payment_method,p_shipping_company_id:form.shipping_company_id||null,p_payment_reference:paymentReference.trim()||null});if(error)throw error;setOrder(data as OrderResult);clear();try{await s.from("checkout_drafts").update({completed_at:new Date().toISOString()}).eq("session",sessionRef.current)}catch{}}catch(err:any){setMsg("❌ "+(err?.message||"No se pudo registrar el pedido."));setStep(3)}finally{setBusy(false)}}
 if(order)return <section><div className="checkout-shell"><div className="checkout-brand"><Link href="/">← Volver a la tienda</Link><strong>DF STORE PY</strong></div><div className="panel success"><small>COMPRA SEGURA</small><h1>¡Pedido recibido!</h1><p>Tu pedido fue registrado correctamente.</p><div className="order-summary"><p><b>Número de pedido:</b> {order.id.slice(0,8).toUpperCase()}</p><p>Subtotal: <b>{money(order.subtotal)}</b></p><p>{order.delivery_type==="delivery"?"Delivery":"Transporte"}: <b>{order.delivery_type==="delivery"?money(order.delivery_fee):"A confirmar con la transportadora"}</b></p><p>Total: <b>{money(order.total)}</b></p></div><p>Te contactaremos por WhatsApp para coordinar entrega y pago.</p><div className="actions"><Link className="btn" href="/catalogo">Seguir comprando</Link>{whatsapp&&<a className="btn secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola, hice el pedido #${order.id.slice(0,8).toUpperCase()} en DF Store PY. Total: ${money(order.total)}.`)}`}>Consultar por WhatsApp</a>}</div></div></div></section>;
 return <section className="checkout-section"><div className="checkout-shell"><div className="checkout-brand"><Link href="/">← Volver a la tienda</Link><strong>DF STORE PY</strong></div><div className="checkout-head"><small>COMPRA SEGURA</small><h1>Completar datos</h1><div className="checkout-steps"><button className={step>=1?"active":""} onClick={()=>setStep(1)}><b>1</b><span>Datos</span></button><i></i><button className={step>=2?"active":""} disabled={!canContinueStep1} onClick={()=>{if(validateStep1())setStep(2)}}><b>2</b><span>Pedido</span></button><i></i><button className={step>=3?"active":""} disabled={step<3} onClick={()=>setStep(3)}><b>3</b><span>Pago</span></button></div></div>
 {restoredDraft&&<div className="panel draft-notice">📝 Recuperamos los datos que habías completado antes. Revisalos y continuá cuando quieras.</div>}
 {step===1&&<div className="checkout-panel panel"><div className="delivery-choice"><button type="button" className={form.delivery_type==="delivery"?"choice active":"choice"} onClick={()=>setForm(x=>({...x,delivery_type:"delivery",shipping_company_id:"",department:"",city:"",neighborhood:""}))}>🚚 <b>Asunción y Central</b><span>✓ Pagás al recibir</span></button><button type="button" className={form.delivery_type==="interior"?"choice active":"choice"} onClick={()=>setForm(x=>({...x,delivery_type:"interior",shipping_company_id:"",department:"",city:"",neighborhood:""}))}>📦 <b>Interior del país</b><span>Envío por transportadora</span></button></div>
 {form.delivery_type==="delivery"&&<div className="delivery-info">✓ Pagás al recibir <span>·</span> 🚚 Entrega rápida</div>}{form.delivery_type==="interior"&&<div className="delivery-info blue">📦 <b>ENVÍO POR TRANSPORTADORA</b><br/><span>Pagás anticipadamente el valor de tus productos. El costo del transporte se abona directamente a la transportadora.</span></div>}
 <div className="checkout-fields"><label>Nombre y apellido*<input required value={form.full_name} onChange={e=>set("full_name",e.target.value)} /></label><label>Teléfono / WhatsApp*<input required value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)} placeholder="09XX XXX XXX" /></label><label>Email<input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="Opcional" /></label>
 {form.delivery_type==="delivery"&&<><label>Ciudad / Distrito*<select required value={form.city} onChange={e=>setDeliveryCity(e.target.value)}><option value="">Seleccioná tu ciudad</option>{deliveryCities.map(c=>{const f=deliveryCityFee(c);return <option key={c} value={c}>{c}{f!==null?` — ${money(f)}`:" — Sin tarifa"}</option>})}</select></label><label>Barrio / localidad{form.city?<select value={form.neighborhood} onChange={e=>set("neighborhood",e.target.value)} disabled={!neighborhoodsForCity.length}><option value="">{neighborhoodsForCity.length?"Seleccioná tu barrio / localidad":"Cargando barrios / localidades..."}</option>{neighborhoodsForCity.map(n=><option key={n} value={n}>{n}</option>)}</select>:<select disabled><option>Primero elegí tu ciudad</option></select>}</label><label>Dirección*<input required value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Calle, número y referencia" /></label></>}
 {form.delivery_type==="interior"&&<><label>Departamento*<select required value={form.department} onChange={e=>setDepartment(e.target.value)}><option value="">Seleccioná tu departamento</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select></label><label>Ciudad / Distrito*<select required value={form.city} onChange={e=>setCity(e.target.value)} disabled={!form.department}><option value="">{form.department?"Seleccioná tu ciudad":"Primero elegí tu departamento"}</option>{citiesForDept.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Barrio / localidad{form.city?<select value={form.neighborhood} onChange={e=>set("neighborhood",e.target.value)} disabled={!neighborhoodsForCity.length}><option value="">{neighborhoodsForCity.length?"Seleccioná tu barrio / localidad":"Cargando barrios / localidades..."}</option>{neighborhoodsForCity.map(n=><option key={n} value={n}>{n}</option>)}</select>:<select disabled><option>Primero elegí tu ciudad</option></select>}</label><label>Dirección*<input required value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Calle, número y referencia" /></label></>}
 {form.delivery_type==="interior"&&<label>Transportadora preferida*<select required value={form.shipping_company_id} onChange={e=>set("shipping_company_id",e.target.value)}><option value="">Seleccioná una transportadora</option>{companiesForInteriorDept.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
 <label>Horario<select value={form.preferred_time} onChange={e=>set("preferred_time",e.target.value)}><option>Mañana</option><option>Tarde</option><option>Cualquier horario</option></select></label><label className="invoice-check"><input type="checkbox" checked={form.invoice_requested} onChange={e=>set("invoice_requested",e.target.checked)} /> Necesito factura</label>
 {form.delivery_type==="delivery"&&<div className="location-box"><h3>📍 UBICACIÓN <span>(opcional)</span></h3><p>Ayudanos a llegar más rápido y sin errores.</p><button type="button" className="location-btn" onClick={location}>📍 Usar mi ubicación actual</button>{locationStatus&&<small>{locationStatus}</small>}<div className="location-or"><span></span><b>O</b><span></span></div><p><b>¿La entrega es en otro lugar?</b><br/><span>Podés pegar un enlace de Google Maps.</span></p><button type="button" className="location-btn secondary" onClick={pasteMaps}>📍 Pegar enlace de Google Maps</button>{form.maps_url&&<small>✓ Enlace de ubicación guardado.</small>}</div>}
 <button type="button" className="note-toggle" onClick={()=>setShowNote(!showNote)}>+ Agregar una nota</button>{showNote&&<label>Nota para el pedido<textarea value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Ej. llamar antes de entregar" /></label>}
 {msg&&<p className="checkout-error">{msg}</p>}<button type="button" className="btn checkout-continue" onClick={()=>{if(validateStep1())setStep(2)}}>CONTINUAR</button></div></div>}
 {step===2&&<div className="checkout-panel panel"><h2>📦 Tu pedido</h2><div className="order-lines">{items.map(i=><div key={i.id}><span>{i.name} × {i.quantity}</span><b>{money(i.price*i.quantity)}</b></div>)}</div><div className="checkout-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>{form.delivery_type==="delivery"?"Delivery":"Transporte"}</span><strong>{form.delivery_type==="delivery"?money(deliveryFee):"A confirmar"}</strong></div><div className="checkout-total grand"><span>Total</span><strong>{money(total)}</strong></div><div className="step-actions"><button type="button" className="btn secondary" onClick={()=>setStep(1)}>← Volver</button><button type="button" className="btn" onClick={()=>setStep(3)}>CONTINUAR</button></div></div>}
 {step===3&&<div className="checkout-panel panel"><h2>💳 Forma de pago</h2><label>Método de pago<select value={form.payment_method} onChange={e=>{set("payment_method",e.target.value);setPaymentReference("")}}><option>Pago al recibir</option><option>Transferencia</option><option>Giro Tigo</option></select></label>{form.payment_method==="Transferencia"&&<div className="payment-instructions"><h3>Datos para transferencia</h3>{banks.length?banks.map(b=><div className="payment-box" key={b.id}><b>{b.bank}</b><br/>{b.account_type||"Cuenta"}<br/>N.º {b.account_number}<br/>Titular: {b.holder_name}{b.document&&<><br/>CI/RUC: {b.document}</>}{b.alias&&<><br/>Alias: {b.alias}</>}</div>):<p className="muted">Los datos de transferencia todavía no están configurados.</p>}<label>Referencia de operación<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Opcional" /></label></div>}{form.payment_method==="Giro Tigo"&&<div className="payment-instructions"><h3>Datos para Giro Tigo</h3>{tigos.length?tigos.map(t=><div className="payment-box" key={t.id}><b>{t.phone}</b><br/>Titular: {t.holder_name}{t.document&&<><br/>CI/RUC: {t.document}</>}</div>):<p className="muted">Los datos de Giro Tigo todavía no están configurados.</p>}<label>Referencia de operación<input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Opcional" /></label></div>}<div className="checkout-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>{form.delivery_type==="delivery"?"Delivery":"Transporte"}</span><strong>{form.delivery_type==="delivery"?money(deliveryFee):"A confirmar"}</strong></div><div className="checkout-total grand"><span>Total</span><strong>{money(total)}</strong></div>{msg&&<p className="checkout-error">{msg}</p>}<div className="step-actions"><button type="button" className="btn secondary" onClick={()=>setStep(2)}>← Volver</button><button type="button" className="btn checkout-confirm" disabled={busy} onClick={submit}>{busy?"REGISTRANDO...":"CONFIRMAR PEDIDO"}</button></div><p className="muted">El stock, precios y delivery se validan nuevamente al confirmar el pedido.</p></div>}
 <aside className="checkout-order-sticky"><b>Tu pedido · {items.length} producto(s)</b><strong>{money(total)}</strong><small>Ver detalle ▾</small></aside>
 </div></section>;
}
