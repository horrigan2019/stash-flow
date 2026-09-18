import type { GroceryListState } from "./types";
import { SAMPLE_ITEMS } from "./sample-data";

export const STORAGE_KEY = "oh-stuffing:weekly-stash";

export function loadGroceryList(): GroceryListState {
  if (typeof window === "undefined") {
    return SAMPLE_ITEMS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_ITEMS;
    const parsed = JSON.parse(raw) as GroceryListState;
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_ITEMS;
    return parsed;
  } catch {
    return SAMPLE_ITEMS;
  }
}

export function saveGroceryList(items: GroceryListState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — keep in-memory state only.
  }
}
