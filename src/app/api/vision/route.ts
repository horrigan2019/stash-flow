import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnthropicErrorBody = {
  error?: { message?: string; type?: string };
};

/**
 * CORS-safe proxy to Anthropic Messages API.
 * Product path (like Fiona): set ANTHROPIC_API_KEY as a Vercel env var.
 * Optional: send x-api-key for local/dev when the server env is not set.
 * End users never need (or see) an API key.
 */
export async function POST(request: Request) {
  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const headerKey = (request.headers.get("x-api-key") || "").trim();
  // Prefer server env; header is a local/dev fallback only when env is unset.
  const apiKey = envKey || headerKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          type: "configuration_error",
          message:
            "AI isn't configured yet. Set ANTHROPIC_API_KEY in Vercel Environment Variables and redeploy.",
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
