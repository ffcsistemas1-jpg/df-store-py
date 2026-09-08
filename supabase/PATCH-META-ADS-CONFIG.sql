-- Configuración editable de Meta Ads para DF Store PY.
-- Guarda únicamente identificadores públicos/no secretos. El token de CAPI
-- permanece exclusivamente en las variables de entorno de Vercel.

alter table public.store_settings
  add column if not exists meta_ad_account_id text,
  add column if not exists meta_page_name text,
  add column if not exists meta_page_id text;

update public.store_settings
set
  meta_ad_account_id = coalesce(nullif(meta_ad_account_id,''), '356287048249925'),
  meta_page_name = coalesce(nullif(meta_page_name,''), 'FFC Electronic')
where id = 1;

-- Los identificadores no son secretos, pero solo el administrador debe
-- poder modificarlos. La lectura pública existente de store_settings se
-- conserva por compatibilidad con el checkout (WhatsApp/banner).
