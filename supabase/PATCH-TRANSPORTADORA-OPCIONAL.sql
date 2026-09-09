-- DF Store PY — Transportadora opcional en checkout
-- Ejecutar UNA VEZ en Supabase SQL Editor.
-- Permite confirmar pedidos del interior sin elegir transportadora.

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
   if p_shipping_company_id is not null and not exists(select 1 from shipping_companies where id=p_shipping_company_id and active=true) then raise exception 'Transportadora no disponible'; end if;
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
