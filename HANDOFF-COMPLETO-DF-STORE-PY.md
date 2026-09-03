# DF STORE PY — HANDOFF COMPLETO PARA CONTINUAR EL TRABAJO

Fecha: 2026-09-03 (Paraguay). Este documento no omite ningún dato necesario
para seguir trabajando. Todo lo que aparece acá es información real,
verificada directamente contra la base de datos y el código — no son
suposiciones.

## 1. Accesos y credenciales (todo lo que hace falta, sin ocultar nada)

### Supabase (base de datos)
- Project ref: `cpeyiwuxqgukdvkcpfwr`
- URL: `https://cpeyiwuxqgukdvkcpfwr.supabase.co`
- Región: `sa-east-1` (São Paulo)
- Anon/publishable key (segura para el frontend):
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlpd3V4cWd1a2R2a2NwZndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzOTc1MDcsImV4cCI6MjEwMzk3MzUwN30.Z9a0hTwqdo93mk5D8y8R_BAGb6Wi1l6OBUPYaJ0tP90`
- **Service role key / contraseña de base: NO se dispone.** Nunca fue
  compartida por Edgar ni recuperada por ninguna IA anterior. Si hace falta
  para algo (operación administrativa fuera de RLS), pedírsela directamente
  a Edgar desde el dashboard de Supabase (Project Settings → API).
- **Atención:** existe otro proyecto Supabase (`qlvgxbolxzujmwatbugg`) que
  NO corresponde a DF Store PY. No tocarlo.

### GitHub (código fuente)
- Repositorio: `https://github.com/ffcsistemas1-jpg/df-store-py`
- Rama de producción: `main`
- El repo tiene carpetas viejas sueltas de subidas anteriores
  (`DF-Store-PY-VERSION-1/`, `df-store-py/`) que son restos, no se usan.
  No hace falta borrarlas para que funcione, pero conviene limpiarlas en
  algún momento para no confundir.

### Vercel (hosting/producción)
- Proyecto: `df-store-py` (cuenta: `ffcsistemas1-1594` / equipo "Dfstore")
- Dominio real que usa Edgar: `https://df-store-py-dfstore.vercel.app`
- Conectado a GitHub (`main`) — el deploy es automático en cada push, pero
  Edgar generalmente lo dispara a mano con "Create Deployment" tras subir
  cambios a GitHub.
- Variables de entorno YA cargadas en Vercel (Production, Preview y
  Development, las 3 tildadas):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_META_PIXEL_ID` = `1634194911588813`
  - `META_CAPI_ACCESS_TOKEN` — **cargado por Edgar directamente en Vercel.
    Ninguna IA (ni esta ni la anterior) tiene ni tuvo nunca ese valor.** Si
    hace falta regenerarlo: Meta Business Suite → Configuración del
    negocio → Usuarios del sistema → "Conversions API System User" →
    Generar token (permisos `ads_management` + `business_management`).
- **Advertencia histórica:** este proyecto tuvo un mecanismo de deploy
  paralelo y roto (`build-runner.cjs`, error "expected 11 chunks, got 12")
  que no dependía de git. Ya se abandonó — ahora el deploy es 100% vía
  GitHub → Vercel. No reintroducir scripts de build custom.

### Meta Business (Facebook/Instagram Ads)
- Portafolio comercial: "Nala novedades" (business_id `474567029080550`)
- Pixel / conjunto de datos: **"DF Store PY"**, ID `1634194911588813`
- App de Meta creada: "DF Store PY" (dentro del mismo portafolio, necesaria
  para generar el token de sistema)
- Usuario del sistema: "Conversions API System User" (id
  `61593933456440`), con acceso total al Pixel y al conjunto de datos.
- Página de Facebook: `https://www.facebook.com/profile.php?id=61580238164654`
  (Edgar avisó que va a cambiar el perfil más adelante)
- Instagram: `@todo_tecnopy` (`https://www.instagram.com/todo_tecnopy`) —
  también sujeto a cambio futuro por Edgar.
- **Estado verificado con evidencia real (no solo "debería funcionar"):**
  31 eventos ya registrados en `meta_events_log`, **todos con status
  "sent"** — PageView (23), AddToCart (5), InitiateCheckout (3). El sistema
  de Pixel + Conversions API está funcionando de punta a punta en
  producción. Todavía no hay ningún evento "Purchase" registrado porque no
  se generó ningún pedido real desde que se activó esta integración (el
  único pedido que existe en la base es anterior a esto).

## 2. Estado real de la base de datos (verificado ahora mismo)

- `products`: 6 filas (5 de demostración + los que Edgar fue cargando)
- `orders`: 1 pedido real (de antes de la integración de Meta, sin
  atribución)
