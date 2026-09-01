create extension if not exists pgcrypto;

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique,
 description text, price numeric(12,0) not null default 0, cost numeric(12,0) default 0,
 stock integer not null default 0, category text, image_url text, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(), full_name text not null, whatsapp text, email text,
 department text, city text, neighborhood text, address text, created_at timestamptz default now()
);
create table if not exists public.shipping_companies(
 id uuid primary key default gen_random_uuid(), name text unique not null, active boolean default true
);
create table if not exists public.delivery_zones(
 id uuid primary key default gen_random_uuid(), department text not null, city text,
 neighborhood text, fee numeric(12,0) default 0, active boolean default true
);
create table if not exists public.bank_accounts(
 id uuid primary key default gen_random_uuid(), bank text not null, account_type text,
 account_number text, holder_name text, document text, alias text, active boolean default true
);
create table if not exists public.tigo_accounts(
 id uuid primary key default gen_random_uuid(), phone text not null, holder_name text,
 document text, active boolean default true
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(), customer_id uuid references public.customers(id),
 status text default 'pendiente', delivery_type text default 'delivery', payment_method text,
 shipping_company_id uuid references public.shipping_companies(id), subtotal numeric(12,0) default 0,
 delivery_fee numeric(12,0) default 0, total numeric(12,0) default 0,
 transfer_receipt_url text, payment_verified boolean default false,
 payment_verified_at timestamptz, created_at timestamptz default now()
);
create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade,
 product_id uuid references public.products(id), product_name text not null, quantity integer default 1,
 unit_price numeric(12,0) default 0, subtotal numeric(12,0) default 0
);

alter table public.products enable row level security;
drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select to anon,authenticated using(active=true);

insert into public.shipping_companies(name) values
('Multienvíos'),('TSI'),('NASA'),('Yaraha PY'),('Aguirre'),('TTL')
on conflict(name) do nothing;

-- IMPORTANTE:
-- Para producción, las operaciones de administración (insert/update/delete de productos,
-- comprobantes, pedidos, cuentas y configuración) deben protegerse con Supabase Auth + RLS.
-- La primera versión del formulario usa la Publishable Key y funcionará solo cuando las
-- políticas de escritura correspondientes sean configuradas para el usuario administrador.

-- Políticas de escritura para administradores (requieren public.is_admin() y sesión autenticada)
alter table public.products enable row level security;
drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update products" on public.products;
create policy "admin update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products for delete to authenticated using (public.is_admin());

-- Soporte de video opcional en productos
alter table public.products add column if not exists video_url text;
