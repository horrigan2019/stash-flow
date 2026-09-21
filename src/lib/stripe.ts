import Stripe from "stripe";

export const PRICE_MONTHLY_DEFAULT = "price_mock_monthly";
export const PRICE_YEARLY_DEFAULT = "price_mock_yearly";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function priceIdForPlan(plan: "monthly" | "yearly"): string {
  if (plan === "yearly") {
    return (
      process.env.STRIPE_PRICE_YEARLY?.trim() || PRICE_YEARLY_DEFAULT
    );
  }
  return process.env.STRIPE_PRICE_MONTHLY?.trim() || PRICE_MONTHLY_DEFAULT;
}

export function planFromPriceId(priceId: string | undefined | null): "monthly" | "yearly" | null {
  if (!priceId) return null;
  const monthly = process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_YEARLY?.trim();
  if (monthly && priceId === monthly) return "monthly";
  if (yearly && priceId === yearly) return "yearly";
  if (priceId.includes("year")) return "yearly";
  if (priceId.includes("month")) return "monthly";
  return null;
}

export function appBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://127.0.0.1:3847";
}
