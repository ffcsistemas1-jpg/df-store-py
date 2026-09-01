import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "../../../lib/products";
export default async function Product({params}:{params:Promise<{id:string}>}){
 const p=await getProduct((await params).id); if(!p)notFound();
 return <section><Link className="back" href="/catalogo">← Volver al catálogo</Link><div className="detail"><div className="pic big">{p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}</div>{p.video_url&&<video src={p.video_url} controls playsInline className="pic big"/>}<div><small>{p.category}</small><h1>{p.name}</h1><div className="price">₲ {Number(p.price).toLocaleString("es-PY")}</div><p>{p.description||"Producto disponible en DF Store PY."}</p><p><b>Stock:</b> {p.stock ?? "Consultar"}</p><Link className="btn" href="/carrito">Agregar al carrito</Link></div></div></section>;
}