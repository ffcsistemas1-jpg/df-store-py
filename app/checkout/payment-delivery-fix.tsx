"use client";

import { useEffect } from "react";

/**
 * Keeps the checkout payment selector honest by delivery type.
 * Interior orders must start with no payment method selected;
 * local delivery remains "Pago al recibir".
 */
export default function PaymentDeliveryFix() {
  useEffect(() => {
    let syncing = false;

    const getDeliveryType = () => {
      const selected = document.querySelector<HTMLInputElement>('input[name="delivery"]:checked');
      const text = selected?.closest("label")?.textContent?.toLowerCase() || "";
      return text.includes("interior") ? "interior" : "delivery";
    };

    const apply = () => {
      const payment = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
        const values = Array.from(select.options).map((option) => option.value);
        return values.includes("Pago al recibir") && values.includes("Transferencia") && values.includes("Giro Tigo");
      });

      if (!payment || syncing) return;

      const isInterior = getDeliveryType() === "interior";
      const placeholderValue = "";
      const placeholderText = "Elegí un método de pago";

      // Always provide a neutral first option for interior orders.
      let placeholder = Array.from(payment.options).find((option) => option.value === placeholderValue);
      if (!placeholder) {
        placeholder = document.createElement("option");
        placeholder.value = placeholderValue;
        payment.insertBefore(placeholder, payment.firstChild);
      }
      placeholder.textContent = placeholderText;

      payment.disabled = !isInterior;

      if (isInterior) {
        // Interior orders require an explicit customer choice.
        if (payment.value !== placeholderValue) {
          syncing = true;
          payment.value = placeholderValue;
          payment.dispatchEvent(new Event("change", { bubbles: true }));
          window.setTimeout(() => {
            syncing = false;
          }, 0);
        }
      } else if (payment.value !== "Pago al recibir") {
        syncing = true;
        payment.value = "Pago al recibir";
        payment.dispatchEvent(new Event("change", { bubbles: true }));
        window.setTimeout(() => {
          syncing = false;
        }, 0);
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
