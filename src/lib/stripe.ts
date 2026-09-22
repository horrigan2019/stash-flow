import Stripe from "stripe";

export const PRICE_WEEKLY_DEFAULT = "price_mock_weekly";
export const PRICE_YEARLY_DEFAULT = "price_mock_yearly";
/** @deprecated Prefer PRICE_WEEKLY_DEFAULT — kept for older env names */
export const PRICE_MONTHLY_DEFAULT = PRICE_WEEKLY_DEFAULT;

export type BillingPlan = "weekly" | "yearly";

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
  if (plan === "yearly") return "yearly";
  // Legacy "monthly" maps to weekly ($1.99/week)
  if (plan === "weekly" || plan === "monthly") return "weekly";
  return null;
}

export function priceIdForPlan(plan: BillingPlan): string {
  if (plan === "yearly") {
    return process.env.STRIPE_PRICE_YEARLY?.trim() || PRICE_YEARLY_DEFAULT;
  }
  return (
    process.env.STRIPE_PRICE_WEEKLY?.trim() ||
    process.env.STRIPE_PRICE_MONTHLY?.trim() ||
    PRICE_WEEKLY_DEFAULT
  );
}

export function planFromPriceId(
  priceId: string | undefined | null
): BillingPlan | null {
  if (!priceId) return null;
  const weekly =
    process.env.STRIPE_PRICE_WEEKLY?.trim() ||
    process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_YEARLY?.trim();
  if (yearly && priceId === yearly) return "yearly";
  if (weekly && priceId === weekly) return "weekly";
  if (priceId.includes("year")) return "yearly";
  if (priceId.includes("week") || priceId.includes("month")) return "weekly";
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
