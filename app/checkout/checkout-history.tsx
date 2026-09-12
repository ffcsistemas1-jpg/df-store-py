"use client";

import { useEffect } from "react";

/** Creates real browser-history entries for the three checkout steps. */
export default function CheckoutHistory() {
  useEffect(() => {
    const url = window.location.href;
    let applying = false;

    // The checkout is one URL, so create three history entries explicitly:
    // cart -> checkout step 1 -> checkout step 2 -> checkout step 3.
    // Then return the visible screen to step 1 without changing the URL.
    window.history.replaceState({ ...(window.history.state || {}), __dfCheckoutStep: 1 }, "", url);
    window.history.pushState({ __dfCheckoutStep: 2 }, "", url);
    window.history.pushState({ __dfCheckoutStep: 3 }, "", url);
    window.history.go(-2);

    const getStep = () => {
      const text = document.body.innerText;
      const match = text.match(/PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Number(match[1]) : 1;
    };

    const clickBack = () => {
      const button = Array.from(document.querySelectorAll("button")).find((b) =>
        /volver/i.test((b.textContent || "").trim())
      ) as HTMLButtonElement | undefined;
      if (button) button.click();
    };

    const onPopState = (event: PopStateEvent) => {
      if (applying) return;
      const target = Number(event.state?.__dfCheckoutStep || 1);
      const visible = getStep();
      if (target < visible && visible > 1) {
        applying = true;
        // The history entry has already moved back one position. Restore a
        // checkout entry so Android cannot navigate to the cart prematurely.
        window.history.pushState({ ...(window.history.state || {}), __dfCheckoutStep: visible }, "", url);
        clickBack();
        window.setTimeout(() => {
          applying = false;
        }, 150);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
