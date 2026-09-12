"use client";

import Link from "next/link";
import { useCart } from "../ui";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const money = (n: number) => `₲ ${Number(n || 0).toLocaleString("es-PY")}`;

export default function Cart() {
  const { items, remove, update, subtotal, syncStock } = useCart();
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
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
          if (!cancelled && !error && Array.isArray(data)) {
            const stocks: Record<string, number> = {};
            data.forEach((row) => {
              if (row.active) stocks[row.id] = Number(row.stock) || 0;
            });
            syncStock(stocks);
          }
        }
      } catch {}
      if (!cancelled) setCheckingStock(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [items.length, syncStock]);

  if (!items.length) {
    return (
      <section className="cart-page cart-empty-page">
        <span className="cart-eyebrow">COMPRA</span>
        <h1>Carrito</h1>
        <div className="cart-empty">
          <h2>Tu carrito está vacío</h2>
          <p>Agregá productos del catálogo para continuar.</p>
          <Link className="btn" href="/catalogo">Ir al catálogo</Link>
        </div>
        <CartStyles />
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="cart-heading">
        <div>
          <span className="cart-eyebrow">COMPRA</span>
          <h1>Carrito</h1>
          <p className="cart-subtitle">Revisá tus productos antes de continuar.</p>
        </div>
        <Link className="cart-back" href="/catalogo">← Seguir comprando</Link>
      </div>

      {checkingStock && <p className="cart-stock-check">Verificando disponibilidad…</p>}

      <div className="cart-layout">
        <div className="cart-items" aria-label="Productos del carrito">
          {items.map((item) => (
            <article className="cart-item" key={item.id}>
              <Link className="cart-product-media" href={`/catalogo/${item.id}`} aria-label={`Ver ${item.name}`}>
                {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>DF</span>}
              </Link>

              <div className="cart-product-main">
                <Link href={`/catalogo/${item.id}`} className="cart-product-name">{item.name}</Link>
                <div className="cart-product-unit">{money(item.price)} <small>por unidad</small></div>
                <div className="cart-product-meta">{item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}</div>
              </div>

              <div className="cart-product-controls">
                <label className="cart-quantity-label" htmlFor={`quantity-${item.id}`}>Cantidad</label>
                <div className="cart-quantity-control">
                  <button type="button" onClick={() => update(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Disminuir cantidad">−</button>
                  <input id={`quantity-${item.id}`} type="number" min="1" max={item.stock || 1} value={item.quantity} onChange={(e) => update(item.id, Number(e.target.value) || 1)} aria-label={`Cantidad de ${item.name}`} />
                  <button type="button" onClick={() => update(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar cantidad">+</button>
                </div>
              </div>

              <div className="cart-product-total">
                <strong>{money(item.price * item.quantity)}</strong>
                <button type="button" onClick={() => remove(item.id)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          <div className="cart-summary-title">Resumen del pedido</div>
          <div className="cart-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <p>El costo de entrega se calculará en el checkout.</p>
          <Link className="btn cart-checkout" href="/checkout">Continuar al checkout</Link>
          <Link className="cart-summary-back" href="/catalogo">Seguir comprando</Link>
        </aside>
      </div>
      <CartStyles />
    </section>
  );
}

function CartStyles() {
  return <style jsx>{`
    .cart-page{width:min(1180px,calc(100% - 32px));margin:42px auto 100px;color:#21171a}
    .cart-eyebrow{display:block;color:#98234d;font-weight:800;letter-spacing:.14em;font-size:13px}
    .cart-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px}
    .cart-page h1{margin:8px 0 10px;font-family:Georgia,serif;font-size:clamp(42px,5vw,64px);line-height:1}
    .cart-subtitle{margin:0;color:#71696c;font-size:18px}
    .cart-back{color:#21171a;font-weight:700;white-space:nowrap;text-decoration:none}
    .cart-stock-check{margin:-10px 0 16px;color:#71696c;font-size:14px}
    .cart-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;align-items:start;gap:24px}
    .cart-items{display:flex;flex-direction:column;gap:14px;min-width:0}
    .cart-item{display:grid;grid-template-columns:116px minmax(0,1fr) auto auto;align-items:center;gap:18px;padding:16px;background:#fff;border:1px solid #eadfe0;border-radius:18px;box-shadow:0 8px 24px rgba(50,20,30,.045);min-width:0}
    .cart-product-media{display:flex;align-items:center;justify-content:center;width:116px;height:116px;min-width:116px;overflow:hidden;border-radius:12px;background:#f7f2ef;text-decoration:none}
    .cart-product-media img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center}
    .cart-product-media span{font:700 38px Georgia,serif;color:#98234d}
    .cart-product-main{min-width:0}
    .cart-product-name{display:block;color:#21171a;font-size:21px;font-weight:800;line-height:1.2;text-decoration:none;overflow-wrap:anywhere;margin-bottom:8px}
    .cart-product-unit{font-weight:800;color:#5c5557;font-size:16px}
    .cart-product-unit small{font-size:12px;font-weight:600;color:#8a8184}
    .cart-product-meta{margin-top:8px;color:#71696c;font-size:13px}
    .cart-product-controls{display:flex;flex-direction:column;align-items:center;gap:7px}
    .cart-quantity-label{font-size:13px;font-weight:800;color:#5c5557}
    .cart-quantity-control{display:flex;align-items:center}
    .cart-quantity-control button,.cart-quantity-control input{height:38px;border:1px solid #d8cbd0;background:#fff;text-align:center;box-sizing:border-box}
    .cart-quantity-control button{width:36px;font-size:21px;cursor:pointer}
    .cart-quantity-control button:first-child{border-radius:8px 0 0 8px}
    .cart-quantity-control button:last-child{border-radius:0 8px 8px 0}
    .cart-quantity-control input{width:48px;border-left:0;border-right:0;font:700 15px inherit;-moz-appearance:textfield}
    .cart-quantity-control input::-webkit-outer-spin-button,.cart-quantity-control input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
    .cart-quantity-control button:disabled{opacity:.4;cursor:not-allowed}
    .cart-product-total{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;align-self:stretch;gap:14px;min-width:105px}
    .cart-product-total strong{font-size:20px;white-space:nowrap}
    .cart-product-total button{border:1px solid #d8cbd0;border-radius:8px;padding:8px 12px;background:#fff;color:#98234d;font-weight:800;cursor:pointer}
    .cart-summary{position:sticky;top:20px;padding:24px;background:#fff;border:1px solid #eadfe0;border-radius:18px;box-shadow:0 8px 24px rgba(50,20,30,.045)}
    .cart-summary-title{font-size:20px;font-weight:800;margin-bottom:22px}
    .cart-summary-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:18px}
    .cart-summary-row strong{color:#98234d;font-size:27px;white-space:nowrap}
    .cart-summary p{margin:16px 0 22px;color:#71696c;line-height:1.45;font-size:14px}
    .cart-checkout{width:100%;justify-content:center;box-sizing:border-box}
    .cart-summary-back{display:block;text-align:center;margin-top:18px;color:#98234d;font-weight:800;text-decoration:none;font-size:14px}
    .cart-empty{padding:32px;background:#fff;border:1px solid #eadfe0;border-radius:18px}
    .cart-empty h2{margin:0 0 10px;font-size:26px}
    .cart-empty p{color:#71696c;margin:0 0 22px}
    @media(max-width:900px){.cart-layout{grid-template-columns:1fr}.cart-summary{position:static}.cart-summary-back{display:none}}
    @media(max-width:600px){.cart-page{width:calc(100% - 24px);margin:26px auto 82px}.cart-heading{display:block;margin-bottom:22px}.cart-page h1{font-size:46px}.cart-subtitle{font-size:16px}.cart-back{display:inline-block;margin-top:15px}.cart-item{grid-template-columns:86px minmax(0,1fr);gap:12px;padding:12px;border-radius:15px;align-items:start}.cart-product-media{width:86px;height:86px;min-width:86px;border-radius:10px}.cart-product-media span{font-size:28px}.cart-product-name{font-size:17px;margin-bottom:6px}.cart-product-unit{font-size:15px}.cart-product-meta{font-size:12px;margin-top:6px}.cart-product-controls{grid-column:2;align-items:flex-start;gap:6px}.cart-quantity-label{font-size:12px}.cart-quantity-control button{width:32px;height:34px}.cart-quantity-control input{width:42px;height:34px}.cart-product-total{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;border-top:1px solid #eee4e5;padding-top:11px;min-width:0;gap:10px}.cart-product-total strong{font-size:18px}.cart-product-total button{padding:7px 11px}.cart-summary{padding:18px}.cart-summary-title{font-size:18px;margin-bottom:18px}.cart-summary-row{font-size:17px}.cart-summary-row strong{font-size:23px}}
  `}</style>;
}
