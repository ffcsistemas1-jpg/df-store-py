-- Faltaba esta política: al reactivar notificaciones en un dispositivo que ya
-- tenía una suscripción guardada, Supabase intenta ACTUALIZAR esa fila (no
-- crear una nueva), y sin este permiso la bloqueaba con un error de RLS.
create policy "admin puede actualizar su propia suscripción"
  on public.push_subscriptions for update
  using (public.is_admin() and admin_user_id = auth.uid())
  with check (public.is_admin() and admin_user_id = auth.uid());
