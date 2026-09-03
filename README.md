# DF Store PY

Tienda online DF Store PY (Next.js 16 + React 19 + Supabase).

## Flujo de compra
- **Agregar al carrito:** guarda el producto y permite seguir navegando por la tienda.
- **Comprar:** agrega el producto y lleva inmediatamente al carrito.
- El carrito conserva los productos en el navegador para que no se pierdan durante la navegación.

## Puesta en marcha (una sola vez)

1. **Crear el proyecto en Supabase** (supabase.com) y anotar la URL y la anon key
   (Project Settings > API).
2. **Ejecutar `supabase/final.sql`** completo en el SQL Editor de ese proyecto.
   Crea todas las tablas, las políticas de seguridad (RLS), la función de
   pedidos y el bucket de imágenes `productos`.
3. **Crear el primer usuario administrador:**
   - En Supabase → Authentication → Users, crear/invitar el usuario administrador.
   - Copiar su `user_id` y, en la tabla `admin_users`, insertar una fila con ese `user_id`.
   - Luego iniciar sesión normalmente en `/admin/login`. La pantalla de admin no expone registro público.
4. **Variables de entorno:** copiar `.env.example` a `.env.local` y completar
   con los datos de Supabase. Las mismas variables van en Vercel al desplegar.
5. **Meta Pixel (opcional, recomendado para hacer campañas):** crear un Pixel
   en Meta Business Suite y pegar su ID en `NEXT_PUBLIC_META_PIXEL_ID`. La
   tienda ya envía automáticamente los eventos estándar: `PageView`,
   `ViewContent` (al ver un producto), `AddToCart`, `InitiateCheckout` y
   `Purchase` (con el ID del pedido para evitar conteos duplicados).
6. **Deploy:** subir el repo a Vercel, cargar las mismas variables de entorno
   y desplegar. Framework preset: Next.js (se detecta solo).

## Desarrollo local

```
npm install
npm run dev
```

Si todavía no configuraste Supabase, la tienda muestra productos de
demostración (`lib/products.ts`) para poder navegar la interfaz sin errores.
