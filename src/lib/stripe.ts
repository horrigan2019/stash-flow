import Stripe from "stripe";

export const PRICE_MONTHLY_DEFAULT = "price_mock_monthly";
export const PRICE_ANNUAL_DEFAULT = "price_mock_annual";
/** @deprecated Prefer PRICE_MONTHLY_DEFAULT — kept for older mock IDs */
export const PRICE_WEEKLY_DEFAULT = PRICE_MONTHLY_DEFAULT;
/** @deprecated Prefer PRICE_ANNUAL_DEFAULT */
export const PRICE_YEARLY_DEFAULT = PRICE_ANNUAL_DEFAULT;

export type BillingPlan = "monthly" | "annual";

export const TRIAL_DAYS = 7;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function normalizePlan(plan: string | null | undefined): BillingPlan | null {
  if (plan === "annual" || plan === "yearly") return "annual";
  // Legacy "weekly" maps to monthly ($6.99/mo)
  if (plan === "monthly" || plan === "weekly") return "monthly";
  return null;
}

function monthlyPriceIdFromEnv(): string | undefined {
  return (
    process.env.STRIPE_PRICE_ID_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_WEEKLY?.trim() ||
    process.env.STRIPE_PRICE_MONTHLY?.trim() ||
    undefined
  );
}

function annualPriceIdFromEnv(): string | undefined {
  return (
    process.env.STRIPE_PRICE_ID_ANNUAL?.trim() ||
    process.env.STRIPE_PRICE_YEARLY?.trim() ||
    undefined
  );
}

export function priceIdForPlan(plan: BillingPlan): string {
  if (plan === "annual") {
    return annualPriceIdFromEnv() || PRICE_ANNUAL_DEFAULT;
  }
  return monthlyPriceIdFromEnv() || PRICE_MONTHLY_DEFAULT;
}

export function planFromPriceId(
  priceId: string | undefined | null
): BillingPlan | null {
  if (!priceId) return null;
  const monthly = monthlyPriceIdFromEnv();
  const annual = annualPriceIdFromEnv();
  if (annual && priceId === annual) return "annual";
  if (monthly && priceId === monthly) return "monthly";
  if (priceId.includes("year") || priceId.includes("annual")) return "annual";
  if (
    priceId.includes("month") ||
    priceId.includes("week") ||
    priceId.includes("monthly")
  ) {
    return "monthly";
  }
  return null;
}

export function appBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://127.0.0.1:3847";
}
