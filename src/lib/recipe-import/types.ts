export type RecipeImportSource = "schema.org" | "ai" | "paste";

export interface ImportedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  image?: string;
  sourceUrl?: string;
  source: RecipeImportSource;
}

export interface ImportRecipeSuccess {
  recipe: ImportedRecipe;
}

export interface ImportRecipeErrorBody {
  error: {
    type:
      | "invalid_url"
      | "invalid_request"
      | "fetch_blocked"
      | "parse_failed"
      | "configuration_error"
      | "api_error";
    message: string;
    needsPaste?: boolean;
  };
}

export type ImportRecipeResponse = ImportRecipeSuccess | ImportRecipeErrorBody;
