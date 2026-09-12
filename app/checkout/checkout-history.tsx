"use client";

import { useEffect, useRef } from "react";

/**
 * The checkout is one URL with three React views. The old implementation tried
 * to discover the step by reading a "PASO X DE 3" label, but the live checkout
 * does not render that label. Therefore no history entries were being created.
 *
 * This implementation observes the actual checkout actions instead:
 * - CONTINUAR/AVANZAR actions create the next history entry.
 * - Android/browser popstate invokes the real React Volver control.
 * - The physical Back button leaves checkout only after step 1.
 */
export default function CheckoutHistory() {
  const stepRef = useRef(1);
  const handlingPopRef = useRef(false);
  const advancingRef = useRef(false);

  useEffect(() => {
    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const visible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const labelOf = (element: HTMLElement) =>
      `${element.textContent || ""} ${element.getAttribute("aria-label") || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const findBackControl = () => {
      const controls = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
      return controls.find((element) => {
        if (element.hasAttribute("disabled") || !visible(element)) return false;
        return /^(←|←\s*)?\s*volver\s*$/.test(labelOf(element)) || /\bvolver\b|\batr[aá]s\b/.test(labelOf(element));
      });
    };

    const findAdvanceControl = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target.closest("button, [role='button']") as HTMLElement | null : null;
      if (!element || element.hasAttribute("disabled") || !visible(element)) return false;
      const label = labelOf(element);
      return /continuar|avanzar|siguiente|confirmar|finalizar|realizar pedido|enviar pedido/.test(label) && !/volver|atr[aá]s/.test(label);
    };

    const initial = Number(window.history.state?.__dfCheckoutStep) || 1;
    stepRef.current = initial;
    window.history.replaceState(stateFor(initial), "", window.location.href);

    const onClickCapture = (event: MouseEvent) => {
      if (handlingPopRef.current) return;

      const target = event.target as HTMLElement | null;
      const control = target?.closest("button, [role='button']") as HTMLElement | null;
      if (!control || control.hasAttribute("disabled")) return;

      const label = labelOf(control);
      if (/\bvolver\b|\batr[aá]s\b/.test(label) && stepRef.current > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.history.back();
        return;
      }

      if (!findAdvanceControl(event.target) || advancingRef.current || stepRef.current >= 3) return;

      advancingRef.current = true;
      const nextStep = stepRef.current + 1;
      // Let the existing React validation/action run first. Only record a new
      // entry if the rendered checkout actually advances.
      window.setTimeout(() => {
        const body = document.body?.innerText || "";
        const stillCheckout = /continuar|siguiente|confirmar|finalizar|realizar pedido|tu pedido/i.test(body);
        if (stillCheckout) {
          stepRef.current = nextStep;
          window.history.pushState(stateFor(nextStep), "", window.location.href);
        }
        advancingRef.current = false;
      }, 350);
    };

    const onPopState = (event: PopStateEvent) => {
      if (handlingPopRef.current || stepRef.current <= 1) return;

      const targetStep = Number(event.state?.__dfCheckoutStep || 0);
      const previousStep = stepRef.current;
      const isInternalBack = Boolean(event.state?.__dfCheckout && targetStep > 0 && targetStep < previousStep);

      // Android may emit a state belonging to the cart/previous route. While
      // on step 2 or 3, keep the checkout entry and move only one React step.
      if (isInternalBack || !event.state?.__dfCheckout) {
        handlingPopRef.current = true;
        window.history.pushState(stateFor(previousStep), "", window.location.href);

        let tries = 0;
        const invokeBack = () => {
          tries += 1;
          const back = findBackControl();
          if (back) {
            back.click();
            window.setTimeout(() => {
              stepRef.current = Math.max(1, previousStep - 1);
              window.history.replaceState(stateFor(stepRef.current), "", window.location.href);
              handlingPopRef.current = false;
            }, 250);
            return;
          }
          if (tries >= 10) {
            stepRef.current = Math.max(1, previousStep - 1);
            window.history.replaceState(stateFor(stepRef.current), "", window.location.href);
            handlingPopRef.current = false;
            return;
          }
          window.setTimeout(invokeBack, 80);
        };
        invokeBack();
      }
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
