"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { WeeklyStash } from "@/components/WeeklyStash";
import { FeastRunway } from "@/components/FeastRunway";
import { PantrySettings } from "@/components/PantrySettings";
import { SAMPLE_ITEMS } from "@/lib/sample-data";
import { saveGroceryList } from "@/lib/storage";

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("weekly-stash");
  const [stashKey, setStashKey] = useState(0);

  function handleResetStash() {
    saveGroceryList(SAMPLE_ITEMS.map((item) => ({ ...item })));
    setStashKey((k) => k + 1);
    setActiveTab("weekly-stash");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-amber-50/40 text-neutral-800 shadow-[0_0_0_1px_rgba(180,83,9,0.08)]">
      <main className="flex flex-1 flex-col overflow-y-auto">
        {activeTab === "weekly-stash" ? (
          <WeeklyStash key={stashKey} />
        ) : null}
        {activeTab === "feast-runway" ? <FeastRunway /> : null}
        {activeTab === "pantry-settings" ? (
          <PantrySettings onResetStash={handleResetStash} />
        ) : null}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
