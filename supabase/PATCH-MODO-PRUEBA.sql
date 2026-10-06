-- Protección de pedidos reales.
-- La tienda pública no acepta pedidos de prueba. Todo pedido creado desde
-- checkout se considera comercial y debe quedar como registro real.
--
-- La columna is_test queda reservada para futuras herramientas administrativas
-- internas; los paneles comerciales la excluyen explícitamente cuando es true.

alter table public.orders
  add column if not exists is_test boolean not null default false;

create index if not exists orders_real_created_at_idx
  on public.orders(created_at desc)
  where is_test = false;

create index if not exists orders_real_status_idx
  on public.orders(status)
  where is_test = false;
