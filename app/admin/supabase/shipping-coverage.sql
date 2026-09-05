-- Cobertura de transportadoras por departamento y ciudad
-- Permite que en el checkout, al elegir "Envío al interior" y un departamento,
-- se filtren automáticamente las ciudades y transportadoras disponibles para esa zona.
-- Ejecutar una sola vez en Supabase SQL Editor (además de final.sql / promotions.sql).

create table if not exists public.shipping_coverage(
  id uuid primary key default gen_random_uuid(),
  shipping_company_id uuid not null references public.shipping_companies(id) on delete cascade,
  department text not null,
  city text,
  created_at timestamptz not null default now()
);

alter table public.shipping_coverage enable row level security;

drop policy if exists "public read shipping coverage" on public.shipping_coverage;
create policy "public read shipping coverage" on public.shipping_coverage for select to anon,authenticated using(
  exists(select 1 from public.shipping_companies c where c.id=shipping_company_id and c.active=true)
);
drop policy if exists "admin read all shipping coverage" on public.shipping_coverage;
create policy "admin read all shipping coverage" on public.shipping_coverage for select to authenticated using(public.is_admin());
drop policy if exists "admin insert shipping coverage" on public.shipping_coverage;
create policy "admin insert shipping coverage" on public.shipping_coverage for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update shipping coverage" on public.shipping_coverage;
create policy "admin update shipping coverage" on public.shipping_coverage for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete shipping coverage" on public.shipping_coverage;
create policy "admin delete shipping coverage" on public.shipping_coverage for delete to authenticated using(public.is_admin());
