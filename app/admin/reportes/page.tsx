"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n: number) => `Gs. ${Math.round(Number(n || 0)).toLocaleString("es-PY")}`;
const pct = (n: number) => `${Number(n || 0).toFixed(1).replace(".", ",")}%`;
const dateLabel = (d: Date) => d.toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" });

export default function Reportes() {
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ads, setAds] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [period, setPeriod] = useState<7 | 30 | 0>(7);

  useEffect(() => {
    (async () => {
      const s = createClient();
      const [a, b, c] = await Promise.all([
        s.from("orders").select("id,status,total,subtotal,delivery_fee,payment_verified,payment_method,created_at,utm_source,utm_medium,utm_campaign,fbclid"),
        s.from("order_items").select("product_id,product_name,quantity,unit_price,subtotal,order_id"),
        s.from("products").select("id,name,stock,active,price,cost"),
      ]);
      if (a.error || b.error || c.error) setMsg(a.error?.message || b.error?.message || c.error?.message || "No se pudieron cargar los datos.");
      else { setOrders(a.data || []); setItems(b.data || []); setProducts(c.data || []); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (period === 0) { setAds(null); return; }
    fetch(`/api/meta-insights?days=${period}`, { cache: "no-store" })
      .then(r => r.json()).then(setAds).catch(() => setAds(null));
  }, [period]);

  const start = useMemo(() => period ? new Date(Date.now() - period * 86400000) : null, [period]);
  const inPeriod = (d: string) => !start || new Date(d) >= start;
  const validOrders = orders.filter(o => o.status !== "cancelado" && inPeriod(o.created_at));
  const delivered = validOrders.filter(o => o.status === "entregado");
  const validOrderIds = new Set(validOrders.map(o => o.id));
  const periodItems = items.filter(i => validOrderIds.has(i.order_id));
  const productMap = new Map(products.map(p => [p.id, p]));
  const nameMap = new Map(products.map(p => [p.name, p]));

  const sales = validOrders.reduce((n, o) => n + Number(o.subtotal || o.total || 0), 0);
  const delivery = validOrders.reduce((n, o) => n + Number(o.delivery_fee || 0), 0);
  const costs = periodItems.reduce((n, i) => {
    const p = productMap.get(i.product_id) || nameMap.get(i.product_name);
    const unitCost = Number(p?.cost || 0);
    return n + unitCost * Number(i.quantity || 0);
  }, 0);
  const gross = sales - costs;
  const adSpend = Number(ads?.spend || 0);
  const net = gross - adSpend;
  const units = periodItems.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const avgTicket = validOrders.length ? sales / validOrders.length : 0;
  const grossMargin = sales ? gross / sales * 100 : 0;
  const netMargin = sales ? net / sales * 100 : 0;
  const adRatio = sales ? adSpend / sales * 100 : 0;
  const pendingPayments = validOrders.filter(o => o.payment_method !== "Pago al recibir" && !o.payment_verified).length;
  const low = products.filter(p => p.active && Number(p.stock) <= 5).sort((a, b) => Number(a.stock) - Number(b.stock));

  const byProduct = useMemo(() => {
    const map: Record<string, any> = {};
    periodItems.forEach(i => {
      const p = productMap.get(i.product_id) || nameMap.get(i.product_name);
      const key = i.product_id || i.product_name;
      if (!map[key]) map[key] = { id: key, name: i.product_name, units: 0, sales: 0, cost: 0, ad: 0 };
      map[key].units += Number(i.quantity || 0);
      map[key].sales += Number(i.subtotal || 0);
      map[key].cost += Number(p?.cost || 0) * Number(i.quantity || 0);
    });
    const totalAttributedSales = validOrders.filter(o => o.utm_campaign || o.utm_source || o.fbclid).reduce((n, o) => n + Number(o.subtotal || o.total || 0), 0);
    const attributedAd = Math.min(adSpend, totalAttributedSales);
    return Object.values(map).map((p: any) => {
      p.ad = totalAttributedSales > 0 && attributedAd > 0 ? attributedAd * (p.sales / totalAttributedSales) : 0;
      p.gross = p.sales - p.cost;
      p.net = p.gross - p.ad;
      p.margin = p.sales ? p.net / p.sales * 100 : 0;
      return p;
    }).sort((a: any, b: any) => b.sales - a.sales);
  }, [periodItems, adSpend, validOrders]);

  const orderStatus = validOrders.reduce((a, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {} as Record<string, number>);
  const periodText = period === 0 ? "Todo el historial" : `Últimos ${period} días`;

  if (loading) return <section><div className="panel">Cargando finanzas...</div></section>;

  return <section className="finance-page">
    <div className="title finance-title">
      <div><small>ADMINISTRADOR</small><h1>Finanzas</h1><p className="muted">Rentabilidad real de tu tienda, ventas, costos y publicidad.</p></div>
      <Link href="/admin">← Admin</Link>
    </div>

    <div className="finance-toolbar">
      <div><b>Período</b><span>{periodText}{start && <> · desde {dateLabel(start)}</>}</span></div>
      <div className="finance-periods">
        <button className={period === 7 ? "active" : ""} onClick={() => setPeriod(7)}>7 días</button>
        <button className={period === 30 ? "active" : ""} onClick={() => setPeriod(30)}>30 días</button>
        <button className={period === 0 ? "active" : ""} onClick={() => setPeriod(0)}>Todo</button>
      </div>
    </div>

    <div className="finance-kpis">
      <div className="finance-kpi"><span>🛍️</span><small>VENTAS DE PRODUCTOS</small><strong>{money(sales)}</strong></div>
      <div className="finance-kpi"><span>📦</span><small>COSTO DE MERCADERÍA</small><strong>{money(costs)}</strong></div>
      <div className="finance-kpi"><span>↗</span><small>GANANCIA BRUTA</small><strong>{money(gross)}</strong><em>Margen bruto: {pct(grossMargin)}</em></div>
      <div className="finance-kpi"><span>📣</span><small>GASTO EN PUBLICIDAD</small><strong>{money(adSpend)}</strong><em>Ventas: {pct(adRatio)}</em></div>
    </div>

    <div className="finance-net">
      <div><small>GANANCIA REAL (NETA)</small><strong>{money(net)}</strong><p>Ventas − costo de mercadería − publicidad</p></div>
      <div className="finance-net-grid">
        <div><span>💰</span><b>Ventas</b><strong>{money(sales)}</strong></div>
        <div><span>📦</span><b>Costo</b><strong>{money(costs)}</strong></div>
        <div><span>📣</span><b>Publicidad</b><strong>{money(adSpend)}</strong></div>
        <div><span>🧾</span><b>Otros gastos</b><strong>{money(0)}</strong></div>
      </div>
    </div>

    <div className="finance-metrics">
      <div><span>📦 PEDIDOS ENTREGADOS</span><strong>{delivered.length}</strong></div>
      <div><span>🛍️ UNIDADES VENDIDAS</span><strong>{units}</strong></div>
      <div><span>🏷️ TICKET PROMEDIO</span><strong>{money(avgTicket)}</strong></div>
      <div><span>% MARGEN BRUTO</span><strong>{pct(grossMargin)}</strong></div>
      <div><span>% MARGEN NETO</span><strong>{pct(netMargin)}</strong></div>
      <div><span>📣 PUBLICIDAD / VENTAS</span><strong>{pct(adRatio)}</strong></div>
    </div>

    <div className="formgrid finance-panels">
      <div className="panel"><div className="section-head"><div><small>OPERACIÓN</small><h2>Estado de pedidos</h2></div><b>{validOrders.length} pedidos</b></div>
        {Object.entries(orderStatus).map(([k,v]) => <div className="finance-row" key={k}><span>{k.replace(/^./, x => x.toUpperCase())}</span><strong>{v}</strong></div>)}
        <div className="finance-row"><span>Pagos pendientes de verificación</span><strong>{pendingPayments}</strong></div>
      </div>
      <div className="panel"><div className="section-head"><div><small>INVENTARIO</small><h2>Stock bajo</h2></div><b>{low.length}</b></div>
        {low.length ? low.map(p => <div className="finance-row" key={p.id}><span>{p.name}</span><strong>{p.stock}</strong></div>) : <p className="muted">No hay productos con stock de 5 o menos.</p>}
      </div>
    </div>

    <div className="panel finance-product-panel">
      <div className="section-head"><div><small>RENTABILIDAD</small><h2>Rentabilidad por producto</h2></div><span className="muted">Ventas, costo, publicidad y ganancia neta</span></div>
      <div className="finance-product-table">
        <div className="finance-product-head"><span>Producto</span><span>Vendidos</span><span>Venta total</span><span>Costo</span><span>Publicidad*</span><span>Ganancia real</span><span>Margen</span></div>
        {byProduct.length ? byProduct.map((p: any) => <div className="finance-product-row" key={p.id}><b>{p.name}</b><span>{p.units}</span><span>{money(p.sales)}</span><span>{money(p.cost)}</span><span>{money(p.ad)}</span><strong>{money(p.net)}</strong><em>{pct(p.margin)}</em></div>) : <p className="muted">Todavía no hay ventas en el período seleccionado.</p>}
      </div>
      <p className="finance-note">* La publicidad se distribuye entre los productos vendidos en pedidos que llegaron con atribución de Meta. Es una estimación de atribución, no un gasto directo registrado por producto.</p>
    </div>

    <div className="panel finance-attribution">
      <div className="section-head"><div><small>META ADS</small><h2>Publicidad y retorno</h2></div><span className={ads?.connected ? "status-ok" : "status-warn"}>{ads?.connected ? "● Conectado" : "● Sin datos de Meta"}</span></div>
      <div className="finance-ads-grid">
        <div><span>Gasto Meta</span><strong>{money(adSpend)}</strong></div>
        <div><span>Compras atribuidas</span><strong>{Number(ads?.purchases || 0).toLocaleString("es-PY")}</strong></div>
        <div><span>Valor de compras</span><strong>{money(ads?.purchaseValue || 0)}</strong></div>
        <div><span>ROAS</span><strong>{Number(ads?.roas || 0).toFixed(2)}×</strong></div>
      </div>
      {!ads?.connected && <p className="muted">{ads?.error || "Meta todavía no devolvió métricas para este período. La aplicación no inventa datos."}</p>}
    </div>

    {msg && <div className="panel">⚠️ {msg}</div>}
  </section>;
}
