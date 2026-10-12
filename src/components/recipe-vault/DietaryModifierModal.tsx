"use client";

import { useId, useState, useTransition } from "react";
import { DIET_OPTIONS, dietLabelsForPrompt } from "./dietOptions";
import { dietAdaptPrompt } from "./prompts";
import {
  type DietId,
  type VaultRecipe,
  variationTitle,
} from "./types";

export interface DietAdaptResult {
  title: string;
  servings: number;
  text: string;
  changes: string[];
  swappedIngredients: { from: string; to: string }[];
}

export interface DietaryModifierModalProps {
  open: boolean;
  recipe: VaultRecipe | null;
  onClose: () => void;
  onSaveAsNew: (recipe: Omit<VaultRecipe, "id">) => void;
  onApplyToThis: (patch: Partial<VaultRecipe>) => void;
  aiJson: (prompt: string, opts?: { modelTier?: string }) => Promise<unknown>;
  hasTextAI?: () => boolean;
  errorMessage?: (err: unknown) => string;
}

export function DietaryModifierModal({
  open,
  recipe,
  onClose,
  onSaveAsNew,
  onApplyToThis,
  aiJson,
  hasTextAI = () => true,
  errorMessage = defaultError,
}: DietaryModifierModalProps) {
  const titleId = useId();
  const [selected, setSelected] = useState<DietId[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<DietAdaptResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open || !recipe) return null;
  const activeRecipe = recipe;

  function toggle(id: DietId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setResult(null);
  }

  function runAdapt() {
    const labels = dietLabelsForPrompt(selected, customNote);
    if (!labels.length) {
      setStatus("Pick at least one dietary restriction (or add a custom note).");
      return;
    }
    if (!hasTextAI()) {
      setStatus("Diet adaptations need Photo & AI access.");
      return;
    }
    setStatus("Adapting the recipe…");
    setResult(null);
    startTransition(async () => {
      try {
        const data = (await aiJson(
          dietAdaptPrompt(activeRecipe.title, activeRecipe.text, labels),
          {
            modelTier: "default",
          }
        )) as Partial<DietAdaptResult> | null;
        const text =
          (data && typeof data.text === "string" && data.text.trim()) || "";
        if (!text) {
          setStatus("Couldn't adapt that recipe — try again.");
          return;
        }
        const title =
          (data && typeof data.title === "string" && data.title.trim()) ||
          variationTitle(activeRecipe.title, labels);
        setResult({
          title,
          servings:
            data && typeof data.servings === "number" && data.servings > 0
              ? data.servings
              : activeRecipe.servings,
          text,
          changes: Array.isArray(data?.changes)
            ? data!.changes.map((c) => String(c))
            : [],
          swappedIngredients: Array.isArray(data?.swappedIngredients)
            ? data!.swappedIngredients
                .map((s) => ({
                  from: String(s?.from || ""),
                  to: String(s?.to || ""),
                }))
                .filter((s) => s.from || s.to)
            : [],
        });
        setStatus("Review the adapted version, then save.");
      } catch (err) {
        setStatus(errorMessage(err));
      }
    });
  }

  function saveNew() {
    if (!result) return;
    const labels = dietLabelsForPrompt(selected, customNote);
    onSaveAsNew({
      title: result.title,
      servings: result.servings,
      text: result.text,
      diets: labels,
      parentId: activeRecipe.id,
      notes: result.changes.length
        ? `Adapted from "${activeRecipe.title}". Changes: ${result.changes.join("; ")}`
        : `Adapted from "${activeRecipe.title}".`,
    });
    resetAndClose();
  }

  function applyThis() {
    if (!result) return;
    const labels = dietLabelsForPrompt(selected, customNote);
    onApplyToThis({
      title: result.title,
      servings: result.servings,
      text: result.text,
      diets: labels,
    });
    resetAndClose();
  }

  function resetAndClose() {
    setSelected([]);
    setCustomNote("");
    setResult(null);
    setStatus("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--surface,#fff)] text-[var(--ink,#2B2620)] shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border,#E4DCC9)] px-4 py-3">
          <div>
            <h2 id={titleId} className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Adapt for Diet
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted,#6B6255)]">
              {activeRecipe.title}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--border,#E4DCC9)] px-3 py-1 text-sm"
            onClick={resetAndClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((opt) => {
              const on = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-semibold " +
                    (on
                      ? "border-[var(--accent,#3F6B4A)] bg-[var(--accent,#3F6B4A)] text-[var(--accent-ink,#fff)]"
                      : "border-[var(--border,#E4DCC9)]")
                  }
                  aria-pressed={on}
                  onClick={() => toggle(opt.id)}
                >
                  <span aria-hidden>{opt.emoji}</span> {opt.label}
                </button>
              );
            })}
          </div>

          {selected.includes("custom") ? (
            <label className="block text-xs text-[var(--muted,#6B6255)]">
              Custom dietary note
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
                placeholder='e.g., "no cilantro", "low sodium"'
                value={customNote}
                onChange={(e) => {
                  setCustomNote(e.target.value);
                  setResult(null);
                }}
              />
            </label>
          ) : null}

          <button
            type="button"
            className="w-full rounded-xl bg-[var(--accent,#3F6B4A)] px-4 py-3 text-sm font-bold text-[var(--accent-ink,#fff)] disabled:opacity-60"
            disabled={pending}
            onClick={runAdapt}
          >
            {pending ? "Adapting…" : "Adapt recipe"}
          </button>

          {status ? (
            <p className="text-xs text-[var(--muted,#6B6255)]" role="status">
              {status}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border,#E4DCC9)] bg-[var(--surface-2,#F3ECDC)] p-3">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--muted,#6B6255)]">
                    Original
                  </p>
                  <p className="mt-1 text-sm font-semibold">{activeRecipe.title}</p>
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {activeRecipe.text}
                  </pre>
                </div>
                <div className="rounded-xl border border-[var(--accent,#3F6B4A)] bg-[var(--surface,#fff)] p-3">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--accent,#3F6B4A)]">
                    Adapted
                  </p>
                  <p className="mt-1 text-sm font-semibold">{result.title}</p>
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {result.text}
                  </pre>
                </div>
              </div>

              {result.swappedIngredients.length ? (
                <ul className="space-y-1 text-xs text-[var(--muted,#6B6255)]">
                  {result.swappedIngredients.map((s, i) => (
                    <li key={i}>
                      <span className="line-through opacity-70">{s.from}</span>
                      {" → "}
                      <strong className="text-[var(--ink,#2B2620)]">{s.to}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-[var(--accent,#3F6B4A)] px-4 py-3 text-sm font-bold text-[var(--accent-ink,#fff)]"
                  onClick={saveNew}
                >
                  Save as New Diet Variation
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-[var(--border,#E4DCC9)] px-4 py-3 text-sm font-semibold"
                  onClick={applyThis}
                >
                  Apply to This Recipe
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function defaultError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message || "Something went wrong.");
  }
  return "Something went wrong.";
}
