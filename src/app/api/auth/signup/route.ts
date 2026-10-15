import { NextResponse } from "next/server";
import {
  hashPassword,
  setSessionCookie,
  toPublicSession,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { createUser, storeBackend } from "@/lib/store";
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
  const passErr = validatePassword(body.password || "");
  if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });

  try {
    const user = await createUser({
      email: body.email!,
      passwordHash: hashPassword(body.password!),
    });
    await setSessionCookie(user);
    return NextResponse.json({
      ok: true,
      session: toPublicSession(user, {
        mockPayments: !stripeConfigured(),
        storeBackend: storeBackend(),
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
