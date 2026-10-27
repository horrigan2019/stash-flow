import { NextResponse } from "next/server";
import {
  ALLOWED_MODELS,
  MAX_OUTPUT_TOKENS,
  requireAiAccess,
  serverApiKey,
} from "@/lib/ai-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 8;
const MAX_BODY_BYTES = 12_000_000;

type AnthropicErrorBody = {
  error?: { message?: string; type?: string };
};

function errorJson(status: number, type: string, message: string) {
  return NextResponse.json({ error: { type, message } }, { status });
}

/**
 * Keep only what the app sends (model, max_tokens, messages) so a subscriber
 * can't use the server key for arbitrary models, huge outputs or system prompts.
 */
function sanitizeBody(raw: string): { body: Record<string, unknown> } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Request body must be JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Request body must be an object." };
  }
  const input = parsed as Record<string, unknown>;
  const model = String(input.model || "");
  if (!(ALLOWED_MODELS as readonly string[]).includes(model)) {
    return { error: "That AI model isn't available." };
  }
  if (!Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 4) {
    return { error: "Request needs 1–4 messages." };
  }
  let images = 0;
  for (const message of input.messages) {
    const content = (message as { content?: unknown })?.content;
    if (Array.isArray(content)) {
      images += content.filter((block) => (block as { type?: unknown })?.type === "image").length;
    }
  }
  if (images > MAX_IMAGES) {
    return { error: `Send at most ${MAX_IMAGES} photos at a time.` };
  }
  const maxTokens = Math.min(Math.max(Number(input.max_tokens) || 1024, 1), MAX_OUTPUT_TOKENS);
  return { body: { model, max_tokens: maxTokens, messages: input.messages } };
}

/**
 * CORS-safe proxy to Anthropic Messages API.
 * Paid feature: requires an authenticated, subscribed user under today's limit.
 * Product path (like Fiona): set ANTHROPIC_API_KEY as a Vercel env var.
 * End users never need (or see) an API key.
 */
export async function POST(request: Request) {
  const access = await requireAiAccess();
  if ("error" in access) {
    return errorJson(access.error.status, access.error.type, access.error.message);
  }

  const apiKey = serverApiKey(request);
  if (!apiKey) {
    // Actionable for the site owner; never ask shoppers for a key.
    return errorJson(
      503,
      "configuration_error",
      "Photo AI isn't set up on the server yet (missing ANTHROPIC_API_KEY). Add it in Vercel → Settings → Environment Variables for Production, then Redeploy."
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return errorJson(413, "invalid_request_error", "Those photos are too large. Try fewer or smaller photos.");
  }
  const clean = sanitizeBody(raw);
  if ("error" in clean) {
    return errorJson(400, "invalid_request_error", clean.error);
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
      body: JSON.stringify(clean.body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return errorJson(502, "api_error", message);
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
  // Remap to configuration_error with an owner-actionable message (no secret leakage).
  if (upstream.status === 401 || upstream.status === 403) {
    const upstreamType =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "type" in data.error
        ? String((data.error as { type?: unknown }).type || "")
        : "";
    console.error("[vision] Anthropic rejected API key", {
      status: upstream.status,
      upstreamType: upstreamType || null,
    });
    return errorJson(
      503,
      "configuration_error",
      "Photo AI could not authenticate with the AI provider. The site owner should check ANTHROPIC_API_KEY in Vercel (Production) — valid key from console.anthropic.com, then Redeploy."
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
