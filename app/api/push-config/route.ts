import { NextResponse } from "next/server";

const VAPID_PUBLIC_KEY = "BMJwuhLSjaA7mDADl2FbghgOsp8GGQXazp9zKI17Mf4ug6oyNlyM-hhENcsQrmoZN8FgKYxFP4dOntqFNhjnI1g";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { publicKey: VAPID_PUBLIC_KEY, release: "2026-10-09-audit" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
