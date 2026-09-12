"use client";

import { useEffect, useRef } from "react";

/** Keeps the checkout's internal React steps synchronized with browser/Android history. */
export default function CheckoutHistory() {
  const currentStep = useRef(1);
  const handlingPop = useRef(false);
  const pendingForward = useRef(false);
  const restoringCheckout = useRef(false);

  useEffect(() => {
    const readVisibleStep = () => {
      const text = document.body.innerText || "";
      const match = text.match(/PASO\s+(1|2|3)\s+DE\s+3/i);
      return match ? Number(match[1]) : 0;
    };

    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    const initialStep = readVisibleStep() || 1;
    currentStep.current = initialStep;
    window.history.replaceState(makeState(initialStep), "", window.location.href);

    const findBackButton = () => Array.from(document.querySelectorAll("button"))
      .find((button) => {
        const label = (button.textContent || "").trim();
        return /volver/i.test(label) && !(button as HTMLButtonElement).disabled;
      }) as HTMLButtonElement | undefined;

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

      if (/continuar/i.test(label) && currentStep.current < 3 && !handlingPop.current) {
        pendingForward.current = true;
        window.setTimeout(recordForwardStepIfRendered, 0);
        window.setTimeout(recordForwardStepIfRendered, 100);
        window.setTimeout(recordForwardStepIfRendered, 300);
        window.setTimeout(recordForwardStepIfRendered, 700);
        return;
      }

      if (/volver/i.test(label) && currentStep.current > 1 && !handlingPop.current) {
        event.preventDefault();
        event.stopPropagation();
        pendingForward.current = false;
        window.history.back();
      }
    };

    const observer = new MutationObserver(() => {
      if (handlingPop.current || !pendingForward.current) return;
      recordForwardStepIfRendered();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const onPopState = (event: PopStateEvent) => {
      const targetStep = Number(event.state?.checkoutStep || 0);

      // Normal synthetic checkout entries: move React one step backward.
      if (event.state?.__dfCheckout && targetStep && targetStep < currentStep.current) {
        currentStep.current = targetStep;
        pendingForward.current = false;
        handlingPop.current = true;
        findBackButton()?.click();
        window.setTimeout(() => {
          handlingPop.current = false;
        }, 500);
        return;
      }

      // Fallback for Android/browser history when no synthetic entry was
      // recorded: the browser has just left checkout and landed on the cart.
      // Restore the checkout document, then use the real React Volver action.
      if (!event.state?.__dfCheckout && currentStep.current > 1 && !restoringCheckout.current) {
        restoringCheckout.current = true;
        handlingPop.current = true;
        window.history.forward();
        window.setTimeout(() => {
          currentStep.current = Math.max(1, currentStep.current - 1);
          pendingForward.current = false;
          findBackButton()?.click();
          window.history.replaceState(makeState(currentStep.current), "", window.location.href);
          handlingPop.current = false;
          restoringCheckout.current = false;
        }, 180);
      }
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
