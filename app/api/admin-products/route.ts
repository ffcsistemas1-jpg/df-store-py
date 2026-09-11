import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function PATCH(req: Request) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión vencida. Volvé a iniciar sesión." }, { status: 401 });

  const { data: isAdmin, error: adminError } = await s.rpc("is_admin");
  if (adminError || !isAdmin) return NextResponse.json({ error: "No tenés permisos de administrador." }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ error: "Falta el identificador del producto." }, { status: 400 });

  const stock = Number(body?.stock);
  const price = Number(body?.price);
  const cost = Number(body?.cost);
  if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "La disponibilidad debe ser un número entero igual o mayor que 0." }, { status: 400 });
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Precio o costo inválido." }, { status: 400 });

  const payload = {
    name: String(body?.name || "").trim(),
    price,
    cost,
    stock,
    category: body?.category ? String(body.category) : null,
    description: body?.description ? String(body.description) : null,
    image_url: body?.image_url ? String(body.image_url) : null,
    video_url: body?.video_url ? String(body.video_url) : null,
    active: Boolean(body?.active),
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) return NextResponse.json({ error: "El nombre del producto es obligatorio." }, { status: 400 });

  const { data, error } = await s.from("products").update(payload).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No se actualizó ningún producto. Verificá la sesión y el identificador." }, { status: 404 });
  return NextResponse.json({ product: data });
}
