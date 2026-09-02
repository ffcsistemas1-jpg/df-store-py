-- Embudo de ventas: eventos de analítica básica (visitas y productos vistos) +
-- marca de "checkout completado" para poder listar los abandonados en el Admin.
-- Ejecutar una sola vez en Supabase SQL Editor (además de final.sql).

alter table public.checkout_drafts add column if not exists completed_at timestamptz;

create table if not exists public.analytics_events(
  id uuid primary key default gen_random_uuid(),
  session text not null,
  type text not null check (type in ('visit','product_view')),
  product_id text,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Cualquier visitante puede registrar su propia visita/vista de producto (no se puede leer nada sensible al insertar).
drop policy if exists "public insert analytics events" on public.analytics_events;
create policy "public insert analytics events" on public.analytics_events for insert to anon,authenticated with check(true);
-- Solo el admin puede leer las estadísticas agregadas.
drop policy if exists "admin read analytics events" on public.analytics_events;
create policy "admin read analytics events" on public.analytics_events for select to authenticated using(public.is_admin());
drop policy if exists "admin delete analytics events" on public.analytics_events;
create policy "admin delete analytics events" on public.analytics_events for delete to authenticated using(public.is_admin());

-- Limpieza opcional de eventos viejos (correr manualmente de vez en cuando):
-- delete from public.analytics_events where created_at < now() - interval '90 days';
