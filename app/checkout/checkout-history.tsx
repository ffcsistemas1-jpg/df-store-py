"use client";

import { useEffect, useRef } from "react";

/** Synchronizes React's three checkout steps with the Android/browser history. */
export default function CheckoutHistory() {
  const currentStep = useRef(1);
  const handlingPop = useRef(false);
  const pendingForward = useRef(false);

  useEffect(() => {
    const readVisibleStep = () => {
      const match = document.body.innerText.match(/CHECKOUT\s*[·•-]?\s*PASO\s+(1|2|3)\s+DE\s+3/i);
      return match ? Number(match[1]) : 0;
    };

    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    // Keep the current checkout URL, but mark its current React step.
    const initialStep = readVisibleStep() || 1;
    currentStep.current = initialStep;
    window.history.replaceState(makeState(initialStep), "", window.location.href);

    const findBackButton = () => Array.from(document.querySelectorAll("button"))
      .find((button) => /volver/i.test((button.textContent || "").trim())) as HTMLButtonElement | undefined;

    const recordForwardStepIfRendered = () => {
      const visibleStep = readVisibleStep();
      if (!visibleStep || visibleStep <= currentStep.current) return;
      if (visibleStep > currentStep.current + 1) return;

      currentStep.current = visibleStep;
      window.history.pushState(makeState(visibleStep), "", window.location.href);
      pendingForward.current = false;
    };

    const onClickCapture = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      const button = element?.closest("button");
      if (!button) return;
      const label = (button.textContent || "").trim();

      // Wait until React has actually changed the step. This prevents a
      // failed validation click from creating a false history entry.
      if (/continuar/i.test(label) && currentStep.current < 3) {
        pendingForward.current = true;
        window.setTimeout(() => {
          if (pendingForward.current) recordForwardStepIfRendered();
        }, 0);
        window.setTimeout(() => {
          if (pendingForward.current) recordForwardStepIfRendered();
        }, 80);
        return;
      }

      // The visible Volver button should also move through browser history,
      // so both navigation methods remain synchronized.
      if (/volver/i.test(label) && currentStep.current > 1 && !handlingPop.current) {
        event.preventDefault();
        event.stopPropagation();
        window.history.back();
      }
    };

    const observer = new MutationObserver(() => {
      if (handlingPop.current) return;
      if (pendingForward.current) recordForwardStepIfRendered();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const onPopState = (event: PopStateEvent) => {
      const targetStep = Number(event.state?.checkoutStep || 0);
      if (!event.state?.__dfCheckout || !targetStep) return;
      if (targetStep >= currentStep.current) return;

      currentStep.current = targetStep;
      pendingForward.current = false;
      handlingPop.current = true;

      const backButton = findBackButton();
      if (backButton) backButton.click();

      window.setTimeout(() => {
        handlingPop.current = false;
      }, 500);
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
