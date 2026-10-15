import type { GroceryItem, GroceryListState } from "./types";
import { SAMPLE_ITEMS } from "./sample-data";
import { createItemId } from "./ids";

/** Current stash key — bumping clears legacy corrupted duplicate-id payloads. */
export const STORAGE_KEY = "oh-stuffing:weekly-stash:v2";
const LEGACY_STORAGE_KEYS = [
  "oh-stuffing:weekly-stash",
  "oh-stuffing:weekly-stash:v1",
];

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

function freshSample(): GroceryListState {
  return SAMPLE_ITEMS.map((item) => ({ ...item }));
}

/** Drop invalid rows and clear duplicate ids (keep first occurrence). */
export function sanitizeGroceryList(
  items: unknown,
): { items: GroceryListState; hadCorruption: boolean } {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: freshSample(), hadCorruption: true };
  }

  const seen = new Set<string>();
  const cleaned: GroceryListState = [];
  let hadCorruption = false;

  for (const row of items) {
    if (!isValidItem(row)) {
      hadCorruption = true;
      continue;
    }

    if (seen.has(row.id)) {
      // Clear corrupted duplicates instead of rendering colliding keys.
      hadCorruption = true;
      continue;
    }

    seen.add(row.id);
    cleaned.push({ ...row });
  }

  if (cleaned.length === 0) {
    return { items: freshSample(), hadCorruption: true };
  }

  return { items: cleaned, hadCorruption };
}

function clearLegacyKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function loadGroceryList(): GroceryListState {
  if (typeof window === "undefined") {
    return freshSample();
  }

  clearLegacyKeys();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return freshSample();
    }

    const parsed = JSON.parse(raw) as unknown;
    const { items, hadCorruption } = sanitizeGroceryList(parsed);

    if (hadCorruption) {
      // Rewrite so duplicate-key corruption does not persist.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    return items;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      clearLegacyKeys();
    } catch {
      // ignore
    }
    return freshSample();
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
  const fresh = freshSample();
  if (typeof window !== "undefined") {
    try {
      clearLegacyKeys();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        clearLegacyKeys();
      } catch {
        // ignore
      }
    }
  }
  return fresh;
}

/** Ensure every item has a unique id; assign new ones if missing/colliding. */
export function ensureUniqueItemIds(
  items: GroceryItem[],
): GroceryListState {
  const seen = new Set<string>();
  return items.map((item) => {
    let id = item.id;
    if (!id || seen.has(id)) {
      id = createItemId("item");
    }
    seen.add(id);
    return { ...item, id };
  });
}
