-- DF Store PY — quita el límite artificial de 5 imágenes / 5 videos por producto.
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de haber aplicado PATCH-PRODUCT-MEDIA.sql.

-- 1) La columna sort_order tenía un check que bloqueaba cualquier fila con sort_order > 4.
--    Se reemplaza por un check que solo exige que no sea negativo.
alter table public.product_media
  drop constraint if exists product_media_sort_order_check;

alter table public.product_media
  add constraint product_media_sort_order_check check (sort_order >= 0);

-- 2) El trigger enforce_product_media_limit cortaba el insert al llegar a 5 archivos
--    del mismo tipo (imagen o video) por producto. Se quita esa restricción y se
--    conserva únicamente la regla de que solo una imagen puede ser portada.
create or replace function public.enforce_product_media_limit()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.is_primary and new.media_type <> 'image' then
    raise exception 'Solo una imagen puede ser portada';
  end if;
  return new;
end $$;

-- El trigger en sí (trg_product_media_limit) sigue existiendo y sigue llamando a
-- esta función, pero ahora la función ya no impone ningún máximo de archivos.
