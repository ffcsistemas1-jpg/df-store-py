import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminProductForm } from "./product-form";
import { createClient } from "../../lib/supabase/server";
export default async function Admin(){
 const s=await createClient();
 const {data:{user}}=await s.auth.getUser();
 if(!user) redirect("/admin/login");
 const {data:isAdmin}=await s.rpc("is_admin");
 if(!isAdmin) return <section><small>DF STORE PY</small><h1>Acceso denegado</h1><p>Tu cuenta ({user.email}) no tiene permisos de administrador.</p></section>;
 return <section><div className="title"><div><small>DF STORE PY</small><h1>Administrador</h1></div><Link className="btn" href="/">Ver tienda</Link></div>
 <div className="adminstats"><div><b>Pedidos</b><strong>—</strong></div><div><b>Ventas</b><strong>₲ —</strong></div><div><b>Stock bajo</b><strong>—</strong></div><div><b>Pagos pendientes</b><strong>—</strong></div></div>
 <div className="panel"><h2>➕ Nuevo producto</h2><p className="muted">Elegí la foto (y opcionalmente un video) desde tu computadora. El sistema los subirá al bucket <b>productos</b> y guardará el producto en Supabase.</p><AdminProductForm/></div>
 <div className="adminlinks">{["Pedidos","Clientes","Métodos de pago","Delivery y zonas","Transportadoras","Reportes","Notificaciones","Seguridad"].map((x,i)=><Link key={x} href={i===2?"/admin/pagos":i===4?"/admin/transportadoras":i===5?"/admin/reportes":i===6?"/admin/notificaciones":"/admin"} className="panel"><h3>{x}</h3><span>Gestionar →</span></Link>)}</div>
 </section>;
}
