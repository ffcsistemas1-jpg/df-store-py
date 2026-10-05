import { SITE_URL } from "../lib/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/carrito", "/checkout"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
