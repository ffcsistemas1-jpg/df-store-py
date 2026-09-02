# DF Store PY — Integración final

Versión consolidada del proyecto de DF Store PY.

## Incluye
- Catálogo y productos desde Supabase.
- Carrito persistente con control de stock.
- Checkout real y creación de pedidos.
- Delivery por zonas y transportadoras.
- Métodos de pago y referencia de operación.
- Administración de pedidos, clientes, productos e inventario.
- Reportes y notificaciones.
- WhatsApp configurable desde Admin → Configuración.
- Fotos y videos de productos.

## SQL
Para la puesta en producción, ejecutar `supabase/final.sql` completo una sola vez en Supabase SQL Editor.

Los archivos SQL de etapas anteriores se conservan como referencia, pero `final.sql` es el consolidado.

## Variables de Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferida)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (compatibilidad con configuración anterior)
