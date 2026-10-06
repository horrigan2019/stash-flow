"use client";

import { useMemo, useState } from "react";
import {
  Car,
  CheckSquare,
  ClipboardList,
  Home,
  Printer,
  Square,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  CALL_SHEET_QUESTIONS,
  IZZY_EDUCATIONAL_DISCLAIMER,
  US_STATES,
  WORKFLOWS,
  getWorkflow,
  isValidVin,
  normalizeVin,
  nuancesForState,
  type UsState,
  type WorkflowId,
} from "@/lib/izzy/checklists";

const WORKFLOW_ICONS: Record<WorkflowId, typeof Car> = {
  "add-vehicle": Car,
  "add-driver": UserPlus,
  "home-closing": Home,
  "remove-driver-vehicle": UserMinus,
};

export function ChangeChecklist() {
  const [workflowId, setWorkflowId] = useState<WorkflowId>("add-vehicle");
  const [state, setState] = useState<UsState | "">("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [showCallSheet, setShowCallSheet] = useState(false);

  const workflow = getWorkflow(workflowId);
  const nuances = useMemo(
    () => nuancesForState(state, workflowId),
    [state, workflowId],
  );

  const vinValue = values.vin ?? "";
  const vinOk = vinValue.length === 0 || isValidVin(vinValue);
  const vinReady = isValidVin(vinValue);

  const itemReady = (id: string) => {
    const item = workflow.items.find((i) => i.id === id);
    if (!item) return false;
    if (item.kind === "vin") return vinReady;
    if (item.kind === "checkbox" || !item.kind) return Boolean(checked[id]);
    return Boolean((values[id] ?? "").trim());
  };

  const completedCount = workflow.items.filter((item) => itemReady(item.id)).length;
  const progress = Math.round((completedCount / workflow.items.length) * 100);

  function selectWorkflow(id: WorkflowId) {
    setWorkflowId(id);
    setChecked({});
    setValues({});
    setShowCallSheet(false);
  }

  function toggleItem(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setField(id: string, raw: string) {
    if (id === "vin") {
      const next = normalizeVin(raw);
      setValues((prev) => ({ ...prev, vin: next }));
      return;
    }
    setValues((prev) => ({ ...prev, [id]: raw }));
  }

  function generateCallSheet() {
    setShowCallSheet(true);
    requestAnimationFrame(() => {
      window.print();
    });
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <header className="mb-5 print:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#3F6B4A]">
          Izzy · Policy changes
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-amber-950">
          Change Checklist
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Gather what carriers ask for, then generate a one-page call sheet.
        </p>
      </header>

      <label className="mb-4 block print:hidden">
        <span className="mb-1.5 block text-xs font-semibold text-amber-950">
          Your state
        </span>
        <select
          value={state}
          onChange={(e) => setState(e.target.value as UsState | "")}
          className="w-full rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
          aria-label="Select US state for nuances"
        >
          <option value="">Select state for local nuances</option>
          {US_STATES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 grid grid-cols-2 gap-2 print:hidden">
        {WORKFLOWS.map((w) => {
          const Icon = WORKFLOW_ICONS[w.id];
          const active = w.id === workflowId;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => selectWorkflow(w.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[#3F6B4A]/40 bg-[#3F6B4A]/12 text-[#2C4A34]"
                  : "border-amber-200/70 bg-white/70 text-amber-950 hover:bg-amber-50/80"
              }`}
              aria-pressed={active}
            >
              <Icon className="mb-1.5 h-4 w-4" aria-hidden />
              <span className="block text-xs font-semibold leading-snug">
                {w.title}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mb-4 rounded-2xl border border-amber-200/70 bg-white/70 p-4 print:hidden">
        <div className="mb-2 flex items-start gap-2">
          <ClipboardList
            className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6B4A]"
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold text-amber-950">
              {workflow.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{workflow.summary}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs font-medium text-neutral-500">
            <span>
              {completedCount} of {workflow.items.length} ready
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-[#3F6B4A] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {nuances.length > 0 ? (
        <section className="mb-4 space-y-2 print:hidden" aria-label="State nuances">
          {nuances.map((nuance) => (
            <div
              key={nuance.id}
              className="rounded-2xl border border-[#3F6B4A]/25 bg-[#3F6B4A]/08 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2C4A34]">
                {state} nuance · {nuance.title}
              </p>
              <p className="mt-1 text-sm text-neutral-700">{nuance.detail}</p>
            </div>
          ))}
        </section>
      ) : null}

      <ul className="mb-4 space-y-2 print:hidden">
        {workflow.items.map((item) => {
          const kind = item.kind ?? "checkbox";
          const ready = itemReady(item.id);

          if (kind === "vin" || kind === "text" || kind === "date" || kind === "number") {
            const inputType =
              kind === "date" ? "date" : kind === "number" ? "number" : "text";
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-amber-200/70 bg-white/70 px-3 py-3"
              >
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                    {ready ? (
                      <CheckSquare className="h-4 w-4 text-[#3F6B4A]" aria-hidden />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-400" aria-hidden />
                    )}
                    {item.label}
                    {item.required ? (
                      <span className="text-[#3F6B4A]">*</span>
                    ) : null}
                  </span>
                  {item.hint ? (
                    <span className="mt-0.5 block pl-6 text-xs text-neutral-500">
                      {item.hint}
                    </span>
                  ) : null}
                  <input
                    type={inputType}
                    inputMode={kind === "vin" ? "text" : undefined}
                    autoCapitalize={kind === "vin" ? "characters" : undefined}
                    value={values[item.id] ?? ""}
                    onChange={(e) => setField(item.id, e.target.value)}
                    placeholder={kind === "vin" ? "e.g. 1HGBH41JXMN109186" : undefined}
                    maxLength={kind === "vin" ? 17 : undefined}
                    className={`mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-amber-300 focus:ring-2 ${
                      kind === "vin" && !vinOk
                        ? "border-red-400"
                        : "border-amber-200/80"
                    }`}
                    aria-invalid={kind === "vin" && !vinOk}
                  />
                  {kind === "vin" && values.vin ? (
                    <span
                      className={`mt-1 block pl-0 text-xs ${
                        vinOk ? "text-[#2C4A34]" : "text-red-700"
                      }`}
                    >
                      {vinOk
                        ? "VIN format looks valid (17 characters)."
                        : `Need 17 valid characters (${values.vin.length}/17). No I, O, or Q.`}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-amber-200/70 bg-white/70 px-3 py-3 text-left transition hover:bg-amber-50/60"
              >
                {checked[item.id] ? (
                  <CheckSquare
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#3F6B4A]"
                    aria-hidden
                  />
                ) : (
                  <Square
                    className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400"
                    aria-hidden
                  />
                )}
                <span>
                  <span className="block text-sm font-semibold text-amber-950">
                    {item.label}
                    {item.required ? (
                      <span className="ml-1 text-[#3F6B4A]">*</span>
                    ) : null}
                  </span>
                  {item.hint ? (
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {item.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mb-4 block print:hidden">
        <span className="mb-1.5 block text-xs font-semibold text-amber-950">
          Policyholder notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Policy #, carrier, agent name, effective date requested…"
          className="w-full resize-none rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
        />
      </label>

      <div className="mb-4 flex flex-col gap-2 print:hidden sm:flex-row">
        <button
          type="button"
          onClick={() => setShowCallSheet((v) => !v)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-200/70"
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
          {showCallSheet ? "Hide call sheet" : "Preview call sheet"}
        </button>
        <button
          type="button"
          onClick={generateCallSheet}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3F6B4A] px-4 py-3 text-sm font-bold text-[#F7FBF5] transition hover:bg-[#355a3f]"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Generate Call Sheet
        </button>
      </div>

      <section
        id="izzy-call-sheet"
        hidden={!showCallSheet}
        className="izzy-call-sheet rounded-2xl border border-neutral-300 bg-white p-5 text-neutral-900"
        aria-label="Izzy Cheat Sheet: Ready to Call My Insurance Carrier"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-neutral-950">
          Izzy Cheat Sheet: Ready to Call My Insurance Carrier
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Workflow: {workflow.title}
          {state ? ` · State: ${state}` : ""}
        </p>

        <div className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
            Required items checklist
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {workflow.items.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span aria-hidden>{itemReady(item.id) ? "☑" : "☐"}</span>
                <span>
                  <strong>{item.label}</strong>
                  {values[item.id]?.trim() ? (
                    <span className="block text-neutral-700">
                      {values[item.id]}
                    </span>
                  ) : null}
                  {item.hint && !values[item.id]?.trim() ? (
                    <span className="block text-neutral-600">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {nuances.length > 0 ? (
          <div className="mt-4 border-t border-neutral-200 pt-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
              State guidance
            </h3>
            {nuances.map((n) => (
              <p key={n.id} className="mt-1 text-sm text-neutral-700">
                <strong>{n.title}:</strong> {n.detail}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-4 border-t border-neutral-200 pt-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
            Policyholder notes
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
            {notes.trim() || "—"}
          </p>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
            Questions to ask the rep
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {CALL_SHEET_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>

        <p className="mt-5 border-t border-neutral-200 pt-3 text-xs leading-relaxed text-neutral-500">
          {IZZY_EDUCATIONAL_DISCLAIMER}
        </p>
      </section>
    </div>
  );
}
