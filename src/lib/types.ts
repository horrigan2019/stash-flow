export type AisleId =
  | "produce"
  | "bakery-deli"
  | "meat-seafood"
  | "canned-dry"
  | "baking-spices"
  | "dairy"
  | "household"
  | "frozen";

export type TabId = "weekly-stash" | "feast-runway" | "pantry-settings";

export interface GroceryItem {
  id: string;
  name: string;
  aisleId: AisleId;
  checked: boolean;
}

export interface AisleMeta {
  id: AisleId;
  title: string;
  subtitle: string;
  lockedToBottom?: boolean;
}

export type GroceryListState = GroceryItem[];
