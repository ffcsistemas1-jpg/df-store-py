import Link from "next/link";

export const metadata = { title: "Política de privacidad — DF Store PY" };

export default function PoliticaPrivacidad(){
 return <section className="legal-page">
  <div className="title"><div><small>DF STORE PY</small><h1>Política de privacidad</h1></div><Link href="/">← Volver al inicio</Link></div>
  <div className="panel">
   <p className="muted">Última actualización: {new Date().toLocaleDateString("es-PY",{year:"numeric",month:"long"})}</p>

   <h2>Qué datos recopilamos</h2>
   <p>Cuando comprás en DF Store PY, guardamos los datos que nos das en el checkout: nombre, WhatsApp, email (opcional), dirección y zona de entrega. Estos datos son necesarios para procesar y entregar tu pedido.</p>

   <h2>Cómo usamos tus datos</h2>
   <ul className="legal-list">
    <li>Para confirmar, procesar y entregar tu pedido.</li>
    <li>Para contactarte por WhatsApp ante cualquier consulta sobre tu compra.</li>
    <li>De forma anónima y agregada, para medir el rendimiento de nuestras campañas de publicidad en Meta (Facebook/Instagram), sin identificarte personalmente ante terceros.</li>
   </ul>

   <h2>Con quién compartimos datos</h2>
   <p>No vendemos ni compartimos tus datos personales con terceros para fines comerciales. Utilizamos Supabase como proveedor de base de datos (almacenamiento seguro) y Meta (Facebook/Instagram) para medir la efectividad de nuestros anuncios mediante información agregada y, cuando corresponde, datos de contacto cifrados (hasheados) que Meta no puede leer en texto plano.</p>

   <h2>Cookies</h2>
   <p>Usamos cookies técnicas para que el carrito de compras funcione correctamente durante tu visita, y cookies de Meta Pixel (cuando están activas) para medir el rendimiento de nuestras campañas publicitarias.</p>

   <h2>Tus derechos</h2>
   <p>Podés solicitarnos en cualquier momento que eliminemos tus datos de nuestra base, escribiéndonos por WhatsApp.</p>

   <h2>Contacto</h2>
   <p>Para cualquier consulta sobre esta política, escribinos por el botón de WhatsApp de la tienda.</p>
  </div>
 </section>;
}
