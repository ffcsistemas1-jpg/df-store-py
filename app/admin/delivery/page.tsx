"use client";
import {useEffect,useState} from "react";
import {createClient} from "../../../lib/supabase/client";

type Zone={id:string;department:string;city:string|null;neighborhood:string|null;fee:number;active:boolean};
type CoverageCity={city:string;department:string};
const money=(n:number)=>`₲ ${Number(n||0).toLocaleString("es-PY")}`;

const COVERAGE:CoverageCity[]=[
 {city:"Asunción",department:"Asunción"},
 {city:"Areguá",department:"Central"},
 {city:"Capiatá",department:"Central"},
 {city:"Fernando de la Mora",department:"Central"},
 {city:"Guarambaré",department:"Central"},
 {city:"Itá",department:"Central"},
 {city:"Itauguá",department:"Central"},
 {city:"J. Augusto Saldívar",department:"Central"},
 {city:"Lambaré",department:"Central"},
 {city:"Limpio",department:"Central"},
 {city:"Luque",department:"Central"},
 {city:"Mariano Roque Alonso",department:"Central"},
 {city:"Nueva Italia",department:"Central"},
 {city:"Ñemby",department:"Central"},
 {city:"San Antonio",department:"Central"},
 {city:"San Lorenzo",department:"Central"},
 {city:"Villa Elisa",department:"Central"},
 {city:"Villeta",department:"Central"},
 {city:"Ypacaraí",department:"Central"},
 {city:"Villa Hayes",department:"Presidente Hayes"},
];

