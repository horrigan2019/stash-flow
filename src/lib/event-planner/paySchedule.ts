/** Payday schedule persisted under localStorage key `oh_stuffing_pay_schedule`. */

export const PAY_SCHEDULE_KEY = "oh_stuffing_pay_schedule";

export type PayFrequency =
  | "biweekly"
  | "semimonthly"
  | "weekly"
  | "monthly";

export interface PaySchedule {
  enabled: boolean;
  frequency: PayFrequency;
  nextPayday: string; // YYYY-MM-DD
}

export const DEFAULT_PAY_SCHEDULE: PaySchedule = {
  enabled: false,
  frequency: "biweekly",
  nextPayday: "",
};

export function loadPaySchedule(
  storage: Storage | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): PaySchedule {
  if (!storage) return { ...DEFAULT_PAY_SCHEDULE };
  try {
    const raw = storage.getItem(PAY_SCHEDULE_KEY);
    if (!raw) return { ...DEFAULT_PAY_SCHEDULE };
    const parsed = JSON.parse(raw) as Partial<PaySchedule>;
    return {
      enabled: Boolean(parsed.enabled),
      frequency: normalizeFrequency(parsed.frequency),
      nextPayday:
        typeof parsed.nextPayday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextPayday)
          ? parsed.nextPayday
          : "",
    };
  } catch {
    return { ...DEFAULT_PAY_SCHEDULE };
  }
}

export function savePaySchedule(
  schedule: PaySchedule,
  storage: Storage | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): void {
  if (!storage) return;
  storage.setItem(PAY_SCHEDULE_KEY, JSON.stringify(schedule));
}

function normalizeFrequency(value: unknown): PayFrequency {
  if (
    value === "biweekly" ||
    value === "semimonthly" ||
    value === "weekly" ||
    value === "monthly"
  ) {
    return value;
  }
  return "biweekly";
}

/** Inclusive list of payday dates from `nextPayday` through the day before `eventDate`. */
export function listPaydaysBeforeEvent(
  schedule: PaySchedule,
  eventDate: string,
  today: string
): string[] {
  if (!schedule.enabled || !schedule.nextPayday || !eventDate) return [];
  const start =
    schedule.nextPayday < today ? schedule.nextPayday : schedule.nextPayday;
  const out: string[] = [];
  let cursor = start;

  // Walk forward from next payday; also include any computed earlier paydays
  // that still fall between today and the event when nextPayday is after today.
  if (schedule.frequency === "semimonthly") {
    const from = today < schedule.nextPayday ? today : schedule.nextPayday;
    return listSemimonthlyPaydays(from, eventDate, schedule.nextPayday);
  }

  // Safety cap
  for (let i = 0; i < 48; i++) {
    if (cursor >= eventDate) break;
    if (cursor >= today) out.push(cursor);
    cursor = addDaysIso(cursor, frequencyStepDays(schedule.frequency, cursor));
  }

  // If next payday is after today, also step backward to catch an earlier payday still before the event
  if (schedule.nextPayday > today) {
    let back = schedule.nextPayday;
    for (let i = 0; i < 24; i++) {
      back = addDaysIso(back, -frequencyStepDays(schedule.frequency, back));
      if (back < today) break;
      if (back < eventDate && !out.includes(back)) out.push(back);
    }
  }

  return Array.from(new Set(out)).sort();
}

function frequencyStepDays(frequency: PayFrequency, fromIso: string): number {
  if (frequency === "weekly") return 7;
  if (frequency === "biweekly") return 14;
  if (frequency === "monthly") {
    const d = parseIso(fromIso);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return Math.round((next.getTime() - d.getTime()) / 86400000);
  }
  return 14;
}

function listSemimonthlyPaydays(
  from: string,
  eventDate: string,
  anchor: string
): string[] {
  // Prefer 1st & 15th; if user's next payday is neither, keep that day-of-month + 15th/1st pattern from anchor.
  const anchorDay = parseInt(anchor.slice(8, 10), 10);
  const days =
    anchorDay === 1 || anchorDay === 15
      ? [1, 15]
      : [anchorDay, anchorDay <= 15 ? anchorDay + 14 : Math.max(1, anchorDay - 14)].sort(
          (a, b) => a - b
        );

  const out: string[] = [];
  const start = parseIso(from);
  const end = parseIso(eventDate);
  let y = start.getFullYear();
  let m = start.getMonth();
  for (let i = 0; i < 36; i++) {
    for (const day of days) {
      const d = new Date(y, m, day);
      const iso = toIso(d);
      if (iso >= from && iso < eventDate) out.push(iso);
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    if (new Date(y, m, 1) > end) break;
  }
  return Array.from(new Set(out)).sort();
}

export function nearestPriorPayday(
  targetDate: string,
  paydays: string[],
  fallback: string
): string {
  let best = "";
  for (const p of paydays) {
    if (p <= targetDate && p > best) best = p;
  }
  return best || fallback || targetDate;
}

export function addDaysIso(dateStr: string, n: number): string {
  const d = parseIso(dateStr);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

function parseIso(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function toIso(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function formatShortDate(dateStr: string): string {
  const d = parseIso(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
