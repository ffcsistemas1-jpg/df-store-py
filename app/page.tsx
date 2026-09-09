import Link from "next/link";
import { ProductCard, TrustBadges } from "./ui";
import { getProducts, getPromotions } from "../lib/products";

const categoryMeta:Record<string,{label:string;icon:string;description:string;source:string}>= {
 "Moda femenina":{label:"Moda femenina",icon:"👗",description:"Ropa y estilo para todos los días",source:"Ropa"},
 Herramientas:{label:"Herramientas",icon:"🛠️",description:"Todo para tus proyectos",source:"Herramientas"},
 Electrónica:{label:"Electrónica",icon:"⚡",description:"Tecnología útil para tu día a día",source:"Electro"},
 Hogar:{label:"Hogar",icon:"🏠",description:"Soluciones prácticas para tu casa",source:"Hogar"},
 Belleza:{label:"Belleza",icon:"✨",description:"Cuidado y bienestar",source:"Belleza"},
 Salud:{label:"Salud",icon:"❤️",description:"Cuidado y productos para tu bienestar",source:"Salud"},
};

const categoryOrder=["Moda femenina","Herramientas","Electrónica","Hogar","Belleza","Salud"];

function getCategoryProduct(products:any[], source:string){
 return products.find(p=>String(p.category||"").trim().toLowerCase()===source.toLowerCase() && p.image_url)
   || products.find(p=>String(p.category||"").trim().toLowerCase()===source.toLowerCase());
}

