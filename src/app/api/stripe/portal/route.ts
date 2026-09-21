import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { appBaseUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage your subscription." }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message:
        "Payments are in local mock mode. Cancel isn't needed — sign out or clear the mock unlock from Settings.",
    });
  }

  if (!user.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on this account yet. Subscribe first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const base = appBaseUrl(request);
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${base}/`,
    });
    return NextResponse.json({ ok: true, url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open billing portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
