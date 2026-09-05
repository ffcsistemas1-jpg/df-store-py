"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function AdminLogin(){
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [msg,setMsg]=useState("");
 const router=useRouter();

 useEffect(()=>{
  (async()=>{
   try{
    const s=createClient();
    const {data}=await s.auth.getSession();
    if(data.session){router.replace("/admin");router.refresh()}
   }catch{}
  })();
 },[router]);

 async function sendMagicLink(e:React.FormEvent){
  e.preventDefault(); setBusy(true); setMsg(""); setSent(false);
  try{
   const s=createClient();
   const redirectTo=`${window.location.origin}/admin/login?next=/admin`;
   const {error}=await s.auth.signInWithOtp({
    email:email.trim(),
    options:{emailRedirectTo:redirectTo,shouldCreateUser:false},
   });
   if(error) throw error;
   setSent(true);
   setMsg("✅ Te enviamos un enlace seguro. Abrilo desde este teléfono para entrar al Admin.");
  }catch(err:any){setMsg("❌ "+(err?.message||"No se pudo enviar el enlace de acceso"))}
  finally{setBusy(false)}
 }

 return <section className="admin-login-page"><small>DF STORE PY</small><h1>Acceso administrador</h1>
  <p className="muted">Sin contraseña. Ingresá con un enlace seguro enviado a tu correo. Si tu sesión sigue activa, el Admin abre directamente.</p>
  <form onSubmit={sendMagicLink} className="product-form admin-login-form">
   <label>Correo administrador<input required autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu-correo@ejemplo.com"/></label>
   <button className="btn" disabled={busy}>{busy?"Enviando...":sent?"Reenviar enlace seguro":"Enviar enlace para entrar"}</button>
   {msg&&<p role="status">{msg}</p>}
  </form>
 </section>;
}
