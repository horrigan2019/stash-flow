import {
  formatShortDate,
  listPaydaysBeforeEvent,
  nearestPriorPayday,
} from "./pay-schedule.js";
import { bucketEventItems } from "./shelf-buckets.js";

export function buildEventShoppingPlan(eventDate, today, items, schedule) {
  var buckets = bucketEventItems(items, eventDate, today);
  var paydays = listPaydaysBeforeEvent(schedule, eventDate, today);
  var payEnabled = !!(schedule && schedule.enabled && paydays.length);

  var runs = buckets.map(function (bucket) {
    return alignBucket(bucket, paydays, payEnabled, today);
  });
  runs.sort(function (a, b) {
    return a.shoppingDate < b.shoppingDate ? -1 : 1;
  });
  return { runs: runs, paydays: paydays, payScheduleEnabled: payEnabled };
}

function alignBucket(bucket, paydays, payEnabled, today) {
  var shoppingDate = bucket.preferredDate;
  var paydayTagged = false;
  if (payEnabled && paydays.length) {
    if (bucket.runId === 3) {
      var near = nearestPriorPayday(bucket.preferredDate, paydays, "");
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
      paydayTagged = paydays.indexOf(shoppingDate) !== -1;
    }
  }
  if (shoppingDate < today) shoppingDate = today;
  var count = bucket.items.length;
  var countLabel = count + " item" + (count === 1 ? "" : "s");
  var dateLabel = formatShortDate(shoppingDate);
  var label = paydayTagged
    ? "Payday Run: " + dateLabel + " — " + bucket.title + " (" + countLabel + ")"
    : "Shopping Run: " + dateLabel + " — " + bucket.title + " (" + countLabel + ")";
  return {
    runId: bucket.runId,
    title: bucket.title,
    subtitle: bucket.subtitle,
    shoppingDate: shoppingDate,
    paydayTagged: paydayTagged,
    label: label,
    items: bucket.items,
  };
}

function daysBetween(a, b) {
  return Math.round(
    (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000
  );
}
