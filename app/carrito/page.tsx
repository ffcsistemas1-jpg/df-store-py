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

          if (!cancelled && !error && Array.isArray(data) && data.length === ids.length) {
            const stocks: Record<string, number> = {};
            for (const row of data) {
              if (row.active) stocks[row.id] = Number(row.stock) || 0;
            }
            syncStock(stocks);
          }
        }
      } catch {
        // The cart remains usable even if the stock check is temporarily unavailable.
      }

      if (!cancelled) setCheckingStock(false);
    }

    checkStock();
    return () => {
      cancelled = true;
    };
  }, [items.length, syncStock]);

  if (!items.length) {
    return (
      <section className="cart-page">
        <small className="eyebrow">COMPRA</small>
        <h1>Carrito</h1>
        <div className="empty">
          <h2>Tu carrito está vacío</h2>
          <p>Agregá productos del catálogo para continuar.</p>
          <Link className="btn" href="/catalogo">Ir al catálogo</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      {checkingStock && <p className="muted stock-check" role="status">Verificando disponibilidad...</p>}

      <header className="cart-header">
        <div>
          <small className="eyebrow">COMPRA</small>
          <h1>Carrito</h1>
          <p className="muted">Revisá tus productos antes de continuar.</p>
        </div>
        <Link className="continue-shopping" href="/catalogo">← Seguir comprando</Link>
      </header>

      <div className="cart-list">
        {items.map((item) => (
          <article className="cart-card" key={item.id}>
            <Link href={`/catalogo/${item.id}`} className="cart-image" aria-label={`Ver ${item.name}`}>
              {item.image_url ? <img src={item.image_url} alt={item.name} /> : <b>DF</b>}
            </Link>

            <div className="cart-details">
              <Link href={`/catalogo/${item.id}`} className="cart-product-link">
                <h2>{item.name}</h2>
              </Link>
              <p className="unit-price">{money(item.price)} <span>c/u</span></p>

              <div className="quantity-block">
                <span className="quantity-label">Cantidad</span>
                <div className="quantity-control">
                  <button type="button" aria-label={`Disminuir ${item.name}`} onClick={() => update(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                  <input aria-label={`Cantidad de ${item.name}`} type="number" min="1" max={item.stock || 1} value={item.quantity} onChange={(event) => update(item.id, Number(event.target.value) || 1)} />
                  <button type="button" aria-label={`Aumentar ${item.name}`} onClick={() => update(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                </div>
              </div>

              <p className="stock-text">{item.stock > 0 ? `${item.stock} disponibles` : "Sin stock"}</p>
            </div>

            <div className="cart-actions">
              <strong className="line-total">{money(item.price * item.quantity)}</strong>
              <button type="button" className="remove-button" onClick={() => remove(item.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      <aside className="cart-summary panel">
        <div className="summary-row">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <p className="muted">El costo de entrega se calculará en el checkout.</p>
        <Link className="btn checkout-button" href="/checkout" aria-disabled={checkingStock}>Continuar al checkout</Link>
      </aside>

      <style jsx>{`
        .cart-page {
          width: min(100% - 32px, 1180px);
          margin: 42px auto 70px;
          min-width: 0;
        }
        .eyebrow {
          display: inline-block;
          color: #98234d;
          font-weight: 800;
          letter-spacing: .12em;
          font-size: 14px;
        }
        .cart-page h1 {
          margin: 8px 0 12px;
          font-size: clamp(38px, 5vw, 58px);
          line-height: 1;
        }
        .cart-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }
        .cart-header p { margin: 0; font-size: 18px; }
        .continue-shopping { color: #292326; font-weight: 700; white-space: nowrap; }
        .stock-check { margin-bottom: 12px; }
        .cart-list { display: flex; flex-direction: column; gap: 16px; }
        .cart-card {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr) auto;
          align-items: center;
          gap: 20px;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 18px;
          background: #fff;
          border: 1px solid #eadfe0;
          border-radius: 20px;
          box-shadow: 0 5px 18px rgba(50, 20, 30, .04);
        }
        .cart-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 128px;
          height: 128px;
          min-width: 128px;
          max-width: 128px;
          min-height: 128px;
          max-height: 128px;
          overflow: hidden;
          box-sizing: border-box;
          border-radius: 14px;
          background: #f7f1ee;
        }
        .cart-image img {
          display: block;
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .cart-image b { color: #98234d; font: 700 42px Georgia, serif; }
        .cart-details { min-width: 0; overflow: hidden; }
        .cart-product-link { color: inherit; text-decoration: none; }
        .cart-details h2 {
          margin: 0 0 8px;
          font-size: 22px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }
        .unit-price { margin: 0 0 14px; color: #5c5557; font-weight: 800; }
        .unit-price span { font-size: 13px; font-weight: 700; }
        .quantity-block { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .quantity-label { font-weight: 800; }
        .quantity-control { display: inline-flex; align-items: center; }
        .quantity-control button,
        .quantity-control input {
          height: 38px;
          box-sizing: border-box;
          border: 1px solid #c8b8bd;
          background: #fff;
          text-align: center;
        }
        .quantity-control button { width: 38px; font-size: 22px; cursor: pointer; }
        .quantity-control button:first-child { border-radius: 8px 0 0 8px; }
        .quantity-control button:last-child { border-radius: 0 8px 8px 0; }
        .quantity-control button:disabled { opacity: .45; cursor: not-allowed; }
        .quantity-control input { width: 52px; border-left: 0; border-right: 0; font: inherit; }
        .stock-text { margin: 8px 0 0; color: #71696c; font-size: 14px; font-weight: 600; }
        .cart-actions { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 18px; min-width: 120px; }
        .line-total { color: #292326; font-size: 22px; white-space: nowrap; }
        .remove-button { border: 1px solid #c8b8bd; border-radius: 8px; padding: 8px 14px; background: #fff; color: #98234d; font-weight: 800; cursor: pointer; }
        .cart-summary { margin-top: 20px; padding: 24px; }
        .summary-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 22px; }
        .summary-row strong { color: #98234d; font-size: 28px; }
        .cart-summary p { margin: 12px 0 20px; }
        .checkout-button { display: inline-flex; }
        @media (max-width: 700px) {
          .cart-page { width: min(100% - 24px, 560px); margin-top: 26px; }
          .cart-header { display: block; margin-bottom: 22px; }
          .cart-header p { font-size: 16px; }
          .continue-shopping { display: inline-block; margin-top: 16px; }
          .cart-card {
            grid-template-columns: 92px minmax(0, 1fr);
            align-items: start;
            gap: 14px;
            padding: 12px;
            border-radius: 16px;
          }
          .cart-image {
            width: 92px;
            height: 92px;
            min-width: 92px;
            max-width: 92px;
            min-height: 92px;
            max-height: 92px;
            border-radius: 10px;
          }
          .cart-image b { font-size: 30px; }
          .cart-details h2 { font-size: 17px; margin-bottom: 6px; }
          .unit-price { margin-bottom: 10px; font-size: 15px; }
          .quantity-block { display: block; }
          .quantity-label { display: block; margin-bottom: 6px; font-size: 14px; }
          .quantity-control button { width: 32px; height: 34px; }
          .quantity-control input { width: 42px; height: 34px; }
          .stock-text { margin-top: 7px; font-size: 13px; }
          .cart-actions {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            min-width: 0;
            width: 100%;
            padding-top: 11px;
            border-top: 1px solid #eadfe0;
            gap: 10px;
          }
          .line-total { font-size: 18px; }
          .remove-button { padding: 7px 12px; }
          .cart-summary { padding: 18px; }
          .summary-row { font-size: 18px; }
          .summary-row strong { font-size: 23px; }
          .checkout-button { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
