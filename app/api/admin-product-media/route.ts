import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

async function adminClient() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { s, error: NextResponse.json({ error: "Sesión vencida." }, { status: 401 }) };
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return { s, error: NextResponse.json({ error: "No tenés permisos de administrador." }, { status: 403 }) };
  return { s, error: null };
}

export async function POST(req: Request) {
  const { s, error } = await adminClient();
  if (error) return error;
  const form = await req.formData();
  const productId = String(form.get("product_id") || "").trim();
  const file = form.get("file");
  if (!productId || !(file instanceof File)) return NextResponse.json({ error: "Producto o archivo faltante." }, { status: 400 });
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return NextResponse.json({ error: "Solo se permiten fotos o videos." }, { status: 400 });
  const max = file.type.startsWith("video/") ? 80 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size > max) return NextResponse.json({ error: `El archivo supera el máximo permitido (${file.type.startsWith("video/") ? "80 MB" : "12 MB"}).` }, { status: 400 });
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${productId}/${crypto.randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const upload = await s.storage.from("product-media").upload(path, bytes, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: `No se pudo cargar el archivo: ${upload.error.message}` }, { status: 500 });
  const { data: publicData } = s.storage.from("product-media").getPublicUrl(path);
  const { data: media, error: insertError } = await s.from("product_media").insert({ product_id: productId, media_type: mediaType, url: publicData.publicUrl, storage_path: path, mime_type: file.type, original_name: file.name, size_bytes: file.size, sort_order: 999, is_primary: false }).select("*").single();
  if (insertError) {
    await s.storage.from("product-media").remove([path]);
    return NextResponse.json({ error: `No se pudo registrar el archivo: ${insertError.message}` }, { status: 500 });
  }
  return NextResponse.json({ media });
}

export async function DELETE(req: Request) {
  const { s, error } = await adminClient();
  if (error) return error;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  const { data: media, error: findError } = await s.from("product_media").select("id,storage_path").eq("id", id).single();
  if (findError || !media) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  if (media.storage_path) await s.storage.from("product-media").remove([media.storage_path]);
  const { error: deleteError } = await s.from("product_media").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}
