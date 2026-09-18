"use client";

import { Archive, RotateCcw, WifiOff } from "lucide-react";

interface PantrySettingsProps {
  onResetStash: () => void;
}

export function PantrySettings({ onResetStash }: PantrySettingsProps) {
  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <header className="mb-6">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-amber-950">
          Pantry & Settings
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Keep staples offline-ready and tune how you walk the store.
        </p>
      </header>

      <div className="space-y-3">
        <section className="rounded-2xl border border-amber-200/70 bg-white/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-900">
            <WifiOff className="h-4 w-4" aria-hidden />
            <h2 className="text-sm font-semibold">Offline-ready stash</h2>
          </div>
          <p className="text-sm text-neutral-600">
            Weekly Stash saves to this device with LocalStorage. No account
            needed for the prototype — your checks survive a refresh.
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200/70 bg-white/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-900">
            <Archive className="h-4 w-4" aria-hidden />
            <h2 className="text-sm font-semibold">Pantry inventory</h2>
          </div>
          <p className="text-sm text-neutral-600">
            Staple tracking and household paper stock will live here in a later
            slice.
          </p>
        </section>

        <button
          type="button"
          onClick={onResetStash}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-200/70"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset Weekly Stash sample list
        </button>
      </div>
    </div>
  );
}
