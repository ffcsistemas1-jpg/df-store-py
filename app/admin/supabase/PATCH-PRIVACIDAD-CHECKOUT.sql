-- DF Store PY — parche obligatorio antes de producción
-- Corrige la exposición pública de datos personales en checkout_drafts.

alter table public.checkout_drafts enable row level security;
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
