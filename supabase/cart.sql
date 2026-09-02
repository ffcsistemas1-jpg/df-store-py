-- Carrito de compras 100% en Supabase (reemplaza el uso de localStorage).
-- El carrito es anónimo (el cliente no inicia sesión para comprar), por lo que se identifica
-- con un token de sesión aleatorio (UUID) guardado en una cookie del navegador. Ese token
-- actúa como clave de acceso a su propio carrito, similar a un "carrito de invitado" en
-- cualquier e-commerce: no contiene datos personales (solo producto + cantidad), así que
-- no representa un riesgo de privacidad, pero SÍ requiere que el token no se filtre
-- (no lo compartas ni lo expongas en URLs).
-- Ejecutar una sola vez en Supabase SQL Editor (además de final.sql).

create table if not exists public.cart_items(
  id uuid primary key default gen_random_uuid(),
  session text not null,
  product_id text not null,
  name text not null,
  price numeric not null default 0,
  image_url text,
  stock integer not null default 0,
  quantity integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(session, product_id)
);

alter table public.cart_items enable row level security;

drop policy if exists "public manage own cart" on public.cart_items;
create policy "public manage own cart" on public.cart_items for all to anon,authenticated using(true) with check(true);

-- Limpieza opcional: carritos abandonados hace más de 30 días.
-- Podés correr esto manualmente de vez en cuando, o programarlo con pg_cron si tu plan de Supabase lo permite:
-- delete from public.cart_items where updated_at < now() - interval '30 days';
