"use client";

import { useId, useRef, useState, useTransition } from "react";
import { autoFormatRecipePaste } from "./autoFormat";
import { askRecipePrompt, photoExtractFullPrompt } from "./prompts";
import {
  type CreateRecipeTab,
  type EffortLevel,
  type RecipeDraft,
  type VaultRecipe,
  draftToRecipeText,
  emptyDraft,
  parsedJsonToDraft,
  type ParsedRecipeJson,
} from "./types";

export interface CreateRecipeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<VaultRecipe, "id">) => void;
  /** Multimodal / text Claude JSON helper — same contract as the HTML vault. */
  aiJson: (
    prompt: string,
    opts?: { images?: File[]; modelTier?: string }
  ) => Promise<ParsedRecipeJson>;
  hasVisionAI?: () => boolean;
  hasTextAI?: () => boolean;
  errorMessage?: (err: unknown) => string;
  /** Client canvas compress — defaults to identity File passthrough. */
  compressImage?: (file: File) => Promise<File | Blob>;
}

const TABS: { id: CreateRecipeTab; label: string }[] = [
  { id: "type", label: "Type or Paste Recipe" },
  { id: "photo", label: "📸 Snap a Recipe" },
  { id: "ask", label: "✨ Ask for a Recipe" },
];

export function CreateRecipeModal({
  open,
  onClose,
  onSave,
  aiJson,
  hasVisionAI = () => true,
  hasTextAI = () => true,
  errorMessage = defaultError,
  compressImage,
}: CreateRecipeModalProps) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<CreateRecipeTab>("type");
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft);
  const [status, setStatus] = useState("");
  const [askPrompt, setAskPrompt] = useState("");
  const [effort, setEffort] = useState<EffortLevel>("weeknight");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function patch(partial: Partial<RecipeDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleAutoFormat() {
    const blob = [draft.ingredientsText, draft.instructionsText]
      .filter(Boolean)
      .join("\n\n");
    const source = blob.trim() || draft.ingredientsText;
    const result = autoFormatRecipePaste(
      [draft.title, source, draft.instructionsText].filter(Boolean).join("\n")
    );
    patch({
      title: draft.title || result.titleGuess,
      servings: result.servingsGuess || draft.servings,
      prepTime: draft.prepTime || result.prepTimeGuess,
      cookTime: draft.cookTime || result.cookTimeGuess,
      ingredientsText: result.ingredientsText || draft.ingredientsText,
      instructionsText: result.instructionsText || draft.instructionsText,
    });
    setStatus("Cleaned and structured — review, then save.");
  }

  function handleSave() {
    const title = draft.title.trim();
    const text = draftToRecipeText(draft);
    if (!title || !text) {
      setStatus("Add a title plus ingredients or steps before saving.");
      return;
    }
    onSave({
      title,
      servings: draft.servings || 4,
      text,
      prepTime: draft.prepTime.trim() || undefined,
      cookTime: draft.cookTime.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      source: draft.source.trim() || undefined,
    });
    setDraft(emptyDraft());
    setStatus("");
    setAskPrompt("");
    setPreviewUrl(null);
    onClose();
  }

  function runPhotoExtract(file: File) {
    if (!hasVisionAI()) {
      setStatus("Photo scan needs Photo & AI access.");
      return;
    }
    setStatus("Reading the photo…");
    startTransition(async () => {
      try {
        let image: File | Blob = file;
        if (compressImage) image = await compressImage(file);
        const asFile =
          image instanceof File
            ? image
            : new File([image], file.name || "recipe.jpg", {
                type: image.type || "image/jpeg",
              });
        const data = await aiJson(photoExtractFullPrompt(), {
          images: [asFile],
          modelTier: "default",
        });
        setDraft(parsedJsonToDraft(data));
        setTab("type");
        setStatus("Read it — verify below, then save.");
      } catch (err) {
        setStatus(errorMessage(err));
      }
    });
  }

  function runAskGenerate() {
    const q = askPrompt.trim();
    if (!q) {
      setStatus("Tell us what you'd like to make.");
      return;
    }
    if (!hasTextAI()) {
      setStatus("Recipe generation needs Photo & AI access.");
      return;
    }
    setStatus("Cooking something up…");
    startTransition(async () => {
      try {
        const data = await aiJson(askRecipePrompt(q, effort), {
          modelTier: "default",
        });
        setDraft(parsedJsonToDraft(data));
        setTab("type");
        setStatus("Generated — tweak anything, then save.");
      } catch (err) {
        setStatus(errorMessage(err));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--surface,#fff)] text-[var(--ink,#2B2620)] shadow-xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border,#E4DCC9)] px-4 py-3">
          <div>
            <h2 id={titleId} className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Add / Create Recipe
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted,#6B6255)]">
              Type, snap a page, or ask for a weeknight idea.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--border,#E4DCC9)] px-3 py-1 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border,#E4DCC9)] px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                "shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold " +
                (tab === t.id
                  ? "bg-[var(--accent,#3F6B4A)] text-[var(--accent-ink,#fff)]"
                  : "text-[var(--muted,#6B6255)]")
              }
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {tab === "type" ? (
            <TypePasteFields
              draft={draft}
              onChange={patch}
              onAutoFormat={handleAutoFormat}
              busy={pending}
            />
          ) : null}

          {tab === "photo" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted,#6B6255)]">
                Snap a cookbook page, recipe card, magazine clipping, or handwritten note.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border,#E4DCC9)] bg-[var(--surface-2,#F3ECDC)] text-center text-xs">
                  <span className="text-2xl" aria-hidden>
                    📷
                  </span>
                  <span>Snap / upload</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(URL.createObjectURL(file));
                      runPhotoExtract(file);
                    }}
                  />
                </label>
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Recipe photo preview"
                    className="h-28 w-28 rounded-xl object-cover"
                  />
                ) : null}
              </div>
              <TypePasteFields
                draft={draft}
                onChange={patch}
                onAutoFormat={handleAutoFormat}
                busy={pending}
              />
            </div>
          ) : null}

          {tab === "ask" ? (
            <div className="space-y-3">
              <label className="block text-xs text-[var(--muted,#6B6255)]">
                What would you like to make?
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
                  placeholder="e.g., Authentic Bolognese, Quick 20-min lemon salmon, Grandma's style beef stew"
                  value={askPrompt}
                  onChange={(e) => setAskPrompt(e.target.value)}
                />
              </label>
              <fieldset className="space-y-1">
                <legend className="text-xs text-[var(--muted,#6B6255)]">
                  Prep time / effort
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["quick", "Quick (~20 min)"],
                      ["weeknight", "Weeknight"],
                      ["weekend", "Weekend project"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={
                        "rounded-full border px-3 py-1.5 text-xs font-semibold " +
                        (effort === id
                          ? "border-[var(--accent,#3F6B4A)] bg-[var(--accent,#3F6B4A)] text-[var(--accent-ink,#fff)]"
                          : "border-[var(--border,#E4DCC9)]")
                      }
                      aria-pressed={effort === id}
                      onClick={() => setEffort(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                className="w-full rounded-xl bg-[var(--accent,#3F6B4A)] px-4 py-3 text-sm font-bold text-[var(--accent-ink,#fff)] disabled:opacity-60"
                disabled={pending}
                onClick={runAskGenerate}
              >
                {pending ? "Generating…" : "✨ Generate recipe"}
              </button>
              {(draft.title || draft.ingredientsText) && (
                <TypePasteFields
                  draft={draft}
                  onChange={patch}
                  onAutoFormat={handleAutoFormat}
                  busy={pending}
                />
              )}
            </div>
          ) : null}

          {status ? (
            <p className="text-xs text-[var(--muted,#6B6255)]" role="status">
              {status}
            </p>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-[var(--border,#E4DCC9)] px-4 py-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-[var(--border,#E4DCC9)] px-4 py-3 text-sm font-semibold"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-[var(--accent,#3F6B4A)] px-4 py-3 text-sm font-bold text-[var(--accent-ink,#fff)] disabled:opacity-60"
            disabled={pending}
            onClick={handleSave}
          >
            Save recipe
          </button>
        </footer>
      </div>
    </div>
  );
}

function TypePasteFields({
  draft,
  onChange,
  onAutoFormat,
  busy,
}: {
  draft: RecipeDraft;
  onChange: (p: Partial<RecipeDraft>) => void;
  onAutoFormat: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-xs text-[var(--muted,#6B6255)]">
        Recipe Title
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
          placeholder="e.g. Grandma's Lasagna"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          autoComplete="off"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs text-[var(--muted,#6B6255)]">
          Servings
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-2 py-2 text-sm"
            value={draft.servings}
            onChange={(e) =>
              onChange({ servings: parseInt(e.target.value, 10) || 1 })
            }
          />
        </label>
        <label className="block text-xs text-[var(--muted,#6B6255)]">
          Prep
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-2 py-2 text-sm"
            placeholder="15 min"
            value={draft.prepTime}
            onChange={(e) => onChange({ prepTime: e.target.value })}
          />
        </label>
        <label className="block text-xs text-[var(--muted,#6B6255)]">
          Cook
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-2 py-2 text-sm"
            placeholder="30 min"
            value={draft.cookTime}
            onChange={(e) => onChange({ cookTime: e.target.value })}
          />
        </label>
      </div>
      <label className="block text-xs text-[var(--muted,#6B6255)]">
        Ingredients
        <textarea
          rows={5}
          className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
          placeholder={"2 cups flour\n1 tsp salt\n…"}
          value={draft.ingredientsText}
          onChange={(e) => onChange({ ingredientsText: e.target.value })}
        />
      </label>
      <label className="block text-xs text-[var(--muted,#6B6255)]">
        Step-by-Step Instructions
        <textarea
          rows={5}
          className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
          placeholder={"1. Mix dry ingredients\n2. …"}
          value={draft.instructionsText}
          onChange={(e) => onChange({ instructionsText: e.target.value })}
        />
      </label>
      <label className="block text-xs text-[var(--muted,#6B6255)]">
        Notes / Source (optional)
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 py-2 text-sm"
          placeholder="Family cookbook, p. 42"
          value={draft.notes || draft.source}
          onChange={(e) => onChange({ notes: e.target.value, source: e.target.value })}
        />
      </label>
      <button
        type="button"
        className="rounded-full border border-[var(--border,#E4DCC9)] px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
        disabled={busy}
        onClick={onAutoFormat}
      >
        Auto-Format &amp; Clean
      </button>
    </div>
  );
}

function defaultError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message || "Something went wrong.");
  }
  return "Something went wrong.";
}
