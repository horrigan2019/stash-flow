import type { ImportedRecipe } from "./types";

/** Format structured recipe into vault plain-text storage. */
export function formatRecipeVaultText(recipe: ImportedRecipe): string {
  const lines: string[] = [];
  if (recipe.ingredients.length) {
    lines.push("Ingredients:");
    for (const ing of recipe.ingredients) lines.push(`- ${ing}`);
    lines.push("");
  }
  if (recipe.instructions.length) {
    lines.push("Instructions:");
    recipe.instructions.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }
  return lines.join("\n").trim();
}
