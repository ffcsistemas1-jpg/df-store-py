"use client";

import { useEffect, useRef } from "react";

/**
 * Checkout has three React views inside one URL. This component gives each
 * view a browser-history entry so Android's physical Back button moves one
 * checkout step at a time instead of immediately returning to the cart.
 *
 * Important: this is deliberately based on the rendered checkout marker and
 * the real React "Volver" control. It never changes the URL or reloads the
 * checkout, so form data and the current checkout session remain intact.
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

      // Prefer an explicit checkout back control when one exists.
      const explicit = visible.find((element) => {
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        const aria = element.getAttribute("aria-label") || "";
        const testId = element.getAttribute("data-testid") || "";
        return /checkout.*back|back.*checkout|checkout.*volver|volver.*checkout/i.test(`${aria} ${testId}`) || /^\s*volver\s*$/i.test(text);
      });
      if (explicit) return explicit;

      // Fallback for the existing Spanish checkout labels.
      return visible.find((element) => /\bvolver\b|\bat r[aá]s\b|\batras\b/i.test(element.textContent || ""));
    };

    const clickBackControl = () => {
      const control = findReactBackControl();
      if (!control) return false;
      control.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
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
        // Every forward transition gets exactly one new history entry.
        currentStepRef.current = renderedStep;
        window.history.pushState(makeState(renderedStep), "", window.location.href);
      } else {
        // A click on the visible Volver button already changed React state.
        // Keep the current entry aligned without adding a duplicate entry.
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

      // Android/Chrome may return the previous cart entry without our custom
      // state. In both cases, immediately restore the current checkout entry.
      // This prevents the browser from leaving /checkout before React moves one
      // internal step backward.
      if (isCheckoutHistoryBack || !event.state?.__dfCheckout) {
        const previousStep = currentStepRef.current;
        handlingBackRef.current = true;
        window.history.pushState(makeState(previousStep), "", window.location.href);

        // React may still be rendering the previous view when popstate fires.
        // Retry briefly instead of assuming a button is already in the DOM.
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
