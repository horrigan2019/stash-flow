"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Isolated PWA update banner.
 * Detects a waiting service worker and offers one-tap reload.
 * Does not touch shopping list / aisle / modal logic.
 */
export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const reloadArmed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;

    function showWaiting(sw: ServiceWorker | null | undefined) {
      if (!sw || cancelled) return;
      waitingRef.current = sw;
      setVisible(true);
    }

    function onControllerChange() {
      if (!reloadArmed.current) return;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) {
          showWaiting(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showWaiting(reg.waiting || installing);
            }
          });
        });

        // Periodic + focus checks for a new deploy
        const tick = () => {
          reg.update().catch(() => {});
        };
        tick();
        const intervalId = window.setInterval(tick, 60 * 60 * 1000);
        const onVisible = () => {
          if (document.visibilityState === "visible") tick();
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
          window.clearInterval(intervalId);
          document.removeEventListener("visibilitychange", onVisible);
        };
      })
      .catch(() => {
        /* offline shell optional */
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      void registration;
    };
  }, []);

  function updateNow() {
    const waiting = waitingRef.current;
    if (!waiting) {
      window.location.reload();
      return;
    }
    reloadArmed.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
    // Fallback reload if controllerchange is slow/missed
    window.setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[var(--border,#E4DCC9)] bg-[var(--surface,#fff)] px-4 py-4 text-[var(--ink,#2B2620)] shadow-[0_8px_28px_rgba(0,0,0,0.18)]">
        <p className="text-base font-semibold leading-snug">
          A fresh update for Oh Stuffing is ready! 🚀
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={updateNow}
            className="min-h-12 flex-1 rounded-xl bg-[var(--accent,#3F6B4A)] px-4 text-base font-bold text-[var(--accent-ink,#fff)]"
          >
            Update Now
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Later"
            className="min-h-12 min-w-12 rounded-xl border border-[var(--border,#E4DCC9)] px-4 text-base font-semibold"
          >
            Later ✕
          </button>
        </div>
      </div>
    </div>
  );
}
