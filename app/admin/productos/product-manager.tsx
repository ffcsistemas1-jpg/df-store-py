"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "../../../lib/supabase/client";
import {formatGs,parseGs} from "../../../lib/format-gs";

const MAX_IMAGES=Infinity;
const IMAGE_EXT=new Set(["jpg","jpeg","png","webp","avif","gif","heic","heif","bmp","tif","tiff","jfif"]);

type Product={id:string;name:string;price:number;cost:number|null;stock:number;category:string|null;description:string|null;image_url:string|null;video_url:string|null;active:boolean;created_at:string;updated_at:string};
type PendingImage={id:string;file:File;progress:number;status:"ready"|"uploading"|"done"|"error";error?:string};

function extOf(file:File){return (file.name.split(".").pop()||"").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin"}
function validImage(file:File){const ext=extOf(file);return file.type.startsWith("image/")||IMAGE_EXT.has(ext)}

export function ProductManager({initialProducts}:{initialProducts:Product[]}){
 const [products,setProducts]=useState(initialProducts); const [q,setQ]=useState(""); const [filter,setFilter]=useState("todos"); const [editing,setEditing]=useState<Product|null>(null); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 const shown=useMemo(()=>products.filter(p=>{const text=`${p.name} ${p.category||""}`.toLowerCase(); const ok=text.includes(q.toLowerCase()); const st=filter==="todos"|| (filter==="activos"&&p.active)||(filter==="inactivos"&&!p.active)||(filter==="bajo"&&p.stock<=5); return ok&&st}),[products,q,filter]);
 async function toggle(p:Product){setBusy(true);setMsg("");try{const s=createClient();const {error}=await s.from("products").update({active:!p.active,updated_at:new Date().toISOString()}).eq("id",p.id);if(error)throw error;setProducts(x=>x.map(a=>a.id===p.id?{...a,active:!p.active}:a));}catch(e:any){setMsg("❌ "+(e?.message||"No se pudo actualizar"))}finally{setBusy(false)}}
 async function remove(p:Product){if(!confirm(`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`))return;setBusy(true);setMsg("");try{const s=createClient();const {error}=await s.from("products").delete().eq("id",p.id);if(error)throw error;setProducts(x=>x.filter(a=>a.id!==p.id));if(editing?.id===p.id)setEditing(null);}catch(e:any){setMsg("❌ "+(e?.message||"No se pudo eliminar"))}finally{setBusy(false)}}
 async function save(p:Product){setBusy(true);setMsg("");try{const s=createClient();const payload={name:p.name,price:Number(p.price)||0,cost:Number(p.cost)||0,stock:Math.max(0,Math.floor(Number(p.stock)||0)),category:p.category||null,description:p.description||null,image_url:p.image_url||null,video_url:p.video_url||null,active:!!p.active,updated_at:new Date().toISOString()};const {data,error}=await s.from("products").update(payload).eq("id",p.id).select().single();if(error)throw error;setProducts(x=>x.map(a=>a.id===p.id?{...a,...data}:a));setEditing(null);setMsg("✅ Producto actualizado.");}catch(e:any){setMsg("❌ "+(e?.message||"No se pudo guardar"))}finally{setBusy(false)}}
 function onMediaAdded(productId:string,firstImageUrl:string|null){if(!firstImageUrl)return;setProducts(x=>x.map(a=>a.id===productId&&!a.image_url?{...a,image_url:firstImageUrl}:a))}
 return <>
  <div className="panel product-toolbar"><div className="twocol"><label>Buscar producto<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nombre o categoría"/></label><label>Filtrar<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="bajo">Stock bajo (≤ 5)</option></select></label></div><p className="muted">{shown.length} producto(s) mostrado(s) · {products.filter(p=>p.active).length} activo(s).</p></div>
  {msg&&<div className="panel">{msg}</div>}
  <div className="admin-products">{shown.map(p=><article className="panel admin-product" key={p.id}>
    <div className="admin-product-media">{p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}</div>
    <div className="admin-product-main"><div className="admin-product-top"><div><small>{p.category||"Sin categoría"}</small><h2>{p.name}</h2></div><span className={p.active?"status active":"status"}>{p.active?"Activo":"Inactivo"}</span></div><div className="admin-product-data"><div><span>Precio</span><b>₲ {Number(p.price).toLocaleString("es-PY")}</b></div><div><span>Costo</span><b>₲ {Number(p.cost||0).toLocaleString("es-PY")}</b></div><div><span>Stock</span><b className={p.stock<=5?"low-stock":""}>{p.stock}</b></div></div><div className="actions"><button className="btn" disabled={busy} onClick={()=>setEditing(p)}>Editar</button><button className="btn secondary" disabled={busy} onClick={()=>toggle(p)}>{p.active?"Desactivar":"Activar"}</button><button className="linkbtn danger" disabled={busy} onClick={()=>remove(p)}>Eliminar</button></div></div>
  </article>)}</div>
  {!shown.length&&<div className="empty">No encontramos productos con ese filtro.</div>}
  {editing&&<EditProduct product={editing} busy={busy} onCancel={()=>setEditing(null)} onSave={save} onMediaAdded={onMediaAdded}/>}
 </>;
}

function EditProduct({product,busy,onCancel,onSave,onMediaAdded}:{product:Product;busy:boolean;onCancel:()=>void;onSave:(p:Product)=>void;onMediaAdded:(productId:string,firstImageUrl:string|null)=>void}){
 const [p,setP]=useState(product); const set=(k:keyof Product,v:any)=>setP(x=>({...x,[k]:v}));
 const [existingCount,setExistingCount]=useState<number|null>(null);
 const [pending,setPending]=useState<PendingImage[]>([]);
 const [uploading,setUploading]=useState(false);
 const [galleryMsg,setGalleryMsg]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   const s=createClient();
   const {count}=await s.from("product_media").select("id",{count:"exact",head:true}).eq("product_id",product.id).eq("media_type","image");
   if(active) setExistingCount(count||0);
  })();
  return ()=>{active=false};
 },[product.id]);

 function addImages(files:FileList|null){
  if(!files)return;
  const incoming=Array.from(files).filter(validImage);
  const rejected=Array.from(files).length-incoming.length;
  setPending(prev=>{
   const room=Math.max(0,MAX_IMAGES-(existingCount||0)-prev.length);
   const accepted=incoming.slice(0,room).map(file=>({id:crypto.randomUUID(),file,progress:0,status:"ready" as const}));
   if(rejected) setGalleryMsg(`⚠️ Algún archivo no fue reconocido como imagen.`.trim());
   return [...prev,...accepted];
  });
 }
 function removePending(id:string){setPending(prev=>prev.filter(x=>x.id!==id))}

 async function uploadPending(){
  if(!pending.length||uploading)return;
  setUploading(true); setGalleryMsg("");
  const s=createClient();
  let sortOrder=existingCount||0;
  let firstUploadedUrl:string|null=null;
  for(const item of pending){
   setPending(prev=>prev.map(x=>x.id===item.id?{...x,status:"uploading"}:x));
   try{
    const ext=extOf(item.file);
    const path=`${product.id}/image/${String(sortOrder).padStart(2,"0")}-${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await s.storage.from("productos").upload(path,item.file,{contentType:item.file.type||undefined,upsert:false});
    if(uploadError) throw uploadError;
    const {data}=s.storage.from("productos").getPublicUrl(path);
    const isPrimary=!product.image_url && sortOrder===0;
    const {error:mediaError}=await s.from("product_media").insert({product_id:product.id,media_type:"image",url:data.publicUrl,storage_path:path,mime_type:item.file.type||null,original_name:item.file.name,size_bytes:item.file.size,sort_order:sortOrder,is_primary:isPrimary});
    if(mediaError) throw mediaError;
    if(!firstUploadedUrl) firstUploadedUrl=data.publicUrl;
    setPending(prev=>prev.map(x=>x.id===item.id?{...x,status:"done",progress:100}:x));
    sortOrder++;
   }catch(e:any){
    setPending(prev=>prev.map(x=>x.id===item.id?{...x,status:"error",error:e?.message||"Error al subir"}:x));
   }
  }
  setExistingCount(sortOrder);
  setPending(prev=>prev.filter(x=>x.status!=="done"));
  if(firstUploadedUrl){
   if(!product.image_url) set("image_url",firstUploadedUrl);
   onMediaAdded(product.id,firstUploadedUrl);
  }
  setGalleryMsg("✅ Fotos agregadas a la galería del producto.");
  setUploading(false);
 }

 return <div className="modal-backdrop"><div className="panel edit-modal"><div className="title"><div><small>EDITAR</small><h2>{p.name}</h2></div><button className="linkbtn" onClick={onCancel}>Cerrar ✕</button></div><label>Nombre<input value={p.name} onChange={e=>set("name",e.target.value)}/></label><div className="twocol"><label>Precio<input inputMode="numeric" value={formatGs(p.price)} onChange={e=>set("price",parseGs(e.target.value))}/></label><label>Costo<input inputMode="numeric" value={formatGs(p.cost||0)} onChange={e=>set("cost",parseGs(e.target.value))}/></label></div><div className="twocol"><label>Stock<input type="number" min="0" value={p.stock} onChange={e=>set("stock",e.target.value)}/></label><label>Categoría<select value={p.category||"Otros"} onChange={e=>set("category",e.target.value)}><option>Ropa</option><option>Hogar</option><option>Otros</option></select></label></div><label>Descripción<textarea value={p.description||""} onChange={e=>set("description",e.target.value)}/></label>

  <section className="media-upload-zone"><div className="media-upload-head"><div><small>GALERÍA</small><h3>Fotos del producto</h3><p>Sin límite de cantidad. Podés elegir varias de una vez.</p></div><b>{existingCount===null?"…":existingCount+pending.length}</b></div>
   <label className="upload upload-multiple">📷 Agregar fotos<input type="file" multiple accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.jfif" disabled={uploading} onChange={e=>{addImages(e.target.files);e.currentTarget.value=""}}/><span>Se agregan a la galería existente, no la reemplazan.</span></label>
   {pending.length>0&&<div className="media-upload-list">{pending.map(item=><div className={`media-upload-item ${item.status}`} key={item.id}>
     <div className="media-upload-icon">🖼️</div><div className="media-upload-info"><b>{item.file.name}</b><small>{item.status==="uploading"?"Subiendo...":item.status==="done"?"Carga completa":item.status==="error"?item.error||"Error":"Listo para subir"}</small></div><button type="button" disabled={uploading} onClick={()=>removePending(item.id)} aria-label="Quitar archivo">×</button>
    </div>)}</div>}
   {pending.length>0&&<button type="button" className="btn secondary" disabled={uploading} onClick={uploadPending}>{uploading?"Subiendo fotos...":`Subir ${pending.length} foto(s)`}</button>}
   {galleryMsg&&<p className="product-form-message">{galleryMsg}</p>}
  </section>

  <label>URL de foto de portada<input value={p.image_url||""} onChange={e=>set("image_url",e.target.value)} placeholder="https://..."/></label><label>URL de video<input value={p.video_url||""} onChange={e=>set("video_url",e.target.value)} placeholder="https://..."/></label><label className="check"><input type="checkbox" checked={p.active} onChange={e=>set("active",e.target.checked)}/> Producto activo</label><div className="actions"><button className="btn" disabled={busy} onClick={()=>onSave({...p,price:Number(p.price),cost:Number(p.cost||0),stock:Number(p.stock)})}>{busy?"Guardando...":"Guardar cambios"}</button><button className="btn secondary" disabled={busy} onClick={onCancel}>Cancelar</button></div></div></div>;
}
