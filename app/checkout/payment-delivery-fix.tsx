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
        return values.includes("pago al recibir") &&
          values.some((value) => value === "transferencia" || value === "transferencia bancaria") &&
          values.includes("giro tigo");
      });

      if (!payment || syncing) return;

      const interior = getDeliveryType() === "interior";
      const cashOption = Array.from(payment.options).find(
        (option) => option.value.toLowerCase() === "pago al recibir"
      );

      // Agregamos un estado neutro para obligar a elegir el método en interior.
      let placeholder = Array.from(payment.options).find((option) => option.value === "");
      if (!placeholder) {
        placeholder = document.createElement("option");
        placeholder.value = "";
        payment.insertBefore(placeholder, payment.firstChild);
      }
      placeholder.textContent = "Elegí un método de pago";
      placeholder.disabled = false;
      placeholder.hidden = false;

      if (cashOption) {
        // En un selector nativo de Android/iOS, hidden + disabled evita que
        // Pago al recibir aparezca como alternativa para envíos al interior.
        cashOption.hidden = interior;
        cashOption.disabled = interior;
      }

      payment.disabled = false;

      if (interior) {
        if (payment.value.toLowerCase() === "pago al recibir") {
          syncing = true;
          payment.value = "";
          payment.dispatchEvent(new Event("change", { bubbles: true }));
          window.setTimeout(() => { syncing = false; }, 0);
        }
      } else if (!payment.value || payment.value.toLowerCase() !== "pago al recibir") {
        syncing = true;
        payment.value = "Pago al recibir";
        payment.dispatchEvent(new Event("change", { bubbles: true }));
        window.setTimeout(() => { syncing = false; }, 0);
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
