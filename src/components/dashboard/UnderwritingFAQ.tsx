"use client";

import { useDeferredValue, useState } from "react";
import { HelpCircle, MessageCircle, Search } from "lucide-react";
import { searchFaq, type FaqCard } from "@/lib/izzy/underwriting-faq";
import {
  AskIzzyDrawer,
  type PolicyContext,
} from "@/components/dashboard/AskIzzyDrawer";

interface UnderwritingFAQProps {
  policyContext?: PolicyContext;
}

export function UnderwritingFAQ({ policyContext }: UnderwritingFAQProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = searchFaq(deferredQuery);
  const [expandedId, setExpandedId] = useState<string | null>("household-members");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [askTopic, setAskTopic] = useState("");

  function openAskIzzy(card: FaqCard) {
    setAskTopic(card.askPrompt);
    setDrawerOpen(true);
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
          Search common carrier questions, then ask Izzy with your policy context.
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
          placeholder="Search: mileage, lienholder, health card, PIP…"
          className="w-full rounded-xl border border-amber-200/80 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
          aria-label="Search underwriting FAQ"
        />
      </label>

      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-3 text-sm text-neutral-600">
            No FAQ matches. Try different keywords or ask Izzy from any related card.
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
                  <span className="mt-0.5 shrink-0 text-xs font-semibold text-[#3F6B4A]">
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
                      onClick={() => openAskIzzy(card)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3F6B4A] px-3 py-2.5 text-xs font-bold text-[#F7FBF5]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      Ask Izzy More About This
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <AskIzzyDrawer
        open={drawerOpen}
        topic={askTopic}
        policyContext={policyContext}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
