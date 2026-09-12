"use client";

import { useEffect, useRef } from "react";

/** Keeps Android/browser back inside the three checkout steps. */
export default function CheckoutHistory() {
  const lastStep = useRef(0);
  const handlingPop = useRef(false);

  useEffect(() => {
    const readStep = () => {
      const match = document.body.innerText.match(/PASO\s+(1|2|3)\s+DE\s+3/i);
      return match ? Number(match[1]) : 0;
    };

    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      checkoutStep: step,
    });

    const initial = readStep() || 1;
    lastStep.current = initial;
    window.history.replaceState(makeState(initial), "", window.location.href);

    const findBackButton = () => Array.from(document.querySelectorAll("button"))
      .find((button) => /^\s*volver\s*$/i.test(button.textContent || "")) as HTMLButtonElement | undefined;

    const observer = new MutationObserver(() => {
      if (handlingPop.current) return;
      const visible = readStep();
      if (!visible || visible === lastStep.current) return;

      // Only record forward transitions. Never call history.go() here.
      if (visible > lastStep.current) {
        window.history.pushState(makeState(visible), "", window.location.href);
      }
      lastStep.current = visible;
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onPopState = (event: PopStateEvent) => {
      const target = Number(event.state?.checkoutStep || 0);
      const visible = readStep() || lastStep.current;

      // A state without our marker means the user is leaving checkout.
      if (!target || !event.state?.__dfCheckout) return;
      if (target >= visible) return;

      handlingPop.current = true;
      lastStep.current = target;
      const back = findBackButton();
      if (back) back.click();
      window.setTimeout(() => { handlingPop.current = false; }, 150);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
