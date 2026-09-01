"use client";
import {useState} from "react";
import {createClient} from "../../lib/supabase/client";
export function AdminProductForm(){
 const [name,setName]=useState(""); const [price,setPrice]=useState(""); const [cost,setCost]=useState(""); const [stock,setStock]=useState("0"); const [category,setCategory]=useState("Ropa"); const [description,setDescription]=useState(""); const [file,setFile]=useState<File|null>(null); const [videoFile,setVideoFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 async function upload(s:ReturnType<typeof createClient>, f:File){
  const ext=f.name.split(".").pop()?.toLowerCase()||"bin";
  const path=`${crypto.randomUUID()}.${ext}`;
  const {error}=await s.storage.from("productos").upload(path,f,{upsert:false,contentType:f.type});
  if(error) throw error;
  const {data}=s.storage.from("productos").getPublicUrl(path);
  return data.publicUrl;
 }
 async function save(e:React.FormEvent){
  e.preventDefault(); setBusy(true); setMsg("");
  try{
   const s=createClient();
   let image_url:string|null=null; if(file) image_url=await upload(s,file);
   let video_url:string|null=null; if(videoFile) video_url=await upload(s,videoFile);
   const {error}=await s.from("products").insert({name,price:Number(price),cost:Number(cost||0),stock:Number(stock||0),category,description,image_url,video_url,active:true});
   if(error) throw error;
   setMsg("✅ Producto guardado. Ya podés cargar otro."); setName("");setPrice("");setCost("");setStock("0");setDescription("");setFile(null);setVideoFile(null);
  }catch(err:any){setMsg("❌ "+(err?.message||"No se pudo guardar. Revisaremos permisos de Supabase."))}
  finally{setBusy(false)}
 }
 return <form onSubmit={save} className="product-form">
  <label>Nombre del producto*<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Calza deportiva"/></label>
  <div className="twocol"><label>Precio*<input required type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="120000"/></label><label>Costo<input type="number" min="0" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0"/></label></div>
  <div className="twocol"><label>Stock<input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)}/></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Ropa</option><option>Hogar</option><option>Otros</option></select></label></div>
  <label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Talles, colores, detalles..."/></label>
  <label className="upload">📷 Foto del producto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<small>Seleccionada: {file.name}</small>}</label>
  <label className="upload">🎥 Video del producto (opcional)<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>setVideoFile(e.target.files?.[0]||null)}/>{videoFile&&<small>Seleccionado: {videoFile.name}</small>}</label>
  <button className="btn" disabled={busy}>{busy?"Guardando...":"Guardar producto"}</button>{msg&&<p>{msg}</p>}
 </form>;
}
