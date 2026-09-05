import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { ProductManager } from "./product-manager";

export default async function ProductosAdmin(){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user) redirect("/admin/login");
  const {data:isAdmin}=await s.rpc("is_admin");
  if(!isAdmin) return <section><h1>Acceso denegado</h1></section>;
  const {data:products,error}=await s.from("products").select("id,name,price,cost,stock,category,description,image_url,video_url,active,created_at,updated_at").order("created_at",{ascending:false});
  return <section>
    <div className="title"><div><small>DF STORE PY</small><h1>Productos e inventario</h1></div><Link className="btn secondary" href="/admin">← Administrador</Link></div>
    {error ? <div className="panel"><b>No se pudieron cargar los productos.</b><p>{error.message}</p></div> : <ProductManager initialProducts={products||[]}/>} 
  </section>;
}
