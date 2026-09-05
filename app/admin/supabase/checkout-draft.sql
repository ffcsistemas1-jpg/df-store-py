-- Borrador del checkout guardado en Supabase (para que el cliente no pierda sus datos
-- si cierra la pestaña, se queda sin señal, etc.). Se identifica con la misma cookie de
-- sesión que ya usa el carrito (df_cart), y se borra automáticamente al confirmar el pedido.
-- Ejecutar una sola vez en Supabase SQL Editor (además de final.sql).

create table if not exists public.checkout_drafts(
  session text primary key,
  full_name text,
  whatsapp text,
  email text,
  department text,
  city text,
  neighborhood text,
  address text,
  delivery_type text,
  payment_method text,
  shipping_company_id text,
  updated_at timestamptz not null default now()
);

alter table public.checkout_drafts enable row level security;

drop policy if exists "public manage own checkout draft" on public.checkout_drafts;
create policy "public manage own checkout draft" on public.checkout_drafts for all to anon,authenticated using(true) with check(true);

-- Limpieza opcional de borradores viejos (correr manualmente de vez en cuando):
-- delete from public.checkout_drafts where updated_at < now() - interval '30 days';
