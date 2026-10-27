import { getSessionUser, readSessionToken } from "@/lib/auth";
import { bumpDailyUsage, isSubscribed, storeBackend, type UserRecord } from "@/lib/store";

/** Models the app actually uses — anything else is refused. */
export const ALLOWED_MODELS = ["claude-haiku-4-5", "claude-sonnet-4-5"] as const;
export const QUICK_MODEL = "claude-haiku-4-5";
export const MAX_OUTPUT_TOKENS = 4096;

/** Per-user AI calls per day (UTC). Override with VISION_DAILY_LIMIT. */
export function dailyLimit(): number {
  const n = Number(process.env.VISION_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 150;
}

export type AiError = { status: number; type: string; message: string };

export function serverApiKey(request: Request): string {
  const envKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (envKey) return envKey;
  // Header key is a local/dev convenience only.
  if (process.env.NODE_ENV === "production") return "";
  return (request.headers.get("x-api-key") || "").trim();
}

/**
 * Signed in + subscribed + under today's limit. Counts the call on success.
 * Returns the user, or the error to send back.
 */
export async function requireAiAccess(): Promise<{ user: UserRecord } | { error: AiError }> {
  const user = await getSessionUser();
  if (!user) {
    const hasCookie = Boolean(await readSessionToken());
    // Cookie-present failures: avoid "Sign in" for a logged-in UI.
    // When Upstash is missing, say so — that is the usual production cause.
    if (hasCookie && storeBackend() === "memory") {
      return {
        error: {
          status: 503,
          type: "configuration_error",
          message:
            "Photo AI can't load accounts on this server (no Upstash Redis). Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel → Production, then Redeploy. Or log out, sign back in, and Upgrade again so your session cookie carries the unlock.",
        },
      };
    }
    return {
      error: {
        status: 401,
        type: hasCookie ? "unavailable" : "auth_required",
        message: hasCookie
          ? "Your account session could not be loaded. Try again, or log out and sign back in."
          : "Sign in to use Photo & AI features.",
      },
    };
  }
  if (!isSubscribed(user)) {
    return {
      error: {
        status: 402,
        type: "subscription_required",
        message:
          "Photo pantry scans and AI recommendations need an Oh Stuffing Pro trial or subscription ($1.99/wk or $39.99/yr).",
      },
    };
  }
  const used = await bumpDailyUsage(user.id);
  if (used > dailyLimit()) {
    return {
      error: {
        status: 429,
        type: "rate_limit_error",
        message: "You've used today's Photo & AI allowance. It resets tomorrow.",
      },
    };
  }
  return { user };
}

/** One text-only Claude call; returns the reply text or throws an AiError-shaped error. */
export async function askClaude(input: {
  apiKey: string;
  prompt: string;
  maxTokens: number;
  model?: string;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model || QUICK_MODEL,
      max_tokens: input.maxTokens,
      messages: [{ role: "user", content: [{ type: "text", text: input.prompt }] }],
    }),
  });
  if (res.status === 401 || res.status === 403) {
    console.error("[ai] Anthropic rejected API key", { status: res.status });
    throw Object.assign(new Error("Photo AI could not authenticate with the AI provider."), {
      type: "configuration_error",
    });
  }
  const data = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
  } | null;
  if (!res.ok || !data) {
    throw Object.assign(new Error("The AI helper is busy right now. Please try again."), {
      type: "api_error",
    });
  }
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text || "")
    .join("");
}

/** Pull the first JSON object out of a model reply. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
