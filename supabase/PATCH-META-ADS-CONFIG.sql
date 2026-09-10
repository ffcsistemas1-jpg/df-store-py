-- Configuración editable de Meta Ads para DF Store PY.
-- Los identificadores públicos se guardan en store_settings.
-- Los tokens se gestionan cifrados en Supabase Vault desde el administrador.

alter table public.store_settings
  add column if not exists meta_ad_account_id text,
  add column if not exists meta_page_name text,
  add column if not exists meta_page_id text,
  add column if not exists meta_business_id text,
  add column if not exists meta_pixel_id text;

update public.store_settings
set
  meta_ad_account_id = coalesce(nullif(meta_ad_account_id,''), '356287048249925'),
  meta_page_name = coalesce(nullif(meta_page_name,''), 'FFC Electronic'),
  meta_business_id = coalesce(nullif(meta_business_id,''), '845353691984059'),
  meta_pixel_id = coalesce(nullif(meta_pixel_id,''), '1062142586813863')
where id = 1;

-- La escritura de los identificadores se valida en /api/meta-config.
-- La lectura pública existente de store_settings se conserva por compatibilidad.
