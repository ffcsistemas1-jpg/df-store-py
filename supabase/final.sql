-- ============================================================
-- DF STORE PY — SQL FINAL CONSOLIDADO
-- Ejecutar TODO este archivo una sola vez en Supabase SQL Editor.
-- Es idempotente en las tablas/policies/funciones principales.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- TABLAS ----------
create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique,
 description text, price numeric(12,0) not null default 0, cost numeric(12,0) default 0,
 stock integer not null default 0, category text, image_url text, video_url text,
 active boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.products add column if not exists video_url text;

create table if not exists public.customers(
 id uuid primary key default gen_random_uuid(), full_name text not null, whatsapp text, email text,
 department text, city text, neighborhood text, address text, created_at timestamptz default now()
);

create table if not exists public.shipping_companies(
 id uuid primary key default gen_random_uuid(), name text unique not null,
 phone text, notes text, active boolean default true
);
alter table public.shipping_companies add column if not exists phone text;
alter table public.shipping_companies add column if not exists notes text;
alter table public.shipping_companies add column if not exists active boolean default true;

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
 payment_reference text, shipping_company_id uuid references public.shipping_companies(id),
 subtotal numeric(12,0) default 0, delivery_fee numeric(12,0) default 0, total numeric(12,0) default 0,
 transfer_receipt_url text, payment_verified boolean default false,
 delivery_note text, preferred_time text, invoice_requested boolean default false, maps_url text, latitude numeric, longitude numeric,
 payment_verified_at timestamptz, created_at timestamptz default now()
);
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_verified boolean default false;
alter table public.orders add column if not exists payment_verified_at timestamptz;
alter table public.orders add column if not exists transfer_receipt_url text;
alter table public.orders add column if not exists delivery_note text;
alter table public.orders add column if not exists preferred_time text;
alter table public.orders add column if not exists invoice_requested boolean default false;
alter table public.orders add column if not exists maps_url text;
alter table public.orders add column if not exists latitude numeric;
alter table public.orders add column if not exists longitude numeric;

create table if not exists public.order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id) on delete cascade,
 product_id uuid references public.products(id), product_name text not null, quantity integer default 1,
 unit_price numeric(12,0) default 0, subtotal numeric(12,0) default 0
);

create table if not exists public.admin_users(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);

create table if not exists public.store_settings(
 id integer primary key default 1,
 whatsapp text,
 updated_at timestamptz not null default now()
);
insert into public.store_settings(id,whatsapp) values(1,null) on conflict(id) do nothing;

-- ---------- ADMIN ----------
alter table public.admin_users enable row level security;
create or replace function public.is_admin()
returns boolean language sql security definer set search_path=public stable
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- RLS ----------
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_companies enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.tigo_accounts enable row level security;
alter table public.store_settings enable row level security;

-- Products
 drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select to anon,authenticated using(active=true);
drop policy if exists "admin read all products" on public.products;
create policy "admin read all products" on public.products for select to authenticated using(public.is_admin());
drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update products" on public.products;
create policy "admin update products" on public.products for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products for delete to authenticated using(public.is_admin());

-- Shipping companies
 drop policy if exists "public read active shipping companies" on public.shipping_companies;
create policy "public read active shipping companies" on public.shipping_companies for select to anon,authenticated using(active=true);
drop policy if exists "admin read shipping companies" on public.shipping_companies;
create policy "admin read shipping companies" on public.shipping_companies for select to authenticated using(public.is_admin());
drop policy if exists "admin insert shipping companies" on public.shipping_companies;
create policy "admin insert shipping companies" on public.shipping_companies for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update shipping companies" on public.shipping_companies;
create policy "admin update shipping companies" on public.shipping_companies for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete shipping companies" on public.shipping_companies;
create policy "admin delete shipping companies" on public.shipping_companies for delete to authenticated using(public.is_admin());

-- Delivery zones
 drop policy if exists "public read active delivery zones" on public.delivery_zones;
create policy "public read active delivery zones" on public.delivery_zones for select to anon,authenticated using(active=true);
drop policy if exists "admin read delivery zones" on public.delivery_zones;
create policy "admin read delivery zones" on public.delivery_zones for select to authenticated using(public.is_admin());
drop policy if exists "admin insert delivery zones" on public.delivery_zones;
create policy "admin insert delivery zones" on public.delivery_zones for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update delivery zones" on public.delivery_zones;
create policy "admin update delivery zones" on public.delivery_zones for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete delivery zones" on public.delivery_zones;
create policy "admin delete delivery zones" on public.delivery_zones for delete to authenticated using(public.is_admin());

-- Payment accounts: active values are public because checkout needs them.
 drop policy if exists "public read active bank accounts" on public.bank_accounts;
