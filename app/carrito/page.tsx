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
    async function checkStock() {
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
      } catch {
        // The cart remains usable if stock verification is temporarily unavailable.
      } finally {
        if (!cancelled) setCheckingStock(false);
      }
    }
    checkStock();
    return () => {
      cancelled = true;
    };
  }, [items.length, syncStock]);

  if (!items.length) {
    return (
      <main className="df-cart-page">
        <CartStyles />
        <div className="df-cart-heading">
          <span className="df-cart-eyebrow">COMPRA</span>
          <h1>Carrito</h1>
          <p>Tu carrito está vacío.</p>
        </div>
        <section className="df-cart-empty">
          <h2>Empezá a elegir tus productos</h2>
          <p>Agregá productos del catálogo para continuar con tu compra.</p>
          <Link className="df-cart-primary" href="/catalogo">Ir al catálogo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="df-cart-page">
      <CartStyles />
      <header className="df-cart-heading">
        <div>
          <span className="df-cart-eyebrow">COMPRA</span>
          <h1>Carrito</h1>
          <p>Revisá tus productos antes de continuar.</p>
        </div>
        <Link className="df-cart-back" href="/catalogo">← Seguir comprando</Link>
      </header>

      {checkingStock && <div className="df-cart-stock">Verificando disponibilidad…</div>}

      <div className="df-cart-layout">
        <section className="df-cart-products" aria-label="Productos del carrito">
          {items.map((item) => (
            <article className="df-cart-product" key={item.id}>
              <Link className="df-cart-image" href={`/catalogo/${item.id}`} aria-label={`Ver ${item.name}`}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} />
                ) : (
                  <span>DF</span>
                )}
              </Link>

              <div className="df-cart-info">
                <Link className="df-cart-name" href={`/catalogo/${item.id}`}>{item.name}</Link>
                <div className="df-cart-unit">{money(item.price)} <span>por unidad</span></div>
                <div className="df-cart-availability">
                  {item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}
                </div>
              </div>

              <div className="df-cart-quantity">
                <span>Cantidad</span>
                <div className="df-cart-stepper">
                  <button type="button" onClick={() => update(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Disminuir cantidad">−</button>
                  <input
                    type="number"
                    min={1}
                    max={item.stock || 1}
                    value={item.quantity}
                    onChange={(event) => update(item.id, Number(event.target.value) || 1)}
                    aria-label={`Cantidad de ${item.name}`}
                  />
                  <button type="button" onClick={() => update(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar cantidad">+</button>
                </div>
              </div>

              <div className="df-cart-total">
                <strong>{money(item.price * item.quantity)}</strong>
                <button type="button" onClick={() => remove(item.id)}>Eliminar</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="df-cart-summary">
          <h2>Resumen del pedido</h2>
          <div className="df-cart-summary-row">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p>El costo de entrega se calculará en el checkout.</p>
          <Link className="df-cart-primary df-cart-checkout" href="/checkout">Continuar al checkout</Link>
          <Link className="df-cart-summary-link" href="/catalogo">Seguir comprando</Link>
        </aside>
      </div>
    </main>
  );
}

function CartStyles() {
  return (
    <style>{`
      .df-cart-page, .df-cart-page * { box-sizing: border-box !important; }
      .df-cart-page { width: min(1160px, calc(100% - 32px)); margin: 38px auto 110px; color: #21171a; }
      .df-cart-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; margin:0 0 28px; }
      .df-cart-eyebrow { display:block; color:#98234d; font-size:13px; font-weight:900; letter-spacing:.16em; }
      .df-cart-heading h1 { margin:8px 0 10px; font-family:Georgia,serif; font-size:clamp(44px,6vw,68px); line-height:1 !important; }
      .df-cart-heading p { margin:0; color:#71696c; font-size:18px; line-height:1.45; }
      .df-cart-back { color:#21171a; font-weight:800; white-space:nowrap; text-decoration:none; }
      .df-cart-stock { margin:-10px 0 16px; color:#71696c; font-size:14px; }
      .df-cart-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:24px; align-items:start; }
      .df-cart-products { display:flex; flex-direction:column; gap:16px; min-width:0; }
      .df-cart-product { display:grid !important; grid-template-columns:132px minmax(0,1fr) 124px 132px !important; grid-template-rows:auto !important; align-items:center !important; gap:18px !important; width:100% !important; min-width:0 !important; padding:16px !important; background:#fff !important; border:1px solid #eadfe0 !important; border-radius:18px !important; box-shadow:0 8px 24px rgba(50,20,30,.05) !important; overflow:hidden !important; }
      .df-cart-image { display:flex !important; align-items:center !important; justify-content:center !important; width:132px !important; height:132px !important; min-width:132px !important; max-width:132px !important; aspect-ratio:1 / 1 !important; overflow:hidden !important; border-radius:12px !important; background:#f7f2ef !important; text-decoration:none !important; }
      .df-cart-image img { display:block !important; width:100% !important; height:100% !important; max-width:100% !important; max-height:100% !important; min-width:0 !important; min-height:0 !important; object-fit:contain !important; object-position:center !important; }
      .df-cart-image span { font:700 38px Georgia,serif; color:#98234d; }
      .df-cart-info { min-width:0 !important; overflow:hidden !important; }
      .df-cart-name { display:block !important; margin:0 0 9px !important; color:#21171a !important; font-size:20px !important; font-weight:900 !important; line-height:1.2 !important; overflow-wrap:anywhere !important; text-decoration:none !important; }
      .df-cart-unit { color:#5c5557; font-size:16px; font-weight:900; }
      .df-cart-unit span { color:#8a8184; font-size:12px; font-weight:600; }
      .df-cart-availability { margin-top:8px; color:#71696c; font-size:13px; }
      .df-cart-quantity { display:flex; flex-direction:column; align-items:center; gap:8px; min-width:0; }
      .df-cart-quantity > span { color:#5c5557; font-size:13px; font-weight:900; }
      .df-cart-stepper { display:flex; align-items:center; width:124px; }
      .df-cart-stepper button, .df-cart-stepper input { height:38px !important; border:1px solid #d8cbd0 !important; background:#fff !important; text-align:center !important; box-sizing:border-box !important; }
      .df-cart-stepper button { width:36px !important; min-width:36px !important; padding:0 !important; font-size:22px !important; cursor:pointer !important; }
      .df-cart-stepper button:first-child { border-radius:8px 0 0 8px !important; }
      .df-cart-stepper button:last-child { border-radius:0 8px 8px 0 !important; }
      .df-cart-stepper input { width:52px !important; min-width:52px !important; padding:0 !important; border-left:0 !important; border-right:0 !important; font:700 15px Arial,sans-serif !important; -moz-appearance:textfield; }
      .df-cart-stepper input::-webkit-outer-spin-button, .df-cart-stepper input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
      .df-cart-stepper button:disabled { opacity:.4; cursor:not-allowed !important; }
      .df-cart-total { display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; align-self:stretch; gap:14px; min-width:0; }
      .df-cart-total strong { color:#21171a; font-size:19px; white-space:nowrap; }
      .df-cart-total button { border:1px solid #d8cbd0; border-radius:9px; padding:8px 11px; background:#fff; color:#98234d; font-weight:900; cursor:pointer; white-space:nowrap; }
      .df-cart-summary { position:sticky; top:90px; padding:24px; background:#fff; border:1px solid #eadfe0; border-radius:18px; box-shadow:0 8px 24px rgba(50,20,30,.05); }
      .df-cart-summary h2 { margin:0 0 22px; font-family:Arial,Helvetica,sans-serif; font-size:20px; }
      .df-cart-summary-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .df-cart-summary-row span { font-size:18px; }
      .df-cart-summary-row strong { color:#98234d; font-size:26px; white-space:nowrap; }
      .df-cart-summary p { margin:16px 0 22px; color:#71696c; font-size:14px; line-height:1.5; }
      .df-cart-primary { display:flex; align-items:center; justify-content:center; min-height:48px; padding:13px 18px; border-radius:11px; background:#98234d; color:#fff !important; font-weight:900; text-decoration:none; }
      .df-cart-checkout { width:100%; }
      .df-cart-summary-link { display:block; margin-top:18px; color:#98234d; font-size:14px; font-weight:900; text-align:center; text-decoration:none; }
      .df-cart-empty { padding:34px; background:#fff; border:1px solid #eadfe0; border-radius:18px; }
      .df-cart-empty h2 { margin:0 0 10px; font-family:Georgia,serif; font-size:28px; }
      .df-cart-empty p { margin:0 0 22px; color:#71696c; }
      @media (max-width: 900px) {
        .df-cart-layout { grid-template-columns:1fr; }
        .df-cart-summary { position:static; }
      }
      @media (max-width: 600px) {
        .df-cart-page { width:calc(100% - 24px); margin:24px auto 100px; }
        .df-cart-heading { display:block; margin-bottom:24px; }
        .df-cart-heading h1 { font-size:48px; }
        .df-cart-heading p { font-size:16px; }
        .df-cart-back { display:inline-block; margin-top:15px; }
        .df-cart-product { grid-template-columns:88px minmax(0,1fr) !important; gap:12px !important; padding:12px !important; align-items:start !important; }
        .df-cart-image { width:88px !important; height:88px !important; min-width:88px !important; max-width:88px !important; border-radius:10px !important; }
        .df-cart-image span { font-size:28px; }
        .df-cart-name { font-size:17px !important; margin-bottom:6px !important; }
        .df-cart-unit { font-size:15px; }
        .df-cart-availability { margin-top:6px; font-size:12px; }
        .df-cart-quantity { grid-column:2; align-items:flex-start; gap:6px; }
        .df-cart-quantity > span { font-size:12px; }
        .df-cart-stepper { width:110px; }
        .df-cart-stepper button { width:32px !important; min-width:32px !important; height:34px !important; }
        .df-cart-stepper input { width:46px !important; min-width:46px !important; height:34px !important; }
        .df-cart-total { grid-column:1 / -1; flex-direction:row; align-items:center; justify-content:space-between; align-self:auto; border-top:1px solid #eee4e5; padding-top:11px; gap:10px; }
        .df-cart-total strong { font-size:18px; }
        .df-cart-total button { padding:7px 11px; }
        .df-cart-summary { padding:18px; }
        .df-cart-summary h2 { font-size:18px; margin-bottom:18px; }
        .df-cart-summary-row span { font-size:17px; }
        .df-cart-summary-row strong { font-size:23px; }
      }
    `}</style>
  );
}
