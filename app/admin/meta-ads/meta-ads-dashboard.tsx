"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n: number) => `₲ ${Math.round(Number(n || 0)).toLocaleString("es-PY")}`;
const integer = (n: number) => Math.round(Number(n || 0)).toLocaleString("es-PY");
const number = (n: number) => Number(n || 0).toFixed(2).replace(".", ",");
const EVENT_LABELS: Record<string, string> = {
  PageView: "Vista de página",
  ViewContent: "Vista de producto",
  AddToCart: "Agregado al carrito",
  InitiateCheckout: "Inicio de compra",
  Purchase: "Compra",
};
const STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  error: "Error",
  network_error: "Error de red",
  not_configured: "No configurado",
  duplicate_ignored: "Duplicado ignorado",
};
const labelFor = (name: string) => EVENT_LABELS[name] || name;
const statusLabelFor = (status: string) => STATUS_LABELS[status] || status;

type Period = "7d" | "30d" | "all";
type Status = {
  pixelConfigured: boolean;
  pixelIdMasked: string | null;
  capiConfigured: boolean;
  marketingConfigured: boolean;
  adAccountMasked: string | null;
  businessId: string | null;
};
type MetaConfig = { adAccountId: string; pageName: string; pageId: string; businessId: string };
type Insights = {
  configured: boolean;
  connected?: boolean;
  period?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  purchases?: number;
  purchaseValue?: number;
  costPerPurchase?: number;
  roas?: number;
  error?: string;
};
type EventRow = {
  id: number;
  event_id: string;
  event_name: string;
  source: string;
  status: string;
  value: number | null;
  currency: string | null;
  created_at: string;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  fbclid: string | null;
};
type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  landing_page: string | null;
};

