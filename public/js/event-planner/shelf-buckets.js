import { addDaysIso } from "./pay-schedule.js";

var RUN1_DEPTS = {
  pantry: 1,
  frozen: 1,
  breakfast: 1,
  baking: 1,
  condiments: 1,
  pasta: 1,
  snacks: 1,
  beverages: 1,
  household: 1,
  pets: 1,
  personal: 1,
  decorations: 1,
};

var RUN2_KEYWORDS =
  /\b(butter|onion|onions|potato|potatoes|squash|carrot|carrots|celery|cabbage|garlic|cured|bacon|ham|salami|sausage|cheese|yogurt|milk|eggs?|cream cheese)\b/i;
var RUN3_KEYWORDS =
  /\b(herb|herbs|parsley|cilantro|basil|dill|mint|lettuce|spinach|salad|greens?|arugula|berries|strawberry|raspberr|blueberr|cream|heavy cream|half.?and.?half|rolls?|bakery|bread|baguette|fresh|tomato|tomatoes|cucumber|avocado)\b/i;
var RUN1_KEYWORDS =
  /\b(broth|stock|flour|sugar|spice|canned|frozen|oil|vinegar|baking|pumpkin|stuffing mix|gravy mix|cranberry sauce|rice|pasta|beans|dry)\b/i;

export function classifyItemRun(item) {
  var text = String((item && item.text) || "");
  var dept = String((item && item.dept) || "").toLowerCase();
  if (
    RUN3_KEYWORDS.test(text) ||
    dept === "produce" ||
    dept === "bakery" ||
    dept === "deli"
  ) {
    if (/\b(potato|onion|squash|carrot|garlic|cabbage|celery)\b/i.test(text)) {
      return 2;
    }
    return 3;
  }
  if (dept === "meat" || dept === "dairy" || RUN2_KEYWORDS.test(text)) return 2;
  if (RUN1_DEPTS[dept] || RUN1_KEYWORDS.test(text) || dept === "frozen") return 1;
  return 2;
}

export function bucketEventItems(items, eventDate, today) {
  var active = (items || []).filter(function (it) {
    return it && it.text && !it.addedToList;
  });
  var early = [];
  var mid = [];
  var fresh = [];
  active.forEach(function (it) {
    var run = classifyItemRun(it);
    if (run === 1) early.push(it);
    else if (run === 2) mid.push(it);
    else fresh.push(it);
  });

  function maxDate(a, b) {
    return a > b ? a : b;
  }

  var buckets = [
    {
      runId: 1,
      title: "Pantry & Frozen Staples",
      subtitle: "Long shelf-life — broths, baking, spices, frozen",
      preferredDate: maxDate(today, addDaysIso(eventDate, -21)),
      items: early,
    },
    {
      runId: 2,
      title: "Mid Staples",
      subtitle: "Butter, cured meats, hardy veggies",
      preferredDate: maxDate(today, addDaysIso(eventDate, -10)),
      items: mid,
    },
    {
      runId: 3,
      title: "Final Fresh Run",
      subtitle: "1–3 days before — herbs, greens, bakery, cream",
      preferredDate: maxDate(today, addDaysIso(eventDate, -2)),
      items: fresh,
    },
  ];
  return buckets.filter(function (b) {
    return b.items.length > 0;
  });
}
