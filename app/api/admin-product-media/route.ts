import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const BUCKET = "product-media";

async function adminClient() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { s, error: NextResponse.json({ error: "Sesión vencida." }, { status: 401 }) };
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return { s, error: NextResponse.json({ error: "No tenés permisos de administrador." }, { status: 403 }) };
  return { s, error: null };
}

function validateFile(name: string, type: string, size: number) {
  if (!name || !type || !size) return "Archivo inválido.";
  if (!type.startsWith("image/") && !type.startsWith("video/")) return "Solo se permiten fotos o videos.";
  const max = type.startsWith("video/") ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
  if (size > max) return `El archivo supera el máximo permitido (${type.startsWith("video/") ? "500 MB" : "25 MB"}).`;
  return null;
}

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const { s, error } = await adminClient();
  if (error) return error;

  const contentType = req.headers.get("content-type") || "";

  // New direct-to-Supabase flow. Only small JSON requests pass through Vercel;
  // the actual video/photo bytes are uploaded directly from the browser.
  if (contentType.includes("application/json")) {
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
    const action = String(body?.action || "");
    const productId = String(body?.product_id || "").trim();

    if (action === "sign") {
      const fileName = String(body?.file_name || "").trim();
      const mimeType = String(body?.content_type || "").trim();
      const size = Number(body?.size || 0);
      const validationError = validateFile(fileName, mimeType, size);
      if (!productId || validationError) return NextResponse.json({ error: validationError || "Producto faltante." }, { status: 400 });

      const path = `${productId}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
      const { data, error: signError } = await s.storage.from(BUCKET).createSignedUploadUrl(path);
      if (signError || !data) return NextResponse.json({ error: `No se pudo preparar la carga: ${signError?.message || "Error de almacenamiento."}` }, { status: 500 });
      return NextResponse.json({ path, token: data.token });
    }

    if (action === "register") {
      const path = String(body?.path || "").trim();
      const fileName = String(body?.file_name || "").trim();
      const mimeType = String(body?.content_type || "").trim();
      const size = Number(body?.size || 0);
      const validationError = validateFile(fileName, mimeType, size);
      if (!productId || !path || validationError) return NextResponse.json({ error: validationError || "Datos incompletos." }, { status: 400 });
      if (!path.startsWith(`${productId}/`)) return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 400 });

      const mediaType = mimeType.startsWith("video/") ? "video" : "image";
      const { data: publicData } = s.storage.from(BUCKET).getPublicUrl(path);
      const { data: media, error: insertError } = await s.from("product_media").insert({
        product_id: productId,
        media_type: mediaType,
        url: publicData.publicUrl,
        storage_path: path,
        mime_type: mimeType,
        original_name: fileName,
        size_bytes: size,
        sort_order: 999,
        is_primary: false,
      }).select("*").single();
      if (insertError) {
        await s.storage.from(BUCKET).remove([path]);
        return NextResponse.json({ error: `No se pudo registrar el archivo: ${insertError.message}` }, { status: 500 });
      }
      return NextResponse.json({ media });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  }

  // Backward-compatible fallback for small legacy uploads.
  const form = await req.formData();
  const productId = String(form.get("product_id") || "").trim();
  const file = form.get("file");
  if (!productId || !(file instanceof File)) return NextResponse.json({ error: "Producto o archivo faltante." }, { status: 400 });
  const validationError = validateFile(file.name, file.type, file.size);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const path = `${productId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const upload = await s.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: `No se pudo cargar el archivo: ${upload.error.message}` }, { status: 500 });
  const { data: publicData } = s.storage.from(BUCKET).getPublicUrl(path);
  const { data: media, error: insertError } = await s.from("product_media").insert({ product_id: productId, media_type: file.type.startsWith("video/") ? "video" : "image", url: publicData.publicUrl, storage_path: path, mime_type: file.type, original_name: file.name, size_bytes: file.size, sort_order: 999, is_primary: false }).select("*").single();
  if (insertError) { await s.storage.from(BUCKET).remove([path]); return NextResponse.json({ error: `No se pudo registrar el archivo: ${insertError.message}` }, { status: 500 }); }
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
  if (media.storage_path) await s.storage.from(BUCKET).remove([media.storage_path]);
  const { error: deleteError } = await s.from("product_media").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}
