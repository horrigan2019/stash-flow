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

  const addItem = useCallback((name: string, aisleId: AisleId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: GroceryItem = {
      id: createItemId("item"),
      name: trimmed,
      aisleId,
      checked: false,
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
    addItem,
    addItems,
    resetToSample,
    setItems,
  };
}