export default function MetaAdsDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [configDraft, setConfigDraft] = useState({ adAccountId: "", pageName: "FFC Electronic", pageId: "" });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const loadInsights = useCallback(async (selectedPeriod: Period) => {
    const data = await fetch(`/api/meta-insights?period=${selectedPeriod}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    setInsights(data as Insights | null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = createClient();
        const [statusRes, insightsRes, configRes, eventsRes, ordersRes] = await Promise.all([
          fetch("/api/meta-status", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch(`/api/meta-insights?period=${period}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/meta-config", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          s.from("meta_events_recent").select("*").limit(50),
          s.from("orders").select("id,created_at,total,utm_source,utm_medium,utm_campaign,fbclid,landing_page").order("created_at", { ascending: false }).limit(20),
        ]);
        if (!alive) return;
        setStatus(statusRes as Status | null);
        setInsights(insightsRes as Insights | null);
        if (configRes?.configured) {
          setConfig(configRes as MetaConfig);
          setConfigDraft({ adAccountId: configRes.adAccountId || "", pageName: configRes.pageName || "FFC Electronic", pageId: configRes.pageId || "" });
        }
        if (eventsRes.error) setErr(eventsRes.error.message); else setEvents((eventsRes.data || []) as EventRow[]);
        if (!ordersRes.error) setOrders((ordersRes.data || []) as OrderRow[]);
      } catch (e: unknown) {
        if (alive) setErr(e instanceof Error ? e.message : "Error al cargar datos de Meta Ads.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period]);

  const changePeriod = (next: Period) => {
    setPeriod(next);
    setInsights(null);
    void loadInsights(next);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    setErr("");
    try {
      const res = await fetch("/api/meta-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar la configuración.");
      setConfig(data as MetaConfig);
      setConfigDraft({ adAccountId: data.adAccountId || "", pageName: data.pageName || "FFC Electronic", pageId: data.pageId || "" });
      setConfigMsg("✓ Configuración guardada correctamente.");
      const [statusRes, insightsRes] = await Promise.all([
        fetch("/api/meta-status", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/meta-insights?period=${period}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setStatus(statusRes as Status);
      setInsights(insightsRes as Insights);
    } catch (e: unknown) {
      setConfigMsg("");
      setErr(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      setSavingConfig(false);
    }
  };

  const byName = useMemo(() => events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_name] = (acc[e.event_name] || 0) + 1;
    return acc;
  }, {}), [events]);
  const lastPurchase = events.find((e) => e.event_name === "Purchase");
  const errors = events.filter((e) => e.status === "error" || e.status === "network_error");
  const ordersWithAttribution = orders.filter((o) => Boolean(o.utm_campaign || o.utm_source || o.fbclid));
  const eventTotal = events.length;
  const periodLabel = period === "7d" ? "Últimos 7 días" : period === "30d" ? "Últimos 30 días" : "Todo el período";
  const purchaseRate = Number(insights?.clicks || 0) > 0 ? (Number(insights?.purchases || 0) / Number(insights?.clicks || 0)) * 100 : 0;
  const capiState = status?.capiConfigured ? "Activo" : "Revisar";
  const apiState = status?.marketingConfigured && insights?.connected ? "Conectada" : "Revisar";

  if (loading) return <div className="panel">Cargando estado de Meta Ads...</div>;

  return (
    <div className="meta-dashboard">
      <div className="meta-hero">
        <div>
          <span className="meta-eyebrow">PUBLICIDAD Y ATRIBUCIÓN</span>
          <h2>Meta Ads</h2>
          <p>Controlá inversión, resultados y conversiones de tus campañas desde DF Store PY.</p>
        </div>
        <div className="meta-identity">
          <span>Página</span>
          <strong>{config?.pageName || "FFC Electronic"}</strong>
          <small>{status?.adAccountMasked ? `Cuenta ${status.adAccountMasked}` : "Cuenta no configurada"}</small>
        </div>
      </div>

      <div className="meta-toolbar">
        <div className="meta-periods">
          {(["7d", "30d", "all"] as Period[]).map((p) => (
            <button key={p} type="button" className={period === p ? "active" : ""} onClick={() => changePeriod(p)}>
              {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "Todo"}
            </button>
          ))}
        </div>
        <span className="meta-period-label">{periodLabel}</span>
      </div>

      <div className="meta-kpis">
        <article><span>Inversión publicitaria</span><strong>{money(insights?.spend || 0)}</strong><small>{periodLabel}</small></article>
        <article><span>Compras</span><strong>{integer(insights?.purchases || 0)}</strong><small>Registradas por Meta</small></article>
        <article><span>Valor de compras</span><strong>{money(insights?.purchaseValue || 0)}</strong><small>Ingresos atribuidos por Meta</small></article>
        <article><span>ROAS</span><strong>{number(insights?.roas || 0)}×</strong><small>Retorno sobre publicidad</small></article>
      </div>

      <div className="meta-status-grid">
        <div className={`meta-status ${status?.pixelConfigured ? "ok" : "warn"}`}><span>●</span><div><b>Meta Pixel</b><strong>{status?.pixelConfigured ? status.pixelIdMasked : "No configurado"}</strong></div></div>
        <div className={`meta-status ${status?.capiConfigured ? "ok" : "warn"}`}><span>●</span><div><b>Conversions API</b><strong>{capiState}</strong></div></div>
        <div className={`meta-status ${status?.marketingConfigured && insights?.connected ? "ok" : "warn"}`}><span>●</span><div><b>Marketing API</b><strong>{apiState}</strong></div></div>
        <div className={`meta-status ${errors.length ? "warn" : "ok"}`}><span>●</span><div><b>Errores recientes</b><strong>{integer(errors.length)}</strong></div></div>
      </div>

      {insights?.error && <div className="panel meta-warning">⚠️ {insights.error}</div>}

      <div className="meta-main-grid">
        <div className="panel">
          <div className="meta-section-head"><div><h2>Rendimiento de campañas</h2><p>Datos de la cuenta publicitaria seleccionada.</p></div><span className="meta-pill">{periodLabel}</span></div>
          <div className="meta-performance-grid">
            <div><span>Impresiones</span><strong>{integer(insights?.impressions || 0)}</strong></div>
            <div><span>Clics</span><strong>{integer(insights?.clicks || 0)}</strong></div>
            <div><span>Costo por compra</span><strong>{money(insights?.costPerPurchase || 0)}</strong></div>
            <div><span>Conversión clic → compra</span><strong>{number(purchaseRate)}%</strong></div>
          </div>
          {!insights?.connected && <p className="muted meta-note">Las métricas de publicidad aparecen cuando la cuenta y el token de Marketing API están conectados correctamente.</p>}
        </div>

        <div className="panel">
          <div className="meta-section-head"><div><h2>Embudo de eventos</h2><p>{eventTotal} eventos registrados recientemente.</p></div></div>
          <div className="meta-funnel">
            {(["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"] as string[]).map((name) => (
              <div key={name}><span>{labelFor(name)}</span><strong>{integer(byName[name] || 0)}</strong></div>
            ))}
          </div>
        </div>
      </div>

      <div className="meta-main-grid">
        <div className="panel">
          <div className="meta-section-head"><div><h2>Última compra</h2><p>Último evento Purchase recibido.</p></div></div>
          {lastPurchase ? (
            <div className="meta-purchase-card">
              <strong>{money(lastPurchase.value || 0)} {lastPurchase.currency || "PYG"}</strong>
              <span>{new Date(lastPurchase.created_at).toLocaleString("es-PY")}</span>
              <small className={lastPurchase.status === "sent" ? "meta-success" : "meta-danger"}>{statusLabelFor(lastPurchase.status)}</small>
              {lastPurchase.utm_campaign && <small>Campaña: {lastPurchase.utm_campaign}</small>}
            </div>
          ) : <p className="muted">Todavía no hay compras registradas con Conversions API.</p>}
        </div>

        <div className="panel">
          <div className="meta-section-head"><div><h2>Atribución de pedidos</h2><p>Pedidos recientes con UTM o fbclid.</p></div><span className="meta-pill">{integer(ordersWithAttribution.length)} / 20</span></div>
          {ordersWithAttribution.length ? ordersWithAttribution.slice(0, 6).map((o) => (
            <div className="meta-order-row" key={o.id}><span>{o.utm_campaign || o.utm_source || "Facebook / Meta"}<small>{new Date(o.created_at).toLocaleDateString("es-PY")}</small></span><strong>{money(o.total)}</strong></div>
          )) : <p className="muted">Todavía no hay pedidos con parámetros de campaña. Esto se completa cuando el cliente entra desde un anuncio con UTM o fbclid.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="meta-section-head"><div><h2>Configuración</h2><p>Cuenta publicitaria que utiliza este panel para consultar Meta Ads.</p></div></div>
        <div className="meta-config-grid">
          <div><label>Cuenta publicitaria</label><input value={configDraft.adAccountId} onChange={(e) => setConfigDraft((x) => ({ ...x, adAccountId: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="356287048249925" /></div>
          <div><label>Página / identidad</label><input value={configDraft.pageName} onChange={(e) => setConfigDraft((x) => ({ ...x, pageName: e.target.value }))} placeholder="FFC Electronic" /></div>
          <div><label>ID de página (opcional)</label><input value={configDraft.pageId} onChange={(e) => setConfigDraft((x) => ({ ...x, pageId: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="ID de Facebook" /></div>
        </div>
        <div className="actions meta-actions"><button className="btn primary" type="button" onClick={saveConfig} disabled={savingConfig || !configDraft.adAccountId}>{savingConfig ? "Guardando..." : "Guardar configuración"}</button>{configMsg && <span className="meta-success">{configMsg}</span>}</div>
        <p className="muted meta-note"><b>Business Portfolio:</b> {status?.businessId || config?.businessId || "No informado"}. La identidad FFC Electronic se selecciona dentro de Meta Ads Manager; este panel usa la cuenta indicada para leer sus métricas.</p>
      </div>

      {errors.length > 0 && <div className="panel meta-warning"><div className="meta-section-head"><div><h2>Errores recientes</h2><p>Eventos que no pudieron procesarse correctamente.</p></div></div>{errors.slice(0, 10).map((e) => <div className="meta-order-row" key={e.id}><span>{labelFor(e.event_name)}<small>{new Date(e.created_at).toLocaleString("es-PY")}</small></span><strong>{statusLabelFor(e.status)}</strong></div>)}</div>}
      {err && <div className="panel meta-warning">⚠️ {err}</div>}
    </div>
  );
}
