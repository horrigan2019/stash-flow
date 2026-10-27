import { NextResponse } from "next/server";
import { askClaude, parseJsonObject, requireAiAccess, serverApiKey } from "@/lib/ai-access";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MEAL = 120;

function errorJson(status: number, type: string, message: string) {
  return NextResponse.json({ error: { type, message } }, { status });
}

/** Grocery list for a meal name (Meal Planning auto-fill). Pro feature. */
export async function POST(request: Request) {
  let body: { meal?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorJson(400, "invalid_request_error", "Request body must be JSON.");
  }
  const meal = typeof body.meal === "string" ? body.meal.trim().slice(0, MAX_MEAL) : "";
  if (meal.length < 2) {
    return errorJson(400, "invalid_request_error", "Type a meal name first.");
  }

  const access = await requireAiAccess();
  if ("error" in access) {
    const { status, type } = access.error;
    // The hint sits under the ingredients box, so keep it short and friendly.
    const message =
      type === "auth_required" || type === "subscription_required"
        ? "Type the ingredients below — AI suggestions come with Oh Stuffing Pro."
        : access.error.message;
    return errorJson(status, type, message);
  }

  const apiKey = serverApiKey(request);
  if (!apiKey) {
    return errorJson(503, "configuration_error", "Ingredient suggestions aren't set up yet — type them in below.");
  }

  const prompt =
    "List the grocery ingredients a home cook would buy to make this meal: " +
    JSON.stringify(meal) +
    ". Use plain shopping names (e.g. \"ground beef\", \"yellow onion\"), 5–15 items, no quantities, no pantry basics like salt, pepper or water.\n" +
    'Respond with ONLY JSON like {"ingredients":["..."]}.';

  let text: string;
  try {
    text = await askClaude({ apiKey, prompt, maxTokens: 400 });
  } catch (err) {
    const type = (err as { type?: string }).type || "api_error";
    return errorJson(type === "configuration_error" ? 503 : 502, type, "Couldn't suggest ingredients right now.");
  }

  const parsed = parseJsonObject(text);
  const ingredients = Array.isArray(parsed?.ingredients)
    ? parsed.ingredients
        .map((item) => String(item ?? "").trim())
        .filter((item) => item && item.length <= 60)
        .slice(0, 20)
    : [];
  if (ingredients.length < 3) {
    return errorJson(502, "api_error", "Couldn't suggest ingredients right now.");
  }
  return NextResponse.json({ ingredients });
}
