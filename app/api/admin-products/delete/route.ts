import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function DELETE(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida." }, { status: 401 });
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "No tenés permisos de administrador." }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ error: "Falta el producto." }, { status: 400 });
  const { data: media } = await s.from("product_media").select("storage_path").eq("product_id", id);
  const paths = (media || []).map((m: any) => m.storage_path).filter(Boolean);
  if (paths.length) await s.storage.from("product-media").remove(paths);
  const { error } = await s.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: `No se pudo eliminar: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}
