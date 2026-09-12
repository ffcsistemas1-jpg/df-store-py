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
 return {title,description,openGraph:{title,description,images,type:"website"},twitter:{card:"summary_large_image",title,description,images:p.image_url?[p.image_url]:undefined}};
}

export default async function Product({params}:{params:Promise<{id:string}>}){
 const p=await getProduct((await params).id); if(!p)notFound();
 return <section className="product-detail-page">
  <ProductViewTracker id={p.id} name={p.name} price={p.price}/>
  <Link className="back" href="/catalogo">← Volver al catálogo</Link>
  <div className="product-detail-layout">
   <div className="product-detail-media"><ProductMediaGallery name={p.name} media={p.product_media||[]}/></div>
   <div className="product-detail-info">
    <small>{p.category}</small>
    <h1>{p.name}</h1>
    <div className="price">₲ {Number(p.price).toLocaleString("es-PY")}</div>
    <div className="product-actions" aria-label="Acciones de compra">
      <AddToCartButton p={p}/>
    </div>
    <p className="product-stock"><b>Stock:</b> {p.stock ?? "Consultar"}</p>
    <div className="product-description-section">
      <h2>Descripción del producto</h2>
      <p className="product-description">{p.description||"Producto disponible en DF Store PY."}</p>
    </div>
   </div>
  </div>
  <style dangerouslySetInnerHTML={{__html:`
    .product-detail-page{max-width:1180px;margin:45px auto;padding:0 24px}
    .product-detail-page .back{display:inline-block;margin-bottom:22px;color:#98234d;font-weight:800}
    .product-detail-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:38px;align-items:start}
    .product-detail-media,.product-detail-info{min-width:0}
    .product-detail-info{background:#fff;border:1px solid #eadfe0;border-radius:18px;padding:28px}
    .product-detail-info h1{font-size:clamp(32px,4vw,52px);line-height:1.05;margin:12px 0}
    .product-detail-info .price{font-size:30px;font-weight:900;color:#98234d;margin:16px 0 20px}
    .product-actions{display:block;width:100%;margin:0 0 20px;position:relative;z-index:2}
    .product-actions button,.product-actions a{min-height:54px}
    .product-stock{font-size:16px;margin:0 0 24px}
    .product-description-section{border-top:1px solid #eee4e6;padding-top:22px}
    .product-description-section h2{font-size:22px;margin:0 0 12px;color:#282326}
    .product-description{font-size:17px;line-height:1.65;color:#5c5557;white-space:pre-line;overflow-wrap:anywhere;margin:0}
    @media(max-width:700px){
      .product-detail-page{margin:24px auto;padding:0 16px}
      .product-detail-layout{grid-template-columns:1fr;gap:20px}
      .product-detail-info{padding:20px}
      .product-detail-info h1{font-size:36px}
      .product-detail-info .price{font-size:26px}
      .product-actions{margin-bottom:18px}
      .product-actions button,.product-actions a{width:100%;min-height:56px}
      .product-description-section h2{font-size:20px}
    }
  `}} />
 </section>;
}
