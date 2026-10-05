import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROMPT_TEMPLATE =
  "You are a helpful weeknight culinary assistant. Given the meal name '{meal}', provide a practical, flavor-first grocery list of 7 to 11 essential ingredients needed to make a delicious version. Include core proteins/produce, foundational aromatics (garlic, onion, celery/peppers where appropriate), essential spices/sauces, and bases. Return strictly a comma-separated list of ingredient names. No introductory text, no numbering, no explanations.";

function parseIngredientList(text: string): string[] {
  let t = String(text || "").trim();
  const fenced = t.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (fenced) t = fenced[1].trim();
  // Prefer comma-separated; fall back to newlines / bullets
  const parts = t.includes(",")
    ? t.split(",")
    : t.split(/\n+/);
  return parts
    .map((p) =>
      p
        .replace(/^[\s•\-\d.)]+/, "")
        .replace(/[.]+$/, "")
        .trim(),
    )
    .filter((p) => p.length > 0 && p.length < 80)
    .slice(0, 14);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { type: "invalid_request", message: "Request body must be JSON." } },
      { status: 400 },
    );
  }

  const meal =
    body && typeof body === "object" && typeof (body as { meal?: unknown }).meal === "string"
      ? String((body as { meal: string }).meal).replace(/\s+/g, " ").trim()
      : "";

  if (!meal || meal.length < 2) {
    return NextResponse.json(
      {
        error: {
          type: "invalid_request",
          message: "Type a meal name first.",
        },
      },
      { status: 400 },
    );
  }

  if (meal.length > 80) {
    return NextResponse.json(
      {
        error: {
          type: "invalid_request",
          message: "Meal name is too long.",
        },
      },
      { status: 400 },
    );
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          type: "configuration_error",
          message:
            "Meal suggestions aren't set up on the server yet (missing ANTHROPIC_API_KEY).",
        },
      },
      { status: 503 },
    );
  }

  const prompt = PROMPT_TEMPLATE.replace("{meal}", meal);

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { error: { type: "api_error", message } },
      { status: 502 },
    );
  }

  const raw = await upstream.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json(
        {
          error: {
            type: "configuration_error",
            message:
              "Meal suggestions could not authenticate with the AI provider. Check ANTHROPIC_API_KEY in Vercel.",
          },
        },
        { status: 503 },
      );
    }
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "message" in data.error
        ? String((data.error as { message?: unknown }).message || "")
        : `AI error ${upstream.status}`;
    return NextResponse.json(
      { error: { type: "api_error", message: message || "AI suggestion failed" } },
      { status: 502 },
    );
  }

  const content =
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray((data as { content: unknown }).content)
      ? (data as { content: Array<{ type?: string; text?: string }> }).content
      : [];
  let text = "";
  for (const block of content) {
    if (block.type === "text" && block.text) text += block.text;
  }

  const ingredients = parseIngredientList(text);
  if (ingredients.length < 3) {
    return NextResponse.json(
      {
        error: {
          type: "parse_failed",
          message: "Couldn't build a grocery list for that meal. Try another name.",
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    meal,
    ingredients,
    source: "ai",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
