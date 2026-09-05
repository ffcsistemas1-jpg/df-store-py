-- Atribución de Meta Ads (UTM + fbclid/fbp/fbc) + log de eventos CAPI.
-- Ya aplicado directamente en el proyecto Supabase cpeyiwuxqgukdvkcpfwr
-- el 2026-09-03. Este archivo queda como referencia/backup, no hace falta
-- volver a correrlo salvo que se reconstruya la base desde cero.

alter table public.orders add column if not exists utm_source text;
alter table public.orders add column if not exists utm_medium text;
alter table public.orders add column if not exists utm_campaign text;
alter table public.orders add column if not exists utm_content text;
alter table public.orders add column if not exists utm_term text;
alter table public.orders add column if not exists fbclid text;
alter table public.orders add column if not exists fbp text;
alter table public.orders add column if not exists fbc text;
alter table public.orders add column if not exists landing_page text;
alter table public.orders add column if not exists event_id text;
create index if not exists idx_orders_utm_campaign on public.orders(utm_campaign);
create index if not exists idx_orders_event_id on public.orders(event_id);

create table if not exists public.meta_events_log(
  id bigint generated always as identity primary key,
  event_id text not null,
  event_name text not null,
  source text not null check (source in ('capi','pixel_ack')),
  order_id uuid references public.orders(id),
  value numeric,
  currency text,
  status text not null default 'pending',
  response jsonb,
  created_at timestamptz not null default now()
);
alter table public.meta_events_log enable row level security;
drop policy if exists "admin read meta events log" on public.meta_events_log;
create policy "admin read meta events log" on public.meta_events_log for select to authenticated using(public.is_admin());

create or replace function public.log_meta_event(
  p_event_id text, p_event_name text, p_source text, p_order_id uuid,
  p_value numeric, p_currency text, p_status text, p_response jsonb
) returns void
language sql security definer set search_path=public
as $$
  insert into public.meta_events_log(event_id,event_name,source,order_id,value,currency,status,response)
  values(p_event_id,p_event_name,p_source,p_order_id,p_value,p_currency,p_status,p_response);
$$;
revoke all on function public.log_meta_event(text,text,text,uuid,numeric,text,text,jsonb) from public;
grant execute on function public.log_meta_event(text,text,text,uuid,numeric,text,text,jsonb) to anon,authenticated;

-- IMPORTANTE: security_invoker=on es obligatorio en esta vista. Sin esto,
-- la vista corre con privilegios del dueño (postgres) y salta el RLS de
-- orders/meta_events_log, exponiendo datos de clientes públicamente.
create or replace view public.meta_events_recent as
select l.id,l.event_id,l.event_name,l.source,l.status,l.value,l.currency,l.created_at,
       o.utm_campaign,o.utm_source,o.utm_medium,o.fbclid
from public.meta_events_log l left join public.orders o on o.id=l.order_id
order by l.created_at desc limit 100;
alter view public.meta_events_recent set (security_invoker = on);
revoke all on public.meta_events_recent from anon, authenticated, public;
grant select on public.meta_events_recent to authenticated;

-- create_order: agrega el parámetro p_attribution (jsonb, opcional) para
-- guardar utm_*/fbclid/fbp/fbc/landing_page/event_id en cada pedido.
-- (Cuerpo completo de la función en el código fuente del proyecto —
-- este archivo documenta el cambio de firma, no repite las ~40 líneas
-- de validación de negocio que ya existían.)
