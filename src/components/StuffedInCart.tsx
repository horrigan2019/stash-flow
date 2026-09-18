"use client";

import { ChevronDown, ShoppingCart } from "lucide-react";
import type { GroceryItem } from "@/lib/types";
import { AISLES } from "@/lib/aisles";
import { uniqueById } from "@/lib/unique-by-id";

interface StuffedInCartProps {
  items: GroceryItem[];
  open: boolean;
  onToggleOpen: () => void;
  onToggleItem: (id: string) => void;
}

function aisleTitle(aisleId: GroceryItem["aisleId"]) {
  return AISLES.find((a) => a.id === aisleId)?.title ?? aisleId;
}

export function StuffedInCart({
  items,
  open,
  onToggleOpen,
  onToggleItem,
}: StuffedInCartProps) {
  const uniqueItems = uniqueById(items);

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-emerald-50/60">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <ShoppingCart className="h-5 w-5 text-emerald-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-emerald-950">Stuffed in Cart</h3>
          <p className="text-xs text-emerald-800/80">
            {uniqueItems.length === 0
              ? "Checked items land here"
              : `${uniqueItems.length} item${uniqueItems.length === 1 ? "" : "s"} bagged`}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-emerald-600/70 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="space-y-1 border-t border-emerald-200/60 px-2 py-2">
          {uniqueItems.length === 0 ? (
            <li className="px-3 py-2 text-sm text-emerald-800/70">
              Cart is empty — check items as you walk.
            </li>
          ) : (
            uniqueItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-emerald-100/60">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => onToggleItem(item.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-neutral-500 line-through">
                      {item.name}
                    </span>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-emerald-700/70">
                      {aisleTitle(item.aisleId)}
                    </span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
