/**
 * Universal calendar export — RFC 5545 .ics Blob download + Google Calendar web intent.
 */

export interface CalendarEventInput {
  title: string;
  date: string; // YYYY-MM-DD (all-day / morning reminder)
  description: string;
  location?: string;
  /** Hour for VALARM / Google start, default 9 */
  alarmHour?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function icsEscape(text: string): string {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  // RFC 5545 line folding at 75 octets — approximate with 74 chars
  if (line.length <= 74) return line;
  let out = "";
  let rest = line;
  while (rest.length > 74) {
    out += rest.slice(0, 74) + "\r\n ";
    rest = rest.slice(74);
  }
  return out + rest;
}

function utcStamp(d = new Date()): string {
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

function dateToIcsDay(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate())
  );
}

export function buildIcsCalendar(events: CalendarEventInput[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oh Stuffing//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((ev, idx) => {
    const uid =
      "oh-stuffing-" +
      dateToIcsDay(ev.date) +
      "-" +
      idx +
      "-" +
      Math.random().toString(16).slice(2, 10) +
      "@ohstuffing.com";
    const day = dateToIcsDay(ev.date);
    const end = dateToIcsDay(nextDay(ev.date));
    const alarmHour = ev.alarmHour == null ? 9 : ev.alarmHour;

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
    // Reminder at 9:00 AM on the morning of the run (relative to all-day start)
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

export function downloadIcsFile(
  filename: string,
  events: CalendarEventInput[]
): void {
  const body = buildIcsCalendar(events);
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : filename + ".ics";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Google Calendar template URL (opens in new tab, prefilled). */
export function googleCalendarUrl(event: CalendarEventInput): string {
  const start = dateToIcsDay(event.date);
  const end = dateToIcsDay(nextDay(event.date));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    dates: start + "/" + end,
  });
  if (event.location) params.set("location", event.location);
  return "https://calendar.google.com/calendar/render?" + params.toString();
}

export function shoppingRunCalendarEvent(opts: {
  eventName: string;
  runNumber: number;
  runTitle: string;
  shoppingDate: string;
  itemNames: string[];
  appUrl?: string;
}): CalendarEventInput {
  const checklist = opts.itemNames.join(", ");
  const link = opts.appUrl || "https://www.ohstuffing.com/";
  return {
    title: `🛒 Oh Stuffing: ${opts.eventName} Run #${opts.runNumber} - ${opts.runTitle}`,
    date: opts.shoppingDate,
    description:
      "Shopping checklist:\n" +
      checklist +
      "\n\nOpen Oh Stuffing: " +
      link,
    location: "Grocery run",
    alarmHour: 9,
  };
}
