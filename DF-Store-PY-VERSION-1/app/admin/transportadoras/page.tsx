"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "../../../lib/supabase/browser";
import {PARAGUAY_DEPARTAMENTOS} from "../../../lib/paraguay-geo";

type Company={id:string;name:string;phone:string|null;notes:string|null;active:boolean};
type Coverage={id:string;shipping_company_id:string;department:string};
const empty={name:"",phone:"",notes:"",active:true};

export default function Transportadoras(){
 const [items,setItems]=useState<Company[]>([]),[form,setForm]=useState(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState("");
 const [coverage,setCoverage]=useState<Coverage[]>([]);
 const [openZones,setOpenZones]=useState<string|null>(null);
 async function load(){
  setLoading(true); setMsg("");
  const s=createClient();
  const [{data,error},{data:cov,error:covErr}]=await Promise.all([
    s.from("shipping_companies").select("id,name,phone,notes,active").order("name"),
    s.from("shipping_coverage").select("id,shipping_company_id,department")
  ]);
  if(error)setMsg(error.message); else setItems((data||[]) as Company[]);
  if(covErr)setMsg(covErr.message); else setCoverage((cov||[]) as Coverage[]);
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function add(e:React.FormEvent){
  e.preventDefault(); setSaving(true); setMsg("");
  const s=createClient();
  const {error}=await s.from("shipping_companies").insert({name:form.name.trim(),phone:form.phone.trim()||null,notes:form.notes.trim()||null,active:true});
  if(error)setMsg(error.message); else {setForm(empty); await load();}
  setSaving(false);
 }
 async function toggle(x:Company){
  setMsg(""); const s=createClient(); const {error}=await s.from("shipping_companies").update({active:!x.active}).eq("id",x.id);
  if(error)setMsg(error.message); else setItems(v=>v.map(i=>i.id===x.id?{...i,active:!x.active}:i));
 }
 async function edit(x:Company){
  const name=window.prompt("Nombre de la transportadora",x.name); if(name===null)return;
  const phone=window.prompt("Teléfono (opcional)",x.phone||""); if(phone===null)return;
  const notes=window.prompt("Notas (opcional)",x.notes||""); if(notes===null)return;
  if(!name.trim()){setMsg("El nombre es obligatorio.");return;}
  const s=createClient(); const {error}=await s.from("shipping_companies").update({name:name.trim(),phone:phone.trim()||null,notes:notes.trim()||null}).eq("id",x.id);
  if(error)setMsg(error.message); else setItems(v=>v.map(i=>i.id===x.id?{...i,name:name.trim(),phone:phone.trim()||null,notes:notes.trim()||null}:i));
 }
 async function remove(x:Company){
  if(!window.confirm(`¿Eliminar ${x.name}? Los pedidos existentes conservarán su referencia, pero ya no podrá elegirse para nuevos pedidos.`))return;
  const s=createClient(); const {error}=await s.from("shipping_companies").delete().eq("id",x.id);
  if(error)setMsg(error.message); else setItems(v=>v.filter(i=>i.id!==x.id));
 }
 async function toggleCoverage(companyId:string, department:string, checked:boolean){
  const s=createClient();
  if(checked){
   const {data,error}=await s.from("shipping_coverage").insert({shipping_company_id:companyId,department}).select("id,shipping_company_id,department").single();
   if(error){setMsg(error.message);return;}
   setCoverage(v=>[...v,data as Coverage]);
  } else {
   const row=coverage.find(c=>c.shipping_company_id===companyId && c.department===department);
   if(!row)return;
   const {error}=await s.from("shipping_coverage").delete().eq("id",row.id);
   if(error){setMsg(error.message);return;}
   setCoverage(v=>v.filter(c=>c.id!==row.id));
  }
 }
 return <section>
  <div className="title"><div><small>ADMINISTRADOR</small><h1>Transportadoras</h1></div><Link href="/admin">← Admin</Link></div>
  {msg&&<div className="panel">⚠️ {msg}</div>}
  <div className="panel">
   <h2>Agregar transportadora</h2>
   <p className="muted">Las transportadoras activas aparecerán en el checkout cuando el cliente elija envío al interior.</p>
   <form className="product-form" onSubmit={add}>
    <div className="twocol">
     <label>Nombre*<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Multienvíos"/></label>
     <label>Teléfono / WhatsApp<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="09XX XXX XXX"/></label>
    </div>
    <label>Notas<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Horario, observaciones, etc."/></label>
    <button className="btn" disabled={saving}>{saving?"Guardando...":"+ Agregar transportadora"}</button>
   </form>
  </div>
  <div className="panel">
   <h2>Transportadoras configuradas</h2>
   <p className="muted">Marcá los departamentos que cubre cada transportadora. En el checkout, al elegir "Envío al interior" y un departamento, solo se muestran las transportadoras que lo cubren (si ninguna está configurada todavía para ese departamento, se muestran todas para no bloquear la compra).</p>
   {loading?<p className="muted">Cargando...</p>:!items.length?<div className="empty"><h3>No hay transportadoras</h3><p>Agregá la primera arriba.</p></div>:<div className="payment-list">{items.map(x=>{
    const covered=new Set(coverage.filter(c=>c.shipping_company_id===x.id).map(c=>c.department));
    return <div className="panel payment-row-col" key={x.id}>
     <div className="payment-row">
      <div><b>{x.name}</b> · {x.active?<span>Activa</span>:<span>Inactiva</span>}<br/>{x.phone&&<>📱 {x.phone}<br/></>}{x.notes&&<span className="muted">{x.notes}</span>}<br/><small className="muted">{covered.size?`Cubre: ${Array.from(covered).join(", ")}`:"Sin departamentos configurados (se muestra en todos por ahora)"}</small></div>
      <div className="actions"><button className="btn secondary" onClick={()=>setOpenZones(openZones===x.id?null:x.id)}>{openZones===x.id?"Cerrar zonas":"Zonas que cubre"}</button><button className="btn secondary" onClick={()=>toggle(x)}>{x.active?"Desactivar":"Activar"}</button><button className="btn secondary" onClick={()=>edit(x)}>Editar</button><button className="link-btn danger" onClick={()=>remove(x)}>Eliminar</button></div>
     </div>
     {openZones===x.id&&<div className="dept-grid">
      {PARAGUAY_DEPARTAMENTOS.map(d=><label key={d.name} className="dept-check"><input type="checkbox" checked={covered.has(d.name)} onChange={e=>toggleCoverage(x.id,d.name,e.target.checked)}/> {d.name}</label>)}
     </div>}
    </div>;
   })}</div>}
  </div>
 </section>
}
