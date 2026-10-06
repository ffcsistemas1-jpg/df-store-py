alter table public.orders
  add column if not exists is_test boolean not null default false;

create index if not exists orders_real_created_at_idx
  on public.orders(created_at desc)
  where is_test = false;

create index if not exists orders_real_status_idx
  on public.orders(status)
  where is_test = false;
