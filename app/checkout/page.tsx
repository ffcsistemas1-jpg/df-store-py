"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useCart } from "../ui";
import { PARAGUAY_DEPARTAMENTOS } from "../../lib/paraguay-geo";
import { getCartSession } from "../../lib/cart-session";
import { normalizePyWhatsapp, isValidPyWhatsapp } from "../../lib/phone-py";
import { pixelTrack, sendCapiEvent, newEventId, getAttribution } from "../../lib/meta-pixel";

const money = (n: number) => `₲ ${Number(n || 0).toLocaleString("es-PY")}`;
type Company = { id: string; name: string };
type GeoDistrict = { name: string; barrios: string[] };
type GeoDepartment = { name: string; distritos: GeoDistrict[] };
type Bank = { id: string; bank: string; account_type: string | null; account_number: string | null; holder_name: string | null; document: string | null; alias: string | null };
type Tigo = { id: string; phone: string; holder_name: string | null; document: string | null };
type Zone = { department: string; city: string | null; neighborhood: string | null; fee: number };
type OrderResult = { id: string; subtotal: number; delivery_fee: number; total: number; delivery_type: string };
type FormState = { full_name: string; whatsapp: string; email: string; department: string; city: string; neighborhood: string; address: string; delivery_type: string; payment_method: string; shipping_company_id: string; shipping_company_other: string; preferred_time: string; invoice_requested: boolean; maps_url: string; note: string };

