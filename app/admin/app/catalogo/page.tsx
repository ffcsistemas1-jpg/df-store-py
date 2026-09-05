import CatalogClient from "./catalog-client";
import { getProducts } from "../../lib/products";

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const sp = await searchParams;
  const products = await getProducts();
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  return <CatalogClient products={products} categories={categories} initialQ={sp.q || ""} initialCategoria={sp.categoria || ""} />;
}