create policy "public read active bank accounts" on public.bank_accounts for select to anon,authenticated using(active=true);
drop policy if exists "admin read bank accounts" on public.bank_accounts;
create policy "admin read bank accounts" on public.bank_accounts for select to authenticated using(public.is_admin());
drop policy if exists "admin insert bank accounts" on public.bank_accounts;
create policy "admin insert bank accounts" on public.bank_accounts for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update bank accounts" on public.bank_accounts;
create policy "admin update bank accounts" on public.bank_accounts for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete bank accounts" on public.bank_accounts;
create policy "admin delete bank accounts" on public.bank_accounts for delete to authenticated using(public.is_admin());

drop policy if exists "public read active tigo accounts" on public.tigo_accounts;
create policy "public read active tigo accounts" on public.tigo_accounts for select to anon,authenticated using(active=true);
drop policy if exists "admin read tigo accounts" on public.tigo_accounts;
create policy "admin read tigo accounts" on public.tigo_accounts for select to authenticated using(public.is_admin());
drop policy if exists "admin insert tigo accounts" on public.tigo_accounts;
create policy "admin insert tigo accounts" on public.tigo_accounts for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update tigo accounts" on public.tigo_accounts;
create policy "admin update tigo accounts" on public.tigo_accounts for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin delete tigo accounts" on public.tigo_accounts;
create policy "admin delete tigo accounts" on public.tigo_accounts for delete to authenticated using(public.is_admin());

-- Orders / customers: only admin can read/update. Public checkout uses RPC.
drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated using(public.is_admin());
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "admin read order items" on public.order_items;
create policy "admin read order items" on public.order_items for select to authenticated using(public.is_admin());
drop policy if exists "admin read customers" on public.customers;
create policy "admin read customers" on public.customers for select to authenticated using(public.is_admin());

