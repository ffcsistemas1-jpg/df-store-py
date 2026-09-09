import Link from "next/link";
import { ProductCard, TrustBadges, MobileStorefront } from "./ui";
import { getProducts, getPromotions } from "../lib/products";

const categoryMeta:Record<string,{icon:string;label:string;description:string}>={
 Ropa:{icon:"👗",label:"Ropa",description:"Moda y conjuntos"},
 Hogar:{icon:"🏠",label:"Hogar",description:"Soluciones para tu casa"},
 Electro:{icon:"⚡",label:"Electro",description:"Prácticos para el día a día"},
 Belleza:{icon:"✨",label:"Belleza",description:"Cuidado y bienestar"},
};

export default async function Home(){
 const ps=await getProducts();
 const promos=await getPromotions();
 const categories=Array.from(new Set(ps.map(p=>String(p.category||"").trim()).filter(Boolean))).slice(0,4);
 const featured=ps.filter(p=>Number(p.stock)>0).slice(0,6);
 return <>
  <MobileStorefront products={ps} promotions={promos}/>
  <div className="desktop-home home-page">
   <section className="home-hero" aria-labelledby="home-title">
    <div className="home-hero-main">
     <div>
      <small>DF STORE PY · TODO PARAGUAY</small>
      <h1 id="home-title">Todo lo que buscás, en un solo lugar.</h1>
      <p>Moda, hogar y productos seleccionados con compra simple, atención humana y opciones de entrega para Asunción, Central e interior.</p>
      <div className="home-hero-actions">
       <Link className="btn" href="/catalogo">Ver catálogo</Link>
       <Link className="btn secondary" href="/catalogo?ofertas=1">Ver ofertas</Link>
      </div>
     </div>
    </div>
    <div className="home-hero-side" aria-label="Beneficios principales">
     <div className="hero-service-card accent"><div><div className="icon" aria-hidden="true">🚚</div><strong>Pagá al recibir</strong><p>Disponible en Asunción y zonas habilitadas de Central.</p></div><small>Delivery rápido y coordinado</small></div>
     <div className="hero-service-card"><div><div className="icon" aria-hidden="true">📦</div><strong>Envíos al interior</strong><p>Preparamos tu pedido para despacho mediante transportadora.</p></div><small>Todo Paraguay</small></div>
    </div>
   </section>

   <section className="home-trust" aria-label="Ventajas de comprar en DF Store PY"><TrustBadges/></section>

   {categories.length>0 && <section aria-labelledby="categorias-title">
    <div className="home-section-head"><div><small>EXPLORÁ LA TIENDA</small><h2 id="categorias-title">Comprá por categoría</h2><p>Encontrá más rápido lo que necesitás.</p></div><Link href="/catalogo">Ver catálogo completo →</Link></div>
    <div className="quick-categories">
     {categories.map(category=>{const meta=categoryMeta[category]||{icon:"🛍️",label:category,description:"Ver productos"};return <Link className="quick-category" key={category} href={`/catalogo?categoria=${encodeURIComponent(category)}`} aria-label={`Ver productos de ${category}`}><span className="qc-icon" aria-hidden="true">{meta.icon}</span><strong>{meta.label}</strong><span>{meta.description}</span></Link>})}
    </div>
   </section>}

   <section aria-labelledby="destacados-title">
    <div className="home-section-head"><div><small>LOS MÁS DESTACADOS</small><h2 id="destacados-title">Productos para vos</h2><p>Disponibilidad y precio visibles antes de comprar.</p></div><Link href="/catalogo">Ver todos →</Link></div>
    <div className="home-product-grid">{featured.map(p=><ProductCard key={p.id} p={p}/>)}</div>
   </section>

   {promos.length>0 && <section aria-labelledby="promos-title">
    <div className="home-section-head"><div><small>OPORTUNIDADES</small><h2 id="promos-title">Promociones de la semana</h2><p>Ofertas sujetas a stock.</p></div><Link href="/catalogo">Ver todas →</Link></div>
    <div className="home-promos">
     {promos.slice(0,4).map(promo=><article className="home-promo" key={promo.id}>
      {promo.image_url&&<img src={promo.image_url} alt="" loading="lazy"/>}
      <div className="home-promo-content">{promo.badge&&<small>{promo.badge}</small>}<h3>{promo.title}</h3>{promo.description&&<p>{promo.description}</p>}{promo.price_text&&<strong>{promo.price_text}</strong>}<div><Link className="btn" href={promo.category?`/catalogo?categoria=${encodeURIComponent(promo.category)}`:"/catalogo"}>{promo.cta_text||"Ver productos"} →</Link></div></div>
     </article>)}
    </div>
   </section>}

   <section aria-label="Opciones de compra" className="home-benefits">
    <div className="home-benefit"><span className="icon" aria-hidden="true">🚚</span><b>Delivery</b><span>Asunción y Central en zonas habilitadas.</span></div>
    <div className="home-benefit"><span className="icon" aria-hidden="true">📦</span><b>Envíos al interior</b><span>Despacho por transportadora.</span></div>
    <div className="home-benefit"><span className="icon" aria-hidden="true">💳</span><b>Formas de pago</b><span>Recibir, transferencia o Giro Tigo.</span></div>
    <div className="home-benefit"><span className="icon" aria-hidden="true">💬</span><b>Atención directa</b><span>Te ayudamos por WhatsApp.</span></div>
   </section>

   <section className="home-steps" aria-labelledby="pasos-title">
    <div className="home-section-head"><div><small>SIMPLE Y RÁPIDO</small><h2 id="pasos-title">Comprar es muy fácil</h2><p>Cuatro pasos, sin vueltas.</p></div></div>
    <div className="home-step-grid">
     <div className="home-step"><b>01</b><h3>Elegí</h3><p>Buscá por categoría o usá el buscador.</p></div>
     <div className="home-step"><b>02</b><h3>Agregá</h3><p>Elegí la cantidad y agregá al carrito.</p></div>
     <div className="home-step"><b>03</b><h3>Confirmá</h3><p>Completá tus datos y seleccioná la entrega.</p></div>
     <div className="home-step"><b>04</b><h3>Recibí</h3><p>Coordinamos la entrega y el pago según tu zona.</p></div>
    </div>
   </section>

   <section className="home-trust-panel" aria-labelledby="confianza-title">
    <div><small>COMPRÁ CON CONFIANZA</small><h2 id="confianza-title">Una tienda pensada para comprar fácil.</h2><p>Mostramos información útil antes de pedir: precio, stock, modalidad de entrega, formas de pago y atención directa.</p><Link className="btn" href="/catalogo">Elegir productos</Link></div>
    <div className="home-checks"><div><span>✓</span>Precios en guaraníes</div><div><span>✓</span>Stock visible</div><div><span>✓</span>Entrega clara antes de confirmar</div><div><span>✓</span>Soporte por WhatsApp</div></div>
   </section>

   <section className="home-faq" id="preguntas-frecuentes" aria-labelledby="faq-title">
    <div className="home-faq-intro"><small>ANTES DE COMPRAR</small><h2 id="faq-title">Preguntas frecuentes</h2><p>Respuestas rápidas para que puedas decidir sin tener que preguntar primero.</p></div>
    <div className="faq-list">
     <details><summary>¿Cómo realizo mi pedido?</summary><p>Elegí un producto, agregalo al carrito y completá el checkout con tus datos.</p></details>
     <details><summary>¿Puedo pagar al recibir?</summary><p>Sí, en las zonas habilitadas. El checkout te muestra la modalidad antes de confirmar.</p></details>
     <details><summary>¿Cuánto cuesta el delivery?</summary><p>El checkout calcula el costo después de seleccionar tu ciudad.</p></details>
     <details><summary>¿Realizan envíos al interior?</summary><p>Sí. Preparamos el pedido para despacho mediante transportadora.</p></details>
     <details><summary>¿Qué medios de pago aceptan?</summary><p>Pago al recibir donde está habilitado, transferencia bancaria y Giro Tigo.</p></details>
     <details><summary>¿Cómo sé si hay stock?</summary><p>La ficha de cada producto muestra la disponibilidad actual y evita confirmar productos agotados.</p></details>
    </div>
   </section>

   <section className="home-final" aria-labelledby="final-title">
    <small>ESTAMOS PARA AYUDARTE</small><h2 id="final-title">¿Encontraste algo que te gusta?</h2><p>Entrá al catálogo, elegí tu producto y completá tu pedido en pocos pasos.</p><Link className="btn" href="/catalogo">Comprar ahora →</Link>
   </section>
  </div>
 </>;
}
