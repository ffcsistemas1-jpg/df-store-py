-- Promociones de la semana + banner superior configurable
-- Ejecutar una sola vez en Supabase SQL Editor (además de final.sql)

alter table public.store_settings add column if not exists banner_text text;

create table if not exists public.promotions(
  id uuid primary key default gen_random_uuid(),
  badge text,
  title text not null,
  description text,
  price_text text,
  cta_text text default 'Ver productos',
  category text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

drop policy if exists "public read active promotions" on public.promotions;
create policy "public read active promotions" on public.promotions for select to anon,authenticated using(active=true);
drop policy if exists "admin read all promotions" on public.promotions;
create policy "admin read all promotions" on public.promotions for select to authenticated using(public.is_admin());
drop policy if exists "admin insert promotions" on public.promotions;
create policy "admin insert promotions" on public.promotions for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update promotions" on public.promotions;
create policy "admin update promotions" on public.promotions for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete promotions" on public.promotions;
create policy "admin delete promotions" on public.promotions for delete to authenticated using(public.is_admin());
