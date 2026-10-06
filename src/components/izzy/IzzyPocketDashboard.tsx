"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccidentEmergencyKit } from "@/components/dashboard/AccidentEmergencyKit";
import { EmergencyHeaderButton } from "@/components/izzy/EmergencyHeaderButton";
import type { PolicyCategory } from "@/lib/izzy/types";

const CATEGORIES: Array<{ id: PolicyCategory; label: string; blurb: string }> = [
  {
    id: "auto",
    label: "Auto",
    blurb: "Crash kit, hotlines, other-party form, deductibles.",
  },
  {
    id: "home",
    label: "Home",
    blurb: "Water/gas shut-off, mitigation duty, home claims line.",
  },
  {
    id: "commercial",
    label: "Commercial",
    blurb: "Open the crisis toolkit with your commercial card context.",
  },
  {
    id: "life",
    label: "Life",
    blurb: "Vault entry for life line — emergency contacts when cached.",
  },
  {
    id: "health",
    label: "Health",
    blurb: "Vault entry for health line — emergency contacts when cached.",
  },
];

type Props = {
  /** Open kit immediately (e.g. ?emergency=1) */
  openKit?: boolean;
  initialCategory?: PolicyCategory;
};

export function IzzyPocketDashboard({
  openKit = false,
  initialCategory = "auto",
}: Props) {
  const [category, setCategory] = useState<PolicyCategory>(initialCategory);
  const [showKit, setShowKit] = useState(openKit);

  const active = useMemo(
    () => CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]!,
    [category],
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--izzy-teal)]">
            5-line pocket vault
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-izzy-display)] text-3xl font-semibold text-[color:var(--izzy-ink)]">
            Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--izzy-ink)]/75">
            Switch lines below, or hit the emergency button for the full offline
            crisis toolkit.
          </p>
        </div>
        <EmergencyHeaderButton
          href="/izzy/vault"
          className="!normal-case !tracking-normal"
        />
      </div>

      <div
        className="mt-6 flex flex-wrap gap-1 rounded-xl bg-[color:var(--izzy-ink)]/6 p-1"
        role="tablist"
        aria-label="Policy categories"
      >
        {CATEGORIES.map((cat) => {
          const selected = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setCategory(cat.id);
                setShowKit(true);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-bold sm:text-sm ${
                selected
                  ? "bg-white text-[color:var(--izzy-ink)] shadow-sm"
                  : "text-[color:var(--izzy-ink)]/65 hover:bg-white/50"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[color:var(--izzy-line)] bg-white/70 p-4">
        <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
          {active.label}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/75">{active.blurb}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowKit(true)}
            className="rounded-md border-2 border-[#7F1D1D] bg-[#DC2626] px-4 py-2 text-sm font-extrabold text-white shadow-[0_0_0_2px_#FDE68A]"
          >
            In Case of Accident / Emergency
          </button>
          <Link
            href={`/izzy/vault?mode=${active.id === "home" ? "home" : "auto"}&category=${active.id}`}
            className="rounded-md border border-[color:var(--izzy-line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--izzy-ink)]"
          >
            Open full vault
          </Link>
        </div>
      </div>

      {showKit ? (
        <div className="mt-2 border-t border-[color:var(--izzy-line)] pt-2">
          <AccidentEmergencyKit
            initialCategory={category}
            initialMode={category === "home" ? "home" : "auto"}
          />
        </div>
      ) : null}
    </div>
  );
}