- `shipping_companies`: 12
- `delivery_zones`: 19
- WhatsApp configurado en `store_settings`: `595972798907`
- Tablas de "chunks" de un mecanismo de deploy abandonado:
  `deploy_source_chunks_20260903` (4 filas) y
  `deploy_build_reports_20260903` (0 filas). No están expuestas
  públicamente (RLS sin política = inaccesibles por API), pero **Edgar
  todavía no autorizó borrarlas** — pidió no tocarlas hasta terminar todo
  lo de Meta Ads. Confirmar con él antes de eliminarlas.

## 3. Qué se implementó hoy (2026-09-03), en orden

1. Auditoría completa del paquete de continuidad recibido de la IA
   anterior — se confirmó que el checkout, RLS y RPCs ya estaban
   corregidos correctamente (parche de privacidad de `checkout_drafts` ya
   aplicado).
2. Se detectó y corrigió una vulnerabilidad real: una vista
   (`meta_events_recent`) creada sin `security_invoker=on` que saltaba el
   RLS de las tablas base — corregida en el momento, confirmada con el
   auditor de seguridad de Supabase.
3. Integración completa de Meta Pixel + Conversions API (server-side),
   con deduplicación por `event_id`, hash SHA-256 de datos personales,
   captura de UTM/fbclid/fbp/fbc por pedido, y panel
   **Admin → Meta Ads** con estado real (no inventado).
4. Se reemplazó el mecanismo de deploy roto (`build-runner.cjs`) por un
   flujo estándar GitHub → Vercel.
5. Se ocultó el link "Admin" del menú público, se agregó `robots.txt`
   bloqueando `/admin`, `/carrito`, `/checkout`, y `sitemap.xml`.
6. Se agregó soporte PWA (instalable desde Chrome): `manifest.ts`,
   `sw.js`, íconos, botón "Instalar app".
7. Se agregaron páginas de **Quiénes somos**, **Términos y condiciones** y
   **Política de privacidad** (esta última también ayuda a que Meta
   apruebe mejor las campañas), sellos de confianza en la home, medios de
   pago visibles, footer profesional con redes sociales.
8. Panel de administración: se agregó una **barra lateral fija** con las
   13 secciones (antes solo había un link "← Admin" para volver al
   dashboard).
9. Se corrigieron dos problemas de experiencia mobile reportados por
   Edgar con capturas reales: el hero ocupaba casi dos pantallas antes de
   mostrar productos (un bloque decorativo gigante se apilaba debajo del
   texto en mobile — se ocultó en esa resolución), y el checkout tenía
   demasiados campos visibles a la vez (se colapsaron horario, factura y
   ubicación en un bloque "+ Más opciones").
10. Se escribió `PROMPT-PROFUNDO-DISENO-Y-FUNCIONES.md` (incluido en este
    mismo ZIP) con el sistema de diseño completo (colores exactos,
    tipografía, patrones de componentes) y las reglas para no romper nada
    al agregar funciones nuevas — leerlo antes de tocar el diseño.

## 4. Qué falta / pendiente

- Confirmar con Edgar si ya subió esta última versión del código a GitHub
  y la desplegó en Vercel (el ZIP que acompaña este documento es el
  código más actualizado que existe; verificar que coincida con lo que
  está en el repo antes de asumir que ya está en producción).
- Borrar (con autorización explícita de Edgar) las tablas
  `deploy_source_chunks_20260903` y `deploy_build_reports_20260903`.
- Limpiar las carpetas viejas sueltas en GitHub
  (`DF-Store-PY-VERSION-1/`, `df-store-py/`).
- Cuando Edgar cambie el perfil de Facebook/Instagram, actualizar los
  links en `app/ui.tsx` (componente `SiteFooter`).
- Primera campaña real en Meta Ads Manager: todavía no se creó ninguna.
  El Pixel/CAPI ya están listos para medirla apenas se lance.
- Reemplazar los productos de demostración por el catálogo real de la
  tienda.
- Crear el primer usuario administrador en Supabase Authentication +
  agregarlo a `admin_users` (confirmar con Edgar si ya lo hizo).

## 5. Objetivo del negocio (para no perder el foco)

DF Store PY es la tienda de un amigo de Edgar. El objetivo es tenerla
lista para correr campañas de Meta Ads (Facebook/Instagram) que lleven
tráfico pago directo a la web, con medición correcta de qué campaña generó
cada venta, y que la tienda transmita seriedad y confianza al nivel de las
tiendas online más grandes de Paraguay (Nova Store fue la referencia visual
usada, respetando siempre el color de marca guinda `#98234d` de DF Store PY).
