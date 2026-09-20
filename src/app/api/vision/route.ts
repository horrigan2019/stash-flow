import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnthropicErrorBody = {
  error?: { message?: string; type?: string };
};

/**
 * CORS-safe proxy to Anthropic Messages API.
 * Client sends the user's Settings API key in `x-api-key` (personal/demo UX).
 * Optional fallback: server env ANTHROPIC_API_KEY when no header is provided.
 */
export async function POST(request: Request) {
  const headerKey = (request.headers.get("x-api-key") || "").trim();
  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  const apiKey = headerKey || envKey;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          type: "authentication_error",
          message:
            "Missing API key. Paste one in Settings, or set ANTHROPIC_API_KEY on the server.",
        },
      },
      { status: 401 }
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
