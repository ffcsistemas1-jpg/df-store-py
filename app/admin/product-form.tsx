"use client";
import {useMemo,useState} from "react";
import {createClient} from "../../lib/supabase/client";
import {formatGs,parseGs} from "../../lib/format-gs";

const MAX_IMAGES=Infinity;
const MAX_VIDEOS=Infinity;
const TUS_CHUNK=6*1024*1024;
const IMAGE_EXT=new Set(["jpg","jpeg","png","webp","avif","gif","heic","heif","bmp","tif","tiff","jfif"]);
const VIDEO_EXT=new Set(["mp4","mov","m4v","webm","mkv","avi","mpeg","mpg","3gp","3g2","mts","m2ts"]);

type UploadKind="image"|"video";
type UploadItem={id:string;file:File;kind:UploadKind;progress:number;status:"ready"|"uploading"|"done"|"error";error?:string};

type UploadedMedia={kind:UploadKind;url:string;path:string;file:File;sortOrder:number};

function extOf(file:File){return (file.name.split(".").pop()||"").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin"}
function validMedia(file:File,kind:UploadKind){
 const ext=extOf(file);
 return kind==="image" ? (file.type.startsWith("image/")||IMAGE_EXT.has(ext)) : (file.type.startsWith("video/")||VIDEO_EXT.has(ext));
}
function b64(v:string){try{return btoa(unescape(encodeURIComponent(v)))}catch{return btoa(v)}}
function formatBytes(n:number){if(!n)return"0 B";const u=["B","KB","MB","GB"];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3);return `${(n/1024**i).toFixed(i?1:0)} ${u[i]}`}

