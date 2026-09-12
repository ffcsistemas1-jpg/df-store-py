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
      const selectedText = selected?.closest("label")?.textContent?.toLowerCase() || "";
      if (selectedText.includes("interior")) return "interior";

      // The delivery radio buttons are not rendered on steps 2 and 3.
      // The interior-only receipt panel is a reliable fallback there.
      if (document.querySelector(".payment-receipt-box")) return "interior";
      const helperText = Array.from(document.querySelectorAll("small, p, span"))
        .map((node) => node.textContent?.toLowerCase() || "")
        .join(" ");
      return helperText.includes("envíos al interior") || helperText.includes("envíos al interior")
        ? "interior"
        : "delivery";
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

      let placeholder = Array.from(payment.options).find((option) => option.value === placeholderValue);
      if (!placeholder) {
        placeholder = document.createElement("option");
        placeholder.value = placeholderValue;
        payment.insertBefore(placeholder, payment.firstChild);
      }
      placeholder.textContent = placeholderText;

      payment.disabled = !isInterior;

      if (isInterior) {
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
