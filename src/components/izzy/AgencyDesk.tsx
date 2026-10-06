"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  DEESCALATE_SCENARIOS,
  getDeescalateScenario,
  type DeescalateScenarioId,
} from "@/lib/izzy/deescalate-scripts";

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
  const [scenario, setScenario] = useState<DeescalateScenarioId>("bill-up");
  const [openFollowUp, setOpenFollowUp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const active = getDeescalateScenario(scenario);

  async function copyCrmNote() {
    try {
      await navigator.clipboard.writeText(active.crmNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  function selectScenario(id: DeescalateScenarioId) {
    setScenario(id);
    setOpenFollowUp(null);
    setCopied(false);
  }

  return (
    <section>
      <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
        De-escalate & resolve buffer
      </h2>
      <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/70">
        Empathy-first scripts for bill increases, household/unlisted-driver pushback,
        non-renewals, and cancellations. Zero-PII templates only.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="De-escalation scenarios">
        {DEESCALATE_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={scenario === s.id}
            onClick={() => selectScenario(s.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              scenario === s.id
                ? "bg-[color:var(--izzy-coral)] text-white"
                : "bg-white text-[color:var(--izzy-ink)] border border-[color:var(--izzy-line)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <h3 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold text-[color:var(--izzy-ink)]">
            {active.title}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/70">{active.subtitle}</p>
        </div>

        <div className="rounded-xl border border-[color:var(--izzy-line)] bg-white/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
            Empathy first
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {active.empathy.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-[color:var(--izzy-ink)]">
                {line}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
            Plain-English explainers
          </p>
          <ul className="mt-2 space-y-2">
            {active.explainers.map((block) => (
              <li
                key={block.heading}
                className="rounded-lg border border-[color:var(--izzy-line)] bg-white/80 px-3 py-2"
              >
                <p className="text-sm font-semibold text-[color:var(--izzy-ink)]">
                  {block.heading}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--izzy-ink)]/80">
                  {block.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {active.softCompliance ? (
          <p className="rounded-lg border border-dashed border-[color:var(--izzy-coral)]/40 bg-[color:var(--izzy-coral)]/5 px-3 py-2 text-xs leading-relaxed text-[color:var(--izzy-ink)]/80">
            {active.softCompliance}
          </p>
        ) : null}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
            Next-step options
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {active.nextSteps.map((step) => (
              <li key={step} className="text-sm leading-relaxed text-[color:var(--izzy-ink)]">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {active.documentChecklist?.length ? (
          <div className="rounded-xl border border-[color:var(--izzy-line)] bg-white/80 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
              Document checklist (generic — no PII)
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              {active.documentChecklist.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-[color:var(--izzy-ink)]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {active.followUps.length ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
              Follow-up answer beats
            </p>
            <p className="mt-1 text-xs text-[color:var(--izzy-ink)]/60">
              Tap a pushback line the insured might say—script a calm reply.
            </p>
            <ul className="mt-2 space-y-2">
              {active.followUps.map((beat) => {
                const open = openFollowUp === beat.id;
                return (
                  <li key={beat.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenFollowUp(open ? null : beat.id)}
                      className="w-full rounded-lg border border-[color:var(--izzy-line)] bg-white/80 px-3 py-2 text-left"
                    >
                      <p className="text-sm font-semibold text-[color:var(--izzy-ink)]">
                        “{beat.pushback}”
                      </p>
                      {open ? (
                        <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/80">
                          {beat.reply}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[color:var(--izzy-teal)]">Show reply →</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--izzy-teal)]">
            Sanitized CRM note generator
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]">
            {active.crmNote}
          </p>
          <button
            type="button"
            onClick={copyCrmNote}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-[color:var(--izzy-ink)] px-3 py-2 text-xs font-bold text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy for CRM"}
          </button>
        </div>
      </div>
    </section>
  );
}
