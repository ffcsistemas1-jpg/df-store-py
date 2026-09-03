# DF STORE PY — PROMPT PROFUNDO DE DISEÑO Y DESARROLLO

Este documento es para dárselo a cualquier IA (Claude, la otra IA, o quien sea)
antes de pedirle que cree una función nueva o cambie la apariencia de la
tienda. Resume el sistema de diseño, la arquitectura y las reglas que hay
que respetar para no romper lo que ya funciona.

## Regla número uno (no negociable)

**Nunca rediseñar ni reescribir desde cero.** Cada cambio se hace de forma
incremental: leer el código existente, entender qué hace, y modificar solo
la parte necesaria. Antes de tocar un archivo, compilar (`npm run build`)
para tener una base de comparación. Después de cada cambio, volver a
compilar y confirmar que no aparecieron errores nuevos.

## Sistema de diseño (colores, tipografía, componentes)

- **Color principal (marca):** `#98234d` (guinda/vino) — botones, precios,
  elementos activos, acentos.
- **Color oscuro (fondo de bloques destacados, footer, hero):** `#21171a`.
- **Fondo general del sitio:** `#f8f3ef`.
- **Fondo de tarjetas/paneles:** `#ffffff`, borde `#eadfe0`.
- **Texto secundario/muted:** `#5c5557` o `#71686a`.
- **Acento claro sobre fondo oscuro:** `#df91ad` (para "small" labels sobre
  el hero/trust).
- **Tipografía de títulos:** Georgia (serif). Cuerpo de texto: Arial/Helvetica.
- **Border-radius estándar:** 18-28px en bloques grandes (hero, cards, panel),
  10-14px en elementos chicos (inputs, botones), 999px (píldora) en
  buscador, chips y filtros de categoría.
- **Patrón de botón primario:** `.btn` — fondo `#98234d`, texto blanco,
  padding generoso, `border-radius:10px`, `font-weight:800`.
- **Patrón de tarjeta:** `.card`/`.panel` — fondo blanco, borde `#eadfe0`,
  `border-radius:18px`, sombra sutil solo en hover (no estática, para no
  sobrecargar visualmente).

No introducir una paleta de colores nueva. Cualquier color adicional debe
ser una variación de tono de `#98234d` o `#21171a`, nunca un color
completamente distinto (evitar que la tienda "no se sienta" DF Store PY).

## Arquitectura del proyecto (no reinventar)

- Next.js 16 (App Router) + React 19 + TypeScript + Supabase (Postgres + Auth).
- Todo el frontend público vive en `app/` (catálogo, checkout, carrito, etc.).
- Todo el panel admin vive en `app/admin/**`, protegido por
  `is_admin()` (Supabase RPC) — nunca duplicar esa lógica de autenticación,
  reutilizarla.
- `app/admin/layout.tsx` + `app/admin/admin-shell.tsx` — barra lateral fija
  del admin. Si se agrega una sección nueva al admin (por ejemplo
  "Finanzas"), agregar la entrada correspondiente en el array `NAV` de
  `admin-shell.tsx`, no crear una navegación paralela.
- `lib/meta-pixel.ts` + `app/api/meta-capi/route.ts` — integración de Meta
  Ads (Pixel + Conversions API). Cualquier evento nuevo de conversión debe
  usar `pixelTrack()` + `sendCapiEvent()` juntos, con el mismo `event_id`,
  para mantener la deduplicación.
- Base de datos: Supabase project `cpeyiwuxqgukdvkcpfwr`. Cambios de
  esquema van con `apply_migration`, nunca alterando tablas a mano sin
  revisar antes las políticas RLS existentes — **toda tabla o vista nueva
  debe revisarse con el auditor de seguridad de Supabase (`get_advisors`)
  antes de darla por terminada**, porque los permisos por defecto de
  Supabase pueden exponer datos sin querer (ya pasó una vez en este
  proyecto con una vista de eventos de Meta).
- Despliegue: GitHub (`ffcsistemas1-jpg/df-store-py`, rama `main`) conectado
  a Vercel. Nunca depender de mecanismos de despliegue "manuales" o
  paralelos (scripts custom de subida de código) — eso ya causó un fallo de
  producción antes. El flujo correcto es siempre: código → GitHub → Vercel
  detecta el push → build automático.

## Qué NO tocar sin revisar antes con cuidado extra

- `create_order` (función SQL): es transaccional, valida stock y precios
  server-side. Cualquier cambio debe probarse antes de reemplazar la
  función en producción.
- Políticas RLS de `orders`, `customers`, `checkout_drafts`: son las que
  protegen los datos personales de los clientes. Nunca agregar una política
  de `select` para `anon` en estas tablas.
- Variables de entorno: `NEXT_PUBLIC_*` son públicas (van al navegador),
  cualquier otra variable (como `META_CAPI_ACCESS_TOKEN`) debe quedar
  siempre sin el prefijo `NEXT_PUBLIC_` para que no se exponga.

## Cómo pedir una función nueva o un cambio visual (plantilla)

Al pedirle a una IA que agregue algo, conviene dar este contexto mínimo:

1. Qué página o sección del sitio se toca.
2. Qué debe hacer la función nueva (comportamiento esperado, no solo
   estética).
3. Confirmar explícitamente: "no modificar nada fuera de esto, no tocar
   `create_order`, ni las políticas de seguridad de Supabase, salvo que sea
   estrictamente necesario para la función pedida".
4. Pedir que compile (`npm run build`) y confirme 0 errores antes de dar
   el cambio por terminado.
