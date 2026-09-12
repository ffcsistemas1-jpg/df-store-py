"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the three React checkout views aligned with browser history.
 * The checkout remains one URL, but every internal step gets a history entry.
 */
export default function CheckoutHistory() {
  const stepRef = useRef(1);
  const processingRef = useRef(false);
  const lastObservedStepRef = useRef(1);

  useEffect(() => {
    const stateFor = (step: number) => ({
      ...(window.history.state || {}),
      __dfCheckout: true,
      __dfCheckoutStep: step,
    });

    const visible = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const text = (el: HTMLElement) =>
      `${el.textContent || ""} ${el.getAttribute("aria-label") || ""}`
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const getRenderedStep = () => {
      const bodyText = document.body?.innerText || "";
      const match = bodyText.match(/checkout\s*[·-]?\s*paso\s*(1|2|3)\s*de\s*3/i);
      return match ? Number(match[1]) : 0;
    };

    const findBackButton = () => {
      const elements = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
      return elements.find((el) => {
        if (!visible(el) || el.hasAttribute("disabled")) return false;
        return /\bvolver\b|\batr[aá]s\b/.test(text(el));
      });
    };

    const initial = Number(window.history.state?.__dfCheckoutStep) || 1;
    stepRef.current = Math.min(3, Math.max(1, initial));
    lastObservedStepRef.current = stepRef.current;
    window.history.replaceState(stateFor(stepRef.current), "", window.location.href);

    const registerRenderedStep = () => {
      if (processingRef.current) return;
      const rendered = getRenderedStep();
      if (!rendered || rendered === lastObservedStepRef.current) return;

      const previous = lastObservedStepRef.current;
      lastObservedStepRef.current = rendered;
      stepRef.current = rendered;

      // A forward React transition needs a matching browser-history entry.
      if (rendered > previous) {
        window.history.pushState(stateFor(rendered), "", window.location.href);
      } else {
        window.history.replaceState(stateFor(rendered), "", window.location.href);
      }
    };

    const onPopState = (event: PopStateEvent) => {
      if (processingRef.current) return;

      const current = stepRef.current;
      if (current <= 1) return;

      const stateStep = Number(event.state?.__dfCheckoutStep) || 0;
      const target = stateStep > 0 && stateStep < current ? stateStep : current - 1;

      processingRef.current = true;
      stepRef.current = Math.max(1, target);
      lastObservedStepRef.current = stepRef.current;

      // Keep the browser inside /checkout while React changes its internal view.
      if (!event.state?.__dfCheckout || stateStep >= current || stateStep <= 0) {
        window.history.pushState(stateFor(current), "", window.location.href);
      }

      let tries = 0;
      const applyReactBack = () => {
        tries += 1;
        const button = findBackButton();
        if (button) {
          button.click();
          window.setTimeout(() => {
            const rendered = getRenderedStep();
            const finalStep = rendered || target;
            stepRef.current = finalStep;
            lastObservedStepRef.current = finalStep;
            window.history.replaceState(stateFor(finalStep), "", window.location.href);
            processingRef.current = false;
          }, 350);
          return;
        }
        if (tries >= 20) {
          stepRef.current = current;
          lastObservedStepRef.current = current;
          window.history.replaceState(stateFor(current), "", window.location.href);
          processingRef.current = false;
          return;
        }
        window.setTimeout(applyReactBack, 100);
      };
      applyReactBack();
    };

    const observer = new MutationObserver(registerRenderedStep);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const poll = window.setInterval(registerRenderedStep, 150);
    window.addEventListener("popstate", onPopState);

    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
