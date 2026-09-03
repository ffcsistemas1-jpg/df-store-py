"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/browser";

const money = (n: number) => `₲ ${Number(n || 0).toLocaleString("es-PY")}`;

type Status = { pixelConfigured: boolean; pixelIdMasked: string | null; capiConfigured: boolean };
type EventRow = { id: number; event_id: string; event_name: string; source: string; status: string; value: number | null; currency: string | null; created_at: string; utm_campaign: string | null; utm_source: string | null; utm_medium: string | null; fbclid: string | null };
type OrderRow = { id: string; created_at: string; total: number; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; fbclid: string | null; landing_page: string | null };

export default function MetaAdsDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const [statusRes, eventsRes, ordersRes] = await Promise.all([
          fetch("/api/meta-status").then((r) => r.json()).catch(() => null),
          s.from("meta_events_recent").select("*").limit(50),
          s.from("orders").select("id,created_at,total,utm_source,utm_medium,utm_campaign,fbclid,landing_page").order("created_at", { ascending: false }).limit(20),
        ]);
        setStatus(statusRes);
        if (eventsRes.error) setErr(eventsRes.error.message);
        else setEvents((eventsRes.data || []) as EventRow[]);
        if (!ordersRes.error) setOrders((ordersRes.data || []) as OrderRow[]);
      } catch (e: any) {
        setErr(e?.message || "Error al cargar datos de Meta Ads.");
      } finally {
        setLoading(false);
      }
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
        <div><b>Eventos registrados (CAPI)</b><strong>{events.length}</strong></div>
        <div><b>Errores de envío</b><strong>{errors.length}</strong></div>
      </div>

      {(!status?.pixelConfigured || !status?.capiConfigured) && (
        <div className="panel">
          <h2>⚠️ Falta terminar la conexión con Meta</h2>
          {!status?.pixelConfigured && (
            <p><b>Pixel:</b> falta cargar <code>NEXT_PUBLIC_META_PIXEL_ID</code> en Vercel. Se obtiene en Meta Business Suite → Administrador de eventos → Orígenes de datos → tu Pixel → Configuración.</p>
          )}
          {!status?.capiConfigured && (
            <p><b>Conversions API:</b> falta cargar <code>META_CAPI_ACCESS_TOKEN</code> en Vercel (variable privada, sin <code>NEXT_PUBLIC</code>). Se genera en Meta Business Suite → Administrador de eventos → tu Pixel → Configuración → Conversions API → Generar token de acceso.</p>
          )}
          <p className="muted">El checkout y el Pixel del navegador funcionan igual mientras tanto — esto solo habilita el envío server-to-server para mejorar la calidad de coincidencia de eventos.</p>
        </div>
      )}

      <div className="formgrid">
        <div className="panel">
          <h2>Eventos por tipo (últimos 50)</h2>
          {Object.keys(byName).length ? Object.entries(byName).map(([k, v]) => (
            <div className="checkout-total" key={k}><span>{k}</span><strong>{v}</strong></div>
          )) : <p className="muted">Todavía no se registró ningún evento. Van a aparecer apenas alguien visite la tienda publicada.</p>}
        </div>
        <div className="panel">
          <h2>Último Purchase</h2>
          {lastPurchase ? (
            <>
              <p><b>Fecha:</b> {new Date(lastPurchase.created_at).toLocaleString("es-PY")}</p>
              <p><b>Valor:</b> {money(lastPurchase.value || 0)} {lastPurchase.currency}</p>
              <p><b>Estado:</b> {lastPurchase.status}</p>
              {lastPurchase.utm_campaign && <p><b>Campaña:</b> {lastPurchase.utm_campaign}</p>}
            </>
          ) : <p className="muted">Todavía no hay compras registradas con Conversions API.</p>}
        </div>
      </div>

      <div className="panel">
        <h2>Pedidos con atribución de Meta (últimos 20 pedidos)</h2>
        {ordersWithAttribution.length ? ordersWithAttribution.map((o) => (
          <div className="checkout-total" key={o.id}>
            <span>{o.utm_campaign || o.utm_source || "fbclid presente"} — {new Date(o.created_at).toLocaleDateString("es-PY")}</span>
            <strong>{money(o.total)}</strong>
          </div>
        )) : <p className="muted">Ninguno de los últimos 20 pedidos llegó con parámetros de campaña (utm_*/fbclid) todavía. Vas a ver datos acá apenas lancen la primera campaña con links de Meta.</p>}
      </div>

      {errors.length > 0 && (
        <div className="panel">
          <h2>Errores recientes</h2>
          {errors.slice(0, 10).map((e) => (
            <div className="checkout-total" key={e.id}><span>{e.event_name} — {new Date(e.created_at).toLocaleString("es-PY")}</span><strong>{e.status}</strong></div>
          ))}
        </div>
      )}

      {err && <p>⚠️ {err}</p>}
    </>
  );
}
