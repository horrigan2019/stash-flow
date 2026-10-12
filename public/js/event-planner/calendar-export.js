function pad(n) {
  return String(n).padStart(2, "0");
}

function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line) {
  if (line.length <= 74) return line;
  var out = "";
  var rest = line;
  while (rest.length > 74) {
    out += rest.slice(0, 74) + "\r\n ";
    rest = rest.slice(74);
  }
  return out + rest;
}

function utcStamp(d) {
  d = d || new Date();
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function dateToIcsDay(dateStr) {
  return String(dateStr || "").replace(/-/g, "");
}

function nextDay(dateStr) {
  var d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate())
  );
}

export function buildIcsCalendar(events) {
  var lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oh Stuffing//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  (events || []).forEach(function (ev, idx) {
    var uid =
      "oh-stuffing-" +
      dateToIcsDay(ev.date) +
      "-" +
      idx +
      "-" +
      Math.random().toString(16).slice(2, 10) +
      "@ohstuffing.com";
    var day = dateToIcsDay(ev.date);
    var end = dateToIcsDay(nextDay(ev.date));
    var alarmHour = ev.alarmHour == null ? 9 : ev.alarmHour;
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + uid);
    lines.push("DTSTAMP:" + utcStamp());
    lines.push("DTSTART;VALUE=DATE:" + day);
    lines.push("DTEND;VALUE=DATE:" + end);
    lines.push(foldLine("SUMMARY:" + icsEscape(ev.title)));
    lines.push(foldLine("DESCRIPTION:" + icsEscape(ev.description)));
    if (ev.location) {
      lines.push(foldLine("LOCATION:" + icsEscape(ev.location)));
    }
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push("DESCRIPTION:Oh Stuffing shopping reminder");
    lines.push("TRIGGER;VALUE=DATE-TIME:" + day + "T" + pad(alarmHour) + "0000");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcsFile(filename, events) {
  var body = buildIcsCalendar(events);
  var blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = /\.ics$/i.test(filename) ? filename : filename + ".ics";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1500);
}

export function googleCalendarUrl(event) {
  var start = dateToIcsDay(event.date);
  var end = dateToIcsDay(nextDay(event.date));
  var params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    dates: start + "/" + end,
  });
  if (event.location) params.set("location", event.location);
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

export function shoppingRunCalendarEvent(opts) {
  var checklist = (opts.itemNames || []).join(", ");
  var link = opts.appUrl || "https://www.ohstuffing.com/";
  return {
    title:
      "🛒 Oh Stuffing: " +
      opts.eventName +
      " Run #" +
      opts.runNumber +
      " - " +
      opts.runTitle,
    date: opts.shoppingDate,
    description:
      "Shopping checklist:\n" + checklist + "\n\nOpen Oh Stuffing: " + link,
    location: "Grocery run",
    alarmHour: 9,
  };
}
