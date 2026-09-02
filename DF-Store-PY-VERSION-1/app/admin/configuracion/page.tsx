"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function Configuracion(){
 const [whatsapp,setWhatsapp]=useState(""); const [bannerText,setBannerText]=useState(""); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{const s=createClient();const {data,error}=await s.from("store_settings").select("whatsapp,banner_text").eq("id",1).maybeSingle();if(error)setMsg(error.message);else{setWhatsapp(data?.whatsapp||"");setBannerText(data?.banner_text||"")}setLoading(false)})()},[]);
 async function save(e:React.FormEvent){e.preventDefault();setSaving(true);setMsg("");const s=createClient();const clean=whatsapp.replace(/\D/g,"");const {error}=await s.from("store_settings").upsert({id:1,whatsapp:clean,banner_text:bannerText.trim()||null});setSaving(false);setMsg(error?"❌ "+error.message:"✅ Configuración guardada correctamente.");}
 return <section><div className="title"><div><small>ADMINISTRADOR</small><h1>Configuración</h1></div><Link href="/admin">← Admin</Link></div>
  <div className="panel"><h2>📱 WhatsApp de atención</h2><p className="muted">Este número se utilizará en los botones y mensajes de WhatsApp de la tienda.</p>{loading?<p>Cargando...</p>:<form onSubmit={save}>
   <label>Número de WhatsApp<input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="595981123456" inputMode="tel"/><small>Usá el código de país. Ejemplo: 595981123456.</small></label>
   <label>Texto de la barra superior<input value={bannerText} onChange={e=>setBannerText(e.target.value)} placeholder="🚚 Pagás al recibir en zonas habilitadas · Envíos a todo el país"/><small>Dejalo vacío para ocultar la barra. Se muestra fija arriba del header.</small></label>
   <button className="btn" disabled={saving}>{saving?"Guardando...":"Guardar cambios"}</button>
  </form>}{msg&&<p>{msg}</p>}</div>
 </section>
}
