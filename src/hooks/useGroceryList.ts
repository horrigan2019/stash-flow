"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroceryItem, GroceryListState } from "@/lib/types";
import { loadGroceryList, saveGroceryList } from "@/lib/storage";

export function useGroceryList() {
  const [items, setItems] = useState<GroceryListState>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadGroceryList());
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
      id: `voice-${Date.now()}`,
      name: trimmed,
      aisleId,
      checked: false,
    };
    setItems((prev) => [...prev, item]);
  }, []);

  const resetToSample = useCallback(() => {
    setItems(loadGroceryList());
  }, []);

  return { items, hydrated, toggleItem, addItem, resetToSample, setItems };
}
