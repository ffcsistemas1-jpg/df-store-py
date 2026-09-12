"use client";

import { useEffect } from "react";

/**
 * Keeps Android/browser Back inside the checkout while there are still
 * checkout steps available. The previous implementation depended on the
 * history state created by React mutations, which is not reliable on mobile.
 */
export default function CheckoutHistory() {
  useEffect(() => {
    const checkoutUrl = window.location.href;
    let currentStep = 1;
    let syncing = false;
    let initialized = false;

    const readStep = () => {
      const text = document.body.innerText;
      const match = text.match(/CHECKOUT\s*[·•-]\s*PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Math.max(1, Math.min(3, Number(match[1]))) : currentStep;
    };

    const writeStep = (step: number, mode: "push" | "replace" = "replace") => {
      const state = { ...(window.history.state || {}), __dfCheckoutStep: step };
      if (mode === "push") window.history.pushState(state, "", checkoutUrl);
      else window.history.replaceState(state, "", checkoutUrl);
    };

    const clickPreviousStep = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const button = buttons.find((item) => {
        const label = (item.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        return label.startsWith("← volver") || label === "volver" || label.includes("volver al pedido");
      }) as HTMLButtonElement | undefined;
      if (button) button.click();
    };

    const detectStep = () => {
      const detected = readStep();
      if (!initialized) {
        currentStep = detected;
        writeStep(currentStep, "replace");
        initialized = true;
        return;
      }
      if (syncing) {
        currentStep = detected;
        writeStep(currentStep, "replace");
        return;
      }
      if (detected !== currentStep) {
        currentStep = detected;
        writeStep(currentStep, "push");
      }
    };

    detectStep();
    const observer = new MutationObserver(detectStep);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onPopState = () => {
      // If the customer is on step 2 or 3, Android Back must move one step
      // backward instead of allowing the route to fall back to the cart.
      if (currentStep <= 1) return;

      syncing = true;
      // Restore the checkout URL immediately after the browser's back event.
      // This prevents the cart route from replacing the checkout screen.
      window.history.pushState(
        { ...(window.history.state || {}), __dfCheckoutStep: currentStep },
        "",
        checkoutUrl
      );

      const previous = currentStep - 1;
      currentStep = previous;
      writeStep(previous, "replace");
      clickPreviousStep();
      window.setTimeout(() => {
        const detected = readStep();
        currentStep = detected || previous;
        writeStep(currentStep, "replace");
        syncing = false;
      }, 80);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
