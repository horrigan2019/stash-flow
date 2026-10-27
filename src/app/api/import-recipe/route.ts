import { NextResponse } from "next/server";
import { askClaude, parseJsonObject, requireAiAccess, serverApiKey } from "@/lib/ai-access";
import {
  fetchPublicPage,
  htmlToText,
  publicHttpUrl,
} from "@/lib/public-fetch";

export const runtime = "nodejs";
export const maxDuration = 30;

const FETCH_TIMEOUT_MS = 12_000;
const MAX_PASTE = 15_000;
const MAX_ITEMS = 60;

type ImportedRecipe = {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  image?: string;
};

const PASTE_MESSAGE =
  "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.";

function needsPaste(message = PASTE_MESSAGE, status = 422) {
  return NextResponse.json({ error: { message, needsPaste: true } }, { status });
}

function cleanText(value: unknown, max = 300): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return htmlToText(String(value)).slice(0, max);
}

function cleanList(values: unknown): string[] {
  return (Array.isArray(values) ? values : [])
    .map((value) => cleanText(value))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

/** "PT1H30M" → "1 hr 30 min". */
function formatDuration(value: unknown): string | undefined {
  const match = typeof value === "string" ? value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i) : null;
  if (!match || (!match[1] && !match[2])) return undefined;
  const parts = [];
  if (match[1]) parts.push(`${Number(match[1])} hr`);
  if (match[2]) parts.push(`${Number(match[2])} min`);
  return parts.join(" ");
}

function flattenInstructions(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map((step) => cleanText(step)).filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  const steps: string[] = [];
  for (const item of value) {
    if (typeof item === "string") steps.push(cleanText(item));
    else if (item && typeof item === "object") {
      const node = item as Record<string, unknown>;
      // HowToSection holds its own list of HowToSteps.
      if (Array.isArray(node.itemListElement)) steps.push(...flattenInstructions(node.itemListElement));
      else steps.push(cleanText(node.text ?? node.name));
    }
  }
  return steps.filter(Boolean).slice(0, MAX_ITEMS);
}

function firstImage(value: unknown): string | undefined {
  const pick = Array.isArray(value) ? value[0] : value;
  const url = typeof pick === "string" ? pick : (pick as { url?: unknown } | null)?.url;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : undefined;
}

function isRecipeNode(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

function findRecipeNode(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const node = value as Record<string, unknown>;
  if (isRecipeNode(node)) return node;
  return node["@graph"] ? findRecipeNode(node["@graph"]) : null;
}

/** Most recipe sites publish schema.org Recipe JSON-LD — no AI needed. */
function recipeFromJsonLd(html: string): ImportedRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script[1].trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(parsed);
    if (!node) continue;
    const ingredients = cleanList(node.recipeIngredient ?? node.ingredients);
    if (!ingredients.length) continue;
    const servings = Array.isArray(node.recipeYield) ? node.recipeYield[0] : node.recipeYield;
    return {
      title: cleanText(node.name, 160) || "Imported recipe",
      ingredients,
      instructions: flattenInstructions(node.recipeInstructions),
      servings: cleanText(servings, 40) || undefined,
      prepTime: formatDuration(node.prepTime),
      cookTime: formatDuration(node.cookTime),
      image: firstImage(node.image),
    };
  }
  return null;
}

const SECTION_INGREDIENTS = /^\s*(ingredients?|you(?:'|’)ll need|what you need)\s*:?\s*$/i;
const SECTION_STEPS = /^\s*(instructions?|directions?|method|steps|how to make it)\s*:?\s*$/i;

/** Free fallback for pasted text with "Ingredients" / "Instructions" headings. */
function recipeFromHeadings(text: string): ImportedRecipe | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let section: "none" | "ingredients" | "steps" = "none";
  let title = "";
  const ingredients: string[] = [];
  const instructions: string[] = [];
  for (const line of lines) {
    if (SECTION_INGREDIENTS.test(line)) section = "ingredients";
    else if (SECTION_STEPS.test(line)) section = "steps";
    else {
      const item = line.replace(/^(?:[-*•▢☐]|\d+[.)])\s*/, "").trim();
      if (section === "ingredients") ingredients.push(item);
      else if (section === "steps") instructions.push(item);
      else if (!title) title = line;
    }
  }
  if (!ingredients.length) return null;
  return {
    title: title.slice(0, 160) || "Imported recipe",
    ingredients: ingredients.slice(0, MAX_ITEMS),
    instructions: instructions.slice(0, MAX_ITEMS),
  };
}

/** Pro users: let Claude read a caption or page with no structured data. */
async function recipeFromAi(request: Request, text: string): Promise<ImportedRecipe | null> {
  const access = await requireAiAccess();
  if ("error" in access) return null;
  const apiKey = serverApiKey(request);
  if (!apiKey) return null;
  const prompt =
    "Extract the recipe from this text. Respond with ONLY JSON like " +
    '{"title":"...","servings":"4","ingredients":["2 cups flour"],"instructions":["Preheat oven..."]}. ' +
    'If there is no recipe, respond {"ingredients":[]}.\n\nText:\n' +
    text.slice(0, MAX_PASTE);
  try {
    const parsed = parseJsonObject(await askClaude({ apiKey, prompt, maxTokens: 2000 }));
    const ingredients = cleanList(parsed?.ingredients);
    if (!parsed || !ingredients.length) return null;
    return {
      title: cleanText(parsed.title, 160) || "Imported recipe",
      ingredients,
      instructions: cleanList(parsed.instructions),
      servings: cleanText(parsed.servings, 40) || undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { url?: unknown; pasteText?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Request body must be JSON." } }, { status: 400 });
  }

  const pasteText = typeof body.pasteText === "string" ? body.pasteText.trim().slice(0, MAX_PASTE) : "";
  if (pasteText) {
    const recipe = recipeFromHeadings(pasteText) || (await recipeFromAi(request, pasteText));
    if (recipe) return NextResponse.json({ recipe });
    return needsPaste(
      "Couldn't find the ingredients. Add a line that says \"Ingredients\" above them (and \"Instructions\" above the steps), then try again."
    );
  }

  const rawUrl = typeof body.url === "string" ? body.url : "";
  const url = publicHttpUrl(rawUrl);
  if (!url) return needsPaste("That link doesn't look usable. Paste the recipe text instead.", 400);

  let html = "";
  try {
    const res = await fetchPublicPage(url, {
      timeoutMs: FETCH_TIMEOUT_MS,
      userAgent: "Mozilla/5.0 (compatible; OhStuffingRecipeImport/1.0)",
    });
    if (!res.ok) return needsPaste();
    html = await res.text();
  } catch {
    return needsPaste();
  }

  const recipe =
    recipeFromJsonLd(html) || (await recipeFromAi(request, htmlToText(html)));
  if (recipe) return NextResponse.json({ recipe });
  return needsPaste();
}
