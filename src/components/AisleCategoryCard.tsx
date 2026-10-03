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
  onBumpQuantity?: (id: string, delta: number) => void;
}

function quantityLabel(item: GroceryItem) {
  const qty = item.quantity ?? 1;
  const unit = (item.unit ?? "").trim();
  return unit ? `${qty} ${unit}` : String(qty);
}

export function AisleCategoryCard({
  aisle,
  items,
  open,
  onToggleOpen,
  onToggleItem,
  onBumpQuantity,
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
                <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-amber-50/80">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-1 py-1">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => onToggleItem(item.id)}
                      className="h-5 w-5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="truncate text-sm text-neutral-800">
                      {item.name}
                    </span>
                  </label>
                  {onBumpQuantity ? (
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      role="group"
                      aria-label={`Quantity for ${item.name}`}
                    >
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-neutral-600 hover:bg-amber-100"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => onBumpQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-neutral-800">
                        {quantityLabel(item)}
                      </span>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-neutral-600 hover:bg-amber-100"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => onBumpQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
