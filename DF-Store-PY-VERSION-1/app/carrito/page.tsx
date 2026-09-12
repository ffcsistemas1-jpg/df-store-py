"use client";

import Link from "next/link";
import { useCart } from "../ui";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

const money = (n: number) => `₲ ${n.toLocaleString("es-PY")}`;

export default function Cart() {
  const { items, remove, update, subtotal, syncStock } = useCart();
  const [checkingStock, setCheckingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!items.length) {
        setCheckingStock(false);
        return;
      }
      try {
        const ids = items.map((i) => i.id).filter((id) => !id.startsWith("demo-"));
        if (ids.length) {
          const { data, error } = await createClient()
            .from("products")
            .select("id,stock,active")
            .in("id", ids);
          if (!cancelled && !error && Array.isArray(data) && data.length === ids.length) {
            const stocks: Record<string, number> = {};
            for (const row of data) {
              if (row.active) stocks[row.id] = Number(row.stock) || 0;
            }
            syncStock(stocks);
          }
        }
      } catch {}
      if (!cancelled) setCheckingStock(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [items.length, syncStock]);

  if (!items.length) {
    return (
      <section className="cart-page cart-page-pro">
        <div className="cart-heading-pro">
          <small>COMPRA</small>
          <h1>Carrito</h1>
        </div>
        <div className="empty">
          <h2>Tu carrito está vacío</h2>
          <p>Agregá productos del catálogo para continuar.</p>
          <Link className="btn" href="/catalogo">Ir al catálogo</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page cart-page-pro">
      {checkingStock && <p className="muted cart-stock-check">Verificando disponibilidad...</p>}

      <header className="cart-heading-pro">
        <small>COMPRA</small>
        <h1>Carrito</h1>
        <p className="muted">Revisá tus productos antes de continuar.</p>
        <Link className="cart-continue-link" href="/catalogo">← Seguir comprando</Link>
      </header>

      <div className="cart-items-pro">
        {items.map((item) => (
          <article className="cart-item-pro" key={item.id}>
            <Link href={`/catalogo/${item.id}`} className="cart-image-pro" aria-label={`Ver ${item.name}`}>
              {item.image_url ? <img src={item.image_url} alt={item.name} /> : <b>DF</b>}
            </Link>

            <div className="cart-product-pro">
              <Link href={`/catalogo/${item.id}`} className="cart-product-name-pro">
                {item.name}
              </Link>
              <div className="cart-product-price-pro">{money(item.price)} <span>por unidad</span></div>
              <div className="cart-stock-pro">
                {item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}
              </div>

              <div className="cart-quantity-pro">
                <span>Cantidad</span>
                <div className="cart-stepper-pro">
                  <button type="button" onClick={() => update(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Disminuir cantidad">−</button>
                  <input
                    type="number"
                    min="1"
                    max={item.stock || 1}
                    value={item.quantity}
                    onChange={(e) => update(item.id, Number(e.target.value) || 1)}
                    aria-label="Cantidad"
                  />
                  <button type="button" onClick={() => update(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Aumentar cantidad">+</button>
                </div>
              </div>
            </div>

            <div className="cart-item-footer-pro">
              <strong>{money(item.price * item.quantity)}</strong>
              <button type="button" className="cart-remove-pro" onClick={() => remove(item.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      <aside className="cart-summary-pro panel">
        <div className="cart-summary-line-pro">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <p className="muted">El costo de entrega se calculará en el checkout.</p>
        <Link className="btn cart-checkout-pro" href="/checkout">Continuar al checkout</Link>
      </aside>

      <style jsx>{`
        .cart-page-pro { max-width: 1080px; margin: 42px auto; padding: 0 24px; }
        .cart-heading-pro { margin-bottom: 26px; }
        .cart-heading-pro small { display: block; margin-bottom: 8px; }
        .cart-heading-pro h1 { margin: 0 0 12px; font-size: clamp(42px, 6vw, 64px); line-height: 1; }
        .cart-heading-pro p { margin: 0 0 18px; font-size: 18px; }
        .cart-continue-link { display: inline-flex; align-items: center; color: #98234d; font-weight: 800; line-height: 1.3; padding: 4px 0; }
        .cart-stock-check { margin: 0 0 12px; }
        .cart-items-pro { display: flex; flex-direction: column; gap: 16px; }
        .cart-item-pro { display: grid; grid-template-columns: 156px minmax(0, 1fr) auto; gap: 22px; align-items: center; background: #fff; border: 1px solid #eadfe0; border-radius: 20px; padding: 18px; min-width: 0; }
        .cart-image-pro { width: 156px; height: 156px; border-radius: 14px; overflow: hidden; background: #f5efeb; display: flex; align-items: center; justify-content: center; }
        .cart-image-pro img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .cart-image-pro b { font: 700 48px Georgia; color: #98234d; }
        .cart-product-pro { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .cart-product-name-pro { color: #21171a; font-size: 24px; font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; }
        .cart-product-price-pro { font-size: 19px; font-weight: 800; color: #21171a; }
        .cart-product-price-pro span { color: #71686a; font-size: 14px; font-weight: 600; }
        .cart-stock-pro { color: #71686a; font-size: 15px; }
        .cart-quantity-pro { display: flex; align-items: center; gap: 12px; margin-top: 8px; font-weight: 800; }
        .cart-stepper-pro { display: inline-flex; align-items: center; }
        .cart-stepper-pro button, .cart-stepper-pro input { height: 40px; border: 1px solid #cfc1c5; background: #fff; font: inherit; text-align: center; }
        .cart-stepper-pro button { width: 40px; font-size: 24px; cursor: pointer; }
        .cart-stepper-pro button:first-child { border-radius: 9px 0 0 9px; }
        .cart-stepper-pro button:last-child { border-radius: 0 9px 9px 0; }
        .cart-stepper-pro button:disabled { opacity: .4; cursor: not-allowed; }
        .cart-stepper-pro input { width: 52px; border-left: 0; border-right: 0; outline: none; }
        .cart-item-footer-pro { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; align-self: stretch; gap: 22px; min-width: 112px; }
        .cart-item-footer-pro strong { font-size: 22px; white-space: nowrap; }
        .cart-remove-pro { border: 1px solid #d8cdcf; background: #fff; color: #98234d; border-radius: 10px; padding: 10px 14px; font: inherit; font-weight: 800; cursor: pointer; white-space: nowrap; }
        .cart-remove-pro:hover { background: #faf0f4; }
        .cart-summary-pro { margin-top: 22px; }
        .cart-summary-line-pro { display: flex; align-items: center; justify-content: space-between; gap: 18px; font-size: 22px; }
        .cart-summary-line-pro strong { color: #98234d; font-size: 30px; }
        .cart-summary-pro p { margin: 12px 0 18px; }
        .cart-checkout-pro { display: block; width: 100%; text-align: center; padding: 16px 20px; font-size: 17px; }
        @media (max-width: 700px) {
          .cart-page-pro { margin: 26px auto; padding: 0 14px; }
          .cart-heading-pro { margin-bottom: 22px; }
          .cart-heading-pro h1 { font-size: 44px; }
          .cart-heading-pro p { font-size: 16px; line-height: 1.45; }
          .cart-continue-link { margin-top: 2px; }
          .cart-item-pro { grid-template-columns: 84px minmax(0, 1fr); gap: 14px; padding: 12px; border-radius: 18px; align-items: start; }
          .cart-image-pro { width: 84px; height: 84px; border-radius: 11px; }
          .cart-image-pro b { font-size: 30px; }
          .cart-product-name-pro { font-size: 18px; line-height: 1.2; }
          .cart-product-price-pro { font-size: 17px; }
          .cart-product-price-pro span { font-size: 12px; }
          .cart-stock-pro { font-size: 14px; }
          .cart-quantity-pro { flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 5px; }
          .cart-stepper-pro button, .cart-stepper-pro input { height: 36px; }
          .cart-stepper-pro button { width: 36px; }
          .cart-stepper-pro input { width: 46px; }
          .cart-item-footer-pro { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: space-between; border-top: 1px solid #eadfe0; padding-top: 11px; min-width: 0; width: 100%; gap: 10px; }
          .cart-item-footer-pro strong { font-size: 19px; }
          .cart-remove-pro { padding: 8px 12px; }
          .cart-summary-pro { padding: 18px; margin-top: 18px; }
          .cart-summary-line-pro { font-size: 19px; }
          .cart-summary-line-pro strong { font-size: 24px; }
        }
      `}</style>
    </section>
  );
}
