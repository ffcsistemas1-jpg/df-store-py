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
      if (!items.length) {
        setCheckingStock(false);
        return;
      }
      try {
        const ids = items.map((item) => item.id).filter((id) => !id.startsWith("demo-"));
        if (ids.length) {
          const { data, error } = await createClient()
            .from("products")
            .select("id,stock,active")
            .in("id", ids);
          if (!cancelled && !error && data) {
            const stocks: Record<string, number> = {};
            data.forEach((row) => {
              if (row.active) stocks[row.id] = Number(row.stock) || 0;
            });
            syncStock(stocks);
          }
        }
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [items.length, syncStock]);

  return (
    <main className="df-cart-page">
      <style>{`
        .df-cart-page,.df-cart-page *{box-sizing:border-box}
        .df-cart-page{width:100%!important;max-width:1180px!important;margin:0 auto!important;padding:28px 24px 130px!important;color:#21171a!important}
        .df-cart-page .df-cart-header{display:block!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;position:relative!important;clear:both!important;overflow:visible!important}
        .df-cart-page .df-kicker{display:block!important;margin:0 0 8px!important;color:#98234d!important;font:900 13px/1 Arial,sans-serif!important;letter-spacing:.18em!important}
        .df-cart-page h1{display:block!important;width:100%!important;height:auto!important;margin:0 0 12px!important;padding:0!important;font:700 clamp(46px,7vw,72px)/1 Georgia,serif!important;color:#21171a!important;white-space:normal!important;overflow:visible!important}
        .df-cart-page .df-subtitle{display:block!important;width:100%!important;height:auto!important;margin:0!important;padding:0!important;color:#71696c!important;font:18px/1.45 Arial,sans-serif!important}
        .df-cart-page .df-continue-row{display:block!important;width:100%!important;height:auto!important;min-height:28px!important;margin:18px 0 24px!important;padding:0!important;position:relative!important;z-index:5!important;clear:both!important;overflow:visible!important}
        .df-cart-page .df-continue{display:inline-flex!important;position:static!important;width:auto!important;max-width:100%!important;height:auto!important;margin:0!important;padding:0!important;color:#98234d!important;font:800 16px/1.3 Arial,sans-serif!important;text-decoration:none!important;white-space:normal!important}
        .df-cart-page .df-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 340px!important;gap:24px!important;align-items:start!important;width:100%!important;height:auto!important;margin:0!important;padding:0!important;position:relative!important;clear:both!important}
        .df-cart-page .df-list{display:flex!important;flex-direction:column!important;gap:16px!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
        .df-cart-page .df-item{display:grid!important;grid-template-columns:112px minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;gap:12px 16px!important;width:100%!important;min-width:0!important;height:auto!important;margin:0!important;padding:16px!important;background:#fff!important;border:1px solid #eadfe0!important;border-radius:18px!important;overflow:hidden!important;position:relative!important}
        .df-cart-page .df-photo{display:flex!important;grid-column:1!important;grid-row:1 / span 2!important;width:112px!important;height:112px!important;min-width:112px!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;border-radius:12px!important;background:#f7f2ef!important;text-decoration:none!important}
        .df-cart-page .df-photo img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;object-fit:contain!important}
        .df-cart-page .df-info{display:block!important;grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;height:auto!important;margin:0!important;padding:0!important}
        .df-cart-page .df-name{display:block!important;width:100%!important;min-width:0!important;height:auto!important;margin:0 0 7px!important;padding:0!important;color:#21171a!important;font:900 19px/1.25 Arial,sans-serif!important;text-decoration:none!important;overflow-wrap:anywhere!important;word-break:normal!important;white-space:normal!important}
        .df-cart-page .df-unit-price{display:block!important;color:#5c5557!important;font:900 16px/1.3 Arial,sans-serif!important;white-space:normal!important}
        .df-cart-page .df-unit-price small{font:400 13px/1.3 Arial,sans-serif!important;color:#8a8184!important}
        .df-cart-page .df-stock{display:block!important;margin:7px 0 0!important;color:#71696c!important;font:13px/1.3 Arial,sans-serif!important}
        .df-cart-page .df-qty{display:flex!important;grid-column:2!important;grid-row:2!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important;margin:0!important;padding:0!important;color:#5c5557!important;font:900 13px/1 Arial,sans-serif!important}
        .df-cart-page .df-stepper{display:flex!important;width:116px!important;height:38px!important;margin:0!important;padding:0!important}
        .df-cart-page .df-stepper button,.df-cart-page .df-stepper input{height:38px!important;margin:0!important;border:1px solid #d8cbd0!important;background:#fff!important;text-align:center!important;box-shadow:none!important}
        .df-cart-page .df-stepper button{width:34px!important;min-width:34px!important;padding:0!important;font:900 21px/36px Arial,sans-serif!important;cursor:pointer!important}
        .df-cart-page .df-stepper input{width:48px!important;min-width:48px!important;padding:0!important;border-left:0!important;border-right:0!important;font:800 16px/38px Arial,sans-serif!important;-moz-appearance:textfield!important}
        .df-cart-page .df-stepper input::-webkit-inner-spin-button,.df-cart-page .df-stepper input::-webkit-outer-spin-button{-webkit-appearance:none!important;margin:0!important}
        .df-cart-page .df-stepper button:first-child{border-radius:8px 0 0 8px!important}.df-cart-page .df-stepper button:last-child{border-radius:0 8px 8px 0!important}
        .df-cart-page .df-actions{display:flex!important;grid-column:1 / -1!important;grid-row:3!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:100%!important;margin:0!important;padding:12px 0 0!important;border-top:1px solid #eee4e5!important}
        .df-cart-page .df-actions strong{display:block!important;color:#21171a!important;font:900 19px/1 Arial,sans-serif!important;white-space:nowrap!important}
        .df-cart-page .df-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:auto!important;min-height:40px!important;margin:0!important;padding:8px 14px!important;background:#fff!important;border:1px solid #d8cbd0!important;border-radius:9px!important;color:#98234d!important;font:800 14px/1 Arial,sans-serif!important;cursor:pointer!important}
        .df-cart-page .df-summary{display:block!important;width:100%!important;height:auto!important;margin:0!important;padding:24px!important;background:#fff!important;border:1px solid #eadfe0!important;border-radius:18px!important;position:sticky!important;top:90px!important}
        .df-cart-page .df-summary h2{display:block!important;margin:0 0 24px!important;padding:0!important;font:800 21px/1.2 Arial,sans-serif!important;color:#21171a!important}
        .df-cart-page .df-summary-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0!important;padding:0!important;font:18px/1.3 Arial,sans-serif!important}
        .df-cart-page .df-summary-row strong{color:#98234d!important;font:900 26px/1.2 Arial,sans-serif!important;white-space:nowrap!important}
        .df-cart-page .df-summary p{display:block!important;margin:18px 0 22px!important;padding:0!important;color:#71696c!important;font:14px/1.5 Arial,sans-serif!important}
        .df-cart-page .df-primary{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-height:52px!important;margin:0!important;padding:15px 18px!important;background:#98234d!important;color:#fff!important;border-radius:11px!important;font:900 16px/1 Arial,sans-serif!important;text-decoration:none!important;text-align:center!important}
        .df-cart-page .df-summary-link{display:block!important;width:100%!important;margin:18px 0 0!important;padding:0!important;color:#98234d!important;font:800 14px/1.3 Arial,sans-serif!important;text-align:center!important;text-decoration:none!important}
        @media(max-width:900px){.df-cart-page .df-layout{grid-template-columns:1fr!important}.df-cart-page .df-summary{position:static!important}}
        @media(max-width:600px){.df-cart-page{width:100%!important;padding:22px 12px 120px!important}.df-cart-page h1{font-size:50px!important}.df-cart-page .df-subtitle{font-size:16px!important}.df-cart-page .df-continue-row{margin-top:16px!important;margin-bottom:20px!important}.df-cart-page .df-item{grid-template-columns:92px minmax(0,1fr)!important;gap:12px!important;padding:12px!important}.df-cart-page .df-photo{width:92px!important;height:92px!important;min-width:92px!important}.df-cart-page .df-name{font-size:17px!important}.df-cart-page .df-unit-price{font-size:16px!important}.df-cart-page .df-actions strong{font-size:18px!important}.df-cart-page .df-summary{padding:18px!important}}
      `}</style>
      {!items.length ? (
        <section className="df-cart-header">
          <span className="df-kicker">COMPRA</span>
          <h1>Carrito</h1>
          <p className="df-subtitle">Tu carrito está vacío.</p>
          <div className="df-continue-row"><Link className="df-continue" href="/catalogo">← Ir al catálogo</Link></div>
        </section>
      ) : (
        <>
          <header className="df-cart-header">
            <span className="df-kicker">COMPRA</span>
            <h1>Carrito</h1>
            <p className="df-subtitle">Revisá tus productos antes de continuar.</p>
          </header>
          <div className="df-continue-row"><Link className="df-continue" href="/catalogo">← Seguir comprando</Link></div>
          {checkingStock && <div className="df-stock-check">Verificando disponibilidad…</div>}
          <div className="df-layout">
            <section className="df-list" aria-label="Productos del carrito">
              {items.map((item) => (
                <article className="df-item" key={item.id}>
                  <Link className="df-photo" href={`/catalogo/${item.id}`}><img src={item.image_url || "/icon.png"} alt={item.name} /></Link>
                  <div className="df-info">
                    <Link className="df-name" href={`/catalogo/${item.id}`}>{item.name}</Link>
                    <div className="df-unit-price">{money(item.price)} <small>por unidad</small></div>
                    <div className="df-stock">{item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}</div>
                  </div>
                  <div className="df-qty">
                    <span>Cantidad</span>
                    <div className="df-stepper">
                      <button type="button" disabled={item.quantity <= 1} onClick={() => update(item.id, item.quantity - 1)}>−</button>
                      <input type="number" min={1} max={item.stock || 1} value={item.quantity} onChange={(e) => update(item.id, Number(e.target.value) || 1)} />
                      <button type="button" disabled={item.quantity >= item.stock} onClick={() => update(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <div className="df-actions"><strong>{money(item.price * item.quantity)}</strong><button type="button" onClick={() => remove(item.id)}>Eliminar</button></div>
                </article>
              ))}
            </section>
            <aside className="df-summary">
              <h2>Resumen del pedido</h2>
              <div className="df-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <p>El costo de entrega se calculará en el checkout.</p>
              <Link className="df-primary" href="/checkout">Continuar al checkout</Link>
              <Link className="df-summary-link" href="/catalogo">Seguir comprando</Link>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
