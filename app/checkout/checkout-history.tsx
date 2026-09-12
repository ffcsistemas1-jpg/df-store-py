"use client";

import { useEffect, useRef } from "react";

/**
 * Gives the checkout's internal React steps their own browser-history entries.
 * This is intentionally independent from the checkout button labels: Android's
 * physical Back button must work even when the step UI changes asynchronously.
 */
export default function CheckoutHistory() {
  const stepRef = useRef(1);
  const handlingHistory = useRef(false);
  const syncing = useRef(false);

  useEffect(() => {
    const getRenderedStep = () => {
      const text = document.body?.innerText || "";
      const match = text.match(/\bPASO\s*(?:N.º?\s*)?(1|2|3)\s*DE\s*3\b/i);
      return match ? Number(match[1]) : 0;
    };

    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const findVisibleBackButton = () => {
      const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
      return buttons.find((button) => {
        if (button.disabled) return false;
        const rect = button.getBoundingClientRect();
        const label = (button.textContent || "").trim();
        return rect.width > 0 && rect.height > 0 && /volver|atr[aá]s/i.test(label);
      });
    };

    const initial = getRenderedStep() || 1;
    stepRef.current = initial;
    window.history.replaceState(stateFor(initial), "", window.location.href);

    // React changes `step` without changing the URL. Polling plus a mutation
    // observer catches both synchronous and asynchronous render updates.
    const syncRenderedStep = () => {
      if (handlingHistory.current || syncing.current) return;
      const rendered = getRenderedStep();
      if (!rendered || rendered === stepRef.current) return;

      if (rendered > stepRef.current && rendered === stepRef.current + 1) {
        stepRef.current = rendered;
        window.history.pushState(stateFor(rendered), "", window.location.href);
        return;
      }

      // A visual Volver click may already have changed React before the
      // browser-history event is delivered. Keep our tracker synchronized.
      if (rendered < stepRef.current) {
        stepRef.current = rendered;
        window.history.replaceState(stateFor(rendered), "", window.location.href);
      }
    };

    const observer = new MutationObserver(syncRenderedStep);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const poll = window.setInterval(syncRenderedStep, 120);

    const onClickCapture = (event: MouseEvent) => {
      if (handlingHistory.current) return;
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button || button.disabled) return;
      const label = (button.textContent || "").trim();

      // Convert the checkout's visible back action into browser history.
      // The actual React Volver handler is called from popstate below.
      if (/volver|atr[aá]s/i.test(label) && stepRef.current > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.history.back();
      }
    };

    const onPopState = (event: PopStateEvent) => {
      const targetStep = Number(event.state?.__dfCheckoutStep || 0);
      if (!event.state?.__dfCheckout || !targetStep) return;
      if (targetStep >= stepRef.current) return;

      stepRef.current = targetStep;
      syncing.current = true;
      handlingHistory.current = true;
      const back = findVisibleBackButton();
      if (back) back.click();

      window.setTimeout(() => {
        handlingHistory.current = false;
        syncing.current = false;
      }, 350);
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
