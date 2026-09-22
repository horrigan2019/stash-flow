import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getUserByEmail,
  getUserById,
  saveUser,
  type SubscriptionStatus,
  type UserRecord,
} from "@/lib/store";
import { getStripe, planFromPriceId, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "none";
  }
}

async function findUser(opts: {
  userId?: string | null;
  email?: string | null;
  customerId?: string | null;
}): Promise<UserRecord | null> {
  if (opts.userId) {
    const byId = await getUserById(opts.userId);
    if (byId) return byId;
  }
  if (opts.email) {
    const byEmail = await getUserByEmail(opts.email);
    if (byEmail) return byEmail;
  }
  return null;
}

async function applySubscription(
  user: UserRecord,
  sub: Stripe.Subscription
): Promise<void> {
  const priceId = sub.items.data[0]?.price?.id;
  user.stripeSubscriptionId = sub.id;
  if (typeof sub.customer === "string") {
    user.stripeCustomerId = sub.customer;
  } else if (sub.customer && "id" in sub.customer) {
    user.stripeCustomerId = sub.customer.id;
  }
  user.subscriptionStatus = mapStatus(sub.status);
  user.plan =
    planFromPriceId(priceId) ||
    (sub.metadata?.plan === "yearly" ||
    sub.metadata?.plan === "weekly" ||
    sub.metadata?.plan === "monthly"
      ? sub.metadata.plan === "monthly"
        ? "weekly"
        : (sub.metadata.plan as "weekly" | "yearly")
      : user.plan) ||
    null;
  if (sub.status === "trialing" && sub.trial_end) {
    user.trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
  } else if (sub.status === "active") {
    user.trialEndsAt = null;
  }
  await saveUser(user);
}

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Webhook ignored — Stripe keys not set (local mock mode).",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Set STRIPE_WEBHOOK_SECRET in Vercel, then redeploy." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId =
          session.metadata?.ohStuffingUserId || session.client_reference_id || null;
        const user = await findUser({
          userId,
          email: session.customer_email || session.customer_details?.email || null,
          customerId: typeof session.customer === "string" ? session.customer : null,
        });
        if (!user) break;
        if (typeof session.customer === "string") {
          user.stripeCustomerId = session.customer;
        }
        if (typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(user, sub);
        } else {
          user.subscriptionStatus = "active";
          user.plan =
            session.metadata?.plan === "yearly"
              ? "yearly"
              : session.metadata?.plan === "weekly" ||
                  session.metadata?.plan === "monthly"
                ? "weekly"
                : user.plan;
          await saveUser(user);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await findUser({
          userId: sub.metadata?.ohStuffingUserId || null,
          customerId: typeof sub.customer === "string" ? sub.customer : null,
        });
        if (!user) break;
        await applySubscription(user, sub);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
