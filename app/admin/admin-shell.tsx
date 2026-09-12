"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshAppBadge } from "../../lib/push";

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
  { label: "Finanzas", href: "/admin/reportes", icon: "💰" },
  { label: "Notificaciones", href: "/admin/notificaciones", icon: "🔔" },
  { label: "Configuración", href: "/admin/configuracion", icon: "⚙️" },
];

const MOBILE_NAV = [
  { label: "Inicio", href: "/admin", icon: "🏠" },
  { label: "Pedidos", href: "/admin/pedidos", icon: "🧾" },
  { label: "Productos", href: "/admin/productos", icon: "📦" },
  { label: "Clientes", href: "/admin/clientes", icon: "👥" },
  { label: "Finanzas", href: "/admin/reportes", icon: "💰" },
];

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
          <button type="button" className="admin-mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Abrir menú del administrador">☰ Menú</button>
        </div>

        <aside className={`admin-sidebar ${open ? "open" : ""}`}>
          <div className="admin-sidebar-title">
            <small>DF STORE PY</small>
            <strong>Administrador</strong>
          </div>
          <nav className="admin-nav">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""} onClick={() => setOpen(false)}>
                <span className="admin-nav-icon">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="admin-back-store" onClick={() => setOpen(false)}>← Ver tienda</Link>
        </aside>

        {open && <button className="admin-menu-backdrop" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
        <div className="admin-content">{children}</div>

        <nav className="admin-mobile-bottom-nav" aria-label="Navegación rápida del administrador">
          {MOBILE_NAV.map(item => <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""}><span>{item.icon}</span><small>{item.label}</small></Link>)}
          <button type="button" onClick={() => setOpen(true)}><span>☰</span><small>Más</small></button>
        </nav>
      </div>

      <style jsx global>{`
        .admin-shell{display:grid!important;grid-template-columns:250px minmax(0,1fr)!important;gap:28px!important;align-items:start!important;width:100%!important;max-width:1280px!important;margin:0 auto!important;}
        .admin-sidebar{grid-column:1!important;grid-row:1!important;width:250px!important;min-width:250px!important;box-sizing:border-box!important;position:sticky!important;top:96px!important;background:#fff!important;border:1px solid #eadfe0!important;border-radius:18px!important;padding:16px!important;display:flex!important;flex-direction:column!important;gap:2px!important;z-index:30!important;}
        .admin-content{grid-column:2!important;grid-row:1!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;}
        .admin-sidebar-title{padding:6px 10px 14px!important;border-bottom:1px solid #eadfe0!important;margin-bottom:8px!important;display:flex!important;flex-direction:column!important;gap:2px!important;}
        .admin-sidebar-title small{font-size:11px!important;letter-spacing:1.5px!important;color:#98234d!important;font-weight:800!important;}
        .admin-sidebar-title strong{font:700 17px Arial,Helvetica,sans-serif!important;}
        .admin-nav{display:flex!important;flex-direction:column!important;gap:2px!important;}
        .admin-nav a{display:flex!important;align-items:center!important;gap:10px!important;padding:10px 12px!important;border-radius:10px!important;font-weight:700!important;color:#21171a!important;font-size:13.5px!important;transition:background .12s!important;}
        .admin-nav a:hover{background:#faf7f5!important;}
        .admin-nav a.active{background:#98234d!important;color:#fff!important;}
        .admin-nav-icon{font-size:15px!important;width:18px!important;text-align:center!important;flex-shrink:0!important;}
        .admin-back-store{margin-top:12px!important;padding:10px 12px 0!important;border-top:1px solid #eadfe0!important;font-weight:700!important;color:#98234d!important;font-size:13.5px!important;}
        .admin-mobile-actions,.admin-mobile-bottom-nav,.admin-menu-backdrop{display:none!important;}
        @media(max-width:900px){
          .admin-shell{display:block!important;max-width:none!important;margin:0!important;padding-bottom:74px!important;}
          .admin-mobile-actions{display:flex!important;gap:10px!important;align-items:center!important;margin-bottom:14px!important;position:sticky!important;top:8px!important;z-index:55!important;background:rgba(255,255,255,.96)!important;padding:8px 0!important;}
          .admin-mobile-toggle{display:inline-flex!important;min-height:44px!important;align-items:center!important;background:#21171a!important;color:#fff!important;border:0!important;border-radius:10px!important;padding:11px 18px!important;font-weight:700!important;font-size:14px!important;position:relative!important;z-index:56!important;}
          .admin-sidebar{display:none!important;position:fixed!important;inset:12px 12px 86px 12px!important;top:12px!important;width:auto!important;min-width:0!important;max-height:calc(100vh - 98px)!important;overflow:auto!important;box-shadow:0 14px 40px rgba(33,23,26,.25)!important;}
          .admin-sidebar.open{display:flex!important;z-index:60!important;}
          .admin-content{width:100%!important;}
          .admin-menu-backdrop{display:block!important;position:fixed!important;inset:0!important;z-index:50!important;border:0!important;background:rgba(20,14,16,.42)!important;}
          .admin-mobile-bottom-nav{display:grid!important;grid-template-columns:repeat(6,1fr)!important;position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:40!important;background:#fff!important;border:1px solid #e6dadd!important;border-radius:18px!important;box-shadow:0 8px 28px rgba(33,23,26,.18)!important;overflow:hidden!important;}
          .admin-mobile-bottom-nav a,.admin-mobile-bottom-nav button{min-height:58px!important;border:0!important;background:#fff!important;color:#51454a!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;font-weight:800!important;font-family:inherit!important;}
          .admin-mobile-bottom-nav a.active{color:#98234d!important;background:#fff7fa!important;}
          .admin-mobile-bottom-nav span{font-size:19px!important;line-height:1!important;}
          .admin-mobile-bottom-nav small{font-size:10px!important;}
        }
      `}</style>
    </>
  );
}
