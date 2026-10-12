/** Shelf-life buckets for holiday / event shopping runs. */

export type RunId = 1 | 2 | 3;

export interface EventPlanItem {
  text: string;
  dept?: string;
  earliestBuyDate?: string;
  addedToList?: boolean;
}

export interface ShoppingRunBucket {
  runId: RunId;
  key: "early" | "mid" | "fresh";
  title: string;
  subtitle: string;
  /** Preferred buy date relative to event (before payday snap). */
  preferredDate: string;
  items: EventPlanItem[];
}

const RUN1_DEPTS = new Set([
  "pantry",
  "frozen",
  "breakfast",
  "baking",
  "condiments",
  "pasta",
  "snacks",
  "beverages",
  "household",
  "pets",
  "personal",
  "decorations",
]);

const RUN2_KEYWORDS =
  /\b(butter|onion|onions|potato|potatoes|squash|carrot|carrots|celery|cabbage|garlic|cured|bacon|ham|salami|sausage|cheese|yogurt|milk|eggs?|cream cheese)\b/i;

const RUN3_KEYWORDS =
  /\b(herb|herbs|parsley|cilantro|basil|dill|mint|lettuce|spinach|salad|greens?|arugula|berries|strawberry|raspberr|blueberr|cream|heavy cream|half.?and.?half|rolls?|bakery|bread|baguette|fresh|tomato|tomatoes|cucumber|avocado|berries)\b/i;

const RUN1_KEYWORDS =
  /\b(broth|stock|flour|sugar|spice|canned|frozen|oil|vinegar|baking|pumpkin|stuffing mix|gravy mix|cranberry sauce|rice|pasta|beans|dry)\b/i;

/**
 * Split event items into 3 shelf-life runs.
 * Existing earliestBuyDate / dept classification is used when present; keywords fill gaps.
 */
export function bucketEventItems(
  items: EventPlanItem[],
  eventDate: string,
  today: string,
  addDays: (date: string, n: number) => string
): ShoppingRunBucket[] {
  const active = (items || []).filter((it) => it && it.text && !it.addedToList);
  const early: EventPlanItem[] = [];
  const mid: EventPlanItem[] = [];
  const fresh: EventPlanItem[] = [];

  active.forEach((it) => {
    const run = classifyItemRun(it);
    if (run === 1) early.push(it);
    else if (run === 2) mid.push(it);
    else fresh.push(it);
  });

  const freshPreferred = maxDate(today, addDays(eventDate, -2));
  const midPreferred = maxDate(today, addDays(eventDate, -10));
  const earlyPreferred = maxDate(today, addDays(eventDate, -21));

  return [
    {
      runId: 1,
      key: "early",
      title: "Pantry & Frozen Staples",
      subtitle: "Long shelf-life — broths, baking, spices, frozen",
      preferredDate: earlyPreferred,
      items: early,
    },
    {
      runId: 2,
      key: "mid",
      title: "Mid Staples",
      subtitle: "Butter, cured meats, hardy veggies",
      preferredDate: midPreferred,
      items: mid,
    },
    {
      runId: 3,
      key: "fresh",
      title: "Final Fresh Run",
      subtitle: "1–3 days before — herbs, greens, bakery, cream",
      preferredDate: freshPreferred,
      items: fresh,
    },
  ].filter((b) => b.items.length > 0) as ShoppingRunBucket[];
}

export function classifyItemRun(item: EventPlanItem): RunId {
  const text = String(item.text || "");
  const dept = String(item.dept || "").toLowerCase();

  if (RUN3_KEYWORDS.test(text) || dept === "produce" || dept === "bakery" || dept === "deli") {
    // Hardy produce stays mid
    if (/\b(potato|onion|squash|carrot|garlic|cabbage|celery)\b/i.test(text)) {
      return 2;
    }
    return 3;
  }
  if (dept === "meat" || dept === "dairy" || RUN2_KEYWORDS.test(text)) {
    return 2;
  }
  if (RUN1_DEPTS.has(dept) || RUN1_KEYWORDS.test(text) || dept === "frozen") {
    return 1;
  }
  // Fallback: use earliestBuyDate lead if present later; default mid
  return 2;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}
