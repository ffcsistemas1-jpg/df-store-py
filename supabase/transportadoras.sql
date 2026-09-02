-- DF Store PY - Etapa 6: Transportadoras
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.shipping_companies add column if not exists phone text;
alter table public.shipping_companies add column if not exists notes text;
alter table public.shipping_companies add column if not exists active boolean default true;
alter table public.shipping_companies enable row level security;

drop policy if exists "public read active shipping companies" on public.shipping_companies;
create policy "public read active shipping companies"
on public.shipping_companies for select to anon,authenticated
using (active=true);

drop policy if exists "admin read shipping companies" on public.shipping_companies;
create policy "admin read shipping companies"
on public.shipping_companies for select to authenticated
using (public.is_admin());

drop policy if exists "admin insert shipping companies" on public.shipping_companies;
create policy "admin insert shipping companies"
on public.shipping_companies for insert to authenticated
with check (public.is_admin());

drop policy if exists "admin update shipping companies" on public.shipping_companies;
create policy "admin update shipping companies"
on public.shipping_companies for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete shipping companies" on public.shipping_companies;
create policy "admin delete shipping companies"
on public.shipping_companies for delete to authenticated
using (public.is_admin());

-- Asegura que las seis transportadoras acordadas existan sin duplicarlas.
insert into public.shipping_companies(name,active) values
('Multienvíos',true),('TSI',true),('NASA',true),('Yahara PY',true),('Aguirre',true),('TTL',true)
on conflict(name) do nothing;

-- Corrige/centraliza la función de checkout para que la referencia de pago
-- usada por la versión actual del frontend sea aceptada y guardada.
-- La tarifa de transporte del interior no se inventa: queda a confirmar.
