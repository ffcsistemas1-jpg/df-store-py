-- Repair register_manual_sale_from_checkout to match the live orders schema.
-- Safe CREATE OR REPLACE: does not alter existing orders, stock, Meta events, or sales.
create or replace function public.register_manual_sale_from_checkout(
  p_session text,
  p_payment_method text default 'Pago al recibir'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_draft checkout_drafts%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_subtotal numeric(12,0):=0;
  v_delivery_fee numeric(12,0):=0;
  v_product products%rowtype;
  v_cart cart_items%rowtype;
  v_zone delivery_zones%rowtype;
  v_shipping_company_id uuid;
begin
  if not public.is_admin() then raise exception 'Acceso denegado'; end if;
  if coalesce(trim(p_session),'')='' then raise exception 'Falta la sesión del checkout'; end if;
  select * into v_draft from public.checkout_drafts where session=p_session for update;
  if not found then raise exception 'El checkout abandonado ya no existe'; end if;
  if v_draft.completed_at is not null then raise exception 'Este checkout ya fue convertido en venta'; end if;
  if coalesce(trim(v_draft.full_name),'')='' or coalesce(trim(v_draft.whatsapp),'')='' then raise exception 'El checkout no tiene nombre y WhatsApp completos'; end if;
  if v_draft.delivery_type not in ('delivery','interior','retiro') then raise exception 'Tipo de entrega inválido'; end if;
  if v_draft.delivery_type in ('delivery','interior') and (coalesce(trim(v_draft.department),'')='' or coalesce(trim(v_draft.city),'')='') then raise exception 'El checkout no tiene departamento y ciudad completos'; end if;
  if v_draft.delivery_type='interior' and coalesce(trim(v_draft.address),'')='' then raise exception 'El checkout no tiene dirección para el envío al interior'; end if;
  if p_payment_method not in ('Pago al recibir','Transferencia','Giro Tigo') then raise exception 'Método de pago inválido'; end if;
  if v_draft.delivery_type='delivery' and p_payment_method<>'Pago al recibir' then raise exception 'En delivery local el pago debe ser al recibir'; end if;
  if v_draft.delivery_type='interior' and p_payment_method not in ('Transferencia','Giro Tigo') then raise exception 'Para el interior el pago debe ser por Transferencia o Giro Tigo'; end if;
  if v_draft.delivery_type='interior' then
    if coalesce(trim(v_draft.shipping_company_id),'')='' then raise exception 'Falta la transportadora'; end if;
    begin v_shipping_company_id:=v_draft.shipping_company_id::uuid; exception when invalid_text_representation then raise exception 'Transportadora inválida'; end;
    if not exists(select 1 from public.shipping_companies where id=v_shipping_company_id and active=true) then raise exception 'Transportadora no disponible'; end if;
  end if;
  if v_draft.delivery_type='delivery' then
    select * into v_zone from public.delivery_zones where active=true and lower(trim(department))=lower(trim(v_draft.department)) and (city is null or lower(trim(city))=lower(trim(v_draft.city))) and (neighborhood is null or lower(trim(neighborhood))=lower(trim(coalesce(v_draft.neighborhood,'')))) order by (case when neighborhood is not null then 3 else 0 end + case when city is not null then 2 else 0 end) desc,id limit 1;
    if not found then raise exception 'No tenemos delivery configurado para esa zona'; end if;
    v_delivery_fee:=coalesce(v_zone.fee,0);
  end if;
  select id into v_customer_id from public.customers where trim(whatsapp)=trim(v_draft.whatsapp) order by created_at desc limit 1;
  if v_customer_id is null then
    insert into public.customers(full_name,whatsapp,email,department,city,neighborhood,address) values(trim(v_draft.full_name),trim(v_draft.whatsapp),nullif(trim(v_draft.email),''),nullif(trim(v_draft.department),''),nullif(trim(v_draft.city),''),nullif(trim(v_draft.neighborhood),''),nullif(trim(v_draft.address),'')) returning id into v_customer_id;
  else
    update public.customers set full_name=trim(v_draft.full_name),email=nullif(trim(v_draft.email),''),department=nullif(trim(v_draft.department),''),city=nullif(trim(v_draft.city),''),neighborhood=nullif(trim(v_draft.neighborhood),''),address=nullif(trim(v_draft.address),'') where id=v_customer_id;
  end if;
  insert into public.orders(customer_id,status,delivery_type,payment_method,payment_verified,payment_verified_at,shipping_company_id,subtotal,delivery_fee,total,landing_page,event_id,is_test,sale_origin)
  values(v_customer_id,'nuevo',v_draft.delivery_type,p_payment_method,case when p_payment_method in ('Transferencia','Giro Tigo') then true else false end,case when p_payment_method in ('Transferencia','Giro Tigo') then now() else null end,v_shipping_company_id,0,v_delivery_fee,0,'manual_abandoned_checkout',null,false,'manual_abandoned_checkout')
  returning id into v_order_id;
  for v_cart in select * from public.cart_items where session=p_session order by updated_at,id loop
    if v_cart.quantity<1 then raise exception 'Cantidad inválida'; end if;
    select * into v_product from public.products where id=v_cart.product_id::uuid and active=true for update;
    if not found then raise exception 'Producto no disponible: %',v_cart.name; end if;
    if v_product.stock<v_cart.quantity then raise exception 'Stock insuficiente para: %',v_product.name; end if;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,subtotal) values(v_order_id,v_product.id,v_product.name,v_cart.quantity,v_product.price,v_product.price*v_cart.quantity);
    v_subtotal:=v_subtotal+v_product.price*v_cart.quantity;
    update public.products set stock=stock-v_cart.quantity,updated_at=now() where id=v_product.id;
  end loop;
  if v_subtotal=0 then raise exception 'Este checkout no tiene productos guardados'; end if;
  update public.orders set subtotal=v_subtotal,total=v_subtotal+v_delivery_fee where id=v_order_id;
  update public.checkout_drafts set completed_at=now(),updated_at=now() where session=p_session;
  delete from public.cart_items where session=p_session;
  return jsonb_build_object('id',v_order_id,'total',v_subtotal+v_delivery_fee,'sale_origin','manual_abandoned_checkout');
end;
$function$;

revoke all on function public.register_manual_sale_from_checkout(text,text) from public;
grant execute on function public.register_manual_sale_from_checkout(text,text) to authenticated;
