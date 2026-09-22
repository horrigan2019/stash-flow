import { NextResponse } from "next/server";
import { getSessionUser, readSessionToken } from "@/lib/auth";
import { appBaseUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    // Cookie present but account missing (e.g. memory-store cold start) ≠ "please sign in"
    // for someone who already sees their email in the UI.
    const hasCookie = Boolean(await readSessionToken());
    return NextResponse.json(
      {
        error: hasCookie
          ? "Your account session could not be loaded. Open Settings and try again, or log out and sign back in."
          : "Sign in to manage your subscription.",
      },
      { status: 401 }
    );
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
      { error: "No Stripe customer on this account yet. Choose a plan first (Upgrade in Settings)." },
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
    return NextResponse.json(
      { error: "Could not open Stripe billing: " + message },
      { status: 502 }
    );
  }
}
