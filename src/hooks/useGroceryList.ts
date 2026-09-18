"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroceryItem, GroceryListState } from "@/lib/types";
import { createItemId } from "@/lib/ids";
import {
  clearCorruptedGroceryList,
  loadGroceryList,
  saveGroceryList,
  sanitizeGroceryList,
} from "@/lib/storage";

export function useGroceryList() {
  const [items, setItems] = useState<GroceryListState>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadGroceryList();
    const { items: clean } = sanitizeGroceryList(loaded);
    setItems(clean);
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

  const addItem = useCallback((name: string, aisleId: GroceryItem["aisleId"]) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: GroceryItem = {
      id: createItemId("item"),
      name: trimmed,
      aisleId,
      checked: false,
    };
    setItems((prev) => {
      const next = [...prev, item];
      const { items: clean } = sanitizeGroceryList(next);
      return clean;
    });
  }, []);

  const resetToSample = useCallback(() => {
    setItems(clearCorruptedGroceryList());
  }, []);

  return { items, hydrated, toggleItem, addItem, resetToSample, setItems };
}
