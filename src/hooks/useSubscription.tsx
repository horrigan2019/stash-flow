"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SubscriptionModal,
  type BillingPlan,
} from "@/components/SubscriptionModal";

export type EntitlementSession = {
  authenticated: boolean;
  email: string | null;
  subscribed: boolean;
  isPro: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  plan: "weekly" | "yearly" | "monthly" | null;
  mockPayments: boolean;
};

type SubscriptionContextValue = {
  isPro: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  session: EntitlementSession | null;
  refresh: () => Promise<EntitlementSession | null>;
  openPaywall: (featureTrigger?: string) => void;
  closePaywall: () => void;
  requirePro: (featureTrigger?: string) => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null
);

export const BETA_STORAGE_KEY = "oh_stuffing_beta_tester";
export const BETA_QUERY_VALUE = "tester2026";
export const BETA_CODE = "OHSTUFFINGBETA";

export function readBetaTester(): boolean {
  try {
    return localStorage.getItem(BETA_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeBetaTester(): void {
  try {
    localStorage.setItem(BETA_STORAGE_KEY, "true");
  } catch {
    /* private mode */
  }
}

const EMPTY: EntitlementSession = {
  authenticated: false,
  email: null,
  subscribed: false,
  isPro: false,
  isInTrial: false,
  trialDaysRemaining: 0,
  plan: null,
  mockPayments: true,
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<EntitlementSession | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [featureTrigger, setFeatureTrigger] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betaTester, setBetaTester] = useState(false);
  const [betaToast, setBetaToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get("beta") === BETA_QUERY_VALUE;
    if (fromLink) {
      writeBetaTester();
      params.delete("beta");
      const qs = params.toString();
      const next =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", next);
      setBetaToast(true);
    }
    if (fromLink || readBetaTester()) setBetaTester(true);
  }, []);

  useEffect(() => {
    if (!betaToast) return;
    const timer = window.setTimeout(() => setBetaToast(false), 4500);
    return () => window.clearTimeout(timer);
  }, [betaToast]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Could not check subscription.");
      const data = (await res.json()) as EntitlementSession;
      setSession(data);
      return data;
    } catch {
      setSession((prev) => prev);
      return session;
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openPaywall = useCallback((trigger?: string) => {
    setFeatureTrigger(trigger || null);
    setError(null);
    setPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
    setFeatureTrigger(null);
    setError(null);
  }, []);

  const requirePro = useCallback(
    async (trigger?: string) => {
      if (betaTester || readBetaTester()) return true;
      const next = (await refresh()) || EMPTY;
      if (next.isPro || next.subscribed) return true;
      openPaywall(trigger);
      return false;
    },
    [betaTester, openPaywall, refresh]
  );

  const redeemBetaCode = useCallback((code: string) => {
    const normalized = code.replace(/\s+/g, "").toUpperCase();
    if (normalized !== BETA_CODE) return false;
    writeBetaTester();
    setBetaTester(true);
    setBetaToast(true);
    setPaywallOpen(false);
    setError(null);
    return true;
  }, []);

  const startTrial = useCallback(
    async (plan: BillingPlan) => {
      if (betaTester || readBetaTester()) {
        setPaywallOpen(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          mock?: boolean;
          session?: EntitlementSession;
        };
        if (!res.ok) {
          if (res.status === 401) {
            setError("Sign in first, then start your free trial.");
          } else {
            setError(data.error || "Could not start checkout.");
          }
          return;
        }
        if (data.mock && data.session) {
          setSession(data.session);
          setPaywallOpen(false);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError("No checkout URL returned.");
      } catch {
        setError("Checkout failed. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [betaTester]
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro: betaTester || !!(session?.isPro || session?.subscribed),
      isInTrial: !!session?.isInTrial,
      trialDaysRemaining: session?.trialDaysRemaining || 0,
      session,
      refresh,
      openPaywall,
      closePaywall,
      requirePro,
    }),
    [betaTester, session, refresh, openPaywall, closePaywall, requirePro]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <SubscriptionModal
        open={paywallOpen}
        onClose={closePaywall}
        onStartTrial={startTrial}
        featureTrigger={featureTrigger}
        loading={loading}
        error={error}
        mockMode={session?.mockPayments !== false}
        onRedeemBetaCode={redeemBetaCode}
      />
      {betaToast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[90] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl bg-[#2C4A34] px-4 py-3.5 text-center text-base font-semibold text-[#F7FBF5] shadow-lg"
        >
          Welcome Beta Tester! All Pro features unlocked.
        </div>
      ) : null}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}

/** Alias matching the product brief */
export const useEntitlements = useSubscription;
