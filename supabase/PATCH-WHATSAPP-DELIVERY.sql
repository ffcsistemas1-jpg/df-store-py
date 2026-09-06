-- Agrega un segundo número de WhatsApp, separado del de atención al cliente,
-- para enviarle los pedidos de delivery (Asunción y Central) desde el admin.
alter table public.store_settings
  add column if not exists whatsapp_delivery text;
