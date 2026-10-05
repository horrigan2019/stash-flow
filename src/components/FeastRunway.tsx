"use client";

import { useState } from "react";
import { CalendarHeart, Link2, PartyPopper } from "lucide-react";
import { RecipeUrlImportModal } from "@/components/recipe-vault/RecipeUrlImportModal";
import type { ImportedRecipe } from "@/lib/recipe-import/types";

const VAULT_KEY = "ostuffing.v1";

function persistImportedRecipe(recipe: ImportedRecipe, vaultText: string) {
  try {
    const raw = window.localStorage.getItem(VAULT_KEY);
    const state = raw ? JSON.parse(raw) : {};
    if (!Array.isArray(state.recipes)) state.recipes = [];
    state.recipes.push({
      id: "r" + Date.now().toString(36) + Math.random().toString(16).slice(2),
      title: recipe.title,
      servings: recipe.servings || 4,
      text: vaultText,
      sourceUrl: recipe.sourceUrl || "",
      image: recipe.image || "",
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime || "",
      cookTime: recipe.cookTime || "",
    });
    window.localStorage.setItem(VAULT_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function queueIngredientsForList(ingredients: string[], title: string) {
  try {
    window.localStorage.setItem(
      "ostuffing.pendingRecipeIngredients",
      JSON.stringify({
        title,
        ingredients,
        at: Date.now(),
      }),
    );
    // Live Oh Stuffing shell is public/index.html at /
    window.location.href = "/?addRecipeIngredients=1";
    return true;
  } catch {
    return false;
  }
}

export function FeastRunway() {
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState("");

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <header className="mb-6">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-amber-950">
          Feast Runway
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Line up holiday menus and guest counts before the store rush.
        </p>
      </header>

      <button
        type="button"
        onClick={() => {
          setStatus("");
          setImportOpen(true);
        }}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#3F6B4A]/30 bg-white px-4 py-3.5 text-left text-base font-semibold text-[#3F6B4A] shadow-sm"
      >
        <Link2 className="h-5 w-5 shrink-0" aria-hidden />
        Import Recipe from Link / Social Media
      </button>
      {status ? (
        <p className="mb-4 text-sm text-neutral-600" role="status">
          {status}
        </p>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-amber-300/80 bg-white/50 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <PartyPopper className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-neutral-900">Events landing soon</h2>
          <p className="mt-1 max-w-xs text-sm text-neutral-600">
            Thanksgiving, Friendsgiving, and potluck budgets will stage here with
            per-dish shopping lists.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-900">
          <CalendarHeart className="h-3.5 w-3.5" aria-hidden />
          Prototype placeholder
        </div>
      </div>

      <RecipeUrlImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSave={(recipe, vaultText) => {
          const ok = persistImportedRecipe(recipe, vaultText);
          setStatus(
            ok
              ? `Saved “${recipe.title}” to your Recipe Vault.`
              : "Could not save that recipe on this device.",
          );
        }}
        onAddIngredients={(ingredients, title) => {
          queueIngredientsForList(ingredients, title);
          setStatus(`Sending ${ingredients.length} ingredients to your list…`);
        }}
      />
    </div>
  );
}
