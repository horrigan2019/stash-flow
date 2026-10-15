import type { AisleMeta } from "./types";

/** Store walk order — Frozen stays pinned at the bottom. */
export const AISLES: AisleMeta[] = [
  { id: "produce", title: "Produce", subtitle: "Entrance" },
  { id: "bakery-deli", title: "Bakery & Deli", subtitle: "Warm counters" },
  { id: "meat-seafood", title: "Meat & Seafood", subtitle: "Butcher & fish" },
  { id: "canned-dry", title: "Canned & Dry Goods", subtitle: "Center aisles" },
  { id: "baking-spices", title: "Baking & Spices", subtitle: "Pantry staples" },
  { id: "dairy", title: "Dairy & Refrigerated", subtitle: "Cold wall" },
  { id: "household", title: "Household & Paper", subtitle: "End caps" },
  {
    id: "frozen",
    title: "Frozen",
    subtitle: "Last stop — keep cold",
    lockedToBottom: true,
  },
];
