export var PAY_SCHEDULE_KEY = "oh_stuffing_pay_schedule";

export var DEFAULT_PAY_SCHEDULE = {
  enabled: false,
  frequency: "biweekly",
  nextPayday: "",
};

export function loadPaySchedule() {
  try {
    var raw = localStorage.getItem(PAY_SCHEDULE_KEY);
    if (!raw) return Object.assign({}, DEFAULT_PAY_SCHEDULE);
    var parsed = JSON.parse(raw);
    var freq = parsed && parsed.frequency;
    if (
      freq !== "biweekly" &&
      freq !== "semimonthly" &&
      freq !== "weekly" &&
      freq !== "monthly"
    ) {
      freq = "biweekly";
    }
    return {
      enabled: !!(parsed && parsed.enabled),
      frequency: freq,
      nextPayday:
        parsed &&
        typeof parsed.nextPayday === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextPayday)
          ? parsed.nextPayday
          : "",
    };
  } catch (e) {
    return Object.assign({}, DEFAULT_PAY_SCHEDULE);
  }
}

export function savePaySchedule(schedule) {
  try {
    localStorage.setItem(PAY_SCHEDULE_KEY, JSON.stringify(schedule));
  } catch (e) {
    /* ignore quota */
  }
}

export function addDaysIso(dateStr, n) {
  var d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function formatShortDate(dateStr) {
  var d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function listPaydaysBeforeEvent(schedule, eventDate, today) {
  if (!schedule || !schedule.enabled || !schedule.nextPayday || !eventDate) {
    return [];
  }
  if (schedule.frequency === "semimonthly") {
    var from = today < schedule.nextPayday ? today : schedule.nextPayday;
    return listSemimonthly(from, eventDate, schedule.nextPayday);
  }

  var out = [];
  var cursor = schedule.nextPayday;
  var i;
  for (i = 0; i < 48; i++) {
    if (cursor >= eventDate) break;
    if (cursor >= today) out.push(cursor);
    cursor = addDaysIso(cursor, stepDays(schedule.frequency, cursor));
  }
  if (schedule.nextPayday > today) {
    var back = schedule.nextPayday;
    for (i = 0; i < 24; i++) {
      back = addDaysIso(back, -stepDays(schedule.frequency, back));
      if (back < today) break;
      if (back < eventDate && out.indexOf(back) === -1) out.push(back);
    }
  }
  return uniqueSort(out);
}

function stepDays(frequency, fromIso) {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  if (frequency === "monthly") {
    var d = new Date(fromIso + "T00:00:00");
    var next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return Math.round((next - d) / 86400000);
  }
  return 14;
}

function listSemimonthly(from, eventDate, anchor) {
  var anchorDay = parseInt(anchor.slice(8, 10), 10);
  var days =
    anchorDay === 1 || anchorDay === 15
      ? [1, 15]
      : [anchorDay, anchorDay <= 15 ? anchorDay + 14 : Math.max(1, anchorDay - 14)].sort(
          function (a, b) {
            return a - b;
          }
        );
  var out = [];
  var start = new Date(from + "T00:00:00");
  var end = new Date(eventDate + "T00:00:00");
  var y = start.getFullYear();
  var m = start.getMonth();
  for (var i = 0; i < 36; i++) {
    for (var j = 0; j < days.length; j++) {
      var d = new Date(y, m, days[j]);
      var iso =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0");
      if (iso >= from && iso < eventDate) out.push(iso);
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    if (new Date(y, m, 1) > end) break;
  }
  return uniqueSort(out);
}

export function nearestPriorPayday(targetDate, paydays, fallback) {
  var best = "";
  for (var i = 0; i < (paydays || []).length; i++) {
    var p = paydays[i];
    if (p <= targetDate && p > best) best = p;
  }
  return best || fallback || targetDate;
}

function uniqueSort(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function (x) {
    if (!seen[x]) {
      seen[x] = true;
      out.push(x);
    }
  });
  return out.sort();
}
