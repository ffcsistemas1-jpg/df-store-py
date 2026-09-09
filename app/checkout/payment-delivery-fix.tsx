"use client";

import { useEffect } from "react";

export default function PaymentDeliveryFix() {
  useEffect(() => {
    let initialized = false;
    const apply = () => {
      const payment = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
        const values = Array.from(select.options).map((option) => option.value);
        return values.includes("Pago al recibir") && values.includes("Transferencia");
      });
      if (!payment) return;

      payment.disabled = false;
      const selectedDelivery = document.querySelector<HTMLInputElement>('input[name="delivery"]:checked');
      const selectedLabel = selectedDelivery?.closest("label")?.textContent?.toLowerCase() || "";
      const isInterior = selectedLabel.includes("interior");

      if (!initialized) {
        initialized = true;
        if (!isInterior && (payment.value === "Transferencia" || !payment.value)) {
          payment.value = "Pago al recibir";
          payment.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "checked"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
