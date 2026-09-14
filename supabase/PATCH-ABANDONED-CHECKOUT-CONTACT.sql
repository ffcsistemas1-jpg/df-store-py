-- Configuración del contacto para recuperar checkouts abandonados.
-- Ejecutar en el proyecto Supabase conectado a DF Store PY.

alter table public.store_settings
  add column if not exists abandoned_checkout_message text;

update public.store_settings
set
  whatsapp = '595974719210',
  abandoned_checkout_message = '¡Hola, {nombre}! 😊 ¿Cómo estás?\nNotamos que casi terminaste tu compra en DF Store PY. 🛍️\nSi tuviste algún inconveniente o necesitás ayuda para finalizar el pedido, escribinos. ¡Estamos para ayudarte! 💕'
where id = 1;
