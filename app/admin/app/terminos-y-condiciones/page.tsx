import Link from "next/link";

export const metadata = { title: "Términos y condiciones — DF Store PY" };

export default function Terminos(){
 return <section className="legal-page">
  <div className="title"><div><small>DF STORE PY</small><h1>Términos y condiciones</h1></div><Link href="/">← Volver al inicio</Link></div>
  <div className="panel">
   <p className="muted">Última actualización: {new Date().toLocaleDateString("es-PY",{year:"numeric",month:"long"})}</p>

   <h2>1. Aceptación</h2>
   <p>Al realizar una compra en DF Store PY, aceptás estos términos y condiciones.</p>

   <h2>2. Productos y precios</h2>
   <p>Los precios se muestran en guaraníes (₲) e incluyen los impuestos aplicables. La disponibilidad de stock se confirma al momento de generar el pedido; si un producto se agota entre que lo agregaste al carrito y confirmaste la compra, te lo comunicamos antes de procesar el pago.</p>

   <h2>3. Formas de pago</h2>
   <p>Aceptamos pago al recibir (Asunción y Central), transferencia bancaria y Giro Tigo. Para envíos al interior del país, el pago se realiza de forma previa por transferencia, ya que el envío se coordina con una transportadora.</p>

   <h2>4. Delivery y envíos</h2>
   <p>En Asunción y Central el delivery es propio; el costo se calcula según tu zona y se muestra antes de confirmar la compra. Para el interior del país, el envío se realiza mediante transportadora, cuyo costo se coordina de forma independiente al del producto.</p>

   <h2>5. Cambios y devoluciones</h2>
   <p>Si recibís un producto con fallas o distinto al pedido, contactanos por WhatsApp dentro de las 48 horas de la entrega para coordinar el cambio o la devolución correspondiente.</p>

   <h2>6. Datos personales</h2>
   <p>Los datos que completás en el checkout (nombre, WhatsApp, dirección) se usan exclusivamente para procesar y entregar tu pedido. Más detalle en nuestra <Link href="/politica-de-privacidad">Política de privacidad</Link>.</p>

   <h2>7. Contacto</h2>
   <p>Ante cualquier consulta sobre tu pedido, escribinos por el botón de WhatsApp de la tienda.</p>
  </div>
 </section>;
}
