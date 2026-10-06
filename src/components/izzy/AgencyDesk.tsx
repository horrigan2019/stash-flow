"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";

type Tool = "coverquote" | "claimflow" | "deescalate";

/**
 * Agency Desk Sidekick — 100% Zero-PII.
 * Never collect customer names, SSNs, DL numbers, policy numbers, or claim files.
 */
export function AgencyDesk() {
  const [tool, setTool] = useState<Tool>("coverquote");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--izzy-teal)]">
        Agency Desk Sidekick · Zero-PII
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-izzy-display)] text-3xl font-semibold text-[color:var(--izzy-ink)] sm:text-4xl">
        Run tools without touching private customer data
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
        Built for CSRs and account managers. Do not enter names, SSNs, driver license numbers, policy numbers, or claim files—ever.
      </p>

      <div
        className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-[color:var(--izzy-ink)]/5 p-1"
        role="tablist"
        aria-label="Agency tools"
      >
        {(
          [
            ["coverquote", "CoverQuote"],
            ["claimflow", "ClaimFlow"],
            ["deescalate", "De-escalate"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tool === id}
            onClick={() => setTool(id)}
            className={`rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${
              tool === id
                ? "bg-white text-[color:var(--izzy-ink)] shadow-sm"
                : "text-[color:var(--izzy-ink)]/65"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tool === "coverquote" ? <CoverQuoteSimulator /> : null}
        {tool === "claimflow" ? <ClaimFlowChecklist /> : null}
        {tool === "deescalate" ? <DeescalateBuffer /> : null}
      </div>
    </div>
  );
}

function CoverQuoteSimulator() {
  const [claim, setClaim] = useState(35000);
  const [limit, setLimit] = useState(25000);

  const exposure = Math.max(0, claim - limit);
  const coveredPct = Math.min(100, Math.round((Math.min(claim, limit) / Math.max(claim, 1)) * 100));

  return (
    <section>
      <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
        CoverQuote explainer & gap simulator
      </h2>
      <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/70">
        Slide a hypothetical claim vs. a limit. Educational only—no quote binding.
      </p>
      <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--izzy-line)] bg-white/80 p-4">
        <label className="block text-sm font-semibold">
          Hypothetical claim: ${claim.toLocaleString()}
          <input
            type="range"
            min={5000}
            max={150000}
            step={1000}
            value={claim}
            onChange={(e) => setClaim(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm font-semibold">
          Policy limit: ${limit.toLocaleString()}
          <input
            type="range"
            min={5000}
            max={100000}
            step={1000}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <div className="h-3 overflow-hidden rounded-full bg-[color:var(--izzy-ink)]/10">
          <div
            className="h-full bg-[color:var(--izzy-teal)] transition-all"
            style={{ width: `${coveredPct}%` }}
          />
        </div>
        <p className="text-sm leading-relaxed">
          About <strong>{coveredPct}%</strong> of this hypothetical claim sits inside the limit.
          Remaining exposure to explain:{" "}
          <strong className="text-[color:var(--izzy-coral)]">
            ${exposure.toLocaleString()}
          </strong>
          .
        </p>
      </div>
    </section>
  );
}

const CLAIMFLOW_STEPS = [
  "Confirm loss type and date (no claim number required for this memo)",
  "Verify coverage line and endorsement checklist against product guide",
  "List missing docs in generic terms (e.g., proof of ownership, photos)",
  "Note next follow-up window and owner role (CSR / AM / claims liaison)",
] as const;

function ClaimFlowChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const note = useMemo(() => {
    const done = CLAIMFLOW_STEPS.filter((_, i) => checked[`s${i}`]);
    const pending = CLAIMFLOW_STEPS.filter((_, i) => !checked[`s${i}`]);
    return [
      "CRM memo (sanitized — no PII):",
      `Completed: ${done.length ? done.join("; ") : "none yet"}.`,
      `Outstanding: ${pending.length ? pending.join("; ") : "none"}.`,
      "No customer identifiers recorded in this Izzy session.",
    ].join(" ");
  }, [checked]);

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <section>
      <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
        ClaimFlow & endorsement checklist
      </h2>
      <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/70">
        Sanitize notes for CRM paste—never include policy or claim numbers here.
      </p>
      <ul className="mt-4 space-y-2">
        {CLAIMFLOW_STEPS.map((step, i) => {
          const id = `s${i}`;
          return (
            <li key={id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[color:var(--izzy-line)] bg-white/80 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(checked[id])}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [id]: e.target.checked }))
                  }
                  className="mt-0.5"
                />
                <span>{step}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 rounded-xl border border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
          Sanitized note generator
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]">
          {note}
        </p>
        <button
          type="button"
          onClick={copyNote}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-[color:var(--izzy-ink)] px-3 py-2 text-xs font-bold text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy for CRM"}
        </button>
      </div>
    </section>
  );
}

function DeescalateBuffer() {
  const [scenario, setScenario] = useState<"rate" | "nonrenew" | "cancel">("rate");

  const scripts = {
    rate: {
      title: "Rate increase",
      lines: [
        "I hear how frustrating a renewal jump feels—let’s look at what changed on the product side, not at you personally.",
        "We can walk the rating factors that commonly move (territory, vehicle symbols, household driving record bands) without needing private identifiers in this tool.",
        "If you’d like options, I can outline deductible or coverage tradeoffs to discuss with the licensed producer of record.",
      ],
    },
    nonrenew: {
      title: "Non-renewal",
      lines: [
        "A non-renewal notice is stressful. I’m here to slow this down and clarify timelines—not to argue the underwriting decision.",
        "Let’s confirm the notice date, the last day of coverage, and what documentation windows still exist with the carrier.",
        "Next, we can prepare a clean handoff checklist for shopping markets—still without storing claim or policy files in Izzy.",
      ],
    },
    cancel: {
      title: "Cancellation",
      lines: [
        "Thanks for telling me what’s going on. Cancellations have strict timing—let’s focus on restoring continuity if that’s the goal.",
        "We’ll separate what the carrier needs versus what we can prepare as talking points for a licensed agent.",
        "I’ll stay calm with you while we list only process steps—no SSNs, licenses, or claim packets in this workspace.",
      ],
    },
  } as const;

  const active = scripts[scenario];

  return (
    <section>
      <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
        De-escalate & resolve buffer
      </h2>
      <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/70">
        Empathy-first scripts for rate increases, non-renewals, and cancellations.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["rate", "Rate increase"],
            ["nonrenew", "Non-renewal"],
            ["cancel", "Cancellation"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScenario(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              scenario === id
                ? "bg-[color:var(--izzy-coral)] text-white"
                : "bg-white text-[color:var(--izzy-ink)] border border-[color:var(--izzy-line)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ol className="mt-4 list-decimal space-y-3 pl-5">
        {active.lines.map((line) => (
          <li key={line} className="text-sm leading-relaxed text-[color:var(--izzy-ink)]">
            {line}
          </li>
        ))}
      </ol>
    </section>
  );
}
