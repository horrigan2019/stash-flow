"use client";

import { ChevronDown, Lock } from "lucide-react";
import type { AisleMeta, GroceryItem } from "@/lib/types";
import { uniqueById } from "@/lib/unique-by-id";

interface AisleCategoryCardProps {
  aisle: AisleMeta;
  items: GroceryItem[];
  open: boolean;
  onToggleOpen: () => void;
  onToggleItem: (id: string) => void;
}

export function AisleCategoryCard({
  aisle,
  items,
  open,
  onToggleOpen,
  onToggleItem,
}: AisleCategoryCardProps) {
  const pending = uniqueById(items.filter((i) => !i.checked));
  const countLabel =
    pending.length === 0
      ? "All stuffed"
      : `${pending.length} left`;

  return (
    <section
      className={`overflow-hidden rounded-2xl border ${
        aisle.lockedToBottom
          ? "border-sky-200/80 bg-sky-50/50"
          : "border-amber-200/60 bg-white/70"
      }`}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-neutral-900">
              {aisle.title}
            </h3>
            {aisle.lockedToBottom ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                <Lock className="h-3 w-3" aria-hidden />
                Bottom
              </span>
            ) : null}
          </div>
          <p className="text-xs text-neutral-500">
            {aisle.subtitle} · {countLabel}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-neutral-400 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="space-y-1 border-t border-amber-100/80 px-2 py-2">
          {pending.length === 0 ? (
            <li className="px-3 py-2 text-sm text-neutral-500">
              Nothing left in this aisle.
            </li>
          ) : (
            pending.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-amber-50/80">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleItem(item.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-neutral-800">{item.name}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
