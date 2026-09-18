import type { GroceryItem, GroceryListState } from "./types";
import { SAMPLE_ITEMS } from "./sample-data";
import { createItemId } from "./ids";

export const STORAGE_KEY = "oh-stuffing:weekly-stash";

function isValidItem(value: unknown): value is GroceryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    typeof item.aisleId === "string" &&
    typeof item.checked === "boolean"
  );
}

/** Drop invalid rows and collapse duplicate ids (keep first). */
export function sanitizeGroceryList(
  items: unknown,
): { items: GroceryListState; hadCorruption: boolean } {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: SAMPLE_ITEMS.map((item) => ({ ...item })), hadCorruption: true };
  }

  const seen = new Set<string>();
  const cleaned: GroceryListState = [];
  let hadCorruption = false;

  for (const row of items) {
    if (!isValidItem(row)) {
      hadCorruption = true;
      continue;
    }

    let id = row.id;
    if (seen.has(id)) {
      hadCorruption = true;
      // Re-key collisions instead of dropping user-added items.
      id = createItemId("deduped");
    }
    seen.add(id);
    cleaned.push({ ...row, id });
  }

  if (cleaned.length === 0) {
    return { items: SAMPLE_ITEMS.map((item) => ({ ...item })), hadCorruption: true };
  }

  return { items: cleaned, hadCorruption };
}

export function loadGroceryList(): GroceryListState {
  if (typeof window === "undefined") {
    return SAMPLE_ITEMS.map((item) => ({ ...item }));
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return SAMPLE_ITEMS.map((item) => ({ ...item }));
    }

    const parsed = JSON.parse(raw) as unknown;
    const { items, hadCorruption } = sanitizeGroceryList(parsed);

    if (hadCorruption) {
      // Rewrite storage so duplicate-key corruption does not persist.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    return items;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return SAMPLE_ITEMS.map((item) => ({ ...item }));
  }
}

export function saveGroceryList(items: GroceryListState): void {
  if (typeof window === "undefined") return;
  try {
    const { items: clean } = sanitizeGroceryList(items);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Quota / private mode — keep in-memory state only.
  }
}

/** Wipe stash storage and return a fresh sample list. */
export function clearCorruptedGroceryList(): GroceryListState {
  const fresh = SAMPLE_ITEMS.map((item) => ({ ...item }));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }
  return fresh;
}
