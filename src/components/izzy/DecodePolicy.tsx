"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { FileUp, Lock, Loader2 } from "lucide-react";
import type { AnalyzePolicyResult } from "@/lib/izzy/types";
import { IZZY_PRIMARY_CTA } from "@/lib/izzy/brand";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function DecodePolicy() {
  const [state, setState] = useState("NY");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzePolicyResult | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/analyze-policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          state,
          category: "auto",
          docType: "dec_page",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        result?: AnalyzePolicyResult;
        error?: string;
      };
      if (!res.ok || !data.result) {
        setError(data.error || "Decode failed. Try a clearer scan.");
        return;
      }
      setResult(data.result);
    } catch {
      setError("Could not reach the decoder. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockPro(planType: "monthly" | "annual") {
    setCheckoutBusy(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Checkout unavailable. Sign in, then try again.");
    } catch {
      setError("Checkout failed.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="font-[family-name:var(--font-izzy-display)] text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--izzy-teal)]">
        Free consumer tier
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-izzy-display)] text-3xl font-semibold text-[color:var(--izzy-ink)] sm:text-4xl">
        {IZZY_PRIMARY_CTA}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
        Upload one declarations page (PDF/PNG/JPG), pick your state, and get liability, deductibles, roadside/rental signals, plus plain-English cards.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-4 rounded-xl border border-[color:var(--izzy-line)] bg-white/70 p-5 shadow-sm"
      >
        <label className="block text-sm font-semibold text-[color:var(--izzy-ink)]">
          State
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="mt-1 w-full rounded-md border border-[color:var(--izzy-line)] bg-white px-3 py-2 text-sm"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--izzy-teal)]/50 bg-[color:var(--izzy-foam)] px-4 py-8 text-center">
          <FileUp className="h-6 w-6 text-[color:var(--izzy-teal)]" aria-hidden />
          <span className="text-sm font-semibold text-[color:var(--izzy-ink)]">
            {file ? file.name : "Drop or choose PDF / PNG / JPG"}
          </span>
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            className="sr-only"
            onChange={onFile}
          />
        </label>

        <button
          type="submit"
          disabled={!file || busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--izzy-coral)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Decoding…" : "Decode my policy"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-10 space-y-6">
          <section>
            <h2 className="font-[family-name:var(--font-izzy-display)] text-2xl font-semibold">
              In plain English
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/85">
              {result.plainEnglishSummary}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {[
              ["Carrier", result.extracted.carrier],
              ["BI liability", result.extracted.liabilityBodilyInjury],
              ["PD liability", result.extracted.liabilityPropertyDamage],
              ["Comp deductible", result.extracted.comprehensiveDeductible],
              ["Collision deductible", result.extracted.collisionDeductible],
              [
                "Roadside",
                result.extracted.roadside == null
                  ? "Unclear"
                  : result.extracted.roadside
                    ? "Listed"
                    : "Not listed",
              ],
              [
                "Rental",
                result.extracted.rental == null
                  ? "Unclear"
                  : result.extracted.rental
                    ? "Listed"
                    : "Not listed",
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-[color:var(--izzy-line)] bg-white/80 px-3 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--izzy-teal)]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--izzy-ink)]">
                  {value || "—"}
                </p>
              </div>
            ))}
          </section>

          <section className="paywall-modal rounded-xl border border-[color:var(--izzy-coral)]/40 bg-gradient-to-br from-white to-[color:var(--izzy-coral)]/10 p-5">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
              Gaps that still matter for your wallet
            </h2>
            <ul className="mt-4 space-y-3">
              {result.teaserGaps.map((gap) => (
                <li
                  key={gap.id}
                  className="rounded-lg border border-[color:var(--izzy-line)] bg-white/90 px-3 py-3"
                >
                  <p className="text-sm font-bold text-[color:var(--izzy-ink)]">
                    {gap.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[color:var(--izzy-ink)]/70">
                    {gap.detail}
                  </p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={checkoutBusy}
              onClick={() => unlockPro("monthly")}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--izzy-ink)] px-4 py-3 text-sm font-bold text-white"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Ask Izzy: What does this mean for my wallet? (Unlock with Pro)
            </button>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--izzy-ink)]/70">
              <button
                type="button"
                className="underline"
                disabled={checkoutBusy}
                onClick={() => unlockPro("monthly")}
              >
                $6.99/month
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                className="underline"
                disabled={checkoutBusy}
                onClick={() => unlockPro("annual")}
              >
                $39.99/year
              </button>
            </div>
          </section>

          <p className="text-sm text-[color:var(--izzy-ink)]/70">
            Need a mid-term change call sheet?{" "}
            <Link href="/izzy/changes" className="font-semibold text-[color:var(--izzy-teal)] underline">
              Open the consumer change checklist
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
