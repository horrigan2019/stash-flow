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
  US_STATES,
  WORKFLOWS,
  getWorkflow,
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
  const [notes, setNotes] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const workflow = getWorkflow(workflowId);
  const nuances = useMemo(
    () => nuancesForState(state, workflowId),
    [state, workflowId],
  );

  const completedCount = workflow.items.filter((item) => checked[item.id]).length;
  const progress = Math.round((completedCount / workflow.items.length) * 100);

  function selectWorkflow(id: WorkflowId) {
    setWorkflowId(id);
    setChecked({});
    setShowPrintPreview(false);
  }

  function toggleItem(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handlePrint() {
    setShowPrintPreview(true);
    // Allow the print sheet to paint before opening the dialog.
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
          Gather what carriers ask for before you call—then print a call sheet.
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
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6B4A]" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-amber-950">{workflow.title}</h2>
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
        <section
          className="mb-4 space-y-2 print:hidden"
          aria-label="State nuances"
        >
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
          const isOn = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-start gap-3 rounded-2xl border border-amber-200/70 bg-white/70 px-3 py-3 text-left transition hover:bg-amber-50/60"
              >
                {isOn ? (
                  <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-[#3F6B4A]" aria-hidden />
                ) : (
                  <Square className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
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
          Notes for the carrier call
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Policy #, agent name, effective date requested…"
          className="w-full resize-none rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
        />
      </label>

      <div className="mb-4 flex flex-col gap-2 print:hidden sm:flex-row">
        <button
          type="button"
          onClick={() => setShowPrintPreview((v) => !v)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-200/70"
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
          {showPrintPreview ? "Hide summary sheet" : "Show summary sheet"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#3F6B4A] px-4 py-3 text-sm font-bold text-[#F7FBF5] transition hover:bg-[#355a3f]"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Export / print
        </button>
      </div>

      <section
        id="izzy-print-summary"
        className={`${
          showPrintPreview ? "block" : "hidden"
        } print:block rounded-2xl border border-neutral-300 bg-white p-5 text-neutral-900`}
        aria-label="Printable carrier call summary"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Izzy carrier call summary
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Workflow: {workflow.title}
          {state ? ` · State: ${state}` : ""}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {workflow.items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span aria-hidden>{checked[item.id] ? "☑" : "☐"}</span>
              <span>
                <strong>{item.label}</strong>
                {item.hint ? (
                  <span className="block text-neutral-600">{item.hint}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {nuances.length > 0 ? (
          <div className="mt-4 border-t border-neutral-200 pt-3">
            <p className="text-sm font-semibold">State nuances</p>
            {nuances.map((n) => (
              <p key={n.id} className="mt-1 text-sm text-neutral-700">
                <strong>{n.title}:</strong> {n.detail}
              </p>
            ))}
          </div>
        ) : null}
        {notes.trim() ? (
          <div className="mt-4 border-t border-neutral-200 pt-3">
            <p className="text-sm font-semibold">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{notes}</p>
          </div>
        ) : null}
        <p className="mt-6 text-xs text-neutral-500">
          Generated by Izzy · not a substitute for carrier or agent advice.
        </p>
      </section>
    </div>
  );
}
