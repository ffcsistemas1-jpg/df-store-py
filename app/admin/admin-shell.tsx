"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

const MOBILE_NAV = [
  { label: "Inicio", href: "/admin", icon: "🏠" },
  { label: "Pedidos", href: "/admin/pedidos", icon: "🧾" },
  { label: "Productos", href: "/admin/productos", icon: "📦" },
  { label: "Clientes", href: "/admin/clientes", icon: "👥" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(()=>{
    const onPrompt=(e:any)=>{e.preventDefault();setInstallPrompt(e)};
    const onInstalled=()=>{setInstalled(true);setInstallPrompt(null)};
    window.addEventListener("beforeinstallprompt",onPrompt);
    window.addEventListener("appinstalled",onInstalled);
    return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled)};
  },[]);

  if (pathname === "/admin/login") return <>{children}</>;

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
  const install=async()=>{
    if(!installPrompt) return;
    try{await installPrompt.prompt();await installPrompt.userChoice}catch{}
    setInstallPrompt(null);
  };

  return (
    <div className="admin-shell">
      <div className="admin-mobile-actions">
        <button type="button" className="admin-mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Abrir menú del administrador">☰ Menú</button>
        {installPrompt&&!installed&&<button type="button" className="admin-install-btn" onClick={install}>⬇ Instalar DF Store PY Admin</button>}
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
      {open&&<button className="admin-menu-backdrop" aria-label="Cerrar menú" onClick={()=>setOpen(false)} />}
      <div className="admin-content">{children}</div>
      <nav className="admin-mobile-bottom-nav" aria-label="Navegación rápida del administrador">
        {MOBILE_NAV.map(item=><Link key={item.href} href={item.href} className={isActive(item.href)?"active":""}><span>{item.icon}</span><small>{item.label}</small></Link>)}
        <button type="button" onClick={()=>setOpen(true)}><span>☰</span><small>Más</small></button>
      </nav>
    </div>
  );
}