export default async function Home(){
 const ps=await getProducts();
 const promos=await getPromotions();
 const categoryCards=categoryOrder.map(category=>{
  const meta=categoryMeta[category];
  return {category,...meta,product:getCategoryProduct(ps,meta.source)};
 });
 const featured=ps.filter(p=>Number(p.stock)>0).slice(0,6);
 return <>
  <div className="mobile-home">
   <section className="mobile-home-search" aria-label="Buscar productos">
    <form action="/catalogo" method="get">
     <span aria-hidden="true">⌕</span>
     <input name="q" type="search" placeholder="¿Qué estás buscando?" aria-label="¿Qué estás buscando?" />
     <button type="submit" aria-label="Buscar">Buscar</button>
    </form>
   </section>

   <section className="mobile-home-hero" aria-labelledby="mobile-home-title">
    <div className="mobile-home-hero-copy">
     <small>DF STORE PY</small>
     <h1 id="mobile-home-title">Todo lo que necesitás en un solo lugar</h1>
     <p>Moda, herramientas, tecnología, hogar, belleza, salud y mucho más. Comprá fácil y seguro desde cualquier lugar del Paraguay.</p>
     <Link className="mobile-home-primary" href="/catalogo">Explorar categorías <span>→</span></Link>
     <div className="mobile-hero-mini-cats" aria-label="Categorías destacadas">
      {categoryCards.slice(0,4).map(({category,source,product,icon})=><Link key={category} href={`/catalogo?categoria=${encodeURIComponent(source)}`} aria-label={`Ver ${category}`}>
       {product?.image_url?<img src={product.image_url} alt=""/>:<span>{icon}</span>}
      </Link>)}
     </div>
    </div>
   </section>

   <section className="mobile-home-trust" aria-label="Ventajas de comprar en DF Store PY">
    <div><span>🚚</span><strong>Delivery</strong><small>Asunción y Central</small></div>
    <div><span>✓</span><strong>Pagás al recibir</strong><small>En zonas habilitadas</small></div>
    <div><span>◇</span><strong>Compra segura</strong><small>Pedido protegido</small></div>
   </section>

   <section className="mobile-home-section" aria-labelledby="mobile-categories-title">
    <div className="mobile-home-heading"><div><small>EXPLORÁ DF STORE</small><h2 id="mobile-categories-title">Nuestras categorías</h2></div><Link href="/catalogo">Ver todas →</Link></div>
    <div className="mobile-category-grid">
     {categoryCards.map(({category,source,product,icon,description})=><Link className="mobile-category-card" key={category} href={`/catalogo?categoria=${encodeURIComponent(source)}`} aria-label={`Ver productos de ${category}`}>
      <div className="mobile-category-image">{product?.image_url?<img src={product.image_url} alt="" loading="lazy"/>:<span>{icon}</span>}</div>
      <strong>{category}</strong><small>{description}</small>
     </Link>)}
     <Link className="mobile-category-card offers" href="/catalogo?ofertas=1"><div className="mobile-category-image offer-icon">%</div><strong>Ofertas</strong><small>Precios especiales</small></Link>
    </div>
   </section>

   <section className="mobile-home-section mobile-home-products" aria-labelledby="mobile-featured-title">
    <div className="mobile-home-heading"><div><small>SELECCIONADOS PARA VOS</small><h2 id="mobile-featured-title">Productos destacados</h2></div><Link href="/catalogo">Ver más →</Link></div>
    <div className="mobile-home-product-grid">{featured.map(p=><ProductCard key={p.id} p={p}/>)}</div>
   </section>

   {promos.length>0 && <section className="mobile-home-offer" aria-labelledby="mobile-offer-title">
    <small>OPORTUNIDADES</small><h2 id="mobile-offer-title">Ofertas especiales</h2><p>Productos seleccionados con precios especiales.</p>
    <Link href="/catalogo?ofertas=1">Ver ofertas <span>→</span></Link>
   </section>}

   <section className="mobile-home-section mobile-home-benefits" aria-labelledby="mobile-benefits-title">
    <div className="mobile-home-heading single"><div><small>COMPRA SIMPLE</small><h2 id="mobile-benefits-title">Comprar es muy fácil</h2><p>Sin vueltas, desde tu celular.</p></div></div>
    <div className="mobile-step-list">
     <div><b>01</b><div><h3>Elegí</h3><p>Encontrá el producto que te gusta.</p></div></div>
     <div><b>02</b><div><h3>Agregá</h3><p>Usá Comprar ahora o Agregar al carrito.</p></div></div>
     <div><b>03</b><div><h3>Confirmá</h3><p>Completá tus datos y elegí el delivery.</p></div></div>
     <div><b>04</b><div><h3>Recibí</h3><p>Recibís tu pedido y pagás según tu zona.</p></div></div>
    </div>
   </section>

   <section className="mobile-home-faq" id="preguntas-frecuentes" aria-labelledby="mobile-faq-title">
    <div className="mobile-home-heading single"><div><small>AYUDA</small><h2 id="mobile-faq-title">Preguntas frecuentes</h2><p>Información clara antes de comprar.</p></div></div>
    <div className="mobile-faq-list">
     <details><summary>¿Cómo realizo mi pedido?</summary><p>Elegí un producto, agregalo al carrito y completá tus datos.</p></details>
     <details><summary>¿Puedo pagar al recibir?</summary><p>Sí, en las zonas habilitadas. La modalidad aparece antes de confirmar.</p></details>
     <details><summary>¿Realizan envíos al interior?</summary><p>Sí. Preparamos el pedido para despacho mediante transportadora.</p></details>
     <details><summary>¿Qué medios de pago aceptan?</summary><p>Pago al recibir donde está habilitado, transferencia bancaria y Giro Tigo.</p></details>
    </div>
   </section>

   <section className="mobile-home-final" aria-labelledby="mobile-final-title">
    <small>TU COMPRA, A TU MANERA</small><h2 id="mobile-final-title">¿Encontraste algo que te gusta?</h2><p>Agregalo al carrito y completá tu pedido en pocos pasos.</p><Link href="/catalogo">Comprar ahora</Link>
   </section>
  </div>

  <div className="desktop-home home-page">
   <section className="home-hero" aria-labelledby="home-title">
    <div className="home-hero-main"><div><small>DF STORE PY · TODO PARAGUAY</small><h1 id="home-title">Todo lo que buscás, en un solo lugar.</h1><p>Moda, hogar y productos seleccionados con compra simple, atención humana y opciones de entrega para Asunción, Central e interior.</p><div className="home-hero-actions"><Link className="btn" href="/catalogo">Ver catálogo</Link><Link className="btn secondary" href="/catalogo?ofertas=1">Ver ofertas</Link></div></div></div>
    <div className="home-hero-side" aria-label="Beneficios principales"><div className="hero-service-card accent"><div><div className="icon" aria-hidden="true">🚚</div><strong>Pagá al recibir</strong><p>Disponible en Asunción y zonas habilitadas de Central.</p></div><small>Delivery rápido y coordinado</small></div><div className="hero-service-card"><div><div className="icon" aria-hidden="true">📦</div><strong>Envíos al interior</strong><p>Preparamos tu pedido para despacho mediante transportadora.</p></div><small>Todo Paraguay</small></div></div>
   </section>
   <section className="home-trust" aria-label="Ventajas de comprar en DF Store PY"><TrustBadges/></section>
   <section aria-labelledby="categorias-title"><div className="home-section-head"><div><small>EXPLORÁ LA TIENDA</small><h2 id="categorias-title">Comprá por categoría</h2><p>Encontrá más rápido lo que necesitás.</p></div><Link href="/catalogo">Ver catálogo completo →</Link></div><div className="quick-categories">{categoryCards.map(({category,source,icon,description})=><Link className="quick-category" key={category} href={`/catalogo?categoria=${encodeURIComponent(source)}`} aria-label={`Ver productos de ${category}`}><span className="qc-icon" aria-hidden="true">{icon}</span><strong>{category}</strong><span>{description}</span></Link>)}</div></section>
   <section aria-labelledby="destacados-title"><div className="home-section-head"><div><small>LOS MÁS DESTACADOS</small><h2 id="destacados-title">Productos para vos</h2><p>Disponibilidad y precio visibles antes de comprar.</p></div><Link href="/catalogo">Ver todos →</Link></div><div className="home-product-grid">{featured.map(p=><ProductCard key={p.id} p={p}/>)}</div></section>
   {promos.length>0 && <section aria-labelledby="promos-title"><div className="home-section-head"><div><small>OPORTUNIDADES</small><h2 id="promos-title">Promociones de la semana</h2><p>Ofertas sujetas a stock.</p></div><Link href="/catalogo">Ver todas →</Link></div><div className="home-promos">{promos.slice(0,4).map(promo=><article className="home-promo" key={promo.id}>{promo.image_url&&<img src={promo.image_url} alt="" loading="lazy"/>}<div className="home-promo-content">{promo.badge&&<small>{promo.badge}</small>}<h3>{promo.title}</h3>{promo.description&&<p>{promo.description}</p>}{promo.price_text&&<strong>{promo.price_text}</strong>}<div><Link className="btn" href={promo.category?`/catalogo?categoria=${encodeURIComponent(promo.category)}`:"/catalogo"}>{promo.cta_text||"Ver productos"} →</Link></div></div></article>)}</div></section>}
   <section aria-label="Opciones de compra" className="home-benefits"><div className="home-benefit"><span className="icon" aria-hidden="true">🚚</span><b>Delivery</b><span>Asunción y Central en zonas habilitadas.</span></div><div className="home-benefit"><span className="icon" aria-hidden="true">📦</span><b>Envíos al interior</b><span>Despacho por transportadora.</span></div><div className="home-benefit"><span className="icon" aria-hidden="true">💳</span><b>Formas de pago</b><span>Recibir, transferencia o Giro Tigo.</span></div><div className="home-benefit"><span className="icon" aria-hidden="true">💬</span><b>Atención directa</b><span>Te ayudamos por WhatsApp.</span></div></section>
   <section className="home-steps" aria-labelledby="pasos-title"><div className="home-section-head"><div><small>SIMPLE Y RÁPIDO</small><h2 id="pasos-title">Comprar es muy fácil</h2><p>Cuatro pasos, sin vueltas.</p></div></div><div className="home-step-grid"><div className="home-step"><b>01</b><h3>Elegí</h3><p>Buscá por categoría o usá el buscador.</p></div><div className="home-step"><b>02</b><h3>Agregá</h3><p>Elegí la cantidad y agregá al carrito.</p></div><div className="home-step"><b>03</b><h3>Confirmá</h3><p>Completá tus datos y seleccioná la entrega.</p></div><div className="home-step"><b>04</b><h3>Recibí</h3><p>Coordinamos la entrega y el pago según tu zona.</p></div></div></section>
   <section className="home-trust-panel" aria-labelledby="confianza-title"><div><small>COMPRÁ CON CONFIANZA</small><h2 id="confianza-title">Una tienda pensada para comprar fácil.</h2><p>Mostramos información útil antes de pedir: precio, stock, modalidad de entrega, formas de pago y atención directa.</p><Link className="btn" href="/catalogo">Elegir productos</Link></div><div className="home-checks"><div><span>✓</span>Precios en guaraníes</div><div><span>✓</span>Stock visible</div><div><span>✓</span>Entrega clara antes de confirmar</div><div><span>✓</span>Soporte por WhatsApp</div></div></section>
   <section className="home-faq" id="preguntas-frecuentes-desktop" aria-labelledby="faq-title"><div className="home-faq-intro"><small>ANTES DE COMPRAR</small><h2 id="faq-title">Preguntas frecuentes</h2><p>Respuestas rápidas para que puedas decidir sin tener que preguntar primero.</p></div><div className="faq-list"><details><summary>¿Cómo realizo mi pedido?</summary><p>Elegí un producto, agregalo al carrito y completá el checkout con tus datos.</p></details><details><summary>¿Puedo pagar al recibir?</summary><p>Sí, en las zonas habilitadas. El checkout te muestra la modalidad antes de confirmar.</p></details><details><summary>¿Cuánto cuesta el delivery?</summary><p>El checkout calcula el costo después de seleccionar tu ciudad.</p></details><details><summary>¿Realizan envíos al interior?</summary><p>Sí. Preparamos el pedido para despacho mediante transportadora.</p></details><details><summary>¿Qué medios de pago aceptan?</summary><p>Pago al recibir donde está habilitado, transferencia bancaria y Giro Tigo.</p></details><details><summary>¿Cómo sé si hay stock?</summary><p>La ficha de cada producto muestra la disponibilidad actual.</p></details></div></section>
   <section className="home-final" aria-labelledby="final-title"><small>ESTAMOS PARA AYUDARTE</small><h2 id="final-title">¿Encontraste algo que te gusta?</h2><p>Entrá al catálogo, elegí tu producto y completá tu pedido en pocos pasos.</p><Link className="btn" href="/catalogo">Comprar ahora →</Link></section>
  </div>
 </>;
}
