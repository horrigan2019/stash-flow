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
      const next = (await refresh()) || EMPTY;
      if (next.isPro || next.subscribed) return true;
      openPaywall(trigger);
      return false;
    },
    [openPaywall, refresh]
  );

  const startTrial = useCallback(
    async (plan: BillingPlan) => {
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
    []
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro: !!(session?.isPro || session?.subscribed),
      isInTrial: !!session?.isInTrial,
      trialDaysRemaining: session?.trialDaysRemaining || 0,
      session,
      refresh,
      openPaywall,
      closePaywall,
      requirePro,
    }),
    [session, refresh, openPaywall, closePaywall, requirePro]
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
      />
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
