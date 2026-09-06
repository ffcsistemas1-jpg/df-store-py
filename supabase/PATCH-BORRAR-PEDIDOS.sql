-- Faltaba esta política: la tabla orders nunca tuvo permiso de DELETE para
-- el administrador (solo tenía SELECT y UPDATE). Por eso la opción
-- "🧪 Prueba (eliminar)" en Pedidos no borraba nada: Supabase bloqueaba el
-- borrado en silencio, sin devolver ningún error, y el pedido volvía a
-- aparecer como si nunca se hubiera tocado.
create policy "admin delete orders"
  on public.orders for delete
  to authenticated
  using (public.is_admin());
