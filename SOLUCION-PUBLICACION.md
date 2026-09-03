# DF Store PY — solución de publicación

## Hallazgos
1. Los dos ZIP recibidos son idénticos; no existen dos versiones para comparar.
2. El bloqueo descrito en el resumen no es un error de Next.js: fue una limitación de red del entorno que intentó ejecutar el deploy por MCP.
3. El proyecto puede publicarse conectando un repositorio Git a Netlify o Vercel.
4. Antes de producción había una política RLS insegura en `checkout_drafts`: permitía SELECT público de nombres, WhatsApp y direcciones. Esta copia ya usa RPC de sesión y lectura directa solo para administradores.
5. `/admin/login` solo inicia sesión. El primer usuario debe crearse en Supabase Authentication y luego agregarse a `admin_users`.

## Orden correcto
1. Ejecutar `supabase/PATCH-PRIVACIDAD-CHECKOUT.sql` en el SQL Editor del proyecto Supabase YA EXISTENTE.
2. Subir esta carpeta a GitHub.
3. Conectar el repositorio a Netlify o Vercel.
4. Variables obligatorias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_META_PIXEL_ID` (cuando se cree el Pixel)
5. Build: `npm run build`. En Netlify, publish directory `.next`.
6. Crear el admin en Supabase Authentication y agregar su UUID a `public.admin_users`.
7. Reemplazar datos/productos demo antes de campañas reales.

## Nota
No ejecutar todo `supabase/final.sql` de nuevo solo para aplicar esta corrección. En la base ya configurada, usar el parche específico `PATCH-PRIVACIDAD-CHECKOUT.sql`.