export function AdminProductForm(){
 const [name,setName]=useState(""); const [price,setPrice]=useState(""); const [cost,setCost]=useState(""); const [stock,setStock]=useState("0"); const [category,setCategory]=useState("Ropa"); const [description,setDescription]=useState("");
 const [images,setImages]=useState<UploadItem[]>([]); const [videos,setVideos]=useState<UploadItem[]>([]); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 const totalBytes=useMemo(()=>[...images,...videos].reduce((n,x)=>n+x.file.size,0),[images,videos]);

 function addFiles(kind:UploadKind,files:FileList|null){
  if(!files)return;
  const incoming=Array.from(files).filter(f=>validMedia(f,kind));
  const rejected=Array.from(files).length-incoming.length;
  const setter=kind==="image"?setImages:setVideos;
  const max=kind==="image"?MAX_IMAGES:MAX_VIDEOS;
  setter(prev=>{
   const room=Math.max(0,max-prev.length);
   const accepted=incoming.slice(0,room).map(file=>({id:crypto.randomUUID(),file,kind,progress:0,status:"ready" as const}));
   if(rejected||incoming.length>room) setMsg(`⚠️ Se aceptan hasta ${max} ${kind==="image"?"imágenes":"videos"}. ${rejected?"Algún archivo no fue reconocido como multimedia.":""}`.trim());
   return [...prev,...accepted];
  });
 }
 function removeFile(kind:UploadKind,id:string){(kind==="image"?setImages:setVideos)(prev=>prev.filter(x=>x.id!==id))}
 function updateItem(kind:UploadKind,id:string,patch:Partial<UploadItem>){(kind==="image"?setImages:setVideos)(prev=>prev.map(x=>x.id===id?{...x,...patch}:x))}

 async function tusUpload(s:ReturnType<typeof createClient>, productId:string, item:UploadItem, sortOrder:number):Promise<UploadedMedia>{
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const apiKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
  if(!apiKey) throw new Error("Falta la clave pública de Supabase para cargar archivos.");
  const projectId=new URL(supabaseUrl).hostname.split(".")[0];
  const endpoint=`https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  const ext=extOf(item.file);
  const path=`${productId}/${item.kind}/${String(sortOrder).padStart(2,"0")}-${crypto.randomUUID()}.${ext}`;
  const {data:{session}}=await s.auth.getSession();
  if(!session?.access_token) throw new Error("Tu sesión de administrador venció. Volvé a ingresar y reintentá.");
  const authHeaders={authorization:`Bearer ${session.access_token}`,apikey:apiKey};
  const contentType=item.file.type||`${item.kind}/unknown`;
  const metadata=[
   ["bucketName","productos"],["objectName",path],["contentType",contentType],["cacheControl","31536000"]
  ].map(([k,v])=>`${k} ${b64(v)}`).join(",");
  const onProgress=(progress:number)=>updateItem(item.kind,item.id,{progress,status:progress>=100?"done":"uploading"});
  updateItem(item.kind,item.id,{status:"uploading",progress:0,error:undefined});
  const create=await fetch(endpoint,{method:"POST",headers:{...authHeaders,"Tus-Resumable":"1.0.0","Upload-Length":String(item.file.size),"Upload-Metadata":metadata,"x-upsert":"false"}});
  if(!create.ok) throw new Error(`No se pudo iniciar la carga (${create.status}).`);
  const uploadUrl=create.headers.get("location"); if(!uploadUrl) throw new Error("Supabase no devolvió la URL de carga.");
  let offset=0;
  while(offset<item.file.size){
   const end=Math.min(offset+TUS_CHUNK,item.file.size); const chunk=item.file.slice(offset,end); let ok=false; let last="";
   for(const delay of [0,1000,3000,5000]){
    if(delay) await new Promise(r=>setTimeout(r,delay));
    try{
     const patch=await fetch(uploadUrl,{method:"PATCH",headers:{...authHeaders,"Tus-Resumable":"1.0.0","Upload-Offset":String(offset),"Content-Type":"application/offset+octet-stream"},body:chunk});
     if(patch.ok){offset=Number(patch.headers.get("Upload-Offset")||end);ok=true;break;} last=`HTTP ${patch.status}`;
    }catch(e:any){last=e?.message||"Error de red"}
   }
   if(!ok) throw new Error(`La carga se interrumpió: ${last}. Podés reintentar sin perder el formulario.`);
   const progress=Math.min(100,Math.round((offset/item.file.size)*100));
   onProgress(progress);
  }
  const {data}=s.storage.from("productos").getPublicUrl(path);
  return {kind:item.kind,url:data.publicUrl,path,file:item.file,sortOrder};
 }

 async function save(e:React.FormEvent){
  e.preventDefault(); if(busy)return; setBusy(true); setMsg("");
  const s=createClient(); const productId=crypto.randomUUID(); const uploaded:UploadedMedia[]=[];
  try{
   for(let i=0;i<images.length;i++) uploaded.push(await tusUpload(s,productId,images[i],i));
   for(let i=0;i<videos.length;i++) uploaded.push(await tusUpload(s,productId,videos[i],i));
   const firstImage=uploaded.find(x=>x.kind==="image")?.url||null;
   const firstVideo=uploaded.find(x=>x.kind==="video")?.url||null;
   const {error:productError}=await s.from("products").insert({id:productId,name,price:Number(price),cost:Number(cost||0),stock:Number(stock||0),category,description,image_url:firstImage,video_url:firstVideo,active:true});
   if(productError) throw productError;
   if(uploaded.length){
    const rows=uploaded.map(x=>({product_id:productId,media_type:x.kind,url:x.url,storage_path:x.path,mime_type:x.file.type||null,original_name:x.file.name,size_bytes:x.file.size,sort_order:x.sortOrder,is_primary:x.kind==="image"&&x.sortOrder===0}));
    const {error:mediaError}=await s.from("product_media").insert(rows); if(mediaError) throw mediaError;
   }
   setMsg(`✅ Producto guardado con ${images.length} imagen(es) y ${videos.length} video(s).`);
   setName("");setPrice("");setCost("");setStock("0");setDescription("");setImages([]);setVideos([]);
  }catch(err:any){
   if(uploaded.length) await s.storage.from("productos").remove(uploaded.map(x=>x.path)).catch(()=>{});
   await s.from("products").delete().eq("id",productId).catch(()=>{});
   const all=[...images,...videos]; all.filter(x=>x.status==="uploading").forEach(x=>updateItem(x.kind,x.id,{status:"error",error:err?.message||"Error"}));
   setMsg("❌ "+(err?.message||"No se pudo guardar el producto."));
  } finally{setBusy(false)}
 }

 const renderFiles=(items:UploadItem[],kind:UploadKind)=><div className="media-upload-list">{items.map((item,i)=><div className={`media-upload-item ${item.status}`} key={item.id}>
  <div className="media-upload-icon">{kind==="image"?"🖼️":"🎬"}</div><div className="media-upload-info"><b>{i===0&&kind==="image"?"Portada · ":""}{item.file.name}</b><small>{formatBytes(item.file.size)} · {item.file.type||"formato detectado por extensión"}</small><div className="upload-progress"><i style={{width:`${item.progress}%`}}/></div><small>{item.status==="uploading"?`${item.progress}% cargado`:item.status==="done"?"Carga completa":item.status==="error"?item.error||"Error":"Listo para subir"}</small></div><button type="button" disabled={busy} onClick={()=>removeFile(kind,item.id)} aria-label="Quitar archivo">×</button>
 </div>)}</div>;

 return <form onSubmit={save} className="product-form product-form-pro">
  <label>Nombre del producto*<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Cocina infrarroja doble hornalla"/></label>
  <div className="twocol"><label>Precio*<input required inputMode="numeric" value={formatGs(price)} onChange={e=>setPrice(String(parseGs(e.target.value)))} placeholder="Ej. 120.000"/></label><label>Costo<input inputMode="numeric" value={formatGs(cost)} onChange={e=>setCost(String(parseGs(e.target.value)))} placeholder="0"/></label></div>
  <div className="twocol"><label>Stock<input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)}/></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Ropa</option><option>Hogar</option><option>Electro</option><option>Belleza</option><option>Otros</option></select></label></div>
  <label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Características, medidas, beneficios, contenido..."/></label>

  <section className="media-upload-zone"><div className="media-upload-head"><div><small>MULTIMEDIA</small><h3>Imágenes del producto</h3><p>Sin límite de cantidad. La primera imagen será la portada.</p></div><b>{images.length}</b></div>
   <label className="upload upload-multiple">📷 Seleccionar imágenes<input type="file" multiple accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.jfif" disabled={busy} onChange={e=>{addFiles("image",e.target.files);e.currentTarget.value=""}}/><span>Podés elegir varias de una vez desde la galería del teléfono.</span></label>
   {renderFiles(images,"image")}
  </section>

  <section className="media-upload-zone"><div className="media-upload-head"><div><small>MULTIMEDIA</small><h3>Videos del producto</h3><p>Sin límite de cantidad. La carga usa fragmentos reintentables para archivos grandes.</p></div><b>{videos.length}</b></div>
   <label className="upload upload-multiple">🎥 Seleccionar videos<input type="file" multiple accept="video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi,.mpeg,.mpg,.3gp,.3g2,.mts,.m2ts" disabled={busy} onChange={e=>{addFiles("video",e.target.files);e.currentTarget.value=""}}/><span>Sin límite artificial de la app: se respeta el máximo global de tu plan de Supabase.</span></label>
   {renderFiles(videos,"video")}
  </section>
  <div className="media-upload-summary"><b>{images.length+videos.length} archivo(s)</b><span>{formatBytes(totalBytes)} seleccionados</span></div>
  <button className="btn" disabled={busy}>{busy?"Subiendo y guardando...":"Guardar producto"}</button>{msg&&<p className="product-form-message">{msg}</p>}
 </form>;
}
