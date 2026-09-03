import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider, Header, WhatsAppButton, TopBanner, MetaPixel, InstallPrompt, ServiceWorkerRegister, SiteFooter, MobileCustomerNav } from "./ui";

export const metadata: Metadata = {
 title: "DF Store PY",
 description: "Todo lo que buscan en un solo lugar",
 manifest: "/manifest.webmanifest",
 appleWebApp: { capable: true, statusBarStyle: "default", title: "DF Store PY" },
 icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#98234d" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="es"><body><MetaPixel/><ServiceWorkerRegister/><CartProvider><TopBanner/><Header/><main>{children}</main><InstallPrompt/><WhatsAppButton/><MobileCustomerNav/><SiteFooter/></CartProvider></body></html>;
}
