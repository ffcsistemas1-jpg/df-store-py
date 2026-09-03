import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
  };
}
