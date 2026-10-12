import {
  type PaySchedule,
  formatShortDate,
  listPaydaysBeforeEvent,
  nearestPriorPayday,
} from "./paySchedule";
import {
  type EventPlanItem,
  type ShoppingRunBucket,
  bucketEventItems,
} from "./shelfLifeBuckets";

export interface AlignedShoppingRun {
  runId: number;
  title: string;
  subtitle: string;
  shoppingDate: string;
  paydayTagged: boolean;
  label: string;
  items: EventPlanItem[];
}

export interface EventShoppingPlan {
  runs: AlignedShoppingRun[];
  paydays: string[];
  payScheduleEnabled: boolean;
}

export function buildEventShoppingPlan(opts: {
  eventName: string;
  eventDate: string;
  today: string;
  items: EventPlanItem[];
  schedule: PaySchedule;
  addDays: (date: string, n: number) => string;
}): EventShoppingPlan {
  const buckets = bucketEventItems(
    opts.items,
    opts.eventDate,
    opts.today,
    opts.addDays
  );
  const paydays = listPaydaysBeforeEvent(
    opts.schedule,
    opts.eventDate,
    opts.today
  );

  const runs: AlignedShoppingRun[] = buckets.map((bucket) =>
    alignBucket(bucket, paydays, opts.schedule.enabled, opts.today)
  );

  // Keep chronological order for display
  runs.sort((a, b) => (a.shoppingDate < b.shoppingDate ? -1 : 1));

  return {
    runs,
    paydays,
    payScheduleEnabled: opts.schedule.enabled && paydays.length > 0,
  };
}

function alignBucket(
  bucket: ShoppingRunBucket,
  paydays: string[],
  payEnabled: boolean,
  today: string
): AlignedShoppingRun {
  let shoppingDate = bucket.preferredDate;
  let paydayTagged = false;

  if (payEnabled && paydays.length) {
    // Final fresh run prefers staying close to the event; only snap if a payday
    // is within 3 days before preferred date.
    if (bucket.runId === 3) {
      const near = nearestPriorPayday(bucket.preferredDate, paydays, "");
      if (near && daysBetween(near, bucket.preferredDate) <= 3) {
        shoppingDate = near;
        paydayTagged = true;
      }
    } else {
      shoppingDate = nearestPriorPayday(
        bucket.preferredDate,
        paydays,
        bucket.preferredDate
      );
      paydayTagged = paydays.includes(shoppingDate);
    }
  }

  if (shoppingDate < today) shoppingDate = today;

  const count = bucket.items.length;
  const countLabel = count + " item" + (count === 1 ? "" : "s");
  const dateLabel = formatShortDate(shoppingDate);
  const label = paydayTagged
    ? `Payday Run: ${dateLabel} — ${bucket.title} (${countLabel})`
    : `Shopping Run: ${dateLabel} — ${bucket.title} (${countLabel})`;

  return {
    runId: bucket.runId,
    title: bucket.title,
    subtitle: bucket.subtitle,
    shoppingDate,
    paydayTagged,
    label,
    items: bucket.items,
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() -
      new Date(a + "T00:00:00").getTime()) /
      86400000
  );
}
