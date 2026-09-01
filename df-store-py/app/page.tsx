import Link from "next/link";
import { ProductCard } from "./ui";
import { getProducts } from "../lib/products";
export default async function Home(){
 const ps=await getProducts();
 return <><section className="hero"><div><small>DF STORE PY</small><h1>Todo lo que buscan en un solo lugar.</h1><p>Ropa, hogar y productos seleccionados. Comprá de forma simple, rápida y segura.</p><Link className="btn" href="/catalogo">Ver catálogo</Link></div><div className="logo">DF<span>STORE PY</span></div></section>
 <section><div className="title"><div><small>DESTACADOS</small><h2>Productos</h2></div><Link href="/catalogo">Ver todos →</Link></div><div className="grid">{ps.slice(0,6).map(p=><ProductCard key={p.id} p={p}/>)}</div></section>
 <section className="benefits"><div>🚚 <b>Delivery</b><small>Central y zonas habilitadas</small></div><div>🚛 <b>Interior</b><small>Transportadoras</small></div><div>💳 <b>Pagos</b><small>Transferencia, recibir o Giro Tigo</small></div><div>📱 <b>WhatsApp</b><small>Atención directa</small></div></section></>;
}