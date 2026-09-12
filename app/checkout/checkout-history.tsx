"use client";

import { useEffect, useRef } from "react";

/**
 * Makes the checkout's React steps behave like browser-history screens.
 * This also contains a fallback for Android browsers that emit popstate with
 * the previous page's state instead of the checkout state.
 */
export default function CheckoutHistory() {
  const stepRef = useRef(1);
  const handlingRef = useRef(false);

  useEffect(() => {
    const readStep = () => {
      const text = document.body?.innerText || "";
      const match = text.match(/\bPASO\s*(?:N.º?\s*)?(1|2|3)\s*DE\s*3\b/i);
      return match ? Number(match[1]) : 0;
    };

    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const findBackButton = () => {
      const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
      const visible = buttons.filter((button) => {
        if (button.disabled) return false;
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return (
        visible.find((button) => /^\s*volver\s*$/i.test(button.textContent || "")) ||
        visible.find((button) => /\bvolver\b|\batr[aá]s\b/i.test(button.textContent || ""))
      );
    };

    const initial = readStep() || 1;
    stepRef.current = initial;
    window.history.replaceState(stateFor(initial), "", window.location.href);

    const syncStep = () => {
      if (handlingRef.current) return;
      const rendered = readStep();
      if (!rendered || rendered === stepRef.current) return;

      if (rendered === stepRef.current + 1) {
        stepRef.current = rendered;
        window.history.pushState(stateFor(rendered), "", window.location.href);
      } else if (rendered < stepRef.current) {
        stepRef.current = rendered;
        window.history.replaceState(stateFor(rendered), "", window.location.href);
      }
    };

    const observer = new MutationObserver(syncStep);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const poll = window.setInterval(syncStep, 100);

    const onPopState = (event: PopStateEvent) => {
      if (handlingRef.current) return;

      const target = Number(event.state?.__dfCheckoutStep || 0);

      // Normal checkout history: go to the previous React step.
      if (event.state?.__dfCheckout && target > 0 && target < stepRef.current) {
        handlingRef.current = true;
        stepRef.current = target;
        const button = findBackButton();
        if (button) button.click();
        window.setTimeout(() => {
          window.history.replaceState(stateFor(readStep() || target), "", window.location.href);
          handlingRef.current = false;
        }, 400);
        return;
      }

      // Android fallback: some browsers return the cart/page state directly.
      // Restore the checkout entry, then invoke the real React back action.
      // This prevents leaving checkout while steps 2 or 3 are still active.
      if (stepRef.current > 1) {
        handlingRef.current = true;
        window.history.pushState(stateFor(stepRef.current), "", window.location.href);
        const button = findBackButton();
        if (button) button.click();
        window.setTimeout(() => {
          const rendered = readStep();
          const next = rendered && rendered < stepRef.current ? rendered : Math.max(1, stepRef.current - 1);
          stepRef.current = next;
          window.history.replaceState(stateFor(next), "", window.location.href);
          handlingRef.current = false;
        }, 450);
      }
      // At step 1, the physical Back button is intentionally allowed to leave
      // checkout and return to the cart/previous page.
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
