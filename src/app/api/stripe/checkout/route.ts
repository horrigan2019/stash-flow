import { NextResponse } from "next/server";
import { getSessionUser, toPublicSession } from "@/lib/auth";
import { isSubscribed, saveUser, storeBackend } from "@/lib/store";
import {
  appBaseUrl,
  getStripe,
  priceIdForPlan,
  stripeConfigured,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in first, then choose a plan." },
      { status: 401 }
    );
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const plan = body.plan === "yearly" ? "yearly" : body.plan === "monthly" ? "monthly" : null;
  if (!plan) {
    return NextResponse.json(
      { error: "Choose monthly ($7.99) or yearly ($49)." },
      { status: 400 }
    );
  }

  // Local / missing Stripe keys: unlock immediately so Debra can develop without Checkout.
  if (!stripeConfigured()) {
    user.subscriptionStatus = "active";
    user.plan = plan;
    user.stripeSubscriptionId = `mock_sub_${plan}_${user.id.slice(0, 8)}`;
    await saveUser(user);
    return NextResponse.json({
      ok: true,
      mock: true,
      url: "/?unlocked=1",
      session: toPublicSession(user, {
        mockPayments: true,
        storeBackend: storeBackend(),
      }),
    });
  }

  if (isSubscribed(user)) {
    return NextResponse.json(
      { error: "You're already subscribed. Use Manage subscription to change or cancel." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const priceId = priceIdForPlan(plan);
  if (priceId.startsWith("price_mock_")) {
    return NextResponse.json(
      {
        error:
          "Set STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY in Vercel to your Stripe Price IDs, then redeploy.",
      },
      { status: 503 }
    );
  }

  const base = appBaseUrl(request);

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { ohStuffingUserId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await saveUser(user);
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      client_reference_id: user.id,
      metadata: {
        ohStuffingUserId: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          ohStuffingUserId: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
