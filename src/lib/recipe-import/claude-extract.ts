import type { ImportedRecipe, RecipeImportSource } from "./types";
import {
  asStringArray,
  formatDuration,
  pickServings,
} from "./normalize";

export { formatRecipeVaultText } from "./format";

function parseJsonLoose(text: string): unknown {
  let t = String(text || "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  return JSON.parse(t);
}

function coerceRecipe(
  data: unknown,
  source: RecipeImportSource,
  sourceUrl?: string,
  fallbackImage?: string,
): ImportedRecipe | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const title = String(obj.title || obj.name || "").trim();
  const ingredients = asStringArray(
    obj.ingredients ?? obj.recipeIngredient ?? obj.ingredientList,
  );
  const instructions = asStringArray(
    obj.instructions ??
      obj.steps ??
      obj.recipeInstructions ??
      obj.directions,
  );
  if (!title || (!ingredients.length && !instructions.length)) return null;

  return {
    title,
    ingredients,
    instructions,
    servings: pickServings(obj.servings ?? obj.recipeYield ?? obj.yield),
    prepTime: formatDuration(obj.prepTime),
    cookTime: formatDuration(obj.cookTime ?? obj.totalTime),
    image:
      (typeof obj.image === "string" && obj.image.trim()) ||
      fallbackImage ||
      undefined,
    sourceUrl,
    source,
  };
}

const EXTRACT_PROMPT = `Extract the recipe title, ingredient list, and step-by-step instructions from this text. If it is a short-form video or social post, infer the missing basic steps logically. Return clean JSON matching this shape only:
{
  "title": string,
  "ingredients": string[],
  "instructions": string[],
  "servings": number | null,
  "prepTime": string | null,
  "cookTime": string | null
}
Use short shopping-list style ingredient lines (include quantities when present). Instructions should be ordered steps as plain strings. If something is unknown, use null or [].`;

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error(
      "Recipe AI isn't set up on the server yet (missing ANTHROPIC_API_KEY).",
    );
    (err as Error & { code?: string }).code = "configuration_error";
    throw err;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
  });

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "message" in data.error
        ? String((data.error as { message?: unknown }).message || "")
        : `AI error ${res.status}`;
    const err = new Error(message || "AI extraction failed");
    (err as Error & { code?: string }).code =
      res.status === 401 || res.status === 403
        ? "configuration_error"
        : "api_error";
    throw err;
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
  return text;
}

export async function extractRecipeWithClaude(
  snippet: string,
  opts?: { sourceUrl?: string; image?: string; source?: RecipeImportSource },
): Promise<ImportedRecipe> {
  const prompt = `${EXTRACT_PROMPT}\n\n---\n${snippet}\n---\nRespond with ONLY valid JSON. No markdown fences, no commentary.`;
  const text = await callAnthropic(prompt);
  let parsed: unknown;
  try {
    parsed = parseJsonLoose(text);
  } catch {
    const err = new Error("Could not parse recipe from AI response");
    (err as Error & { code?: string }).code = "parse_failed";
    throw err;
  }
  const recipe = coerceRecipe(
    parsed,
    opts?.source || "ai",
    opts?.sourceUrl,
    opts?.image,
  );
  if (!recipe) {
    const err = new Error("AI could not find a clear recipe in that content");
    (err as Error & { code?: string }).code = "parse_failed";
    throw err;
  }
  return recipe;
}
