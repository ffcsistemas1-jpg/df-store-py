"use client";

import { useEffect } from "react";

/**
 * Makes Android/browser back navigate checkout steps instead of leaving
 * checkout immediately. The checkout page uses React state for the steps,
 * so the history layer deliberately delegates the visual change to its
 * existing Volver buttons.
 */
export default function CheckoutHistory() {
  useEffect(() => {
    const url = window.location.href;
    let currentStep = 1;
    let booting = true;
    let processing = false;

    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    // Build exactly three entries at the current checkout URL and place the
    // browser pointer on step 1. The previous entry remains the cart page.
    window.history.replaceState(stateFor(1), "", url);
    window.history.pushState(stateFor(2), "", url);
    window.history.pushState(stateFor(3), "", url);
    window.history.go(-2);

    const getVisibleStep = () => {
      const text = document.body.innerText;
      const match = text.match(/PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Math.max(1, Math.min(3, Number(match[1]))) : currentStep;
    };

    const clickBack = (times: number) => {
      const button = () => Array.from(document.querySelectorAll("button"))
        .find((element) => /^\s*volver\s*$/i.test(element.textContent || "")) as HTMLButtonElement | undefined;
      for (let i = 0; i < times; i += 1) {
        const back = button();
        if (!back) break;
        back.click();
      }
    };

    const finishBoot = () => { booting = false; };
    window.setTimeout(finishBoot, 500);

    const onPopState = (event: PopStateEvent) => {
      if (booting || processing) return;
      const target = Number(event.state?.checkoutStep || 0);
      const visible = getVisibleStep();
      if (!target || target >= visible) return;

      processing = true;
      currentStep = target;
      clickBack(visible - target);
      window.setTimeout(() => { processing = false; }, 150);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}
