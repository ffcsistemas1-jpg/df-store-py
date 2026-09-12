"use client";

import { useEffect } from "react";

/** Keeps the checkout steps in the browser history so Android/browser Back
 * returns to the previous checkout step before leaving for the cart. */
export default function CheckoutHistory() {
  useEffect(() => {
    let currentStep = 1;
    let handlingPopState = false;

    const readStep = () => {
      const text = document.body.innerText;
      const match = text.match(/PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Number(match[1]) : 1;
    };

    const setStateStep = (step: number, replace = false) => {
      const nextState = { ...(window.history.state || {}), __dfCheckoutStep: step };
      if (replace) window.history.replaceState(nextState, "", window.location.href);
      else window.history.pushState(nextState, "", window.location.href);
    };

    setStateStep(1, true);

    const observer = new MutationObserver(() => {
      const detected = readStep();
      if (detected === currentStep) return;
      if (!handlingPopState) {
        if (detected > currentStep) setStateStep(detected);
        else setStateStep(detected, true);
      }
      currentStep = detected;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onPopState = () => {
      const target = Number(window.history.state?.__dfCheckoutStep || 0);
      const visibleStep = readStep();
      if (target > 0 && target < visibleStep) {
        const backButton = Array.from(document.querySelectorAll("button")).find((button) =>
          (button.textContent || "").trim().startsWith("← Volver")
        ) as HTMLButtonElement | undefined;
        if (backButton) {
          handlingPopState = true;
          backButton.click();
          window.setTimeout(() => {
            currentStep = readStep();
            handlingPopState = false;
          }, 0);
        }
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
