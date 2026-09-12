"use client";

import { useEffect, useRef } from "react";

/** Keeps Android/browser back inside the three checkout steps. */
export default function CheckoutHistory() {
  const currentStep = useRef(1);
  const handlingPop = useRef(false);

  useEffect(() => {
    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    // The checkout starts at step 1. Forward navigation is registered from
    // the actual CONTINUAR click instead of trying to infer React state from
    // rendered text, which is unreliable on mobile browsers.
    currentStep.current = 1;
    window.history.replaceState(makeState(1), "", window.location.href);

    const getButton = (pattern: RegExp) => Array.from(document.querySelectorAll("button"))
      .find((button) => pattern.test((button.textContent || "").trim())) as HTMLButtonElement | undefined;

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button) return;

      const label = (button.textContent || "").trim();

      // Register a real browser-history entry before React changes the step.
      if (/continuar/i.test(label) && currentStep.current < 3) {
        const nextStep = currentStep.current + 1;
        currentStep.current = nextStep;
        window.history.pushState(makeState(nextStep), "", window.location.href);
        return;
      }

      // Make the visible Volver button use the same history mechanism. This
      // keeps the physical Android button and the on-screen button aligned.
      if (/volver/i.test(label) && currentStep.current > 1 && !handlingPop.current) {
        event.preventDefault();
        event.stopPropagation();
        window.history.back();
      }
    };

    const onPopState = (event: PopStateEvent) => {
      const targetStep = Number(event.state?.checkoutStep || 0);

      // If the state belongs to the page before checkout, allow the browser
      // to leave checkout normally (step 1 -> cart).
      if (!event.state?.__dfCheckout || !targetStep) return;
      if (targetStep >= currentStep.current) return;

      currentStep.current = targetStep;
      handlingPop.current = true;

      // Trigger the existing React Volver action so all checkout state and
      // validation behavior remains unchanged.
      const backButton = getButton(/volver/i);
      if (backButton) {
        backButton.click();
      }

      window.setTimeout(() => {
        handlingPop.current = false;
      }, 300);
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
