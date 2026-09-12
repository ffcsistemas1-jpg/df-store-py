"use client";

import { useEffect, useRef } from "react";

/**
 * Checkout has three React views inside one URL. This component gives each
 * view a browser-history entry so Android's physical Back button moves one
 * checkout step at a time instead of immediately returning to the cart.
 */
export default function CheckoutHistory() {
  const currentStepRef = useRef(1);
  const handlingBackRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const readRenderedStep = () => {
      const text = document.body?.innerText || "";
      const match = text.match(/\bPASO\s*(?:N[.º°]?\s*)?(1|2|3)\s*DE\s*3\b/i);
      return match ? Number(match[1]) : 0;
    };

    const makeState = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const findReactBackControl = () => {
      const elements = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
      const visible = elements.filter((element) => !element.hasAttribute("disabled") && isVisible(element));

      const explicit = visible.find((element) => {
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        const aria = element.getAttribute("aria-label") || "";
        const testId = element.getAttribute("data-testid") || "";
        return /checkout.*back|back.*checkout|checkout.*volver|volver.*checkout/i.test(`${aria} ${testId}`) || /^\s*volver\s*$/i.test(text);
      });
      if (explicit) return explicit;

      return visible.find((element) => /\bvolver\b|\batr[aá]s\b/i.test(element.textContent || ""));
    };

    const clickBackControl = () => {
      const control = findReactBackControl();
      if (!control) return false;
      control.click();
      return true;
    };

    const initialStep = readRenderedStep() || 1;
    currentStepRef.current = initialStep;
    window.history.replaceState(makeState(initialStep), "", window.location.href);
    initializedRef.current = true;

    const syncHistoryToRenderedStep = () => {
      if (!initializedRef.current || handlingBackRef.current) return;
      const renderedStep = readRenderedStep();
      if (!renderedStep || renderedStep === currentStepRef.current) return;

      if (renderedStep > currentStepRef.current) {
        currentStepRef.current = renderedStep;
        window.history.pushState(makeState(renderedStep), "", window.location.href);
      } else {
        currentStepRef.current = renderedStep;
        window.history.replaceState(makeState(renderedStep), "", window.location.href);
      }
    };

    const observer = new MutationObserver(syncHistoryToRenderedStep);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const poll = window.setInterval(syncHistoryToRenderedStep, 150);

    const onPopState = (event: PopStateEvent) => {
      if (handlingBackRef.current || currentStepRef.current <= 1) return;

      const targetStep = Number(event.state?.__dfCheckoutStep || 0);
      const isCheckoutHistoryBack = Boolean(event.state?.__dfCheckout && targetStep < currentStepRef.current);

      if (isCheckoutHistoryBack || !event.state?.__dfCheckout) {
        const previousStep = currentStepRef.current;
        handlingBackRef.current = true;
        window.history.pushState(makeState(previousStep), "", window.location.href);

        let attempts = 0;
        const tryBack = () => {
          attempts += 1;
          if (clickBackControl() || attempts >= 8) {
            window.setTimeout(() => {
              const rendered = readRenderedStep();
              const nextStep = rendered > 0 && rendered < previousStep ? rendered : Math.max(1, previousStep - 1);
              currentStepRef.current = nextStep;
              window.history.replaceState(makeState(nextStep), "", window.location.href);
              handlingBackRef.current = false;
            }, 180);
            return;
          }
          window.setTimeout(tryBack, 60);
        };
        tryBack();
      }
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
