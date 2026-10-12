/** Recipe Vault schema — compatible with legacy `{ id, title, servings, text }` rows. */

export type DietId =
  | "gluten-free"
  | "dairy-free"
  | "low-carb"
  | "diabetic"
  | "vegetarian-vegan"
  | "nut-free"
  | "custom";

export interface DietOption {
  id: DietId;
  label: string;
  emoji: string;
  promptLabel: string;
}

export interface RecipeDraft {
  title: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredientsText: string;
  instructionsText: string;
  notes: string;
  source: string;
}

export interface VaultRecipe {
  id: string;
  title: string;
  servings: number;
  text: string;
  prepTime?: string;
  cookTime?: string;
  notes?: string;
  source?: string;
  diets?: string[];
  parentId?: string;
}

/** Structured payload returned by photo OCR / AI generation. */
export interface ParsedRecipeJson {
  title?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients?: string[] | string;
  instructions?: string[] | string;
  notes?: string;
  source?: string;
  text?: string;
  tips?: string;
}

export type CreateRecipeTab = "type" | "photo" | "ask";

export type EffortLevel = "quick" | "weeknight" | "weekend";

export function emptyDraft(): RecipeDraft {
  return {
    title: "",
    servings: 4,
    prepTime: "",
    cookTime: "",
    ingredientsText: "",
    instructionsText: "",
    notes: "",
    source: "",
  };
}

export function draftToRecipeText(draft: RecipeDraft): string {
  const parts: string[] = [];
  const meta: string[] = [];
  if (draft.prepTime.trim()) meta.push(`Prep: ${draft.prepTime.trim()}`);
  if (draft.cookTime.trim()) meta.push(`Cook: ${draft.cookTime.trim()}`);
  if (meta.length) parts.push(meta.join(" · "));

  const ingredients = draft.ingredientsText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (ingredients.length) {
    parts.push("Ingredients:");
    ingredients.forEach((line) => {
      parts.push(line.startsWith("-") || line.startsWith("•") ? line : `- ${line}`);
    });
  }

  const steps = draft.instructionsText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (steps.length) {
    parts.push("");
    parts.push("Instructions:");
    steps.forEach((line, i) => {
      const numbered = /^\d+[\).\]]\s*/.test(line);
      parts.push(numbered ? line : `${i + 1}. ${line}`);
    });
  }

  if (draft.notes.trim()) {
    parts.push("");
    parts.push(`Notes: ${draft.notes.trim()}`);
  }
  if (draft.source.trim()) {
    parts.push(`Source: ${draft.source.trim()}`);
  }

  return parts.join("\n").trim();
}

export function parsedJsonToDraft(data: ParsedRecipeJson | null | undefined): RecipeDraft {
  const draft = emptyDraft();
  if (!data || typeof data !== "object") return draft;

  if (typeof data.title === "string") draft.title = data.title.trim();
  if (typeof data.servings === "number" && data.servings > 0) {
    draft.servings = Math.round(data.servings);
  }
  if (typeof data.prepTime === "string") draft.prepTime = data.prepTime.trim();
  if (typeof data.cookTime === "string") draft.cookTime = data.cookTime.trim();
  if (typeof data.notes === "string") draft.notes = data.notes.trim();
  if (typeof data.source === "string") draft.source = data.source.trim();
  if (typeof data.tips === "string" && data.tips.trim()) {
    draft.notes = [draft.notes, data.tips.trim()].filter(Boolean).join("\n");
  }

  if (Array.isArray(data.ingredients)) {
    draft.ingredientsText = data.ingredients.map((x) => String(x || "").trim()).filter(Boolean).join("\n");
  } else if (typeof data.ingredients === "string") {
    draft.ingredientsText = data.ingredients.trim();
  }

  if (Array.isArray(data.instructions)) {
    draft.instructionsText = data.instructions.map((x) => String(x || "").trim()).filter(Boolean).join("\n");
  } else if (typeof data.instructions === "string") {
    draft.instructionsText = data.instructions.trim();
  }

  // Legacy single-blob field: split into ingredients / instructions when possible
  if ((!draft.ingredientsText || !draft.instructionsText) && typeof data.text === "string" && data.text.trim()) {
    const split = splitLegacyRecipeText(data.text);
    if (!draft.ingredientsText) draft.ingredientsText = split.ingredientsText;
    if (!draft.instructionsText) draft.instructionsText = split.instructionsText;
    if (!draft.notes && split.notes) draft.notes = split.notes;
  }

  return draft;
}

export function splitLegacyRecipeText(text: string): {
  ingredientsText: string;
  instructionsText: string;
  notes: string;
} {
  const raw = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { ingredientsText: "", instructionsText: "", notes: "" };

  const instrMatch = raw.match(/\n\s*(instructions?|directions?|method|steps?)\s*:?\s*\n/i);
  const notesMatch = raw.match(/\n\s*(notes?|tips?|source)\s*:?\s*/i);

  let body = raw;
  let notes = "";
  if (notesMatch && notesMatch.index != null) {
    notes = raw.slice(notesMatch.index + notesMatch[0].length).trim();
    body = raw.slice(0, notesMatch.index).trim();
  }

  if (instrMatch && instrMatch.index != null) {
    let ingredientsBlock = body.slice(0, instrMatch.index).trim();
    const instructionsBlock = body.slice(instrMatch.index + instrMatch[0].length).trim();
    ingredientsBlock = ingredientsBlock.replace(/^\s*ingredients?\s*:?\s*/i, "").trim();
    return {
      ingredientsText: ingredientsBlock,
      instructionsText: instructionsBlock,
      notes,
    };
  }

  const lines = body.split("\n");
  const ingredientish = lines.filter((l) => looksLikeIngredient(l));
  if (ingredientish.length >= 2 && ingredientish.length < lines.length) {
    const ingredientsText = ingredientish.join("\n");
    const instructionsText = lines.filter((l) => !looksLikeIngredient(l) && l.trim()).join("\n");
    return { ingredientsText, instructionsText, notes };
  }

  return { ingredientsText: body, instructionsText: "", notes };
}

function looksLikeIngredient(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^[-•*]\s+/.test(t)) return true;
  if (/^\d+(\s*\/\s*\d+)?(\s+\d+\/\d+)?(\s*(cup|cups|tsp|tbsp|teaspoon|tablespoon|oz|ounce|lb|pound|g|kg|ml|l|clove|cloves|can|cans|pkg|package)s?\b)/i.test(t)) {
    return true;
  }
  if (/^\d+[\s.]/.test(t) && t.length < 80) return true;
  return false;
}

export function variationTitle(baseTitle: string, dietLabels: string[]): string {
  const base = baseTitle.replace(/\s*\([^)]*\)\s*$/, "").trim() || "Recipe";
  if (!dietLabels.length) return `${base} (Diet Variation)`;
  return `${base} (${dietLabels.join(" & ")})`;
}
