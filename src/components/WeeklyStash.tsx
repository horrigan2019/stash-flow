"use client";

import { useMemo, useState } from "react";
import { AISLES } from "@/lib/aisles";
import { useGroceryList } from "@/hooks/useGroceryList";
import { AisleCategoryCard } from "@/components/AisleCategoryCard";
import { StuffedInCart } from "@/components/StuffedInCart";
import { VoiceIntakeButton } from "@/components/VoiceIntakeButton";
import type { AisleId } from "@/lib/types";

const AISLE_GUESS: Record<string, AisleId> = {
  cilantro: "produce",
  limes: "produce",
  eggs: "dairy",
  cream: "dairy",
  berries: "frozen",
  frozen: "frozen",
};

function guessAisle(phrase: string): AisleId {
  const lower = phrase.toLowerCase();
  for (const [word, aisle] of Object.entries(AISLE_GUESS)) {
    if (lower.includes(word)) return aisle;
  }
  return "canned-dry";
}

export function WeeklyStash() {
  const { items, hydrated, toggleItem, addItems } = useGroceryList();
  const [openAisles, setOpenAisles] = useState<Record<string, boolean>>({
    produce: true,
  });
  const [cartOpen, setCartOpen] = useState(true);

  const pendingByAisle = useMemo(() => {
    const map = Object.fromEntries(
      AISLES.map((a) => [a.id, [] as typeof items]),
    ) as Record<AisleId, typeof items>;
    for (const item of items) {
      if (!item.checked) map[item.aisleId].push(item);
    }
    return map;
  }, [items]);

  const stuffed = useMemo(
    () => items.filter((item) => item.checked),
    [items],
  );

  function toggleAisle(id: string) {
    setOpenAisles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSpill(phrase: string) {
    const parts = phrase
      .replace(/^grab\s+/i, "")
      .replace(/^we need\s+/i, "")
      .replace(/^add\s+/i, "")
      .split(/\s+and\s+/i);
    const entries = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .map((name) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        aisleId: guessAisle(name),
      }));
    addItems(entries);
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-neutral-500">Warming up the stash…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-5 pb-2 pt-6">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-amber-950">
          Oh Stuffing!
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Never backtrack for milk again.
        </p>
      </header>

      <VoiceIntakeButton onSpill={handleSpill} />

      <div className="aisle-stack flex flex-1 flex-col gap-3 px-4 pb-4 pt-2">
        <div className="flex items-end justify-between gap-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
            Aisle walk-flow
          </h2>
          <p className="text-[11px] text-neutral-400">
            {items.filter((i) => !i.checked).length} to grab
          </p>
        </div>

        {AISLES.map((aisle) => (
          <AisleCategoryCard
            key={aisle.id}
            aisle={aisle}
            items={pendingByAisle[aisle.id]}
            open={Boolean(openAisles[aisle.id])}
            onToggleOpen={() => toggleAisle(aisle.id)}
            onToggleItem={toggleItem}
          />
        ))}

        <StuffedInCart
          items={stuffed}
          open={cartOpen}
          onToggleOpen={() => setCartOpen((v) => !v)}
          onToggleItem={toggleItem}
        />
      </div>
    </div>
  );
}
