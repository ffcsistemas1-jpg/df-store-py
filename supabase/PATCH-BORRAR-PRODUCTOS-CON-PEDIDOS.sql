-- Por qué pasaba: order_items.product_id apunta a products(id) sin ninguna
-- regla de "qué hacer si el producto se borra". Por defecto Postgres lo
-- bloquea (no deja borrar el producto), pero el panel no mostraba ese error
-- con claridad — solo parecía que "no pasaba nada".
--
-- La solución: si el producto tenía pedidos, al borrarlo esos pedidos NO se
-- tocan (siguen mostrando el nombre, precio y cantidad que ya tenían
-- guardados aparte), solo queda sin el "link" al producto que ya no existe.

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;
