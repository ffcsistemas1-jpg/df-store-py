# DF Store PY v2

Versión preparada para trabajar más rápido.

## Incluye
- Tienda pública responsive.
- Catálogo y fichas de producto.
- Formulario de administrador para crear productos.
- Selección de imagen desde la computadora.
- Subida automática de imagen al bucket Supabase Storage `productos`.
- Guardado automático del producto en Supabase.
- Estructura de clientes, pedidos, items, delivery, zonas, cuentas bancarias, Giro Tigo y transportadoras.
- Panel inicial con pedidos, ventas, stock y pagos.
- Secciones para pagos, transportadoras, reportes y notificaciones.

## Configuración
1. Copiar `.env.example` a `.env.local`.
2. Completar:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
3. Ejecutar `supabase/schema.sql` en Supabase SQL Editor.
4. Confirmar que exista el bucket público `productos`.
5. Configurar Auth + RLS antes de usar el administrador en producción.

## Vercel
Agregar las dos variables de entorno en Project Settings > Environment Variables y desplegar.

## Próxima implementación
Carrito persistente, checkout real, comprobante de transferencia, verificación de pago, WhatsApp, delivery por departamento/ciudad/barrio, ABM de métodos de pago y transportadoras, permisos de administrador y reportes conectados a datos reales.
