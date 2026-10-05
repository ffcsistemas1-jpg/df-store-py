import type { Metadata } from "next";
import { SITE_URL } from "../../lib/seo";

export const metadata: Metadata = { title: "Catálogo de productos | DF Store PY", description: "Explorá ropa, herramientas, electrónica y productos para el hogar. Precios en guaraníes y envíos en Paraguay.", alternates: { canonical: SITE_URL + "/catalogo" }, openGraph: { url: SITE_URL + "/catalogo" } };

import CatalogClient from "./catalog-client";
import { getProducts } from "../../lib/products";

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const sp = await searchParams;
  const products = await getProducts();
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  return <CatalogClient products={products} categories={categories} initialQ={sp.q || ""} initialCategoria={sp.categoria || ""} />;
}
