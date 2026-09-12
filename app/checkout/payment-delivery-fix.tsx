"use client";

import { useEffect } from "react";

/**
 * En pedidos al interior, Pago al recibir no debe estar disponible.
 * En delivery local, Pago al recibir sí permanece disponible.
 */
export default function PaymentDeliveryFix() {
  useEffect(() => {
    let syncing = false;

    const getDeliveryType = () => {
      const selected = document.querySelector<HTMLInputElement>('input[name="delivery"]:checked');
      const selectedText = selected?.closest("label")?.textContent?.toLowerCase() || "";
      if (selectedText.includes("interior")) return "interior";

      // En los pasos 2 y 3 ya no se muestran las opciones de entrega.
      // El bloque de comprobante solo existe para pedidos al interior.
      if (document.querySelector(".payment-receipt-box")) return "interior";

      return "delivery";
    };

    const apply = () => {
      const payment = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
        const values = Array.from(select.options).map((option) => option.value.toLowerCase());
        return values.includes("pago al recibir".toLowerCase()) &&
          values.some((value) => value === "transferencia" || value === "transferencia bancaria") &&
          values.includes("giro tigo");
      });

      if (!payment || syncing) return;

      const interior = getDeliveryType() === "interior";
      const cashOption = Array.from(payment.options).find(
        (option) => option.value.toLowerCase() === "pago al recibir"
      );

      if (cashOption) {
        // hidden + disabled lo elimina de las opciones visibles del selector
        // nativo de Android/iOS, sin romper el formulario controlado por React.
        cashOption.hidden = interior;
        cashOption.disabled = interior;
      }

      if (interior) {
        payment.disabled = false;
        if (payment.value.toLowerCase() === "pago al recibir") {
          syncing = true;
          payment.value = "";
          payment.dispatchEvent(new Event("change", { bubbles: true }));
          window.setTimeout(() => { syncing = false; }, 0);
        }
      } else {
        payment.disabled = false;
        if (!payment.value || payment.value.toLowerCase() !== "pago al recibir") {
          syncing = true;
          payment.value = "Pago al recibir";
          payment.dispatchEvent(new Event("change", { bubbles: true }));
          window.setTimeout(() => { syncing = false; }, 0);
        }
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["checked", "disabled"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
