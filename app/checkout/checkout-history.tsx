"use client";

import { useEffect, useRef } from "react";

/**
 * The checkout is a single /checkout URL with three React views.
 * This component gives each internal view a real browser-history entry so
 * Android's physical Back button moves one checkout step at a time.
 */
export default function CheckoutHistory() {
  const stepRef = useRef(1);
  const handlingBackRef = useRef(false);
  const lastAdvanceAtRef = useRef(0);

  useEffect(() => {
    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const textOf = (element: HTMLElement) =>
      `${element.textContent || ""} ${element.getAttribute("aria-label") || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const controls = () =>
      Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];

    const findBackControl = () => controls().find((element) => {
      if (element.hasAttribute("disabled") || !isVisible(element)) return false;
      const text = textOf(element);
      return /\bvolver\b|\batr[aá]s\b/.test(text);
    });

    const isAdvanceControl = (element: HTMLElement) => {
      if (element.hasAttribute("disabled") || !isVisible(element)) return false;
      const text = textOf(element);
      return /continuar|avanzar|siguiente|confirmar|realizar pedido|enviar pedido/.test(text) && !/\bvolver\b|\batr[aá]s\b/.test(text);
    };

    const initialStep = Number(window.history.state?.__dfCheckoutStep) || 1;
    stepRef.current = Math.min(3, Math.max(1, initialStep));
    window.history.replaceState(stateFor(stepRef.current), "", window.location.href);

    const onClickCapture = (event: MouseEvent) => {
      if (handlingBackRef.current) return;
      const target = event.target as HTMLElement | null;
      const control = target?.closest("button, [role='button']") as HTMLElement | null;
      if (!control || control.hasAttribute("disabled")) return;
      const text = textOf(control);

      // A visible back action is represented by browser history. React's
      // existing handler is allowed to run only after popstate is handled.
      if (/\bvolver\b|\batr[aá]s\b/.test(text) && stepRef.current > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.history.back();
        return;
      }

      if (!isAdvanceControl(control) || stepRef.current >= 3) return;
      const now = Date.now();
      if (now - lastAdvanceAtRef.current < 500) return;
      lastAdvanceAtRef.current = now;

      // Register the next checkout screen immediately. This is deliberately
      // done before React handles the click, so Android cannot leave checkout
      // during the transition between views.
      const nextStep = stepRef.current + 1;
      stepRef.current = nextStep;
      window.history.pushState(stateFor(nextStep), "", window.location.href);
    };

    const onPopState = (event: PopStateEvent) => {
      if (handlingBackRef.current || stepRef.current <= 1) return;

      const stateStep = Number(event.state?.__dfCheckoutStep || 0);
      const currentStep = stepRef.current;
      const requestedStep = event.state?.__dfCheckout && stateStep > 0
        ? Math.min(currentStep - 1, stateStep)
        : currentStep - 1;

      handlingBackRef.current = true;
      stepRef.current = Math.max(1, requestedStep);

      // Android can return a cart/route state instead of our checkout state.
      // Restore a checkout entry and invoke the actual React back control.
      if (!event.state?.__dfCheckout || stateStep >= currentStep || stateStep <= 0) {
        window.history.pushState(stateFor(currentStep), "", window.location.href);
      }

      let attempts = 0;
      const applyBack = () => {
        attempts += 1;
        const back = findBackControl();
        if (back) {
          back.click();
          window.setTimeout(() => {
            window.history.replaceState(stateFor(stepRef.current), "", window.location.href);
            handlingBackRef.current = false;
          }, 300);
          return;
        }
        if (attempts >= 15) {
          // Do not pretend that the step changed if React did not expose its
          // back control. Keep the history state consistent for the next try.
          stepRef.current = currentStep;
          window.history.replaceState(stateFor(currentStep), "", window.location.href);
          handlingBackRef.current = false;
          return;
        }
        window.setTimeout(applyBack, 100);
      };
      applyBack();
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
