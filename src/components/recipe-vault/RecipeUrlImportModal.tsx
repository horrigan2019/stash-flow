"use client";

import { useEffect, useState, useTransition } from "react";
import type { ImportedRecipe } from "@/lib/recipe-import/types";
import { formatRecipeVaultText } from "@/lib/recipe-import/format";

export interface RecipeUrlImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Persist into Recipe Vault */
  onSave: (recipe: ImportedRecipe, vaultText: string) => void;
  /** Push ingredients through the existing grocery categorizer */
  onAddIngredients: (ingredients: string[], title: string) => void;
}

type Phase = "input" | "loading" | "preview" | "paste";

export function RecipeUrlImportModal({
  open,
  onClose,
  onSave,
  onAddIngredients,
}: RecipeUrlImportModalProps) {
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setPasteText("");
    setPhase("input");
    setError("");
    setRecipe(null);
    setSelected({});
  }, [open]);

  if (!open) return null;

  function applyRecipe(next: ImportedRecipe) {
    setRecipe(next);
    const map: Record<number, boolean> = {};
    next.ingredients.forEach((_, i) => {
      map[i] = true;
    });
    setSelected(map);
    setPhase("preview");
    setError("");
  }

  function importFromUrl() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a recipe link first.");
      return;
    }
    setPhase("loading");
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/import-recipe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) {
          const needsPaste = Boolean(data?.error?.needsPaste);
          setError(
            data?.error?.message ||
              "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.",
          );
          setPhase(needsPaste ? "paste" : "input");
          return;
        }
        applyRecipe(data.recipe as ImportedRecipe);
      } catch {
        setError(
          "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.",
        );
        setPhase("paste");
      }
    });
  }

  function importFromPaste() {
    const trimmed = pasteText.trim();
    if (trimmed.length < 20) {
      setError("Paste a bit more of the recipe or caption so we can read it.");
      return;
    }
    setPhase("loading");
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/import-recipe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            pasteText: trimmed,
            url: url.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) {
          setError(data?.error?.message || "Couldn't read that recipe text.");
          setPhase("paste");
          return;
        }
        applyRecipe(data.recipe as ImportedRecipe);
      } catch {
        setError("Couldn't read that recipe text. Try again.");
        setPhase("paste");
      }
    });
  }

  function checkedIngredients() {
    if (!recipe) return [];
    return recipe.ingredients.filter((_, i) => selected[i] !== false);
  }

  function handleSave() {
    if (!recipe) return;
    onSave(recipe, formatRecipeVaultText(recipe));
    onClose();
  }

  function handleAddToList() {
    if (!recipe) return;
    const ings = checkedIngredients();
    if (!ings.length) {
      setError("Check at least one ingredient to add.");
      return;
    }
    onAddIngredients(ings, recipe.title);
  }

  const busy = pending || phase === "loading";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-import-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-200/70 bg-[#FBF7F0] p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2
              id="recipe-import-title"
              className="font-[family-name:var(--font-display)] text-xl font-semibold text-amber-950"
            >
              Import recipe
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Paste a link from Google, TikTok, Instagram, YouTube, or a food
              blog.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm text-neutral-600 hover:bg-amber-100"
          >
            Close
          </button>
        </div>

        {phase !== "preview" ? (
          <div className="space-y-3">
            <label className="block text-sm text-neutral-700">
              Recipe link
              <input
                type="url"
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any recipe link (Google, TikTok, Instagram, YouTube, food blog)..."
                className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-base text-neutral-900 outline-none focus:border-amber-500"
              />
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={importFromUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3F6B4A] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span
                    className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                  Importing…
                </>
              ) : (
                "Import Recipe"
              )}
            </button>

            {(phase === "paste" || error) && (
              <button
                type="button"
                className="w-full text-left text-sm text-amber-900 underline underline-offset-2"
                onClick={() => setPhase("paste")}
              >
                {error ||
                  "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly."}
              </button>
            )}

            {phase === "paste" ? (
              <div className="space-y-2 rounded-xl border border-dashed border-amber-300 bg-white/70 p-3">
                <label className="block text-sm text-neutral-700">
                  Paste recipe text or social caption
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={6}
                    placeholder="Paste the caption or full recipe text here…"
                    className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-base text-neutral-900 outline-none focus:border-amber-500"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={importFromPaste}
                  className="w-full rounded-xl border border-[#3F6B4A] bg-white px-4 py-3 text-base font-semibold text-[#3F6B4A] disabled:opacity-60"
                >
                  Read pasted text
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "preview" && recipe ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
              {recipe.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.image}
                  alt=""
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="p-3">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {recipe.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {[
                    recipe.servings ? `Serves ${recipe.servings}` : null,
                    recipe.prepTime ? `Prep ${recipe.prepTime}` : null,
                    recipe.cookTime ? `Cook ${recipe.cookTime}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Imported recipe"}
                </p>
              </div>
            </div>

            {recipe.ingredients.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Ingredients
                </h4>
                <ul className="space-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={`${i}-${ing}`}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-amber-50">
                        <input
                          type="checkbox"
                          checked={selected[i] !== false}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [i]: e.target.checked,
                            }))
                          }
                          className="mt-1 h-5 w-5 rounded border-neutral-300 text-[#3F6B4A]"
                        />
                        <span className="text-base text-neutral-800">{ing}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recipe.instructions.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Steps
                </h4>
                <ol className="list-decimal space-y-2 pl-5 text-base text-neutral-800">
                  {recipe.instructions.map((step, i) => (
                    <li key={`${i}-${step.slice(0, 24)}`}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-700" role="status">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="w-full rounded-xl bg-[#3F6B4A] px-4 py-3.5 text-base font-semibold text-white"
              >
                Save to Recipe Vault
              </button>
              <button
                type="button"
                onClick={handleAddToList}
                className="w-full rounded-xl border border-[#3F6B4A] bg-white px-4 py-3.5 text-base font-semibold text-[#3F6B4A]"
              >
                Add Ingredients to Shopping List
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase("input");
                  setRecipe(null);
                  setError("");
                }}
                className="w-full rounded-xl px-4 py-3 text-sm text-neutral-600 hover:bg-amber-100"
              >
                Try another link
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
