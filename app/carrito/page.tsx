"use client";

import Link from "next/link";
import { useCart } from "../ui";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const money = (value: number) => `₲ ${Number(value || 0).toLocaleString("es-PY")}`;

export default function CartPage() {
  const { items, remove, update, subtotal, syncStock } = useCart();
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!items.length) return setCheckingStock(false);
      try {
        const ids = items.map((item) => item.id).filter((id) => !id.startsWith("demo-"));
        if (ids.length) {
          const { data, error } = await createClient().from("products").select("id,stock,active").in("id", ids);
          if (!cancelled && !error && data) {
            const stocks: Record<string, number> = {};
            data.forEach((row) => { if (row.active) stocks[row.id] = Number(row.stock) || 0; });
            syncStock(stocks);
          }
        }
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [items.length, syncStock]);

  return (
    <main id="df-cart-root">
      <style>{`
        #df-cart-root,#df-cart-root *{box-sizing:border-box}
        #df-cart-root{width:min(1120px,calc(100% - 32px));margin:32px auto 120px;color:#21171a}
        #df-cart-root .cart-head{margin:0 0 24px;padding:0;display:block!important;position:static!important}
        #df-cart-root .cart-kicker{display:block;color:#98234d;font:900 13px Arial;letter-spacing:.18em;margin-bottom:8px}
        #df-cart-root h1{font:700 clamp(46px,7vw,72px)/1 Georgia,serif;margin:0 0 12px}
        #df-cart-root .cart-subtitle{margin:0;color:#71696c;font:18px/1.45 Arial}
        #df-cart-root .cart-continue{display:inline-flex!important;position:static!important;margin-top:18px;color:#98234d!important;font:800 16px Arial;text-decoration:none;clear:both}
        #df-cart-root .cart-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:24px;align-items:start}
        #df-cart-root .cart-list{display:flex;flex-direction:column;gap:16px;min-width:0}
        #df-cart-root .cart-item{display:grid!important;grid-template-columns:128px minmax(0,1fr) 120px 130px!important;gap:18px!important;align-items:center!important;margin:0!important;padding:16px!important;background:#fff!important;border:1px solid #eadfe0!important;border-radius:18px!important;overflow:hidden!important;min-width:0!important}
        #df-cart-root .cart-photo{display:flex!important;width:128px!important;height:128px!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;border-radius:12px!important;background:#f7f2ef!important}
        #df-cart-root .cart-photo img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important}
        #df-cart-root .cart-info{min-width:0!important}
        #df-cart-root .cart-name{display:block!important;color:#21171a!important;font:900 20px/1.2 Arial;text-decoration:none;overflow-wrap:anywhere;margin-bottom:8px}
        #df-cart-root .cart-price{font:900 16px Arial;color:#5c5557}.cart-price small{font-weight:400;color:#8a8184}
        #df-cart-root .cart-stock{font:13px Arial;color:#71696c;margin-top:8px}
        #df-cart-root .cart-qty{display:flex;flex-direction:column;align-items:center;gap:8px;font:900 13px Arial;color:#5c5557}
        #df-cart-root .cart-stepper{display:flex;width:120px;height:40px}.cart-stepper button,.cart-stepper input{height:40px!important;border:1px solid #d8cbd0!important;background:#fff!important;text-align:center!important}.cart-stepper button{width:36px!important;min-width:36px!important;font-size:22px!important}.cart-stepper input{width:48px!important;min-width:48px!important;border-left:0!important;border-right:0!important;font-weight:800!important;-moz-appearance:textfield}.cart-stepper input::-webkit-inner-spin-button,.cart-stepper input::-webkit-outer-spin-button{-webkit-appearance:none}.cart-stepper button:first-child{border-radius:8px 0 0 8px}.cart-stepper button:last-child{border-radius:0 8px 8px 0}
        #df-cart-root .cart-actions{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;align-self:stretch;gap:12px}.cart-actions strong{font:900 19px Arial;white-space:nowrap}.cart-actions button{background:#fff;border:1px solid #d8cbd0;border-radius:9px;padding:9px 12px;color:#98234d;font-weight:800}
        #df-cart-root .cart-summary{background:#fff;border:1px solid #eadfe0;border-radius:18px;padding:24px;position:sticky;top:90px}.cart-summary h2{font:800 21px Arial;margin:0 0 24px}.cart-summary .row{display:flex;justify-content:space-between;gap:12px;align-items:center;font:18px Arial}.cart-summary .row strong{color:#98234d;font-size:26px;white-space:nowrap}.cart-summary p{color:#71696c;font:14px/1.5 Arial;margin:18px 0 22px}.cart-primary{display:flex;justify-content:center;align-items:center;background:#98234d;color:#fff!important;border-radius:11px;padding:15px 18px;font:900 16px Arial;text-decoration:none}.cart-summary-link{display:block;text-align:center;color:#98234d;font:800 14px Arial;margin-top:18px;text-decoration:none}
        @media(max-width:900px){#df-cart-root .cart-layout{grid-template-columns:1fr}.cart-summary{position:static!important}}
        @media(max-width:600px){#df-cart-root{width:calc(100% - 24px);margin:24px auto 105px}#df-cart-root h1{font-size:50px}.cart-subtitle{font-size:16px!important}.cart-item{grid-template-columns:88px minmax(0,1fr)!important;gap:12px!important;padding:12px!important}.cart-photo{width:88px!important;height:88px!important}.cart-name{font-size:17px!important}.cart-qty{grid-column:2;align-items:flex-start!important}.cart-stepper{width:110px!important;height:36px!important}.cart-stepper button{height:36px!important;width:32px!important;min-width:32px!important}.cart-stepper input{height:36px!important;width:46px!important;min-width:46px!important}.cart-actions{grid-column:1/-1;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;border-top:1px solid #eee4e5;padding-top:12px;align-self:auto!important}.cart-actions strong{font-size:18px}.cart-summary{padding:18px!important}}
      `}</style>
      {!items.length ? <section className="cart-head"><span className="cart-kicker">COMPRA</span><h1>Carrito</h1><p className="cart-subtitle">Tu carrito está vacío.</p><Link className="cart-continue" href="/catalogo">← Ir al catálogo</Link></section> : <>
        <header className="cart-head"><span className="cart-kicker">COMPRA</span><h1>Carrito</h1><p className="cart-subtitle">Revisá tus productos antes de continuar.</p><Link className="cart-continue" href="/catalogo">← Seguir comprando</Link></header>
        {checkingStock && <div className="cart-stock">Verificando disponibilidad…</div>}
        <div className="cart-layout"><section className="cart-list" aria-label="Productos del carrito">{items.map((item) => <article className="cart-item" key={item.id}>
          <Link className="cart-photo" href={`/catalogo/${item.id}`}><img src={item.image_url || "/icon.png"} alt={item.name}/></Link>
          <div className="cart-info"><Link className="cart-name" href={`/catalogo/${item.id}`}>{item.name}</Link><div className="cart-price">{money(item.price)} <small>por unidad</small></div><div className="cart-stock">{item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}</div></div>
          <div className="cart-qty"><span>Cantidad</span><div className="cart-stepper"><button type="button" disabled={item.quantity<=1} onClick={() => update(item.id,item.quantity-1)}>−</button><input type="number" min={1} max={item.stock||1} value={item.quantity} onChange={(e)=>update(item.id,Number(e.target.value)||1)}/><button type="button" disabled={item.quantity>=item.stock} onClick={() => update(item.id,item.quantity+1)}>+</button></div></div>
          <div className="cart-actions"><strong>{money(item.price*item.quantity)}</strong><button type="button" onClick={()=>remove(item.id)}>Eliminar</button></div>
        </article>)}</section><aside className="cart-summary"><h2>Resumen del pedido</h2><div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>El costo de entrega se calculará en el checkout.</p><Link className="cart-primary" href="/checkout">Continuar al checkout</Link><Link className="cart-summary-link" href="/catalogo">Seguir comprando</Link></aside></div>
      </>}
    </main>
  );
}
