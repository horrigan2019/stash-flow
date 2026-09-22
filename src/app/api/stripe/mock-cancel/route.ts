import { NextResponse } from "next/server";
import { getSessionUser, toPublicSession } from "@/lib/auth";
import { saveUser, storeBackend } from "@/lib/store";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Dev-only: clear mock subscription when Stripe keys are not configured. */
export async function POST() {
  if (stripeConfigured()) {
    return NextResponse.json(
      { error: "Use Stripe Customer Portal to manage a live subscription." },
      { status: 400 }
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Couldn't verify your account. Try again, or log out and sign back in." },
      { status: 401 }
    );
  }

  user.subscriptionStatus = "none";
  user.plan = null;
  user.stripeSubscriptionId = undefined;
  await saveUser(user);

  return NextResponse.json({
    ok: true,
    session: toPublicSession(user, {
      mockPayments: true,
      storeBackend: storeBackend(),
    }),
  });
}
