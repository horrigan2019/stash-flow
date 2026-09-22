import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isSubscribed } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnthropicErrorBody = {
  error?: { message?: string; type?: string };
};

/**
 * CORS-safe proxy to Anthropic Messages API.
 * Paid feature: requires an authenticated, subscribed user.
 * Product path (like Fiona): set ANTHROPIC_API_KEY as a Vercel env var.
 * Optional: send x-api-key for local/dev when the server env is not set.
 * End users never need (or see) an API key.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          type: "auth_required",
          message: "Sign in to use Photo & AI features.",
        },
      },
      { status: 401 }
    );
  }
  if (!isSubscribed(user)) {
    return NextResponse.json(
      {
        error: {
          type: "subscription_required",
          message:
            "Photo pantry scans and AI recommendations need an Oh Stuffing subscription ($7.99/mo or $49/yr).",
        },
      },
      { status: 402 }
    );
  }

  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const headerKey = (request.headers.get("x-api-key") || "").trim();
  // Prefer server env; header is a local/dev fallback only when env is unset.
  const apiKey = envKey || headerKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          type: "configuration_error",
          message: "AI isn't configured on the server yet. Try again later.",
        },
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { type: "invalid_request_error", message: "Request body must be JSON." } },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { type: "invalid_request_error", message: "Request body must be an object." } },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { error: { type: "api_error", message } },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      error: {
        type: "api_error",
        message: text || `Bad response from Anthropic (${upstream.status})`,
      },
    } satisfies AnthropicErrorBody;
  }

  // Never pass Anthropic auth failures through as HTTP 401 — the client used to map
  // any 401 to "Sign in", which falsely told logged-in / subscribed users to sign in.
  if (upstream.status === 401 || upstream.status === 403) {
    return NextResponse.json(
      {
        error: {
          type: "configuration_error",
          message: "Photo AI is temporarily unavailable — try again later.",
        },
      },
      { status: 503 }
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-api-key",
    },
  });
}
