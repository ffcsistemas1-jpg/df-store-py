-- DF Store PY — Meta Ads/CAPI hardening + reproducibilidad
-- 2026-09-03
-- Objetivos:
-- 1) idempotencia real de eventos CAPI
-- 2) Purchase toma total/productos/cliente desde el pedido real
-- 3) cerrar la RPC antigua de logging público
-- 4) conservar una migración completa de create_order con atribución

begin;

create table if not exists public.meta_event_dispatches (
  event_name text not null check (event_name in ('PageView','ViewContent','AddToCart','InitiateCheckout','Purchase')),
  event_id text not null,
  order_id uuid null references public.orders(id) on delete set null,
  status text not null default 'claimed' check (status in ('claimed','sent','error','network_error','not_configured')),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz null,
  primary key (event_name, event_id)
);

alter table public.meta_event_dispatches enable row level security;
revoke all on public.meta_event_dispatches from anon, authenticated;
grant select on public.meta_event_dispatches to authenticated;
drop policy if exists "admin read meta event dispatches" on public.meta_event_dispatches;
create policy "admin read meta event dispatches" on public.meta_event_dispatches
for select to authenticated using (public.is_admin());

-- La función vieja permitía insertar logs arbitrarios sin validación.
revoke execute on function public.log_meta_event(text,text,text,uuid,numeric,text,text,jsonb) from anon;
revoke execute on function public.log_meta_event(text,text,text,uuid,numeric,text,text,jsonb) from authenticated;

