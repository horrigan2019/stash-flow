import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie, toPublicSession } from "@/lib/auth";
import { isSubscribed, saveUser, storeBackend } from "@/lib/store";
import {
  TRIAL_DAYS,
  appBaseUrl,
  getStripe,
  normalizePlan,
  priceIdForPlan,
  stripeConfigured,
  type BillingPlan,
} from "@/lib/stripe";

export const runtime = "nodejs";

function trialEndIso(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

/**
 * Izzy + Oh Stuffing checkout.
 * Accepts `planType` or `plan`: 'monthly' ($6.99) | 'annual' ($39.99).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in first, then start Pro." },
      { status: 401 },
    );
  }

  let body: { plan?: string; planType?: string; priceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const plan: BillingPlan | null =
    normalizePlan(body.planType) ||
    normalizePlan(body.plan) ||
    (body.priceId?.includes("year") || body.priceId?.includes("annual")
      ? "annual"
      : body.priceId
        ? "monthly"
        : null);

  if (!plan) {
    return NextResponse.json(
      { error: "Choose planType monthly ($6.99) or annual ($39.99)." },
      { status: 400 },
    );
  }

  if (!stripeConfigured()) {
    user.subscriptionStatus = "trialing";
    user.plan = plan;
    user.trialEndsAt = trialEndIso();
    user.stripeSubscriptionId = `mock_trial_${plan}_${user.id.slice(0, 8)}`;
    await saveUser(user);
    await setSessionCookie(user);
    return NextResponse.json({
      ok: true,
      mock: true,
      trial: true,
      trialDays: TRIAL_DAYS,
      url: "/izzy/decode?unlocked=1",
      session: toPublicSession(user, {
        mockPayments: true,
        storeBackend: storeBackend(),
      }),
    });
  }

  if (isSubscribed(user)) {
    return NextResponse.json(
      {
        error:
          "You're already subscribed (or in a free trial). Use Manage subscription to change or cancel.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const priceId = body.priceId?.startsWith("price_")
    ? body.priceId
    : priceIdForPlan(plan);
  if (priceId.startsWith("price_mock_")) {
    return NextResponse.json(
      {
        error:
          "Set STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_ANNUAL in Vercel to your Stripe Price IDs, then redeploy.",
      },
      { status: 503 },
    );
  }

  const base = appBaseUrl(request);

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { ohStuffingUserId: user.id, izzyUserId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await saveUser(user);
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/izzy/decode?checkout=success`,
      cancel_url: `${base}/izzy?checkout=cancel`,
      client_reference_id: user.id,
      metadata: {
        ohStuffingUserId: user.id,
        izzyUserId: user.id,
        plan,
      },
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          ohStuffingUserId: user.id,
          izzyUserId: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
