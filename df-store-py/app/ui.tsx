"use client";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [open,setOpen]=useState(false);
  return <header><div className="head"><Link href="/" className="brand"><b>DF</b> Store PY</Link><button className="hamb" onClick={()=>setOpen(!open)}>☰</button><nav className={open?"open":""}><Link href="/catalogo">Catálogo</Link><Link href="/catalogo?categoria=Ropa">Ropa</Link><Link href="/catalogo?categoria=Hogar">Hogar</Link><Link href="/carrito">🛒 Carrito</Link><Link href="/admin">Admin</Link></nav></div></header>;
}
export function ProductCard({p}:{p:any}) {
 return <article className="card"><Link href={"/catalogo/"+p.id} className="pic">{p.image_url?<img src={p.image_url} alt={p.name}/>:<b>DF</b>}</Link><small>{p.category||"Producto"}</small><h3>{p.name}</h3><strong>₲ {Number(p.price).toLocaleString("es-PY")}</strong></article>;
}