export default function Delivery(){
 const [zones,setZones]=useState<Zone[]>([]); const [loading,setLoading]=useState(true); const [msg,setMsg]=useState("");
 const [editingCity,setEditingCity]=useState<string|null>(null); const [fee,setFee]=useState(""); const [saving,setSaving]=useState(false);
 const [showAdd,setShowAdd]=useState(false);
 const [form,setForm]=useState({department:"Central",city:"",neighborhood:"",fee:"",active:true});
 const s=createClient();
 async function load(){setLoading(true);const {data,error}=await s.from("delivery_zones").select("id,department,city,neighborhood,fee,active").order("department").order("city").order("neighborhood");if(error)setMsg("❌ "+error.message);else setZones((data||[]) as Zone[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 function cityZone(city:string){return zones.find(z=>z.city===city && !z.neighborhood)||null}
 function startEdit(c:CoverageCity){const z=cityZone(c.city);setEditingCity(c.city);setFee(z?String(z.fee):"");setMsg("")}
 function cancelEdit(){setEditingCity(null);setFee("")}
 async function saveCity(c:CoverageCity){
   const value=Number(fee); if(!Number.isFinite(value)||value<0){setMsg("❌ Ingresá una tarifa válida.");return}
   setSaving(true);setMsg("");const z=cityZone(c.city);
   const r=z?await s.from("delivery_zones").update({department:c.department,city:c.city,neighborhood:null,fee:value,active:true}).eq("id",z.id):await s.from("delivery_zones").insert({department:c.department,city:c.city,neighborhood:null,fee:value,active:true});
   if(r.error)setMsg("❌ "+r.error.message);else{setMsg(`✅ Tarifa de ${c.city} guardada.`);cancelEdit();await load()}setSaving(false)
 }
 function resetForm(){setForm({department:"Central",city:"",neighborhood:"",fee:"",active:true})}
 async function addZone(e:React.FormEvent){e.preventDefault();setMsg("");const value=Number(form.fee);if(!form.city.trim()||!Number.isFinite(value)||value<0){setMsg("❌ Ciudad y costo válido son obligatorios.");return}const payload={department:form.department.trim(),city:form.city.trim()||null,neighborhood:form.neighborhood.trim()||null,fee:value,active:form.active};const r=await s.from("delivery_zones").insert(payload);if(r.error)setMsg("❌ "+r.error.message);else{setMsg("✅ Zona agregada.");resetForm();setShowAdd(false);load()}}
 async function toggle(z:Zone){const {error}=await s.from("delivery_zones").update({active:!z.active}).eq("id",z.id);if(error)setMsg("❌ "+error.message);else load()}
 async function remove(z:Zone){if(!confirm(`¿Eliminar la zona ${z.city||z.department}${z.neighborhood?" / "+z.neighborhood:""}?`))return;const {error}=await s.from("delivery_zones").delete().eq("id",z.id);if(error)setMsg("❌ "+error.message);else load()}
 const extras=zones.filter(z=>!COVERAGE.some(c=>c.city===z.city)||!!z.neighborhood);
 return <section><div className="title"><div><small>LOGÍSTICA</small><h1>Delivery</h1></div></div>
 <div className="panel delivery-simple"><h2>Tarifas de Asunción y Central</h2><p className="muted">Acá configurás el monto de delivery de cada ciudad. Tocá el ✏️ para cambiar la tarifa.</p>
 {msg&&<p>{msg}</p>}
 {loading?<p>Cargando...</p>:<div className="delivery-city-list">{COVERAGE.map(c=>{const z=cityZone(c.city);const editing=editingCity===c.city;return <div className="delivery-city-row" key={c.city}><div><strong>{c.city}</strong><small>{z?.active===false?"Inactiva":"Delivery disponible"}</small></div>{editing?<div className="delivery-fee-edit"><span>₲</span><input autoFocus type="number" min="0" step="1" value={fee} onChange={e=>setFee(e.target.value)} placeholder="20000"/><button className="btn" disabled={saving} onClick={()=>saveCity(c)}>{saving?"Guardando...":"Guardar"}</button><button className="linkbtn" onClick={cancelEdit}>Cancelar</button></div>:<div className="delivery-fee"><strong>{z?money(z.fee):"Sin tarifa"}</strong><button className="edit-pencil" aria-label={`Editar tarifa de ${c.city}`} onClick={()=>startEdit(c)}>✏️</button></div>}</div>})}</div>}
 </div>
 <div className="panel"><div className="title"><div><h2>Agregar zona</h2><p className="muted">Usalo si más adelante querés agregar una ciudad o una tarifa específica por barrio.</p></div><button className="btn" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"Cerrar":"+ Agregar zona"}</button></div>
 {showAdd&&<form onSubmit={addZone} className="formgrid"><div><label>Departamento*<input required value={form.department} onChange={e=>setForm({...form,department:e.target.value})} placeholder="Central"/></label><label>Ciudad*<input required value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Luque"/></label><label>Barrio (opcional)<input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})} placeholder="Centro"/></label><label>Costo de delivery*<input required type="number" min="0" step="1" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})} placeholder="20000"/></label><label className="check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Zona activa</label><div className="actions"><button className="btn">Agregar zona</button></div></div></form>}
 </div>
 {extras.length>0&&<div className="panel"><h2>Zonas adicionales</h2><p className="muted">Estas son configuraciones especiales que ya existen, por ejemplo tarifas por barrio.</p><div className="tablewrap"><table><thead><tr><th>Ciudad</th><th>Barrio</th><th>Tarifa</th><th>Estado</th><th></th></tr></thead><tbody>{extras.map(z=><tr key={z.id}><td>{z.city||"—"}</td><td>{z.neighborhood||"Todos"}</td><td>{money(z.fee)}</td><td>{z.active?"Activa":"Inactiva"}</td><td><button className="linkbtn" onClick={()=>{setEditingCity(null);window.scrollTo({top:0,behavior:"smooth"})}}>Ver arriba</button> <button className="linkbtn" onClick={()=>toggle(z)}>{z.active?"Desactivar":"Activar"}</button> <button className="linkbtn danger" onClick={()=>remove(z)}>Eliminar</button></td></tr>)}</tbody></table></div></div>}
 </section>
}
