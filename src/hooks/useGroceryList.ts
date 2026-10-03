"use client";

import { useCallback, useEffect, useState } from "react";
import type { AisleId, GroceryItem, GroceryListState } from "@/lib/types";
import { createItemId } from "@/lib/ids";
import {
  clearCorruptedGroceryList,
  ensureUniqueItemIds,
  loadGroceryList,
  saveGroceryList,
  sanitizeGroceryList,
} from "@/lib/storage";

export function useGroceryList() {
  const [items, setItems] = useState<GroceryListState>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // loadGroceryList already sanitizes + rewrites corrupted localStorage.
    const loaded = loadGroceryList();
    const { items: clean } = sanitizeGroceryList(loaded);
    setItems(ensureUniqueItemIds(clean));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveGroceryList(items);
  }, [items, hydrated]);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const setItemQuantity = useCallback(
    (id: string, quantity: number, unit?: string) => {
      const nextQty = Math.min(99, Math.max(1, Math.floor(quantity) || 1));
      const nextUnit = (unit ?? "").replace(/\s+/g, " ").trim().slice(0, 12);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: nextQty,
                ...(nextUnit ? { unit: nextUnit } : { unit: undefined }),
              }
            : item,
        ),
      );
    },
    [],
  );

  const bumpItemQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = item.quantity ?? 1;
        return {
          ...item,
          quantity: Math.min(99, Math.max(1, current + delta)),
        };
      }),
    );
  }, []);

  const addItem = useCallback((name: string, aisleId: AisleId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: GroceryItem = {
      id: createItemId("item"),
      name: trimmed,
      aisleId,
      checked: false,
      quantity: 1,
    };
    setItems((prev) => {
      const next = ensureUniqueItemIds([...prev, item]);
      return sanitizeGroceryList(next).items;
    });
  }, []);

  /** Batch add (voice spill) — one state update, unique id per entry. */
  const addItems = useCallback(
    (entries: { name: string; aisleId: AisleId }[]) => {
      const prepared = entries
        .map(({ name, aisleId }) => ({
          name: name.trim(),
          aisleId,
        }))
        .filter((e) => e.name.length > 0)
        .map(({ name, aisleId }) => ({
          id: createItemId("item"),
          name,
          aisleId,
          checked: false,
          quantity: 1,
        }));

      if (prepared.length === 0) return;

      setItems((prev) => {
        const next = ensureUniqueItemIds([...prev, ...prepared]);
        return sanitizeGroceryList(next).items;
      });
    },
    [],
  );

  const resetToSample = useCallback(() => {
    setItems(clearCorruptedGroceryList());
  }, []);

  return {
    items,
    hydrated,
    toggleItem,
    setItemQuantity,
    bumpItemQuantity,
    addItem,
    addItems,
    resetToSample,
    setItems,
  };
}
