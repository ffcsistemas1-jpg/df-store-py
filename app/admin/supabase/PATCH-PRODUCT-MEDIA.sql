-- DF Store PY — galería multimedia por producto (máximo 5 imágenes + 5 videos)
-- Mantiene products.image_url / products.video_url para compatibilidad con catálogo existente.

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  url text not null,
  storage_path text not null,
  mime_type text,
  original_name text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sort_order integer not null default 0 check (sort_order between 0 and 4),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, media_type, sort_order),
  unique(storage_path)
);

alter table public.product_media enable row level security;

drop policy if exists "public read product media" on public.product_media;
create policy "public read product media" on public.product_media
for select to anon, authenticated using (
  exists(select 1 from public.products p where p.id=product_id and p.active=true)
  or public.is_admin()
);

drop policy if exists "admin insert product media" on public.product_media;
create policy "admin insert product media" on public.product_media
for insert to authenticated with check (public.is_admin());

drop policy if exists "admin update product media" on public.product_media;
create policy "admin update product media" on public.product_media
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete product media" on public.product_media;
create policy "admin delete product media" on public.product_media
for delete to authenticated using (public.is_admin());

create or replace function public.enforce_product_media_limit()
returns trigger language plpgsql set search_path=public as $$
declare n integer;
begin
  select count(*) into n from public.product_media
  where product_id=new.product_id and media_type=new.media_type and id<>new.id;
  if n >= 5 then
    raise exception 'Máximo 5 archivos de tipo % por producto', new.media_type;
  end if;
  if new.is_primary and new.media_type <> 'image' then
    raise exception 'Solo una imagen puede ser portada';
  end if;
  return new;
end $$;

drop trigger if exists trg_product_media_limit on public.product_media;
create trigger trg_product_media_limit
before insert or update on public.product_media
for each row execute function public.enforce_product_media_limit();

create unique index if not exists product_media_one_primary_image
on public.product_media(product_id)
where is_primary=true and media_type='image';

-- Storage: el bucket productos ya es público para lectura. Las escrituras quedan solo para admins autenticados.
drop policy if exists "admin upload productos" on storage.objects;
create policy "admin upload productos" on storage.objects
for insert to authenticated with check (bucket_id='productos' and public.is_admin());

drop policy if exists "admin update productos" on storage.objects;
create policy "admin update productos" on storage.objects
for update to authenticated using (bucket_id='productos' and public.is_admin()) with check (bucket_id='productos' and public.is_admin());

drop policy if exists "admin delete productos" on storage.objects;
create policy "admin delete productos" on storage.objects
for delete to authenticated using (bucket_id='productos' and public.is_admin());

-- No fijamos file_size_limit de bucket: NULL permite usar el máximo global que admita el plan de Supabase.
