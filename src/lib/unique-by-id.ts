import type { GroceryItem } from "./types";

/** Keep first occurrence of each id — defensive for list keys. */
export function uniqueById(items: GroceryItem[]): GroceryItem[] {
  const seen = new Set<string>();
  const out: GroceryItem[] = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
