import { NextResponse } from "next/server";
import { getSessionUser, toPublicSession } from "@/lib/auth";
import { storeBackend } from "@/lib/store";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    toPublicSession(user, {
      mockPayments: !stripeConfigured(),
      storeBackend: storeBackend(),
    })
  );
}