const DELIVERY_CITIES = ["Asunción", "Areguá", "Capiatá", "Fernando de la Mora", "Guarambaré", "Itá", "Itauguá", "J. Augusto Saldívar", "Lambaré", "Limpio", "Luque", "Mariano Roque Alonso", "Nueva Italia", "Ñemby", "San Antonio", "San Lorenzo", "Villa Elisa", "Villeta", "Ypacaraí", "Villa Hayes"];
const DELIVERY_CITY_DEPARTMENT: Record<string, string> = { "Asunción": "Asunción", "Areguá": "Central", "Capiatá": "Central", "Fernando de la Mora": "Central", "Guarambaré": "Central", "Itá": "Central", "Itauguá": "Central", "J. Augusto Saldívar": "Central", "Lambaré": "Central", "Limpio": "Central", "Luque": "Central", "Mariano Roque Alonso": "Central", "Nueva Italia": "Central", "Ñemby": "Central", "San Antonio": "Central", "San Lorenzo": "Central", "Villa Elisa": "Central", "Villeta": "Central", "Ypacaraí": "Central", "Villa Hayes": "Presidente Hayes" };
const normGeo = (v: string) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ full_name: "", whatsapp: "", email: "", department: "", city: "", neighborhood: "", address: "", delivery_type: "delivery", payment_method: "Pago al recibir", shipping_company_id: "", shipping_company_other: "", preferred_time: "Mañana", invoice_requested: false, maps_url: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [shippingCompanies, setShippingCompanies] = useState<Company[]>([]);
  const [geoDepartments, setGeoDepartments] = useState<GeoDepartment[]>(PARAGUAY_DEPARTAMENTOS.map(d => ({ name: d.name, distritos: d.distritos.map(name => ({ name, barrios: [] })) })));
  const [coverage, setCoverage] = useState<{ shipping_company_id: string; department: string }[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [tigos, setTigos] = useState<Tigo[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [zoneResolved, setZoneResolved] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [paymentReceiptPath, setPaymentReceiptPath] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const sessionRef = useRef("");
  const draftReady = useRef(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const initiateTracked = useRef(false);

  useEffect(() => {
    if (!items.length || initiateTracked.current) return;
    initiateTracked.current = true;
    const evId = newEventId();
    const params = { content_ids: items.map(i => i.id), content_type: "product", num_items: items.reduce((n, i) => n + i.quantity, 0), value: subtotal, currency: "PYG" };
    pixelTrack("InitiateCheckout", params, evId);
    sendCapiEvent({ event_name: "InitiateCheckout", event_id: evId, value: subtotal, currency: "PYG", content_ids: params.content_ids, num_items: params.num_items });
  }, [items, subtotal]);

  useEffect(() => {
    (async () => {
      const session = getCartSession();
      sessionRef.current = session;
      try {
        const s = createClient();
        const { data, error } = await s.rpc("get_checkout_draft", { p_session: session });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setForm(x => ({ ...x, full_name: row.full_name || x.full_name, whatsapp: row.whatsapp || x.whatsapp, email: row.email || x.email, department: row.department || x.department, city: row.city || x.city, neighborhood: row.neighborhood || x.neighborhood, address: row.address || x.address, delivery_type: row.delivery_type || x.delivery_type, payment_method: row.payment_method || x.payment_method, shipping_company_id: row.shipping_company_id || x.shipping_company_id, shipping_company_other: row.shipping_company_other || x.shipping_company_other, preferred_time: row.preferred_time || x.preferred_time, invoice_requested: Boolean(row.invoice_requested), maps_url: row.maps_url || x.maps_url, note: row.note || x.note }));
          if (!row.completed_at) setRestoredDraft(true);
        }
      } catch {}
      draftReady.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!draftReady.current) return;
    if (!form.full_name.trim() && !form.whatsapp.trim() && !form.address.trim()) return;
    const timer = window.setTimeout(() => {
      const session = sessionRef.current;
      if (!session) return;
      createClient().rpc("save_checkout_draft", { p_session: session, p_draft: { full_name: form.full_name || null, whatsapp: form.whatsapp || null, email: form.email || null, department: form.department || null, city: form.city || null, neighborhood: null, address: form.address || null, delivery_type: form.delivery_type || null, payment_method: form.payment_method || null, shipping_company_id: form.shipping_company_id || null, shipping_company_other: form.shipping_company_other || null, preferred_time: form.preferred_time || null, invoice_requested: form.invoice_requested, maps_url: form.maps_url || null, note: null } }).then(({ error }: any) => { if (error) console.error("No se pudo guardar el borrador", error); });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form]);

  useEffect(() => {
    const s = createClient();
    Promise.all([
      s.from("store_settings").select("whatsapp").eq("id", 1).maybeSingle(),
      s.from("shipping_companies").select("id,name").eq("active", true).order("name"),
      s.from("bank_accounts").select("id,bank,account_type,account_number,holder_name,document,alias").eq("active", true).order("bank"),
      s.from("tigo_accounts").select("id,phone,holder_name,document").eq("active", true).order("phone"),
      s.from("delivery_zones").select("department,city,neighborhood,fee").eq("active", true),
      s.from("shipping_coverage").select("shipping_company_id,department")
    ]).then(([settings, c, b, t, z, cov]) => {
      setWhatsapp(settings.data?.whatsapp || "");
      setShippingCompanies(c.data || []);
      setBanks(b.data || []);
      setTigos(t.data || []);
      setZones(((z.data || []) as any[]).map(r => ({ department: r.department, city: r.city, neighborhood: r.neighborhood, fee: Number(r.fee) || 0 })));
      setCoverage((cov.data || []) as any[]);
    });
  }, []);

  useEffect(() => {
    const base = PARAGUAY_DEPARTAMENTOS.map(d => ({ name: d.name, distritos: d.distritos.map(name => ({ name, barrios: [] })) }));
    setGeoDepartments(base);
    const mergeGeo = (api: GeoDepartment[]) => base.map(baseDep => {
      const norm = (v: string) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const ad = api.find(x => norm(x.name) === norm(baseDep.name));
      const districts = baseDep.distritos.map(d => { const found = ad?.distritos?.find(x => norm(x.name) === norm(d.name)); return { name: d.name, barrios: Array.isArray(found?.barrios) ? found!.barrios : [] }; });
      const extras = (ad?.distritos || []).filter(x => !districts.some(d => norm(d.name) === norm(x.name))).map(x => ({ name: x.name, barrios: Array.isArray(x.barrios) ? x.barrios : [] }));
      return { name: baseDep.name, distritos: [...districts, ...extras].sort((a, b) => a.name.localeCompare(b.name, "es")) };
    });
    try { const cached = localStorage.getItem("df_py_geo_v1"); if (cached) { const parsed = JSON.parse(cached); if (Array.isArray(parsed) && parsed.length) setGeoDepartments(mergeGeo(parsed)); } } catch {}
    fetch("/api/paraguay-geo", { cache: "force-cache" }).then(r => r.ok ? r.json() : null).then(data => { if (!data?.departments?.length) return; setGeoDepartments(mergeGeo(data.departments as GeoDepartment[])); try { localStorage.setItem("df_py_geo_v1", JSON.stringify(data.departments)); } catch {} }).catch(() => {});
  }, []);

  const departments = useMemo(() => geoDepartments.map(d => d.name).sort((a, b) => a.localeCompare(b, "es")), [geoDepartments]);
  const citiesForDept = useMemo(() => { if (!form.department) return []; const dep = geoDepartments.find(d => d.name.toLowerCase() === form.department.toLowerCase()); return dep?.distritos.map(x => x.name).sort((a, b) => a.localeCompare(b, "es")) || []; }, [geoDepartments, form.department]);
  const deliveryCities = useMemo(() => DELIVERY_CITIES.slice().sort((a, b) => a.localeCompare(b, "es")), []);
  const deliveryCityFee = (city: string) => { const rows = zones.filter(z => normGeo(z.city || "") === normGeo(city) && !z.neighborhood); if (!rows.length) return null; const active = rows.find(z => z.fee >= 0); return active ? Number(active.fee) || 0 : null; };
  const companiesForInteriorDept = useMemo(() => { if (!shippingCompanies.length) return []; if (!form.department) return shippingCompanies; const ids = new Set(coverage.filter(x => x.department.toLowerCase() === form.department.toLowerCase()).map(x => x.shipping_company_id)); return ids.size ? shippingCompanies.filter(x => ids.has(x.id)) : shippingCompanies; }, [shippingCompanies, coverage, form.department]);

  useEffect(() => {
    if (form.delivery_type !== "delivery") { setDeliveryFee(0); setZoneResolved(true); return; }
    if (!form.city) { setDeliveryFee(0); setZoneResolved(false); return; }
    const dep = form.department.toLowerCase(), city = form.city.trim().toLowerCase();
    const rows = zones.filter(z => z.department.toLowerCase() === dep);
    const cityRow = rows.find(r => r.city?.toLowerCase() === city && !r.neighborhood);
    const depRow = rows.find(r => !r.city && !r.neighborhood);
    const found = cityRow || depRow;
    setDeliveryFee(found ? found.fee : 0);
    setZoneResolved(Boolean(found));
  }, [form.delivery_type, form.department, form.city, zones]);

  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);
  const set = (k: keyof FormState, v: any) => setForm(x => ({ ...x, [k]: v }));
  const setDepartment = (v: string) => setForm(x => ({ ...x, department: v, city: "", neighborhood: "", shipping_company_id: "", shipping_company_other: "" }));
  const setCity = (v: string) => setForm(x => ({ ...x, city: v, neighborhood: "" }));
  const setDeliveryCity = (v: string) => { const dep = DELIVERY_CITY_DEPARTMENT[v] || ""; setForm(x => ({ ...x, city: v, department: dep, neighborhood: "", shipping_company_id: "", shipping_company_other: "" })); };
  const location = () => { if (!navigator.geolocation) { setLocationStatus("Tu navegador no permite obtener la ubicación."); return; } setLocationStatus("Obteniendo ubicación..."); navigator.geolocation.getCurrentPosition(pos => { const { latitude, longitude } = pos.coords; set("maps_url", `https://www.google.com/maps?q=${latitude},${longitude}`); setLocationStatus("✓ Ubicación guardada para facilitar la entrega."); }, () => setLocationStatus("No pudimos obtener tu ubicación. Podés pegar un enlace de Google Maps."), { enableHighAccuracy: true, timeout: 10000 }); };
  const pasteMaps = () => { const v = window.prompt("Pegá aquí el enlace de Google Maps de la ubicación de entrega:", form.maps_url || ""); if (v !== null) { set("maps_url", v.trim()); setLocationStatus(v.trim() ? "✓ Enlace de ubicación guardado." : ""); } };

  const handlePaymentReceipt = (file: File | null) => {
    if (!file) { setPaymentReceiptFile(null); setPaymentReceiptPath(""); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { setMsg("El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("El comprobante no puede superar los 5 MB."); return; }
    setPaymentReceiptFile(file); setPaymentReceiptPath(""); setMsg("");
  };

  const uploadPaymentReceipt = async (s: ReturnType<typeof createClient>) => {
    if (form.delivery_type !== "interior") return null;
    if (paymentReceiptPath) return paymentReceiptPath;
    if (!paymentReceiptFile) throw new Error("Adjuntá el comprobante de pago para continuar con el envío al interior.");
    const session = (sessionRef.current || getCartSession()).replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = (paymentReceiptFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const suffix = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `checkout/${session}/${suffix}.${ext}`;
    const { error } = await s.storage.from("comprobantes").upload(path, paymentReceiptFile, { upsert: false, contentType: paymentReceiptFile.type });
    if (error) throw new Error("No pudimos subir el comprobante. Revisá el archivo e intentá nuevamente.");
    setPaymentReceiptPath(path);
    return path;
  };

  const validateStep1 = () => {
    if (!form.full_name.trim() || !form.whatsapp.trim()) { setMsg("Completá nombre y WhatsApp."); return false; }
    if (!isValidPyWhatsapp(form.whatsapp)) { setMsg("Revisá tu número de WhatsApp: parece incompleto o mal escrito."); return false; }
    if (form.delivery_type === "delivery" && !form.city) { setMsg("Completá la ciudad para el delivery."); return false; }
    if (form.delivery_type === "interior" && (!form.department || !form.city || !form.address.trim())) { setMsg("Completá los datos de entrega obligatorios."); return false; }
    if (form.delivery_type === "delivery" && !zoneResolved) { setMsg("Seleccioná una zona con tarifa de delivery disponible."); return false; }
    if (form.delivery_type === "interior" && form.shipping_company_id === "otro" && !form.shipping_company_other.trim()) { setMsg("Indicá qué transportadora preferís."); return false; }
    setMsg("");
    return true;
  };

  async function submit() {
    if (busy || order) return;
    setBusy(true); setMsg("");
    let uploadedReceiptPath = "";
    try {
      const s = createClient();
      const attribution = getAttribution();
      if (form.delivery_type === "interior") {
        uploadedReceiptPath = (await uploadPaymentReceipt(s)) || "";
        if (!uploadedReceiptPath) throw new Error("Adjuntá el comprobante de pago para continuar.");
      }
      const purchaseEventId = newEventId();
      const { data, error } = await s.rpc("create_order", {
        p_customer: {
          full_name: form.full_name.trim(), whatsapp: normalizePyWhatsapp(form.whatsapp), email: form.email.trim() || null,
          department: form.department || null, city: form.city || null, neighborhood: null, address: form.address.trim() || null,
          preferred_time: form.preferred_time || null, invoice_requested: form.invoice_requested, maps_url: form.maps_url.trim() || null,
          note: form.shipping_company_other.trim() ? `Transportadora solicitada por el cliente: ${form.shipping_company_other.trim()}` : null
        },
        p_items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        p_delivery_type: form.delivery_type,
        p_payment_method: form.payment_method,
        p_shipping_company_id: (form.shipping_company_id && form.shipping_company_id !== "otro") ? form.shipping_company_id : null,
        p_payment_reference: paymentReference.trim() || null,
        p_transfer_receipt_url: uploadedReceiptPath || null,
        p_attribution: { ...attribution, event_id: purchaseEventId }
      });
      if (error) throw error;
      const result = data as OrderResult;
      setOrder(result);
      const purchaseParams = { content_ids: items.map(i => i.id), content_type: "product", num_items: items.reduce((n, i) => n + i.quantity, 0), value: result.total, currency: "PYG" };
      pixelTrack("Purchase", purchaseParams, purchaseEventId);
      sendCapiEvent({ event_name: "Purchase", event_id: purchaseEventId, order_id: result.id });
      clear();
      try { await s.rpc("complete_checkout_draft", { p_session: sessionRef.current }); } catch {}
    } catch (e: any) {
      if (uploadedReceiptPath) { try { await createClient().storage.from("comprobantes").remove([uploadedReceiptPath]); } catch {} }
      setMsg(e?.message || "No se pudo registrar el pedido.");
    } finally { setBusy(false); }
  }

  if (!items.length && !order) return <section><small>CHECKOUT</small><h1>Finalizar compra</h1><div className="empty"><h2>No hay productos para comprar</h2><Link className="btn" href="/catalogo">Volver al catálogo</Link></div></section>;
  if (order) return <section className="checkout-section"><div className="checkout-shell"><div className="checkout-brand"><b>DF</b> STORE PY</div><div className="checkout-head"><small>PEDIDO CONFIRMADO</small><h1>¡Pedido recibido!</h1><p>{order.delivery_type === "interior" ? "Recibimos tu pedido y tu comprobante de pago. Nuestro equipo verificará el pago antes de preparar el despacho." : "Gracias por tu compra. Guardá tu número de pedido."}</p></div><div className="checkout-panel panel"><h2>Pedido #{order.id}</h2><div className="order-lines"><div><span>Subtotal</span><b>{money(order.subtotal)}</b></div><div><span>{order.delivery_type === "delivery" ? "Delivery" : "Transporte"}</span><b>{order.delivery_type === "delivery" ? money(order.delivery_fee) : "A confirmar"}</b></div><div className="checkout-total grand"><span>Total</span><strong>{money(order.total)}</strong></div></div><a className="btn checkout-whatsapp" href={`https://wa.me/${normalizePyWhatsapp(whatsapp)}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a></div></div></section>;

  return <section className="checkout-section"><div className="checkout-shell"><div className="checkout-brand"><b>DF</b> STORE PY</div><div className="checkout-head"><small>CHECKOUT · PASO {step} DE 3</small><h1>Finalizar compra</h1><p>Completá tus datos. Es rápido y seguro.</p>{restoredDraft && <div className="draft-notice">Retomamos los datos que ya habías completado.</div>}</div><div className="checkout-steps" aria-label="Progreso"><span className={step >= 1 ? "active" : ""}>1. Entrega</span><span className={step >= 2 ? "active" : ""}>2. Revisar pedido</span><span className={step >= 3 ? "active" : ""}>3. Pago</span></div>
    {step === 1 && <div className="checkout-panel panel"><h2>📍 ¿Dónde entregamos?</h2><div className="delivery-choice"><label className={form.delivery_type === "delivery" ? "choice active" : "choice"}><input type="radio" name="delivery" checked={form.delivery_type === "delivery"} onChange={() => setForm(x => ({ ...x, delivery_type: "delivery", payment_method: "Pago al recibir" }))} /><span><b>Asunción y Central</b><small>Delivery y pago al recibir</small></span></label><label className={form.delivery_type === "interior" ? "choice active" : "choice"}><input type="radio" name="delivery" checked={form.delivery_type === "interior"} onChange={() => setForm(x => ({ ...x, delivery_type: "interior", payment_method: "Transferencia" }))} /><span><b>Interior del país</b><small>Envío por transportadora · pago anticipado</small></span></label></div><div className="delivery-info"><b>🚚 {form.delivery_type === "delivery" ? "Delivery local" : "Envío al interior"}</b><span>{form.delivery_type === "delivery" ? "Pagás al recibir en zonas habilitadas." : "El producto se paga anticipadamente por transferencia bancaria o Giro Tigo. El costo del transporte se abona directamente a la transportadora."}</span></div><div className="checkout-fields"><label>Nombre y apellido*<input required value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Tu nombre completo" /></label><label>WhatsApp*<input required value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="09xx xxx xxx" /></label><label>Email <span className="field-optional">(opcional)</span><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="tu@email.com" /></label>{form.delivery_type === "delivery" && <><div className="location-box"><div><b>📍 Ubicación para facilitar la entrega</b><span>{form.maps_url ? "Ya compartiste tu ubicación." : "Podés compartir tu ubicación exacta o pegar un enlace de Google Maps."}</span>{locationStatus && <small>{locationStatus}</small>}</div><div className="location-actions"><button type="button" className="location-btn" onClick={location}>Usar mi ubicación</button><button type="button" className="location-btn secondary" onClick={pasteMaps}>Pegar enlace</button></div></div><label>Ciudad / Distrito*<select required value={form.city} onChange={e => setDeliveryCity(e.target.value)}><option value="">Seleccioná tu ciudad</option>{deliveryCities.map(c => { const f = deliveryCityFee(c); return <option key={c} value={c}>{c}{f !== null ? ` — ${Number(f).toLocaleString("es-PY")}` : " — Sin tarifa"}</option>; })}</select></label><label>Dirección <span className="field-optional">(opcional si ya compartiste tu ubicación)</span><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle, número y referencia" /></label></>}
      {form.delivery_type === "interior" && <><label>Departamento*<select required value={form.department} onChange={e => setDepartment(e.target.value)}><option value="">Seleccioná tu departamento</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></label><label>Ciudad / Distrito*<select required value={form.city} onChange={e => setCity(e.target.value)} disabled={!form.department}><option value="">{form.department ? "Seleccioná tu ciudad" : "Primero elegí tu departamento"}</option>{citiesForDept.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label>Dirección*<input required value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle, número y referencia" /></label></>}
      {form.delivery_type === "interior" && <div className="transportadora-preference"><label>Transportadora preferida <span className="field-optional">(opcional)</span><select value={form.shipping_company_id} onChange={e => { const v = e.target.value; set("shipping_company_id", v); if (v !== "otro") set("shipping_company_other", ""); }}><option value="">No tengo preferencia</option>{companiesForInteriorDept.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="otro">Otro — quiero indicar una</option></select></label>{form.shipping_company_id === "otro" && <label>¿A qué transportadora te gustaría que enviemos? <span className="field-optional">(opcional)</span><input value={form.shipping_company_other} onChange={e => set("shipping_company_other", e.target.value)} placeholder="Ej. El rápido, Nuestra Señora de la Asunción, etc." /></label>}<small className="muted">Podés dejarlo en “No tengo preferencia” y nosotros coordinamos la mejor opción disponible.</small></div>}
      <label className="invoice-check standalone-invoice"><input type="checkbox" checked={form.invoice_requested} onChange={e => set("invoice_requested", e.target.checked)} /> <span>Solicitar factura <small>(opcional)</small></span></label>{msg && <p className="checkout-error">{msg}</p>}<button type="button" className="btn checkout-continue" onClick={() => { if (validateStep1()) setStep(2); }}>CONTINUAR</button></div></div>}
    {step === 2 && <div className="checkout-panel panel"><h2>📦 Tu pedido</h2><div className="order-lines">{items.map(i => <div key={i.id}><span>{i.name} × {i.quantity}</span><b>{money(i.price * i.quantity)}</b></div>)}</div><div className="checkout-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>{form.delivery_type === "delivery" ? "Delivery" : "Transporte"}</span><strong>{form.delivery_type === "delivery" ? money(deliveryFee) : "A confirmar"}</strong></div><div className="checkout-total grand"><span>Total</span><strong>{money(total)}</strong></div><div className="step-actions"><button type="button" className="btn secondary" onClick={() => setStep(1)}>← Volver</button><button type="button" className="btn" onClick={() => setStep(3)}>CONTINUAR</button></div></div>}
    {step === 3 && <div className="checkout-panel panel"><h2>💳 Forma de pago</h2><label>Método de pago<select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} disabled={form.delivery_type === "delivery"}><option value="Pago al recibir">Pago al recibir</option><option value="Transferencia">Transferencia bancaria</option><option value="Giro Tigo">Giro Tigo</option></select><small className="field-optional">{form.delivery_type === "delivery" ? "En Asunción y Central el pago es al recibir." : "Para envíos al interior el pago del producto es anticipado. El transporte se abona directamente a la transportadora."}</small></label>
      {form.delivery_type === "interior" && <div className="payment-receipt-box"><div><h3>📎 Comprobante de pago <span>*</span></h3><p>Adjuntá la captura o comprobante de tu transferencia o Giro Tigo. Es necesario para finalizar el pedido.</p><small>JPG, PNG, WEBP o PDF · máximo 5 MB</small></div><label className="payment-receipt-upload"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => handlePaymentReceipt(e.target.files?.[0] || null)} /><span>📎 {paymentReceiptFile ? "Cambiar comprobante" : "Adjuntar comprobante"}</span></label>{paymentReceiptFile && <div className="payment-receipt-selected">✓ {paymentReceiptFile.name} · {(paymentReceiptFile.size / 1024 / 1024).toFixed(2)} MB</div>}</div>}
      {form.payment_method === "Transferencia" && <div className="payment-instructions"><h3>Datos para transferencia</h3>{banks.length ? banks.map(b => <div className="payment-box" key={b.id}><div className="payment-copy-row"><b>{b.bank}</b><button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(b.bank)}>Copiar</button></div><div className="payment-copy-row"><span>{b.account_type || "Cuenta"}</span></div><div className="payment-copy-row"><span>N.º {b.account_number || ""}</span>{b.account_number && <button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(b.account_number || "")}>Copiar</button>}</div><div className="payment-copy-row"><span>Titular: {b.holder_name || ""}</span>{b.holder_name && <button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(b.holder_name || "")}>Copiar</button>}</div>{b.document && <div className="payment-copy-row"><span>CI/RUC: {b.document}</span><button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(b.document || "")}>Copiar</button></div>}{b.alias && <div className="payment-copy-row"><span>Alias: {b.alias}</span><button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(b.alias || "")}>Copiar</button></div>}</div>) : <p className="muted">Los datos de transferencia todavía no están configurados.</p>}<label>Referencia de operación<input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Opcional" /></label></div>}
      {form.payment_method === "Giro Tigo" && <div className="payment-instructions"><h3>Datos para Giro Tigo</h3>{tigos.length ? tigos.map(t => <div className="payment-box" key={t.id}><div className="payment-copy-row"><b>{t.phone}</b><button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(t.phone)}>Copiar</button></div><div className="payment-copy-row"><span>Titular: {t.holder_name || ""}</span>{t.holder_name && <button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(t.holder_name || "")}>Copiar</button>}</div>{t.document && <div className="payment-copy-row"><span>CI/RUC: {t.document}</span><button type="button" className="payment-copy" onClick={() => navigator.clipboard.writeText(t.document || "")}>Copiar</button></div>}</div>) : <p className="muted">Los datos de Giro Tigo todavía no están configurados.</p>}<label>Referencia de operación<input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Opcional" /></label></div>}
      <div className="checkout-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="checkout-total"><span>{form.delivery_type === "delivery" ? "Delivery" : "Transporte"}</span><strong>{form.delivery_type === "delivery" ? money(deliveryFee) : "A confirmar"}</strong></div><div className="checkout-total grand"><span>Total</span><strong>{money(total)}</strong></div>{msg && <p className="checkout-error">{msg}</p>}<div className="step-actions"><button type="button" className="btn secondary" onClick={() => setStep(2)}>← Volver</button><button type="button" className="btn checkout-confirm" disabled={busy} onClick={submit}>{busy ? "REGISTRANDO..." : "CONFIRMAR PEDIDO"}</button></div><p className="muted">El stock, precios y delivery se validan nuevamente al confirmar el pedido.</p></div>}
    <aside className="checkout-order-sticky"><b>Tu pedido · {items.length} producto(s)</b><strong>{money(total)}</strong><small>Ver detalle ▾</small></aside>
  </div></section>;
}
