import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "../../../lib/products";
import { AddToCartButton } from "../../ui";
import ProductViewTracker from "./product-view-tracker";
import ProductMediaGallery from "./product-media-gallery";

export async function generateMetadata({params}:{params:Promise<{id:string}>}){
 const p=await getProduct((await params).id);
 if(!p) return { title: "Producto no encontrado — DF Store PY" };
 const title=`${p.name} — DF Store PY`;
 const description=p.description||`${p.name} disponible en DF Store PY. Todo lo que buscan en un solo lugar.`;
 const images=p.image_url?[{url:p.image_url}]:undefined;
 return {
  title, description,
  openGraph:{title,description,images,type:"website"},
  twitter:{card:"summary_large_image",title,description,images:p.image_url?[p.image_url]:undefined},
 };
}

export default async function Product({params}:{params:Promise<{id:string}>}){
 const p=await getProduct((await params).id); if(!p)notFound();
 return <section><ProductViewTracker id={p.id} name={p.name} price={p.price}/><Link className="back" href="/catalogo">← Volver al catálogo</Link><div className="detail"><div><ProductMediaGallery name={p.name} media={p.product_media||[]}/></div><div><small>{p.category}</small><h1>{p.name}</h1><div className="price">₲ {Number(p.price).toLocaleString("es-PY")}</div><p>{p.description||"Producto disponible en DF Store PY."}</p><p><b>Stock:</b> {p.stock ?? "Consultar"}</p><AddToCartButton p={p}/></div></div></section>;
}
