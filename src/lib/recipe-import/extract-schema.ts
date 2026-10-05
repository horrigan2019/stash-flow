import type { ImportedRecipe } from "./types";
import {
  asStringArray,
  findRecipeNode,
  formatDuration,
  pickImage,
  pickServings,
} from "./normalize";

function parseJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = match[1]
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Some sites ship trailing commas — try a light cleanup
      try {
        const cleaned = raw.replace(/,\s*([}\]])/g, "$1");
        blocks.push(JSON.parse(cleaned));
      } catch {
        // ignore bad blocks
      }
    }
  }
  return blocks;
}

export function extractSchemaOrgRecipe(
  html: string,
  sourceUrl?: string,
): ImportedRecipe | null {
  const blocks = parseJsonLdBlocks(html);
  for (const block of blocks) {
    const node = findRecipeNode(block);
    if (!node) continue;

    const title = String(node.name || node.headline || "").trim();
    const ingredients = asStringArray(node.recipeIngredient);
    let instructions = asStringArray(node.recipeInstructions);
    if (!instructions.length && typeof node.recipeInstructions === "string") {
      instructions = asStringArray(node.recipeInstructions);
    }

    if (!title || (!ingredients.length && !instructions.length)) continue;

    return {
      title,
      ingredients,
      instructions,
      servings: pickServings(node.recipeYield ?? node.yield),
      prepTime: formatDuration(node.prepTime),
      cookTime: formatDuration(node.cookTime ?? node.totalTime),
      image: pickImage(node.image ?? node.thumbnailUrl),
      sourceUrl,
      source: "schema.org",
    };
  }
  return null;
}
