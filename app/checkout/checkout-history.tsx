"use client";

import { useEffect } from "react";

/** Synchronizes React checkout steps with real browser history entries. */
export default function CheckoutHistory() {
  useEffect(() => {
    const url = window.location.href;
    let currentStep = 1;
    let movingHistory = true;
    let handlingBack = false;

    window.history.replaceState({ ...(window.history.state || {}), __dfCheckoutStep: 1 }, "", url);
    window.history.pushState({ __dfCheckoutStep: 2 }, "", url);
    window.history.pushState({ __dfCheckoutStep: 3 }, "", url);
    window.history.go(-2);
    window.setTimeout(() => { movingHistory = false; }, 250);

    const readVisibleStep = () => {
      const match = document.body.innerText.match(/PASO\s+(\d+)\s+DE\s+3/i);
      return match ? Math.max(1, Math.min(3, Number(match[1]))) : currentStep;
    };

    const observer = new MutationObserver(() => {
      if (movingHistory || handlingBack) return;
      const visible = readVisibleStep();
      if (visible === currentStep) return;
      const delta = visible - currentStep;
      currentStep = visible;
      movingHistory = true;
      window.history.go(delta);
      window.setTimeout(() => { movingHistory = false; }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const onPopState = (event: PopStateEvent) => {
      const target = Number(event.state?.__dfCheckoutStep || 0);
      const visible = readVisibleStep();
      if (target > 0 && target < visible) {
        handlingBack = true;
        currentStep = target;
        const backButton = Array.from(document.querySelectorAll("button")).find((b) =>
          /volver/i.test((b.textContent || "").trim())
        ) as HTMLButtonElement | undefined;
        if (backButton) backButton.click();
        window.setTimeout(() => { handlingBack = false; }, 250);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
