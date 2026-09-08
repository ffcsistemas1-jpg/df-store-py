"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n: number) => `₲ ${Math.round(Number(n || 0)).toLocaleString("es-PY")}`;
const pct = (n: number) => `${Number(n || 0).toFixed(1).replace(".", ",")}%`;

type Period = "7d" | "30d" | "all";
type Order = {
  id: string;
  status: string | null;
  total: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  payment_method: string | null;
  payment_verified: boolean | null;
  created_at: string;
};
type Item = { product_name: string; quantity: number | null; subtotal: number | null; order_id: string };
type Product = { id: string; name: string; stock: number | null; active: boolean | null; price: number | null; cost: number | null };
type MetaInsights = { connected?: boolean; spend?: number; purchases?: number; purchaseValue?: number; costPerPurchase?: number; roas?: number; error?: string };

type ProductProfit = {
  name: string;
  units: number;
  sales: number;
  cost: number;
  gross: number;
  net: number;
  margin: number;
};

export default function Reportes() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<MetaInsights | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const s = createClient();
      const [a, b, c, m] = await Promise.all([
        s.from("orders").select("id,status,total,subtotal,delivery_fee,payment_method,payment_verified,created_at").order("created_at", { ascending: false }),
        s.from("order_items").select("product_name,quantity,subtotal,order_id"),
        s.from("products").select("id,name,stock,active,price,cost"),
        fetch("/api/meta-insights", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      const error = a.error?.message || b.error?.message || c.error?.message;
      if (error) setMsg(error);
      setOrders((a.data || []) as Order[]);
      setItems((b.data || []) as Item[]);
      setProducts((c.data || []) as Product[]);
      setMeta(m);
      setLoading(false);
    })();
  }, []);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 0;
  const since = days ? Date.now() - days * 86400000 : 0;
  const filteredOrders = useMemo(() => orders.filter((o) => !since || new Date(o.created_at).getTime() >= since), [orders, since]);
  const validOrders = filteredOrders.filter((o) => o.status !== "cancelado");
  const delivered = validOrders.filter((o) => o.status === "entregado");
  const validIds = new Set(validOrders.map((o) => o.id));
  const filteredItems = items.filter((i) => validIds.has(i.order_id));

  const sales = validOrders.reduce((n, o) => n + Number(o.subtotal || 0), 0);
  const delivery = validOrders.reduce((n, o) => n + Number(o.delivery_fee || 0), 0);
  const cost = filteredItems.reduce((n, i) => {
    const p = products.find((x) => x.name === i.product_name);
    const price = Number(p?.price || 0);
    const unitCost = Number(p?.cost || 0);
    const lineSales = Number(i.subtotal || 0);
    return n + (price > 0 ? lineSales * (unitCost / price) : unitCost * Number(i.quantity || 0));
  }, 0);
  const adSpend = Number(meta?.spend || 0);
  const gross = sales - cost;
  const net = gross - adSpend;
  const units = filteredItems.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const avgTicket = delivered.length ? sales / delivered.length : 0;
  const grossMargin = sales ? (gross / sales) * 100 : 0;
  const netMargin = sales ? (net / sales) * 100 : 0;
  const adRatio = sales ? (adSpend / sales) * 100 : 0;
  const pendingPayments = validOrders.filter((o) => o.payment_method !== "Pago al recibir" && !o.payment_verified).length;
  const low = products.filter((p) => p.active && Number(p.stock || 0) <= 5).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  const statuses = validOrders.reduce<Record<string, number>>((acc, o) => {
    const key = o.status || "sin estado";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const profitability = useMemo<ProductProfit[]>(() => {
    const map: Record<string, ProductProfit> = {};
    filteredItems.forEach((i) => {
      const p = products.find((x) => x.name === i.product_name);
      const name = i.product_name || "Producto";
      const unitsLine = Number(i.quantity || 0);
      const lineSales = Number(i.subtotal || 0);
      const unitPrice = Number(p?.price || 0);
      const lineCost = unitPrice > 0 ? lineSales * (Number(p?.cost || 0) / unitPrice) : Number(p?.cost || 0) * unitsLine;
      const row = map[name] || { name, units: 0, sales: 0, cost: 0, gross: 0, net: 0, margin: 0 };
      row.units += unitsLine;
      row.sales += lineSales;
      row.cost += lineCost;
      row.gross = row.sales - row.cost;
      row.margin = row.sales ? (row.gross / row.sales) * 100 : 0;
      row.net = row.gross;
      map[name] = row;
    });
    return Object.values(map).sort((a, b) => b.sales - a.sales);
  }, [filteredItems, products]);

  const periodLabel = period === "7d" ? "Últimos 7 días" : period === "30d" ? "Últimos 30 días" : "Todo el período";

  if (loading) return <section><div className="panel">Cargando finanzas...</div></section>;

  return (
    <section className="finance-page">
      <div className="title">
        <div><small>ADMINISTRADOR</small><h1>Finanzas</h1><p className="muted">Rentabilidad real de tu tienda · {periodLabel}</p></div>
        <Link href="/admin">← Admin</Link>
      </div>

      <div className="filters finance-filters">
        <button className={period === "7d" ? "active" : ""} onClick={() => setPeriod("7d")}>7 días</button>
        <button className={period === "30d" ? "active" : ""} onClick={() => setPeriod("30d")}>30 días</button>
        <button className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>Todo</button>
      </div>

      {msg && <div className="panel finance-warning">⚠️ {msg}</div>}

      <div className="finance-kpis">
        <article><span>🛍️ VENTAS DE PRODUCTOS</span><strong>{money(sales)}</strong></article>
        <article><span>📦 COSTO DE MERCADERÍA</span><strong>{money(cost)}</strong></article>
        <article><span>↗ GANANCIA BRUTA</span><strong>{money(gross)}</strong><small>Margen bruto: {pct(grossMargin)}</small></article>
        <article><span>📣 GASTO EN PUBLICIDAD</span><strong>{money(adSpend)}</strong><small>Ventas: {pct(adRatio)}</small></article>
      </div>

      <div className="finance-net">
        <div><span>GANANCIA REAL (NETA)</span><strong>{money(net)}</strong></div>
        <div className="finance-breakdown">
          <div><b>💰 Ventas</b><span>{money(sales)}</span></div>
          <div><b>📦 Costo</b><span>{money(cost)}</span></div>
          <div><b>📣 Publicidad</b><span>{money(adSpend)}</span></div>
          <div><b>🧾 Otros gastos</b><span>{money(0)}</span></div>
          <div><b>Ganancia real</b><span>{money(net)}</span></div>
        </div>
      </div>

      <div className="finance-mini-grid">
        <article><span>📦 PEDIDOS ENTREGADOS</span><strong>{delivered.length}</strong></article>
        <article><span>🛍️ UNIDADES VENDIDAS</span><strong>{units}</strong></article>
        <article><span>🏷️ TICKET PROMEDIO</span><strong>{money(avgTicket)}</strong></article>
        <article><span>% MARGEN BRUTO</span><strong>{pct(grossMargin)}</strong></article>
        <article><span>% MARGEN NETO</span><strong>{pct(netMargin)}</strong></article>
        <article><span>📣 PUBLICIDAD / VENTAS</span><strong>{pct(adRatio)}</strong></article>
      </div>

      <div className="formgrid">
        <div className="panel">
          <h2>Estado de pedidos</h2>
          {Object.keys(statuses).length ? Object.entries(statuses).map(([k, v]) => <div className="checkout-total" key={k}><span>{k}</span><strong>{v}</strong></div>) : <p className="muted">Todavía no hay pedidos.</p>}
          <p className="muted">Pagos pendientes de verificación: <b>{pendingPayments}</b></p>
        </div>
        <div className="panel">
          <h2>Stock bajo</h2>
          {low.length ? low.map((p) => <div className="checkout-total" key={p.id}><span>{p.name}</span><strong>{Number(p.stock || 0)}</strong></div>) : <p className="muted">No hay productos con stock de 5 o menos.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="finance-section-head"><div><h2>Rentabilidad por producto</h2><p className="muted">Ventas, costo y margen calculados con los productos vendidos en {periodLabel.toLowerCase()}.</p></div><span className="finance-pill">{profitability.length} productos</span></div>
        {profitability.length ? <div className="finance-products">
          {profitability.map((p) => <article key={p.name}><div><h3>{p.name}</h3><span>{p.units} unidades vendidas</span></div><div className="finance-product-numbers"><span><small>Venta total</small><b>{money(p.sales)}</b></span><span><small>Costo total</small><b>{money(p.cost)}</b></span><span><small>Ganancia bruta</small><b>{money(p.gross)}</b></span><span><small>Margen</small><b>{pct(p.margin)}</b></span></div></article>)}
        </div> : <p className="muted">Todavía no hay productos vendidos en este período.</p>}
      </div>

      <div className="panel">
        <div className="finance-section-head"><div><h2>Publicidad de Meta</h2><p className="muted">Datos disponibles desde la cuenta publicitaria conectada.</p></div><Link href="/admin/meta-ads" className="btn">Ver Meta Ads →</Link></div>
        <div className="finance-meta-grid">
          <div><span>Gasto Meta</span><strong>{money(adSpend)}</strong></div>
          <div><span>Compras atribuidas</span><strong>{Number(meta?.purchases || 0).toLocaleString("es-PY")}</strong></div>
          <div><span>Costo por compra</span><strong>{money(Number(meta?.costPerPurchase || 0))}</strong></div>
          <div><span>ROAS</span><strong>{Number(meta?.roas || 0).toFixed(2)}×</strong></div>
        </div>
        {!meta?.connected && <p className="muted">Meta todavía no devuelve métricas de la cuenta publicitaria. La publicidad se mantiene en ₲ 0 hasta recibir datos reales; no se inventan importes.</p>}
        {meta?.error && <p className="muted">⚠️ {meta.error}</p>}
      </div>

      <div className="panel finance-formula"><b>Cómo se calcula la ganancia real:</b> ventas de productos − costo de mercadería − publicidad − otros gastos registrados. El delivery cobrado se muestra aparte y no se mezcla con la venta de productos.</div>
    </section>
  );
}
