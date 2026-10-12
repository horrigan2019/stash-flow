"use client";

import { useEffect, useState } from "react";
import {
  type PayFrequency,
  type PaySchedule,
  DEFAULT_PAY_SCHEDULE,
  loadPaySchedule,
  savePaySchedule,
} from "@/lib/event-planner/paySchedule";

const FREQUENCIES: { id: PayFrequency; label: string }[] = [
  { id: "biweekly", label: "Every 2 Weeks / Bi-Weekly" },
  { id: "semimonthly", label: "Twice a Month (1st & 15th)" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export interface PaydaySchedulePanelProps {
  onChange?: (schedule: PaySchedule) => void;
}

export function PaydaySchedulePanel({ onChange }: PaydaySchedulePanelProps) {
  const [schedule, setSchedule] = useState<PaySchedule>(DEFAULT_PAY_SCHEDULE);

  useEffect(() => {
    const loaded = loadPaySchedule();
    setSchedule(loaded);
    onChange?.(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(partial: Partial<PaySchedule>) {
    const next = { ...schedule, ...partial };
    setSchedule(next);
    savePaySchedule(next);
    onChange?.(next);
  }

  return (
    <section className="rounded-xl border border-[var(--border,#E4DCC9)] bg-[var(--surface,#fff)] p-3">
      <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={schedule.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Align shopping runs with my pay schedule 💰
      </label>

      {schedule.enabled ? (
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-[var(--muted,#6B6255)]">
            Pay Frequency
            <select
              className="mt-1 min-h-12 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 text-sm"
              value={schedule.frequency}
              onChange={(e) =>
                update({ frequency: e.target.value as PayFrequency })
              }
            >
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--muted,#6B6255)]">
            Next Payday
            <input
              type="date"
              className="mt-1 min-h-12 w-full rounded-lg border border-[var(--border,#E4DCC9)] bg-transparent px-3 text-sm"
              value={schedule.nextPayday}
              onChange={(e) => update({ nextPayday: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
