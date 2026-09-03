import Link from "next/link";
import { ProductCard, TrustBadges } from "./ui";
import { getProducts, getPromotions } from "../lib/products";
export default async function Home(){
 const ps=await getProducts();
 const promos=await getPromotions();
 return <><section className="hero"><div><small>DF STORE PY</small><h1>Todo lo que buscan en un solo lugar.</h1><p>Ropa, hogar y productos seleccionados. Comprá de forma simple, rápida y segura.</p><Link className="btn" href="/catalogo">Ver catálogo</Link></div><div className="logo">DF<span>STORE PY</span></div></section>
 <TrustBadges/>
 <section><div className="title"><div><small>DESTACADOS</small><h2>Productos</h2></div><Link href="/catalogo">Ver todos →</Link></div><div className="grid">{ps.slice(0,6).map(p=><ProductCard key={p.id} p={p}/>)}</div></section>

 {promos.length>0 && <section><div className="title"><div><small>OPORTUNIDADES</small><h2>Promociones de la semana</h2></div><Link href="/catalogo">Ver todo el catálogo →</Link></div>
  <div className="promo-grid">
   {promos.map(promo=><div className="promo-card" key={promo.id}>
     {promo.image_url && <div className="promo-pic"><img src={promo.image_url} alt={promo.title}/></div>}
     {promo.badge && <small>{promo.badge}</small>}
     <h3>{promo.title}</h3>
     {promo.description && <p>{promo.description}</p>}
     {promo.price_text && <strong>{promo.price_text}</strong>}
     <Link className="btn" href={promo.category?`/catalogo?categoria=${encodeURIComponent(promo.category)}`:"/catalogo"}>{promo.cta_text||"Ver productos"} →</Link>
   </div>)}
  </div>
 </section>}

 <section className="benefits"><div>🚚 <b>Delivery</b><small>Central y zonas habilitadas</small></div><div>🚛 <b>Interior</b><small>Transportadoras</small></div><div>💳 <b>Pagos</b><small>Transferencia, recibir o Giro Tigo</small></div><div>📱 <b>WhatsApp</b><small>Atención directa</small></div></section>

 <section className="steps"><div className="title"><div><small>SIMPLE Y RÁPIDO</small><h2>Comprar es muy fácil</h2></div></div>
  <div className="steps-grid">
   <div className="step"><b>01</b><h3>Elegí</h3><p>Encontrá el producto que te gusta en el catálogo.</p></div>
   <div className="step"><b>02</b><h3>Agregá</h3><p>Sumalo al carrito con la cantidad que necesites.</p></div>
   <div className="step"><b>03</b><h3>Confirmá</h3><p>Completá tus datos y elegí el delivery o envío.</p></div>
   <div className="step"><b>04</b><h3>Recibí</h3><p>Recibís tu pedido y pagás según la modalidad elegida.</p></div>
  </div>
 </section>

 <section className="trust">
  <div className="trust-text"><small>COMPRÁ CON CONFIANZA</small><h2>Atención humana, rápida y personalizada.</h2><p>Te acompañamos desde tu primera consulta hasta la entrega de tu pedido.</p><Link className="btn" href="/catalogo">Elegir productos</Link></div>
  <ul className="trust-list">
   <li>✓ Confirmación de disponibilidad</li>
   <li>✓ Productos seleccionados</li>
   <li>✓ Promociones reales</li>
   <li>✓ Entregas coordinadas</li>
  </ul>
 </section>

 <section className="faq" id="preguntas-frecuentes"><div className="title"><div><small>ANTES DE COMPRAR</small><h2>Preguntas frecuentes</h2><p className="muted">Si todavía tenés dudas, escribinos por el botón de WhatsApp.</p></div></div>
  <div className="faq-list">
   <details><summary>¿Cómo realizo mi pedido?</summary><p>Elegí el producto, presioná Agregar al carrito y completá el checkout con tus datos.</p></details>
   <details><summary>¿Puedo pagar al recibir?</summary><p>Sí, en las zonas habilitadas. El checkout muestra la modalidad disponible antes de confirmar.</p></details>
   <details><summary>¿Cuánto cuesta el delivery?</summary><p>El checkout muestra el costo correspondiente después de seleccionar tu zona o ciudad.</p></details>
   <details><summary>¿Realizan envíos al interior?</summary><p>Sí, realizamos envíos a todo el país mediante transportadora.</p></details>
   <details><summary>¿Qué medios de pago aceptan?</summary><p>Transferencia bancaria, pago al recibir en zonas habilitadas y Giro Tigo.</p></details>
   <details><summary>¿Los productos tienen stock limitado?</summary><p>Sí. La disponibilidad depende del stock cargado en cada producto.</p></details>
  </div>
 </section>

 <section className="final-cta">
  <small>ESTAMOS PARA AYUDARTE</small>
  <h2>¿Encontraste algo que te gusta?</h2>
  <p>Elegí tu producto, confirmamos la disponibilidad y te ayudamos a completar tu pedido.</p>
  <Link className="btn" href="/catalogo">Comprar ahora</Link>
 </section></>;
}