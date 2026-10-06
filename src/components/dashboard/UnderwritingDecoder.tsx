"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import { HelpCircle, MessageCircle, Search, Sparkles } from "lucide-react";
import { searchFaq, type FaqCard } from "@/lib/izzy/underwriting-faq";

export function UnderwritingDecoder() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = searchFaq(deferredQuery);

  const [expandedId, setExpandedId] = useState<string | null>("household-members");
  const [askInput, setAskInput] = useState("");
  const [askReply, setAskReply] = useState<string | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  async function handleAskIzzy(e: FormEvent) {
    e.preventDefault();
    const message = askInput.trim();
    if (!message || askBusy) return;
    setAskBusy(true);
    setAskError(null);
    setAskReply(null);
    try {
      const res = await fetch("/api/ask-izzy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        setAskError(data.error?.message || "Ask Izzy is unavailable right now.");
        return;
      }
      setAskReply(data.reply || "No answer returned.");
    } catch {
      setAskError("Could not reach Ask Izzy. Check your connection and try again.");
    } finally {
      setAskBusy(false);
    }
  }

  function askAboutCard(card: FaqCard) {
    setAskInput(`Explain more: ${card.question}`);
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-2">
      <header className="mb-4">
        <div className="mb-1 flex items-center gap-2 text-[#3F6B4A]">
          <HelpCircle className="h-4 w-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Why are they asking?
          </p>
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-amber-950">
          Underwriting decoder
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Search common carrier questions, then ask Izzy for a customized take.
        </p>
      </header>

      <label className="relative mb-4 block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: mileage, mortgagee, household…"
          className="w-full rounded-xl border border-amber-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
          aria-label="Search underwriting FAQ"
        />
      </label>

      <div className="mb-5 space-y-2">
        {results.length === 0 ? (
          <p className="rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-3 text-sm text-neutral-600">
            No FAQ matches. Try different keywords or ask Izzy below.
          </p>
        ) : (
          results.map((card) => {
            const open = expandedId === card.id;
            return (
              <article
                key={card.id}
                className="rounded-2xl border border-amber-200/70 bg-white/70"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : card.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <span>
                    <span className="block text-sm font-semibold text-amber-950">
                      {card.question}
                    </span>
                    <span className="mt-1 block text-xs text-neutral-600">
                      {card.shortAnswer}
                    </span>
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-[#3F6B4A]">
                    {open ? "Hide" : "Why"}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-2 border-t border-amber-100 px-4 py-3">
                    <p className="text-sm text-neutral-700">
                      <span className="font-semibold text-amber-950">
                        Why they ask:{" "}
                      </span>
                      {card.whyTheyAsk}
                    </p>
                    <p className="text-sm text-neutral-700">
                      <span className="font-semibold text-amber-950">Tip: </span>
                      {card.tip}
                    </p>
                    <button
                      type="button"
                      onClick={() => askAboutCard(card)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3F6B4A]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      Prefill Ask Izzy
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <section className="rounded-2xl border border-[#3F6B4A]/25 bg-[#3F6B4A]/08 p-4">
        <div className="mb-2 flex items-center gap-2 text-[#2C4A34]">
          <Sparkles className="h-4 w-4" aria-hidden />
          <h3 className="text-sm font-semibold">Ask Izzy</h3>
        </div>
        <p className="mb-3 text-xs text-neutral-600">
          Custom questions about a carrier request, state rule, or document.
        </p>
        <form onSubmit={handleAskIzzy} className="space-y-2">
          <textarea
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            rows={3}
            placeholder="e.g. My NY carrier asked for an FS-20—what should I request?"
            className="w-full resize-none rounded-xl border border-amber-200/80 bg-white/90 px-3 py-2.5 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
          />
          <button
            type="submit"
            disabled={askBusy || !askInput.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3F6B4A] px-4 py-2.5 text-sm font-bold text-[#F7FBF5] transition hover:bg-[#355a3f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {askBusy ? "Asking Izzy…" : "Ask Izzy"}
          </button>
        </form>
        {askError ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {askError}
          </p>
        ) : null}
        {askReply ? (
          <div className="mt-3 rounded-xl border border-[#3F6B4A]/20 bg-white/80 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2C4A34]">
              Izzy says
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
              {askReply}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
