"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV: { label: string; href: string; icon: string }[] = [
  { label: "Panel principal", href: "/admin", icon: "🏠" },
  { label: "Productos e inventario", href: "/admin/productos", icon: "📦" },
  { label: "Promociones", href: "/admin/promociones", icon: "🏷️" },
  { label: "Pedidos", href: "/admin/pedidos", icon: "🧾" },
  { label: "Embudo de ventas", href: "/admin/embudo", icon: "📊" },
  { label: "Meta Ads", href: "/admin/meta-ads", icon: "🎯" },
  { label: "Clientes", href: "/admin/clientes", icon: "👥" },
  { label: "Métodos de pago", href: "/admin/pagos", icon: "💳" },
  { label: "Delivery y zonas", href: "/admin/delivery", icon: "🚚" },
  { label: "Transportadoras", href: "/admin/transportadoras", icon: "🚛" },
  { label: "Reportes", href: "/admin/reportes", icon: "📈" },
  { label: "Notificaciones", href: "/admin/notificaciones", icon: "🔔" },
  { label: "Configuración", href: "/admin/configuracion", icon: "⚙️" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // El login no lleva barra lateral: todavía no hay sesión que administrar.
  if (pathname === "/admin/login") return <>{children}</>;

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);

  return (
    <div className="admin-shell">
      <button type="button" className="admin-mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Abrir menú del administrador">
        ☰ Menú
      </button>
      <aside className={`admin-sidebar ${open ? "open" : ""}`}>
        <div className="admin-sidebar-title">
          <small>DF STORE PY</small>
          <strong>Administrador</strong>
        </div>
        <nav className="admin-nav">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="admin-back-store" onClick={() => setOpen(false)}>← Ver tienda</Link>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
