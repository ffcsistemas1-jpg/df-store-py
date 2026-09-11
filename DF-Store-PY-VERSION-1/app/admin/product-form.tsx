"use client";
import {useState} from "react";
import {createClient} from "../../lib/supabase/client";

const CATEGORIES=["Electrónica","Hogar","Herramientas","Vestimenta","Belleza","Accesorios","Tecnología","Otros"];

export function AdminProductForm(){
 const [name,setName]=useState(""); const [price,setPrice]=useState(""); const [cost,setCost]=useState(""); const [stock,setStock]=useState(""); const [category,setCategory]=useState("Electrónica"); const [description,setDescription]=useState(""); const [file,setFile]=useState<File|null>(null); const [videoFile,setVideoFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
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
   const {error}=await s.from("products").insert({name:name.trim(),price:Number(price)||0,cost:Number(cost)||0,stock:Math.max(0,Math.floor(Number(stock)||0)),category,description:description.trim()||null,image_url,video_url,active:true});
   if(error) throw error;
   setMsg("✅ Producto guardado correctamente."); setName("");setPrice("");setCost("");setStock("");setCategory("Electrónica");setDescription("");setFile(null);setVideoFile(null);
  }catch(err:any){setMsg("❌ "+(err?.message||"No se pudo guardar el producto."))}
  finally{setBusy(false)}
 }
 return <form onSubmit={save} className="product-form admin-product-form">
  <div className="form-heading"><span className="form-eyebrow">CATÁLOGO E INVENTARIO</span><h2>Agregar producto</h2><p>Completá los datos del producto y cargá sus imágenes. La primera imagen será la portada.</p></div>
  <div className="form-section"><h3>Información principal</h3><label>Nombre del producto*<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Cocina infrarroja doble"/></label><div className="twocol"><label>Precio*<input required type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="120000"/></label><label>Costo<input type="number" min="0" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0"/></label></div><div className="twocol"><label>Disponibilidad / Stock<input type="text" inputMode="numeric" pattern="[0-9]*" value={stock} onChange={e=>setStock(e.target.value.replace(/[^0-9]/g,""))} placeholder="0"/><small className="field-help">Cantidad disponible para la venta</small></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(item=><option key={item} value={item}>{item}</option>)}</select></label></div><label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Características, medidas, beneficios y detalles..."/></label></div>
  <div className="form-section"><h3>Multimedia</h3><p className="section-note">Podés cargar una imagen y, opcionalmente, un video. La primera imagen será la portada.</p><label className="upload">📷 Foto del producto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<small>Seleccionada: {file.name}</small>}</label><label className="upload">🎥 Video del producto <span>(opcional)</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>setVideoFile(e.target.files?.[0]||null)}/>{videoFile&&<small>Seleccionado: {videoFile.name}</small>}</label></div>
  <button className="btn primary-action" disabled={busy}>{busy?"Guardando producto...":"Guardar producto"}</button>{msg&&<p className="form-message" role="status">{msg}</p>}
 </form>;
}
