-- DF Store PY - Etapa 5: Delivery y zonas
-- Ejecutar una vez en Supabase SQL Editor.

alter table public.delivery_zones enable row level security;

drop policy if exists "public read active delivery zones" on public.delivery_zones;
create policy "public read active delivery zones"
on public.delivery_zones for select to anon,authenticated
using (active=true);

drop policy if exists "admin read delivery zones" on public.delivery_zones;
create policy "admin read delivery zones"
on public.delivery_zones for select to authenticated
using (public.is_admin());

drop policy if exists "admin insert delivery zones" on public.delivery_zones;
create policy "admin insert delivery zones"
on public.delivery_zones for insert to authenticated
with check (public.is_admin());

drop policy if exists "admin update delivery zones" on public.delivery_zones;
create policy "admin update delivery zones"
on public.delivery_zones for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete delivery zones" on public.delivery_zones;
create policy "admin delete delivery zones"
on public.delivery_zones for delete to authenticated
using (public.is_admin());

-- Mantiene segura la función de checkout: la tarifa se determina en Supabase.
-- No es necesario cargar zonas aquí; se agregan desde Admin > Delivery y zonas.
