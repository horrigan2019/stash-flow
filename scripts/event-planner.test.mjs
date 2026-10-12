import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../public/js/event-planner");

const pay = await import(pathToFileURL(join(root, "pay-schedule.js")).href);
const buckets = await import(pathToFileURL(join(root, "shelf-buckets.js")).href);
const align = await import(pathToFileURL(join(root, "payday-align.js")).href);
const cal = await import(pathToFileURL(join(root, "calendar-export.js")).href);

function test(name, fn) {
  fn();
  console.log("ok - " + name);
}

test("biweekly paydays before event", () => {
  const schedule = {
    enabled: true,
    frequency: "biweekly",
    nextPayday: "2026-10-16",
  };
  const days = pay.listPaydaysBeforeEvent(schedule, "2026-11-27", "2026-10-12");
  assert.ok(days.includes("2026-10-16"));
  assert.ok(days.includes("2026-10-30"));
  assert.ok(!days.includes("2026-11-27"));
});

test("shelf buckets split pantry vs fresh", () => {
  const items = [
    { text: "chicken broth", dept: "pantry" },
    { text: "butter", dept: "dairy" },
    { text: "fresh parsley", dept: "produce" },
    { text: "dinner rolls", dept: "bakery" },
  ];
  const b = buckets.bucketEventItems(items, "2026-11-27", "2026-10-12");
  const titles = b.map((x) => x.title).join("|");
  assert.match(titles, /Pantry/);
  assert.match(titles, /Fresh/);
  const early = b.find((x) => x.runId === 1);
  assert.ok(early.items.some((i) => /broth/i.test(i.text)));
});

test("payday alignment tags early run", () => {
  const plan = align.buildEventShoppingPlan(
    "2026-11-27",
    "2026-10-12",
    [
      { text: "flour", dept: "baking" },
      { text: "frozen corn", dept: "frozen" },
      { text: "heavy cream", dept: "dairy" },
    ],
    { enabled: true, frequency: "biweekly", nextPayday: "2026-10-16" }
  );
  assert.ok(plan.runs.length >= 1);
  assert.ok(plan.paydays.length >= 1);
});

test("ics contains VEVENT and VALARM", () => {
  const ics = cal.buildIcsCalendar([
    {
      title: "🛒 Oh Stuffing: Thanksgiving Run #1 - Pantry",
      date: "2026-10-16",
      description: "Broth, Flour",
      alarmHour: 9,
    },
  ]);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /VALARM/);
  assert.match(ics, /SUMMARY:/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261016/);
});

test("google calendar url is a template intent", () => {
  const url = cal.googleCalendarUrl({
    title: "Test",
    date: "2026-10-16",
    description: "Items",
  });
  assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(url, /action=TEMPLATE/);
  assert.match(url, /dates=20261016/);
});

console.log("event-planner tests passed");
