"use client";

import { useEffect } from "react";

/** Keeps Android/browser back inside the three checkout steps. */
export default function CheckoutHistory() {
  useEffect(() => {
    let currentStep = 1;
    let handlingPop = false;

    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    // Do not pre-create fake future entries. They desynchronize the browser
    // pointer from React. Instead, record each step only after it is rendered.
    window.history.replaceState(makeState(1), "", window.location.href);

    const readStep = () => {
      const match = document.body.innerText.match(/PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Math.max(1, Math.min(3, Number(match[1]))) : currentStep;
    };

    const findBackButton = () => Array.from(document.querySelectorAll("button"))
      .find((button) => /^\s*volver\s*$/i.test(button.textContent || "")) as HTMLButtonElement | undefined;

    const observer = new MutationObserver(() => {
      if (handlingPop) return;
      const visibleStep = readStep();
      if (visibleStep === currentStep) return;

      // Forward React navigation gets a real browser entry. Backward React
      // navigation is already represented by popstate and must not push one.
      if (visibleStep > currentStep) {
        window.history.pushState(makeState(visibleStep), "", window.location.href);
      }
      currentStep = visibleStep;
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onPopState = (event: PopStateEvent) => {
      const target = Number(event.state?.checkoutStep || 0);
      const visible = readStep();
      if (!target || target >= visible) return;

      handlingPop = true;
      currentStep = target;
      const back = findBackButton();
      if (back) back.click();
      window.setTimeout(() => { handlingPop = false; }, 200);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
