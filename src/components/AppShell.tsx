"use client";

import { useState } from "react";
import type { TabId } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { WeeklyStash } from "@/components/WeeklyStash";
import { FeastRunway } from "@/components/FeastRunway";
import { PantrySettings } from "@/components/PantrySettings";
import { clearCorruptedGroceryList } from "@/lib/storage";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";

function AppShellInner() {
  const [activeTab, setActiveTab] = useState<TabId>("weekly-stash");
  const [stashKey, setStashKey] = useState(0);
  const { requirePro, isPro, isInTrial, trialDaysRemaining } = useSubscription();

  function handleResetStash() {
    clearCorruptedGroceryList();
    setStashKey((k) => k + 1);
    setActiveTab("weekly-stash");
  }

  async function handlePremiumDemo() {
    const ok = await requirePro("Fridge & pantry Photo AI");
    if (ok) setActiveTab("pantry-settings");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between bg-[#FBF7F0] text-[#2C261C] shadow-[0_0_0_1px_rgba(63,107,74,0.08)]">
      <main className="flex flex-1 flex-col overflow-y-auto">
        {isPro ? (
          <p className="mx-4 mt-3 rounded-xl bg-[#3F6B4A]/12 px-3 py-2 text-xs font-medium text-[#2C4A34]">
            {isInTrial
              ? `Pro trial · ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left`
              : "Oh Stuffing Pro unlocked"}
          </p>
        ) : null}
        {activeTab === "weekly-stash" ? (
          <WeeklyStash key={stashKey} />
        ) : null}
        {activeTab === "feast-runway" ? <FeastRunway /> : null}
        {activeTab === "pantry-settings" ? (
          <PantrySettings onResetStash={handleResetStash} />
        ) : null}
        {!isPro && activeTab === "weekly-stash" ? (
          <button
            type="button"
            onClick={() => void handlePremiumDemo()}
            className="mx-4 mb-4 rounded-xl bg-[#3F6B4A] px-4 py-3 text-sm font-bold text-[#F7FBF5]"
          >
            Try Photo &amp; AI free for 7 days
          </button>
        ) : null}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export function AppShell() {
  return (
    <SubscriptionProvider>
      <AppShellInner />
    </SubscriptionProvider>
  );
}
