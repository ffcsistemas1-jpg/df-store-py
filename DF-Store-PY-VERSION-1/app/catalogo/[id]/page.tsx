import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "../../../lib/products";
import { AddToCartButton } from "../../ui";
import ProductViewTracker from "./product-view-tracker";

export default async function Product({params}:{params:Promise<{id:string}>}){
 const p=await getProduct((await params).id); if(!p)notFound();
 return (
  <section className="product-detail-page">
   <ProductViewTracker id={p.id}/>
   <Link className="back" href="/catalogo">← Volver al catálogo</Link>
   <div className="detail">
    <div className="product-media-column">
     <div className="pic big">
      {p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}
     </div>
     {p.video_url&&<video src={p.video_url} controls playsInline className="product-video"/>}
     <div className="product-actions-below">
      <AddToCartButton p={p}/>
     </div>
    </div>
    <div className="product-info-column">
     <small>{p.category}</small>
     <h1>{p.name}</h1>
     <div className="price">₲ {Number(p.price).toLocaleString("es-PY")}</div>
     <p>{p.description||"Producto disponible en DF Store PY."}</p>
     <p><b>Stock:</b> {p.stock ?? "Consultar"}</p>
    </div>
   </div>
   <style jsx>{`
    .product-detail-page { max-width: 1180px; margin: 0 auto; }
    .product-media-column, .product-info-column { min-width: 0; }
    .product-actions-below { margin-top: 20px; }
    .product-actions-below :global(.cart-actions) { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
    .product-actions-below :global(.cart-actions .btn) { width: 100%; min-height: 54px; margin: 0; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 16px; }
    @media (max-width: 800px) {
      .product-detail-page { margin-top: 24px; }
      .product-actions-below { margin-top: 16px; }
      .product-actions-below :global(.cart-actions) { grid-template-columns: 1fr 1fr; gap: 10px; }
      .product-actions-below :global(.cart-actions .btn) { min-height: 58px; padding: 12px 10px; }
    }
    @media (max-width: 430px) {
      .product-actions-below :global(.cart-actions) { grid-template-columns: 1fr; }
    }
   `}</style>
  </section>
 );
}
