export var RECIPE_VAULT_JSON_SHAPE =
  '{"title":string,"servings":number,"prepTime":string,"cookTime":string,"ingredients":string[],"instructions":string[],"notes":string,"tips":string}';

export var PHOTO_EXTRACT_PROMPT =
  "Extract the recipe title, servings, prep/cook time, exact ingredients, and instructions from this image. Return clean JSON matching our Recipe Vault schema.";

export function photoExtractFullPrompt() {
  return (
    PHOTO_EXTRACT_PROMPT +
    " Reply with ONLY a JSON object shaped like " +
    RECIPE_VAULT_JSON_SHAPE +
    ". Use empty strings when a field is missing. If servings isn't stated, make a reasonable guess."
  );
}

export function askRecipePrompt(request, effort) {
  var effortHint =
    effort === "quick"
      ? "Keep total active time under 20 minutes when possible."
      : effort === "weekend"
        ? "A slightly more involved weekend cook is fine — still practical, not restaurant-kitchen."
        : "Aim for a practical flavor-first weeknight dinner (about 30–45 minutes).";
  return (
    "Generate a practical, flavor-first home cook recipe for: " +
    JSON.stringify(String(request || "").trim()) +
    ". " +
    effortHint +
    " Include full ingredients with quantities, clear numbered steps, and a short tip. " +
    "Reply with ONLY a JSON object shaped like " +
    RECIPE_VAULT_JSON_SHAPE +
    "."
  );
}

export function dietAdaptPrompt(recipeTitle, recipeText, selectedDiets) {
  var diets = (selectedDiets || []).join(", ");
  return (
    "Adapt this recipe for the following dietary restrictions: " +
    diets +
    ". Swap out incompatible ingredients with delicious, accessible 1:1 alternatives " +
    "(e.g., tamari/coconut aminos for soy sauce, almond flour for all-purpose flour, " +
    "oat milk/nutritional yeast for dairy). Update the instruction steps where cooking behavior changes. " +
    "Mark swapped ingredients clearly so the user sees what changed.\n\n" +
    "Original title: " +
    recipeTitle +
    "\n\nOriginal recipe:\n" +
    recipeText +
    "\n\nReply with ONLY a JSON object shaped like " +
    '{"title":string,"servings":number,"text":string,"changes":string[],"swappedIngredients":[{"from":string,"to":string}]}' +
    ". Put the full adapted recipe (ingredients + instructions) in text. " +
    "In text, mark swaps inline like \"oat milk (was whole milk)\" when helpful."
  );
}
