import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getUserStash,
  sanitizeStash,
  saveUserStash,
} from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    const state = await getUserStash(user.id);
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json(
      { error: "Could not load lists saved on this account." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { state?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const state = sanitizeStash(body.state);
  if (!state) {
    return NextResponse.json({ error: "Missing list data." }, { status: 400 });
  }

  try {
    await saveUserStash(user.id, state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save lists.";
    const status = message.includes("too large") ? 413 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
