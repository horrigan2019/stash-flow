import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie, toPublicSession } from "@/lib/auth";
import { storeBackend } from "@/lib/store";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  // Refresh signed cookie claims when we have a real store record so /api/vision
  // (separate serverless isolate) can auth without shared memory/Upstash.
  if (user && user.passwordHash) {
    await setSessionCookie(user);
  }
  return NextResponse.json(
    toPublicSession(user, {
      mockPayments: !stripeConfigured(),
      storeBackend: storeBackend(),
    })
  );
}