-- Store settings: public can read WhatsApp; only admin can change it.
drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select to anon,authenticated using(true);
drop policy if exists "admin insert store settings" on public.store_settings;
create policy "admin insert store settings" on public.store_settings for insert to authenticated with check(public.is_admin());
drop policy if exists "admin update store settings" on public.store_settings;
create policy "admin update store settings" on public.store_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- ---------- CHECKOUT SEGURO ----------
create or replace function public.create_order(
 p_customer jsonb,
 p_items jsonb,
 p_delivery_type text default 'delivery',
 p_payment_method text default 'Pago al recibir',
 p_shipping_company_id uuid default null,
 p_payment_reference text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
 v_customer_id uuid; v_order_id uuid; v_subtotal numeric(12,0):=0; v_delivery_fee numeric(12,0):=0;
 v_qty integer; v_product products%rowtype; v_item jsonb; v_zone delivery_zones%rowtype;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'El carrito está vacío'; end if;
 if coalesce(trim(p_customer->>'full_name'),'')='' or coalesce(trim(p_customer->>'whatsapp'),'')='' then raise exception 'Nombre y WhatsApp son obligatorios'; end if;
 if p_delivery_type not in ('delivery','interior','retiro') then raise exception 'Tipo de entrega inválido'; end if;
 if p_delivery_type in ('delivery','interior') and (coalesce(trim(p_customer->>'department'),'')='' or coalesce(trim(p_customer->>'city'),'')='') then raise exception 'Departamento y ciudad son obligatorios'; end if;
 if p_delivery_type<>'retiro' and coalesce(trim(p_customer->>'address'),'')='' then raise exception 'La dirección es obligatoria para el envío'; end if;
 if p_payment_method not in ('Pago al recibir','Transferencia','Giro Tigo') then raise exception 'Método de pago inválido'; end if;
 if p_payment_method in ('Transferencia','Giro Tigo') and p_payment_reference is not null and length(trim(p_payment_reference))>200 then raise exception 'Referencia de pago demasiado larga'; end if;
 if p_delivery_type='interior' then
   if p_shipping_company_id is null then raise exception 'Seleccioná una transportadora'; end if;
   if not exists(select 1 from shipping_companies where id=p_shipping_company_id and active=true) then raise exception 'Transportadora no disponible'; end if;
 elsif p_shipping_company_id is not null then raise exception 'Transportadora no corresponde a este tipo de entrega'; end if;
 if p_delivery_type='delivery' then
   select * into v_zone from delivery_zones
   where active=true and lower(trim(department))=lower(trim(p_customer->>'department'))
     and (city is null or lower(trim(city))=lower(trim(p_customer->>'city')))
     and (neighborhood is null or lower(trim(neighborhood))=lower(trim(coalesce(p_customer->>'neighborhood',''))))
   order by (case when neighborhood is not null then 3 else 0 end + case when city is not null then 2 else 0 end) desc,id limit 1;
   if found then
    v_delivery_fee:=coalesce(v_zone.fee,0);
  else
    raise exception 'No tenemos delivery configurado para esa zona.';
  end if;
 end if;
 insert into customers(full_name,whatsapp,email,department,city,neighborhood,address)
 values(trim(p_customer->>'full_name'),trim(p_customer->>'whatsapp'),nullif(trim(p_customer->>'email'),''),nullif(trim(p_customer->>'department'),''),nullif(trim(p_customer->>'city'),''),nullif(trim(p_customer->>'neighborhood'),''),nullif(trim(p_customer->>'address'),'')) returning id into v_customer_id;
 insert into orders(customer_id,status,delivery_type,payment_method,payment_reference,shipping_company_id,subtotal,delivery_fee,total)
 values(v_customer_id,'pendiente',p_delivery_type,p_payment_method,nullif(trim(p_payment_reference),''),p_shipping_company_id,0,v_delivery_fee,0) returning id into v_order_id;
 update orders set delivery_note=nullif(trim(p_customer->>'note'),''), preferred_time=nullif(trim(p_customer->>'preferred_time'),''), invoice_requested=coalesce((p_customer->>'invoice_requested')::boolean,false), maps_url=nullif(trim(p_customer->>'maps_url'),''), latitude=nullif(trim(p_customer->>'latitude'),'')::numeric, longitude=nullif(trim(p_customer->>'longitude'),'')::numeric where id=v_order_id;
 for v_item in select * from jsonb_array_elements(p_items) loop
   v_qty:=floor(coalesce((v_item->>'quantity')::numeric,0)); if v_qty<1 then raise exception 'Cantidad inválida'; end if;
   select * into v_product from products where id=(v_item->>'id')::uuid and active=true for update;
   if not found then raise exception 'Producto no disponible'; end if;
   if v_product.stock<v_qty then raise exception 'Stock insuficiente para: %',v_product.name; end if;
   insert into order_items(order_id,product_id,product_name,quantity,unit_price,subtotal) values(v_order_id,v_product.id,v_product.name,v_qty,v_product.price,v_product.price*v_qty);
   v_subtotal:=v_subtotal+v_product.price*v_qty;
   update products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
 end loop;
 update orders set subtotal=v_subtotal,total=v_subtotal+v_delivery_fee where id=v_order_id;
 return jsonb_build_object('id',v_order_id,'subtotal',v_subtotal,'delivery_fee',v_delivery_fee,'total',v_subtotal+v_delivery_fee,'delivery_type',p_delivery_type);
end; $$;

revoke all on function public.create_order(jsonb,jsonb,text,text,uuid,text) from public;
grant execute on function public.create_order(jsonb,jsonb,text,text,uuid,text) to anon,authenticated;

-- ---------- STORAGE: bucket productos ----------
insert into storage.buckets(id,name,public) values('productos','productos',true)
on conflict(id) do update set public=true;

 drop policy if exists "public read product media" on storage.objects;
create policy "public read product media" on storage.objects for select to anon,authenticated using(bucket_id='productos');
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated with check(bucket_id='productos' and public.is_admin());
drop policy if exists "admins update product media" on storage.objects;
create policy "admins update product media" on storage.objects for update to authenticated using(bucket_id='productos' and public.is_admin()) with check(bucket_id='productos' and public.is_admin());
drop policy if exists "admins delete product media" on storage.objects;
create policy "admins delete product media" on storage.objects for delete to authenticated using(bucket_id='productos' and public.is_admin());

-- ---------- TRANSPORTADORAS INICIALES ----------
insert into public.shipping_companies(name,active) values
('Multienvíos',true),('TSI',true),('NASA',true),('Yahara PY',true),('Aguirre',true),('TTL',true)
on conflict(name) do nothing;

-- ---------- PROMOCIONES + BANNER SUPERIOR ----------
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

-- ---------- COBERTURA DE TRANSPORTADORAS (departamento/ciudad) ----------
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

-- ---------- CARRITO EN SUPABASE (reemplaza localStorage) ----------
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

-- ---------- BORRADOR DE CHECKOUT (para no perder datos si el cliente se va a mitad de camino) ----------
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
  preferred_time text,
  invoice_requested boolean not null default false,
  maps_url text,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.checkout_drafts add column if not exists preferred_time text;
alter table public.checkout_drafts add column if not exists invoice_requested boolean not null default false;
alter table public.checkout_drafts add column if not exists maps_url text;
alter table public.checkout_drafts add column if not exists note text;
alter table public.checkout_drafts enable row level security;
drop policy if exists "public manage own checkout draft" on public.checkout_drafts;
create policy "public manage own checkout draft" on public.checkout_drafts for all to anon,authenticated using(true) with check(true);

-- ---------- EMBUDO DE VENTAS (analítica básica + checkouts abandonados) ----------
alter table public.checkout_drafts add column if not exists completed_at timestamptz;

create table if not exists public.analytics_events(
  id uuid primary key default gen_random_uuid(),
  session text not null,
  type text not null check (type in ('visit','product_view')),
  product_id text,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
drop policy if exists "public insert analytics events" on public.analytics_events;
create policy "public insert analytics events" on public.analytics_events for insert to anon,authenticated with check(true);
drop policy if exists "admin read analytics events" on public.analytics_events;
create policy "admin read analytics events" on public.analytics_events for select to authenticated using(public.is_admin());
drop policy if exists "admin delete analytics events" on public.analytics_events;
create policy "admin delete analytics events" on public.analytics_events for delete to authenticated using(public.is_admin());

-- ============================================================
-- FIN
-- ============================================================

-- ============================================================
-- PRIVACIDAD DE CHECKOUT DRAFTS
-- Evita que clientes anónimos puedan listar datos personales de otros
-- checkouts. El cliente solo accede a su borrador mediante un token de
-- sesión no enumerable y funciones RPC específicas.
-- ============================================================
drop policy if exists "public manage own checkout draft" on public.checkout_drafts;
drop policy if exists "admin read checkout drafts" on public.checkout_drafts;
drop policy if exists "admin delete checkout drafts" on public.checkout_drafts;
create policy "admin read checkout drafts" on public.checkout_drafts
  for select to authenticated using(public.is_admin());
create policy "admin delete checkout drafts" on public.checkout_drafts
  for delete to authenticated using(public.is_admin());

create or replace function public.get_checkout_draft(p_session text)
returns table(
  full_name text, whatsapp text, email text, department text, city text,
  neighborhood text, address text, delivery_type text, payment_method text,
  shipping_company_id text, preferred_time text, invoice_requested boolean,
  maps_url text, note text, completed_at timestamptz
)
language sql security definer set search_path=public stable
as $$
  select d.full_name,d.whatsapp,d.email,d.department,d.city,d.neighborhood,d.address,
         d.delivery_type,d.payment_method,d.shipping_company_id,d.preferred_time,
         d.invoice_requested,d.maps_url,d.note,d.completed_at
  from public.checkout_drafts d
  where d.session=p_session
  limit 1;
$$;
revoke all on function public.get_checkout_draft(text) from public;
grant execute on function public.get_checkout_draft(text) to anon,authenticated;

create or replace function public.save_checkout_draft(p_session text,p_draft jsonb)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if coalesce(length(trim(p_session)),0)<20 or length(p_session)>200 then
    raise exception 'Sesión inválida';
  end if;
  insert into public.checkout_drafts(
    session,full_name,whatsapp,email,department,city,neighborhood,address,
    delivery_type,payment_method,shipping_company_id,preferred_time,
    invoice_requested,maps_url,note,updated_at
  ) values(
    p_session,nullif(trim(p_draft->>'full_name'),''),nullif(trim(p_draft->>'whatsapp'),''),
    nullif(trim(p_draft->>'email'),''),nullif(trim(p_draft->>'department'),''),
    nullif(trim(p_draft->>'city'),''),nullif(trim(p_draft->>'neighborhood'),''),
    nullif(trim(p_draft->>'address'),''),nullif(trim(p_draft->>'delivery_type'),''),
    nullif(trim(p_draft->>'payment_method'),''),nullif(trim(p_draft->>'shipping_company_id'),''),
    nullif(trim(p_draft->>'preferred_time'),''),coalesce((p_draft->>'invoice_requested')::boolean,false),
    nullif(trim(p_draft->>'maps_url'),''),nullif(trim(p_draft->>'note'),''),now()
  ) on conflict(session) do update set
    full_name=excluded.full_name,whatsapp=excluded.whatsapp,email=excluded.email,
    department=excluded.department,city=excluded.city,neighborhood=excluded.neighborhood,
    address=excluded.address,delivery_type=excluded.delivery_type,payment_method=excluded.payment_method,
    shipping_company_id=excluded.shipping_company_id,preferred_time=excluded.preferred_time,
    invoice_requested=excluded.invoice_requested,maps_url=excluded.maps_url,note=excluded.note,
    updated_at=now();
end;
$$;
revoke all on function public.save_checkout_draft(text,jsonb) from public;
grant execute on function public.save_checkout_draft(text,jsonb) to anon,authenticated;

create or replace function public.complete_checkout_draft(p_session text)
returns void
language sql security definer set search_path=public
as $$ update public.checkout_drafts set completed_at=now() where session=p_session; $$;
revoke all on function public.complete_checkout_draft(text) from public;
grant execute on function public.complete_checkout_draft(text) to anon,authenticated;
