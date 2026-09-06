"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { normalizePyWhatsapp } from "../../../lib/phone-py";

export default function Configuracion(){
 const [whatsapp,setWhatsapp]=useState(""); const [whatsappDelivery,setWhatsappDelivery]=useState(""); const [bannerText,setBannerText]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{const s=createClient();const {data,error}=await s.from("store_settings").select("whatsapp,whatsapp_delivery,banner_text").eq("id",1).maybeSingle();if(error)setMsg(error.message);else{setWhatsapp(data?.whatsapp||"");setWhatsappDelivery(data?.whatsapp_delivery||"");setBannerText(data?.banner_text||"")}setLoading(false)})()},[]);
 async function save(e:React.FormEvent){e.preventDefault();setSaving(true);setMsg("");const s=createClient();const cleanWhatsapp=normalizePyWhatsapp(whatsapp);const cleanDelivery=normalizePyWhatsapp(whatsappDelivery);const {error}=await s.from("store_settings").upsert({id:1,whatsapp:cleanWhatsapp,whatsapp_delivery:cleanDelivery||null,banner_text:bannerText.trim()||null});setSaving(false);if(!error){setWhatsapp(cleanWhatsapp);setWhatsappDelivery(cleanDelivery)}setMsg(error?"❌ "+error.message:"✅ Configuración guardada correctamente.");}
 return <section><div className="title"><div><small>ADMINISTRADOR</small><h1>Configuración</h1></div><Link href="/admin">← Admin</Link></div>
  <div className="panel"><h2>📱 WhatsApp</h2><p className="muted">Podés escribir el número como quieras (con o sin 0, con o sin 595) — se corrige solo al guardar.</p>{loading?<p>Cargando...</p>:<form onSubmit={save}>
   <label>WhatsApp de atención (botón flotante de la tienda)<input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="0981 123 456" inputMode="tel"/><small>Este es el que ven tus clientes en la tienda.</small></label>
   <label>WhatsApp de delivery (Asunción y Central)<input value={whatsappDelivery} onChange={e=>setWhatsappDelivery(e.target.value)} placeholder="0981 123 456 (opcional)" inputMode="tel"/><small>A este número le vas a poder mandar los datos del pedido con un botón, desde el detalle de cada pedido con delivery.</small></label>
   <label>Texto de la barra superior<input value={bannerText} onChange={e=>setBannerText(e.target.value)} placeholder="🚚 Pagás al recibir en zonas habilitadas · Envíos a todo el país"/><small>Dejalo vacío para ocultar la barra. Se muestra fija arriba del header.</small></label>
   <button className="btn" disabled={saving}>{saving?"Guardando...":"Guardar cambios"}</button>
  </form>}{msg&&<p>{msg}</p>}</div>
 </section>
}
