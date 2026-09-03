"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n: number) => `₲ ${Number(n || 0).toLocaleString("es-PY")}`;

type Status = {
  pixelConfigured: boolean; pixelIdMasked: string | null; capiConfigured: boolean;
  marketingConfigured: boolean; adAccountMasked: string | null; businessId: string | null;
};
type Insights = { configured:boolean; connected?:boolean; period?:string; spend?:number; impressions?:number; clicks?:number; purchases?:number; purchaseValue?:number; costPerPurchase?:number; roas?:number; error?:string };
type EventRow = { id: number; event_id: string; event_name: string; source: string; status: string; value: number | null; currency: string | null; created_at: string; utm_campaign: string | null; utm_source: string | null; utm_medium: string | null; fbclid: string | null };
type OrderRow = { id: string; created_at: string; total: number; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; fbclid: string | null; landing_page: string | null };

export default function MetaAdsDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const [statusRes, insightsRes, eventsRes, ordersRes] = await Promise.all([
          fetch("/api/meta-status", {cache:"no-store"}).then((r) => r.json()).catch(() => null),
          fetch("/api/meta-insights", {cache:"no-store"}).then((r) => r.json()).catch(() => null),
          s.from("meta_events_recent").select("*").limit(50),
          s.from("orders").select("id,created_at,total,utm_source,utm_medium,utm_campaign,fbclid,landing_page").order("created_at", { ascending: false }).limit(20),
        ]);
        setStatus(statusRes);
        setInsights(insightsRes);
        if (eventsRes.error) setErr(eventsRes.error.message); else setEvents((eventsRes.data || []) as EventRow[]);
        if (!ordersRes.error) setOrders((ordersRes.data || []) as OrderRow[]);
      } catch (e: any) { setErr(e?.message || "Error al cargar datos de Meta Ads."); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="panel">Cargando estado de Meta Ads...</div>;

  const byName = events.reduce((acc: Record<string, number>, e) => { acc[e.event_name] = (acc[e.event_name] || 0) + 1; return acc; }, {});
  const lastPurchase = events.find((e) => e.event_name === "Purchase");
  const errors = events.filter((e) => e.status === "error" || e.status === "network_error");
  const ordersWithAttribution = orders.filter((o) => o.utm_campaign || o.utm_source || o.fbclid);

  return (
    <>
      <div className="adminstats">
        <div><b>Pixel</b><strong>{status?.pixelConfigured ? status.pixelIdMasked : "No configurado"}</strong></div>
        <div><b>Conversions API</b><strong>{status?.capiConfigured ? "Configurado" : "No configurado"}</strong></div>
        <div><b>Marketing API</b><strong>{status?.marketingConfigured ? "Configurada" : "No conectada"}</strong></div>
        <div><b>Errores CAPI</b><strong>{errors.length}</strong></div>
      </div>

      <div className="panel">
        <h2>Estado de conexión</h2>
        <p><b>Business Portfolio:</b> {status?.businessId || "No informado"}</p>
        <p><b>Pixel/CAPI:</b> {status?.pixelConfigured && status?.capiConfigured ? "✅ activos" : "⚠️ configuración incompleta"}</p>
        <p><b>Marketing API / Ads Manager:</b> {status?.marketingConfigured ? (insights?.connected ? "✅ conectada" : "⚠️ configurada, pero Meta no respondió correctamente") : "No conectado a Marketing API"}</p>
        {!status?.marketingConfigured&&<p className="muted">Para traer gasto, campañas, costo por compra y ROAS falta definir la cuenta publicitaria real (<code>META_AD_ACCOUNT_ID</code>). No se muestran métricas inventadas.</p>}
        {insights?.error&&<p>⚠️ {insights.error}</p>}
      </div>

      {insights?.connected&&<div className="adminstats">
        <div><b>Gasto · 7 días</b><strong>{money(insights.spend||0)}</strong></div>
        <div><b>Compras Meta</b><strong>{Number(insights.purchases||0).toLocaleString("es-PY")}</strong></div>
        <div><b>Costo por compra</b><strong>{money(insights.costPerPurchase||0)}</strong></div>
        <div><b>ROAS</b><strong>{Number(insights.roas||0).toFixed(2)}×</strong></div>
      </div>}

      <div className="formgrid">
        <div className="panel">
          <h2>Eventos por tipo (últimos 50)</h2>
          {Object.keys(byName).length ? Object.entries(byName).map(([k, v]) => <div className="checkout-total" key={k}><span>{k}</span><strong>{v}</strong></div>) : <p className="muted">Todavía no se registró ningún evento.</p>}
        </div>
        <div className="panel">
          <h2>Último Purchase</h2>
          {lastPurchase ? <><p><b>Fecha:</b> {new Date(lastPurchase.created_at).toLocaleString("es-PY")}</p><p><b>Valor:</b> {money(lastPurchase.value || 0)} {lastPurchase.currency}</p><p><b>Estado:</b> {lastPurchase.status}</p>{lastPurchase.utm_campaign && <p><b>Campaña:</b> {lastPurchase.utm_campaign}</p>}</> : <p className="muted">Todavía no hay compras registradas con Conversions API.</p>}
        </div>
      </div>

      <div className="panel">
        <h2>Pedidos con atribución de Meta (últimos 20)</h2>
        {ordersWithAttribution.length ? ordersWithAttribution.map((o) => <div className="checkout-total" key={o.id}><span>{o.utm_campaign || o.utm_source || "fbclid presente"} — {new Date(o.created_at).toLocaleDateString("es-PY")}</span><strong>{money(o.total)}</strong></div>) : <p className="muted">Ninguno de los últimos 20 pedidos llegó con parámetros de campaña todavía.</p>}
      </div>

      {errors.length > 0 && <div className="panel"><h2>Errores recientes</h2>{errors.slice(0, 10).map((e) => <div className="checkout-total" key={e.id}><span>{e.event_name} — {new Date(e.created_at).toLocaleString("es-PY")}</span><strong>{e.status}</strong></div>)}</div>}
      {err && <p>⚠️ {err}</p>}
    </>
  );
}
