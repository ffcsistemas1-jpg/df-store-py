-- DF Store PY - Administración de pedidos y clientes
-- Ejecutar una vez en Supabase SQL Editor.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;

drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read order items" on public.order_items;
create policy "admin read order items" on public.order_items for select to authenticated using (public.is_admin());
drop policy if exists "admin read customers" on public.customers;
create policy "admin read customers" on public.customers for select to authenticated using (public.is_admin());
