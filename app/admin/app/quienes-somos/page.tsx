import Link from "next/link";

export const metadata = { title: "Quiénes somos — DF Store PY" };

export default function QuienesSomos(){
 return <section className="legal-page">
  <div className="title"><div><small>DF STORE PY</small><h1>Quiénes somos</h1></div><Link href="/">← Volver al inicio</Link></div>
  <div className="panel">
   <p>DF Store PY es una tienda online paraguaya que ofrece ropa, artículos para el hogar y productos seleccionados, pensada para que comprar sea simple, rápido y seguro.</p>
   <p>Trabajamos con delivery propio en Asunción y Central, y envíos a todo el país a través de transportadoras para el interior.</p>
   <p>La atención a nuestros clientes es directa y personal: cada consulta se responde por WhatsApp, y cada pedido se confirma antes de coordinar la entrega.</p>
   <h2>Nuestro compromiso</h2>
   <ul className="legal-list">
    <li>Confirmamos la disponibilidad de cada producto antes de coordinar el envío.</li>
    <li>Mostramos con claridad el costo de delivery según tu zona antes de confirmar la compra.</li>
    <li>Ofrecemos distintas formas de pago para que elijas la que más te convenga.</li>
   </ul>
  </div>
 </section>;
}
