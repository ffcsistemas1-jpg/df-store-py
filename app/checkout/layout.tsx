import "./checkout.css";
import "./checkout-final.css";
import type { ReactNode } from "react";
import CheckoutHistory from "./checkout-history";

// Checkout actualizado: mantener el flujo compacto y la navegación por pasos.
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CheckoutHistory />
      {children}
    </>
  );
}
