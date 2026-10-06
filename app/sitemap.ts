import { SITE_URL } from "../lib/seo";
import type { MetadataRoute } from "next";
import { getProducts } from "../lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const base=SITE_URL; const products=await getProducts();
 const staticEntries: MetadataRoute.Sitemap=[
  {url:base+"/",changeFrequency:"daily",priority:1},{url:base+"/catalogo",changeFrequency:"daily",priority:0.9},
  {url:base+"/quienes-somos",changeFrequency:"monthly",priority:0.4},{url:base+"/terminos-y-condiciones",changeFrequency:"monthly",priority:0.3},{url:base+"/politica-de-privacidad",changeFrequency:"monthly",priority:0.3}
 ];
 const productEntries: MetadataRoute.Sitemap=products.filter(p=>!p.id.startsWith("demo-")).map(p=>({url:base+"/catalogo/"+p.id,changeFrequency:"weekly",priority:0.7}));
 return [...staticEntries,...productEntries];
}
