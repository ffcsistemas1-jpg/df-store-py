"use client";
import {useEffect,useState} from "react";
import {createClient} from "../../../lib/supabase/client";

type Zone={id:string;department:string;city:string|null;neighborhood:string|null;fee:number;active:boolean};
const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;

export default function Delivery(){
 const [zones,setZones]=useState<Zone[]>([]); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
 const [form,setForm]=useState({department:"",city:"",neighborhood:"",fee:"",active:true});
 const [editing,setEditing]=useState<string|null>(null); const s=createClient();
 async function load(){setLoading(true);const {data,error}=await s.from("delivery_zones").select("id,department,city,neighborhood,fee,active").order("department").order("city").order("neighborhood");if(error)setMsg("❌ "+error.message);else setZones((data||[]) as Zone[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 function reset(){setForm({department:"",city:"",neighborhood:"",fee:"",active:true});setEditing(null)}
 function edit(z:Zone){setEditing(z.id);setForm({department:z.department,city:z.city||"",neighborhood:z.neighborhood||"",fee:String(z.fee||0),active:z.active});window.scrollTo({top:0,behavior:"smooth"})}
 async function save(e:React.FormEvent){e.preventDefault();setMsg("");const fee=Number(form.fee);if(!form.department.trim()||!Number.isFinite(fee)||fee<0){setMsg("❌ Departamento y costo válido son obligatorios.");return}const payload={department:form.department.trim(),city:form.city.trim()||null,neighborhood:form.neighborhood.trim()||null,fee,active:form.active};const r=editing?await s.from("delivery_zones").update(payload).eq("id",editing):await s.from("delivery_zones").insert(payload);if(r.error)setMsg("❌ "+r.error.message);else{setMsg(editing?"✅ Zona actualizada.":"✅ Zona agregada.");reset();load()}}
 async function toggle(z:Zone){const {error}=await s.from("delivery_zones").update({active:!z.active}).eq("id",z.id);if(error)setMsg("❌ "+error.message);else load()}
 async function remove(z:Zone){if(!confirm(`¿Eliminar la zona ${z.department}${z.city?" / "+z.city:""}${z.neighborhood?" / "+z.neighborhood:""}?`))return;const {error}=await s.from("delivery_zones").delete().eq("id",z.id);if(error)setMsg("❌ "+error.message);else load()}
 return <section><div className="title"><div><small>LOGÍSTICA</small><h1>Delivery y zonas</h1></div></div>
 <div className="panel"><h2>{editing?"Editar zona":"Agregar zona"}</h2><p className="muted">Podés configurar una tarifa general por departamento, por ciudad o una tarifa específica por barrio. El sistema usa la coincidencia más específica.</p>
 <form onSubmit={save} className="formgrid"><div><label>Departamento*<input required value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Central"/></label><label>Ciudad (opcional)<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Luque"/></label><label>Barrio (opcional)<input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})} placeholder="Centro"/></label><label>Costo de delivery*<input required type="number" min="0" step="1" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})} placeholder="20000"/></label><label className="check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Zona activa</label><div className="actions"><button className="btn">{editing?"Guardar cambios":"Agregar zona"}</button>{editing&&<button type="button" className="btn secondary" onClick={reset}>Cancelar</button>}</div></div></form>{msg&&<p>{msg}</p>}</div>
 <div className="panel"><h2>Zonas configuradas</h2>{loading?<p>Cargando...</p>:zones.length===0?<p className="muted">Todavía no hay zonas. Agregá la primera arriba.</p>:<div className="tablewrap"><table><thead><tr><th>Departamento</th><th>Ciudad</th><th>Barrio</th><th>Tarifa</th><th>Estado</th><th></th></tr></thead><tbody>{zones.map(z=><tr key={z.id}><td>{z.department}</td><td>{z.city||"Todas"}</td><td>{z.neighborhood||"Todos"}</td><td>{money(z.fee)}</td><td>{z.active?"Activa":"Inactiva"}</td><td><button className="linkbtn" onClick={()=>edit(z)}>Editar</button> <button className="linkbtn" onClick={()=>toggle(z)}>{z.active?"Desactivar":"Activar"}</button> <button className="linkbtn danger" onClick={()=>remove(z)}>Eliminar</button></td></tr>)}</tbody></table></div>}</div></section>
}
