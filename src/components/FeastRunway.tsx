import { CalendarHeart, PartyPopper } from "lucide-react";

export function FeastRunway() {
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
    </div>
  );
}
