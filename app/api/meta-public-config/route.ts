import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET() {
  const s = await createClient();
  const { data } = await s.from("store_settings").select("meta_pixel_id").eq("id", 1).maybeSingle();
  const pixelId = String(data?.meta_pixel_id || "").replace(/[^0-9]/g, "");
  return NextResponse.json({ pixelId: /^\d{10,20}$/.test(pixelId) ? pixelId : "" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
