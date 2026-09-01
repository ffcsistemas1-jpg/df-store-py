import { ProductCard } from "../ui";
import { getProducts } from "../../lib/products";
export default async function Catalogo({searchParams}:{searchParams:Promise<{categoria?:string}>}){
 const q=await searchParams; const ps=await getProducts(q.categoria);
 return <section><div className="title"><div><small>DF STORE PY</small><h1>Catálogo</h1></div><div className="filters"><a href="/catalogo">Todos</a><a href="/catalogo?categoria=Ropa">Ropa</a><a href="/catalogo?categoria=Hogar">Hogar</a></div></div><div className="grid">{ps.map(p=><ProductCard key={p.id} p={p}/>)}</div>{!ps.length&&<div className="empty">Todavía no hay productos cargados.</div>}</section>;
}