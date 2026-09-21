import { NextResponse } from "next/server";
import {
  setSessionCookie,
  toPublicSession,
  validateEmail,
  verifyPassword,
} from "@/lib/auth";
import { getUserByEmail, storeBackend } from "@/lib/store";
import { stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const emailErr = validateEmail(body.email || "");
  if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
  if (!body.password) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  const user = await getUserByEmail(body.email!);
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }

  await setSessionCookie(user);
  return NextResponse.json({
    ok: true,
    session: toPublicSession(user, {
      mockPayments: !stripeConfigured(),
      storeBackend: storeBackend(),
    }),
  });
}
