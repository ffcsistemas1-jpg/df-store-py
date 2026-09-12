import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-polish.css";
import "./checkout-polish.css";
import "./premium-storefront.css";
import "./mobile-premium.css";
import "./storefront-compact.css";
import "./nova-style.css";
import "./product-page-polish.css";
import "./checkout-copy-fix.css";
import "./admin-products-fix.css";
import "./admin-professional.css";
import "./cart-professional.css";
import { CartProvider,Header,WhatsAppButton,TopBanner,ServiceWorkerRegister,SiteFooter,MobileCustomerNav } from "./ui";
import MetaPixelRuntime from "./meta-pixel-runtime";
import PaymentDeliveryFix from "./checkout/payment-delivery-fix";

export const metadata:Metadata={title:"DF Store PY",description:"Todo lo que buscan en un solo lugar",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"default",title:"DF Store PY"},icons:{icon:"/icons/icon-192.png",apple:"/icons/icon-192.png"}};
export const viewport:Viewport={themeColor:"#98234d"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body><a className="skip-link" href="#contenido-principal">Saltar al contenido principal</a><MetaPixelRuntime/><ServiceWorkerRegister/><CartProvider><TopBanner/><Header/><main id="contenido-principal" tabIndex={-1}>{children}</main><PaymentDeliveryFix/><WhatsAppButton/><MobileCustomerNav/><SiteFooter/></CartProvider></body></html>}
