-- Guarda las suscripciones de notificaciones push del navegador de cada
-- administrador (una fila por dispositivo/navegador donde activó las
-- notificaciones). Se usa para avisarle cuando entra un pedido nuevo.
create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "admin puede ver sus propias suscripciones"
  on public.push_subscriptions for select
  using (public.is_admin() and admin_user_id = auth.uid());

create policy "admin puede crear su propia suscripción"
  on public.push_subscriptions for insert
  with check (public.is_admin() and admin_user_id = auth.uid());

create policy "admin puede borrar su propia suscripción"
  on public.push_subscriptions for delete
  using (public.is_admin() and admin_user_id = auth.uid());

-- ============================================================
-- ÚLTIMO PASO (se hace desde el panel de Supabase, no desde SQL):
-- ============================================================
-- 1. Supabase → Database → Webhooks → "Create a new hook"
-- 2. Nombre: notify-new-order
-- 3. Table: orders   |   Events: solo tildar "Insert"
-- 4. Type: HTTP Request   |   Method: POST
-- 5. URL: https://TU-DOMINIO-DE-VERCEL/api/notify-new-order
--    (ej: https://df-store-py-dfstore.vercel.app/api/notify-new-order)
-- 6. HTTP Headers → agregar:
--       x-webhook-secret : el mismo valor que pusiste en Vercel como
--                           ORDER_WEBHOOK_SECRET
-- 7. Guardar.
--
-- Con eso, cada vez que se inserta un pedido nuevo, Supabase le avisa
-- automáticamente a la API, y la API le manda la notificación push a
-- todos los administradores suscriptos.

