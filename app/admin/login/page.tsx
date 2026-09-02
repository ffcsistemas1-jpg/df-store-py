"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "../../../lib/supabase/client";
export default function AdminLogin(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 const router=useRouter();
 async function login(e:React.FormEvent){
  e.preventDefault(); setBusy(true); setMsg("");
  try{
   const s=createClient();
   const {error}=await s.auth.signInWithPassword({email,password});
   if(error) throw error;
   router.push("/admin"); router.refresh();
  }catch(err:any){setMsg("❌ "+(err?.message||"No se pudo iniciar sesión"))}
  finally{setBusy(false)}
 }
 return <section><small>DF STORE PY</small><h1>Acceso administrador</h1>
  <form onSubmit={login} className="product-form">
   <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@dfstorepy.com"/></label>
   <label>Contraseña<input required type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="btn" disabled={busy}>{busy?"Ingresando...":"Ingresar"}</button>
   {msg&&<p>{msg}</p>}
  </form>
 </section>;
}
