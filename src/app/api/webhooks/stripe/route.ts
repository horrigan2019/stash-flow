import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/server";
// Reuse Oh Stuffing session store fulfillment when Supabase is not wired
import { POST as legacyWebhook } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";

async function setSubscribedByCustomer(opts: {
  customerId: string | null;
  subscriptionId: string | null;
  email: string | null;
  subscribed: boolean;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  if (opts.customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data?.id) {
      await admin
        .from("profiles")
        .update({
          is_subscribed: opts.subscribed,
          stripe_subscription_id: opts.subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return true;
    }
  }

  if (opts.email) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", opts.email)
      .maybeSingle();
    if (data?.id) {
      await admin
        .from("profiles")
        .update({
          is_subscribed: opts.subscribed,
          stripe_customer_id: opts.customerId,
          stripe_subscription_id: opts.subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      return true;
    }
  }

  // Metadata user id from Checkout
  return false;
}

async function setSubscribedByUserId(
  userId: string,
  opts: {
    customerId: string | null;
    subscriptionId: string | null;
    subscribed: boolean;
  },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from("profiles")
    .update({
      is_subscribed: opts.subscribed,
      stripe_customer_id: opts.customerId,
      stripe_subscription_id: opts.subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export async function POST(request: Request) {
  // When Supabase is not configured, fall back to existing Oh Stuffing webhook.
  if (!getSupabaseAdmin()) {
    return legacyWebhook(request);
  }

  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Webhook ignored — Stripe keys not set.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Set STRIPE_WEBHOOK_SECRET." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;
      const userId =
        session.metadata?.ohStuffingUserId ||
        session.metadata?.izzyUserId ||
        session.client_reference_id ||
        null;
      const email = session.customer_details?.email || session.customer_email || null;

      if (userId) {
        await setSubscribedByUserId(userId, {
          customerId,
          subscriptionId,
          subscribed: true,
        });
      } else {
        await setSubscribedByCustomer({
          customerId,
          subscriptionId,
          email,
          subscribed: true,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
      const userId = sub.metadata?.ohStuffingUserId || sub.metadata?.izzyUserId || null;
      if (userId) {
        await setSubscribedByUserId(userId, {
          customerId,
          subscriptionId: sub.id,
          subscribed: false,
        });
      } else {
        await setSubscribedByCustomer({
          customerId,
          subscriptionId: sub.id,
          email: null,
          subscribed: false,
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: true });
}
