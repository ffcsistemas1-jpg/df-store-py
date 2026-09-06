import { NextResponse } from "next/server";

// Next.js solo reconoce el archivo especial manifest.ts en la RAÍZ de app/.
// Para tener un segundo manifest independiente en /admin, lo servimos
// manualmente con un Route Handler en esta misma ruta literal.
export async function GET() {
  return NextResponse.json(
    {
      name: "DF Store PY Admin",
      short_name: "DF Admin",
      description: "Administración móvil de DF Store PY",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#98234d",
      lang: "es-PY",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
