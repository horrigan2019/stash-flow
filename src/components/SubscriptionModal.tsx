"use client";

import { useCallback, useMemo, useState } from "react";

export type BillingPlan = "weekly" | "yearly";

export type SubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
  onStartTrial: (plan: BillingPlan) => void | Promise<void>;
  featureTrigger?: string | null;
  loading?: boolean;
  error?: string | null;
  mockMode?: boolean;
};

const VALUE_BULLETS = [
  "Instant dinner ideas from photos of your fridge",
  "Match real flyer sales to your list automatically",
  "Compare multi-store prices to cut your grocery bill",
  "Leftover & expiry countdown so food never spoils",
] as const;

export function SubscriptionModal({
  open,
  onClose,
  onStartTrial,
  featureTrigger,
  loading = false,
  error = null,
  mockMode = false,
}: SubscriptionModalProps) {
  const [plan, setPlan] = useState<BillingPlan>("yearly");

  const ctaLabel = useMemo(() => {
    if (plan === "yearly") {
      return "Start 7-Day Free Trial, then $39.99/year";
    }
    return "Start 7-Day Free Trial, then $1.99/week";
  }, [plan]);

  const handleCta = useCallback(() => {
    void onStartTrial(plan);
  }, [onStartTrial, plan]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oh-paywall-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#D9CFC0] bg-[#FBF7F0] p-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#5C5346] hover:bg-[#F0E8DC]"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3F6B4A]">
          Oh Stuffing Pro
        </p>
        <h2
          id="oh-paywall-title"
          className="mt-1 font-[family-name:var(--font-display,Fraunces,Georgia,serif)] text-2xl font-bold tracking-tight text-[#2C261C]"
        >
          Try free for 7 days
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5C5346]">
          {featureTrigger
            ? `${featureTrigger} is included in Pro. Your free shopping list stays free.`
            : "Unlock Photo & AI and smart planning tools. Your free shopping list stays free."}
        </p>
        <p className="mt-2 rounded-xl bg-[#3F6B4A]/10 px-3 py-2 text-sm font-medium text-[#2C4A34]">
          Try free for 7 days. You will not be charged until day 7. Cancel anytime
          in 1 tap.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => setPlan("yearly")}
            aria-pressed={plan === "yearly"}
            className={`w-full rounded-2xl border-2 p-4 text-left transition ${
              plan === "yearly"
                ? "border-[#3F6B4A] bg-white shadow-sm"
                : "border-[#D9CFC0] bg-[#F7F1E8]"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <strong className="text-[#2C261C]">Annual</strong>
              <span className="rounded-full bg-[#E8A87C] px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-[#3A2414]">
                Best value · Save 61%
              </span>
            </div>
            <div className="font-[family-name:var(--font-display,Fraunces,Georgia,serif)] text-2xl font-bold text-[#3F6B4A]">
              $39.99
              <span className="text-sm font-medium text-[#5C5346]"> / year</span>
            </div>
            <div className="text-sm text-[#5C5346]">$0.77 / week</div>
          </button>

          <button
            type="button"
            onClick={() => setPlan("weekly")}
            aria-pressed={plan === "weekly"}
            className={`w-full rounded-2xl border-2 p-4 text-left transition ${
              plan === "weekly"
                ? "border-[#3F6B4A] bg-white shadow-sm"
                : "border-[#D9CFC0] bg-[#F7F1E8]"
            }`}
          >
            <strong className="text-[#2C261C]">Weekly</strong>
            <div className="mt-1 font-[family-name:var(--font-display,Fraunces,Georgia,serif)] text-2xl font-bold text-[#3F6B4A]">
              $1.99
              <span className="text-sm font-medium text-[#5C5346]"> / week</span>
            </div>
            <div className="text-sm text-[#5C5346]">Flexible, cancel anytime</div>
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {VALUE_BULLETS.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-snug text-[#2C261C]"
            >
              <span className="mt-0.5 font-bold text-[#3F6B4A]" aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-3 text-sm text-[#B42318]" role="alert">
            {error}
          </p>
        ) : null}
        {mockMode ? (
          <p className="mt-2 text-xs text-[#5C5346]">
            Stripe keys aren’t set — starting a trial unlocks Pro in mock mode
            (no card charged).
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={handleCta}
          className="mt-4 w-full rounded-xl bg-[#3F6B4A] px-4 py-3.5 text-sm font-bold text-[#F7FBF5] disabled:opacity-55"
        >
          {loading ? "Starting trial…" : ctaLabel}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl border border-[#D9CFC0] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#5C5346]"
        >
          Continue with free list
        </button>

        <div className="mt-4 space-y-1 text-center text-xs text-[#5C5346]">
          <p>🔒 Secure checkout powered by Stripe</p>
          <p>⚡ 1-click cancellation anytime</p>
          <p className="pt-1">
            <a className="underline" href="#restore">
              Restore Purchase
            </a>
            {" · "}
            <a className="underline" href="/terms">
              Terms
            </a>
            {" · "}
            <a className="underline" href="/privacy">
              Privacy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
