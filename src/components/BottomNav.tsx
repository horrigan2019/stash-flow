"use client";

import { CalendarDays, ShoppingBasket, Settings2 } from "lucide-react";
import type { TabId } from "@/lib/types";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof ShoppingBasket;
}[] = [
  { id: "weekly-stash", label: "Weekly Stash", icon: ShoppingBasket },
  { id: "feast-runway", label: "Feast Runway", icon: CalendarDays },
  { id: "pantry-settings", label: "Pantry & Settings", icon: Settings2 },
];

interface BottomNavProps {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      className="sticky bottom-0 z-20 border-t border-amber-200/70 bg-amber-50/95 backdrop-blur-sm"
      aria-label="Main"
    >
      <ul className="grid grid-cols-3 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight transition ${
                  active
                    ? "bg-amber-200/70 text-amber-950"
                    : "text-neutral-500 hover:bg-amber-100/50 hover:text-neutral-700"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-amber-800" : "text-neutral-400"}`}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span className="text-center">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