create or replace function public.claim_meta_event(
  p_event_name text,
  p_event_id text,
  p_order_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean := false;
begin
  if p_event_name not in ('PageView','ViewContent','AddToCart','InitiateCheckout','Purchase') then
    return false;
  end if;
  if p_event_id is null or length(trim(p_event_id)) < 8 or length(trim(p_event_id)) > 128 then
    return false;
  end if;

  if p_event_name = 'Purchase' then
    if p_order_id is null then return false; end if;
    if not exists (
      select 1 from public.orders o
      where o.id = p_order_id and o.event_id = trim(p_event_id)
    ) then
      return false;
    end if;
  end if;

  insert into public.meta_event_dispatches(event_name,event_id,order_id,status,claimed_at,completed_at)
  values(p_event_name,trim(p_event_id),p_order_id,'claimed',now(),null)
  on conflict(event_name,event_id) do update
    set order_id = coalesce(excluded.order_id, public.meta_event_dispatches.order_id),
        status = 'claimed', claimed_at = now(), completed_at = null
    where public.meta_event_dispatches.status in ('error','network_error','not_configured');

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;

revoke all on function public.claim_meta_event(text,text,uuid) from public;
grant execute on function public.claim_meta_event(text,text,uuid) to anon, authenticated;

create or replace function public.get_meta_purchase_payload(
  p_order_id uuid,
  p_event_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'order_id', o.id,
    'event_id', o.event_id,
    'value', o.total,
    'currency', 'PYG',
    'content_ids', coalesce((select jsonb_agg(oi.product_id::text order by oi.id) from public.order_items oi where oi.order_id=o.id), '[]'::jsonb),
    'num_items', coalesce((select sum(oi.quantity) from public.order_items oi where oi.order_id=o.id),0),
    'email', c.email,
    'phone', c.whatsapp,
    'fbp', o.fbp,
    'fbc', o.fbc,
    'landing_page', o.landing_page
  ) into v_result
  from public.orders o
  left join public.customers c on c.id=o.customer_id
  where o.id=p_order_id and o.event_id=trim(p_event_id)
  limit 1;
  return v_result;
end;
$$;

revoke all on function public.get_meta_purchase_payload(uuid,text) from public;
grant execute on function public.get_meta_purchase_payload(uuid,text) to anon, authenticated;

create or replace function public.record_meta_event_result(
  p_event_id text,
  p_event_name text,
  p_order_id uuid,
  p_value numeric,
  p_currency text,
  p_status text,
  p_response jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('sent','error','network_error','not_configured') then return false; end if;
  if not exists (
    select 1 from public.meta_event_dispatches d
    where d.event_name=p_event_name and d.event_id=trim(p_event_id)
      and (p_event_name <> 'Purchase' or d.order_id=p_order_id)
  ) then return false; end if;

  insert into public.meta_events_log(event_id,event_name,source,order_id,value,currency,status,response)
  values(trim(p_event_id),p_event_name,'capi',p_order_id,p_value,left(coalesce(p_currency,'PYG'),8),p_status,p_response);

  update public.meta_event_dispatches
  set status=p_status, completed_at=now()
  where event_name=p_event_name and event_id=trim(p_event_id);
  return true;
end;
$$;

revoke all on function public.record_meta_event_result(text,text,uuid,numeric,text,text,jsonb) from public;
grant execute on function public.record_meta_event_result(text,text,uuid,numeric,text,text,jsonb) to anon, authenticated;

-- Atribución completa. Se incluye el cuerpo íntegro para que el repositorio
-- pueda reconstruir la función real de producción sin depender del historial.
create or replace function public.create_order(
  p_customer jsonb,
  p_items jsonb,
  p_delivery_type text default 'delivery',
  p_payment_method text default 'Pago al recibir',
  p_shipping_company_id uuid default null,
  p_payment_reference text default null,
  p_attribution jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
 v_customer_id uuid; v_order_id uuid; v_subtotal numeric(12,0):=0; v_delivery_fee numeric(12,0):=0;
 v_qty integer; v_product products%rowtype; v_item jsonb; v_zone delivery_zones%rowtype; v_event_id text;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'El carrito está vacío'; end if;
 if coalesce(trim(p_customer->>'full_name'),'')='' or coalesce(trim(p_customer->>'whatsapp'),'')='' then raise exception 'Nombre y WhatsApp son obligatorios'; end if;
 if p_delivery_type not in ('delivery','interior','retiro') then raise exception 'Tipo de entrega inválido'; end if;
 if p_delivery_type in ('delivery','interior') and (coalesce(trim(p_customer->>'department'),'')='' or coalesce(trim(p_customer->>'city'),'')='') then raise exception 'Departamento y ciudad son obligatorios'; end if;
 if p_delivery_type<>'retiro' and coalesce(trim(p_customer->>'address'),'')='' then raise exception 'La dirección es obligatoria para el envío'; end if;
 if p_payment_method not in ('Pago al recibir','Transferencia','Giro Tigo') then raise exception 'Método de pago inválido'; end if;
 if p_delivery_type='delivery' and p_payment_method<>'Pago al recibir' then raise exception 'En delivery local el pago es al recibir'; end if;
 if p_delivery_type='interior' and p_payment_method<>'Transferencia' then raise exception 'Para envíos al interior el pago es por transferencia'; end if;
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
   if found then v_delivery_fee:=coalesce(v_zone.fee,0); else raise exception 'No tenemos delivery configurado para esa zona.'; end if;
 end if;
 insert into customers(full_name,whatsapp,email,ruc,business_name,department,city,neighborhood,address)
 values(trim(p_customer->>'full_name'),trim(p_customer->>'whatsapp'),nullif(trim(p_customer->>'email'),''),nullif(trim(p_customer->>'ruc'),''),nullif(trim(p_customer->>'business_name'),''),nullif(trim(p_customer->>'department'),''),nullif(trim(p_customer->>'city'),''),nullif(trim(p_customer->>'neighborhood'),''),nullif(trim(p_customer->>'address'),'')) returning id into v_customer_id;
 v_event_id:=nullif(trim(p_attribution->>'event_id'),'');
 insert into orders(customer_id,status,delivery_type,payment_method,payment_reference,shipping_company_id,subtotal,delivery_fee,total,
   utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,fbp,fbc,landing_page,event_id)
 values(v_customer_id,case when p_delivery_type='interior' then 'esperando_comprobante' else 'nuevo' end,p_delivery_type,p_payment_method,nullif(trim(p_payment_reference),''),p_shipping_company_id,0,v_delivery_fee,0,
   nullif(trim(p_attribution->>'utm_source'),''),nullif(trim(p_attribution->>'utm_medium'),''),nullif(trim(p_attribution->>'utm_campaign'),''),
   nullif(trim(p_attribution->>'utm_content'),''),nullif(trim(p_attribution->>'utm_term'),''),nullif(trim(p_attribution->>'fbclid'),''),
   nullif(trim(p_attribution->>'fbp'),''),nullif(trim(p_attribution->>'fbc'),''),nullif(trim(p_attribution->>'landing_page'),''),v_event_id)
 returning id into v_order_id;
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
 return jsonb_build_object('id',v_order_id,'subtotal',v_subtotal,'delivery_fee',v_delivery_fee,'total',v_subtotal+v_delivery_fee,'delivery_type',p_delivery_type,'event_id',v_event_id);
end;
$$;

commit;
