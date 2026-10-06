"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshAppBadge } from "../../lib/push";

type NavItem = { label: string; href: string; icon: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Operación", items: [
    { label: "Panel principal", href: "/admin", icon: "grid" },
    { label: "Pedidos", href: "/admin/pedidos", icon: "bag" },
    { label: "Productos e inventario", href: "/admin/productos", icon: "box" },
    { label: "Promociones", href: "/admin/promociones", icon: "tag" },
  ]},
  { label: "Clientes y ventas", items: [
    { label: "Clientes", href: "/admin/clientes", icon: "users" },
    { label: "Embudo de ventas", href: "/admin/embudo", icon: "chart" },
    { label: "Meta Ads", href: "/admin/meta-ads", icon: "target" },
    { label: "Finanzas", href: "/admin/reportes", icon: "finance" },
  ]},
  { label: "Logística", items: [
    { label: "Delivery y zonas", href: "/admin/delivery", icon: "pin" },
    { label: "Transportadoras", href: "/admin/transportadoras", icon: "truck" },
    { label: "Métodos de pago", href: "/admin/pagos", icon: "card" },
  ]},
  { label: "Sistema", items: [
    { label: "Notificaciones", href: "/admin/notificaciones", icon: "bell" },
    { label: "Configuración", href: "/admin/configuracion", icon: "settings" },
  ]},
];

const MOBILE_NAV = [
  { label: "Inicio", href: "/admin", icon: "grid" },
  { label: "Pedidos", href: "/admin/pedidos", icon: "bag" },
  { label: "Productos", href: "/admin/productos", icon: "box" },
  { label: "Clientes", href: "/admin/clientes", icon: "users" },
  { label: "Finanzas", href: "/admin/reportes", icon: "finance" },
];

function AdminIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    bag: "M6 8h12l1 12H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
    box: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9",
    tag: "m4 5 7-2 9 9-8 8-9-9 1-6Zm4 4h.01",
    users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6a3 3 0 0 1 2.5 4.65M20 20v-1.2a3.2 3.2 0 0 0-2.2-3.04",
    chart: "M4 19V5m0 14h16M7 15l3-4 3 2 5-6",
    target: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-4 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 0h.01",
    finance: "M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7",
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    card: "M3 6h18v12H3zM3 10h18",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 13h4",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
  };
  return <svg className="admin-nav-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.grid} /></svg>;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/admin/login") refreshAppBadge();
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  return (
    <>
      <div className="admin-shell">
        <div className="admin-mobile-actions">
          <button type="button" className="admin-mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Abrir menú del administrador">
            <span className="admin-mobile-brand"><span className="admin-mobile-mark">DF</span><span>STORE PY</span></span><span className="admin-menu-label">Menú</span>
          </button>
        </div>

        <aside className={`admin-sidebar ${open ? "open" : ""}`}>
          <div className="admin-sidebar-title">
            <div className="admin-brand-mark">DF</div>
            <div className="admin-brand-copy"><small>DF STORE PY</small><strong>Centro de control</strong></div>
          </div>

          <div className="admin-status-card">
            <span className="admin-status-dot" />
            <div><b>Producción</b><small>Tienda operativa</small></div>
          </div>

          <nav className="admin-nav" aria-label="Administración">
            {NAV_GROUPS.map(group => (
              <div className="admin-nav-group" key={group.label}>
                <div className="admin-sidebar-caption">{group.label}</div>
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""} onClick={() => setOpen(false)}>
                    <span className="admin-nav-icon"><AdminIcon name={item.icon} /></span><span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <Link href="/" className="admin-back-store" onClick={() => setOpen(false)}>
            <span className="admin-back-store-icon">↗</span><span>Ver tienda</span><small>Visitar sitio</small>
          </Link>
        </aside>

        {open && <button className="admin-menu-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
        <div className="admin-content">
          <div className="admin-topbar">
            <div><span>ADMINISTRACIÓN</span><b>DF Store PY</b></div>
            <div className="admin-topbar-actions">
              <span className="admin-live-pill"><i /> Sistema activo</span>
              <Link href="/" className="admin-store-link">Ver tienda ↗</Link>
            </div>
          </div>
          {children}
        </div>

        <nav className="admin-mobile-bottom-nav" aria-label="Navegación rápida del administrador">
          {MOBILE_NAV.map(item => <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""}><AdminIcon name={item.icon} /><small>{item.label}</small></Link>)}
          <button type="button" onClick={() => setOpen(true)}><span className="mobile-more-icon">+</span><small>Más</small></button>
        </nav>
      </div>
    </>
  );
}
