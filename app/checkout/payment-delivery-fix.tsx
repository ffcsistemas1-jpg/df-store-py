"use client";

import { useEffect } from "react";

/**
 * Keeps the payment options consistent without changing React state,
 * dispatching synthetic change events, disabling the select, or forcing
 * a selected value. Those DOM/state mutations caused the mobile checkout
 * selector to appear frozen on Android.
 */
export default function PaymentDeliveryFix() {
  useEffect(() => {
    const getPaymentSelect = () =>
      Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
        const values = Array.from(select.options).map((option) => option.value.toLowerCase());
        return values.includes("pago al recibir") &&
          values.some((value) => value === "transferencia" || value === "transferencia bancaria") &&
          values.includes("giro tigo");
      });

    const isInterior = () => {
      const selected = document.querySelector<HTMLInputElement>('input[name="delivery"]:checked');
      const label = selected?.closest("label")?.textContent?.toLowerCase() || "";
      return label.includes("interior") || Boolean(document.querySelector(".payment-receipt-box"));
    };

    const apply = () => {
      const select = getPaymentSelect();
      if (!select) return;

      const interior = isInterior();
      const cash = Array.from(select.options).find(
        (option) => option.value.toLowerCase() === "pago al recibir"
      );

      if (cash) {
        // Do not change select.value, disabled, or dispatch events. Only
        // control visibility so React remains the single source of truth.
        cash.hidden = interior;
        cash.disabled = interior;
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
