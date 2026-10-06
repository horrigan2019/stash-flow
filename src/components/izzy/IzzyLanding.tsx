"use client";

import Link from "next/link";
import {
  IZZY_HERO_HEADLINE,
  IZZY_NAME,
  IZZY_PRIMARY_CTA,
  IZZY_TAGLINE,
} from "@/lib/izzy/brand";

export function IzzyLanding() {
  return (
    <div className="relative flex flex-1 flex-col">
      <section className="izzy-hero relative isolate min-h-[min(92dvh,900px)] overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/izzy-hero.svg')] bg-cover bg-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--izzy-ink)]/55 via-[color:var(--izzy-ink)]/35 to-[color:var(--izzy-foam)]" />
        <div className="relative mx-auto flex max-w-5xl flex-col justify-end gap-5 px-5 pb-16 pt-28 sm:pb-24 sm:pt-36">
          <p className="izzy-brand-mark font-[family-name:var(--font-izzy-display)] text-5xl font-semibold tracking-tight text-white drop-shadow sm:text-7xl">
            {IZZY_NAME}
          </p>
          <h1 className="max-w-2xl font-[family-name:var(--font-izzy-display)] text-3xl font-semibold leading-tight text-white sm:text-5xl">
            {IZZY_HERO_HEADLINE}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            {IZZY_TAGLINE}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/izzy/decode"
              className="izzy-cta inline-flex items-center justify-center rounded-md bg-[color:var(--izzy-coral)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[color:var(--izzy-ink)]/20 transition hover:brightness-110"
            >
              {IZZY_PRIMARY_CTA}
            </Link>
            <Link
              href="/izzy/agency"
              className="inline-flex items-center justify-center rounded-md border border-white/50 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Agency Desk Sidekick
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 sm:grid-cols-3">
        <div>
          <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold text-[color:var(--izzy-ink)]">
            Free decode
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
            One dec page upload, state-aware limits, and plain-English summary cards—plus a printable change call sheet.
          </p>
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold text-[color:var(--izzy-ink)]">
            Pro companion
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
            Ask Izzy, carrier-letter decoder, 5-line pocket vault, and offline accident emergency cards for $6.99/mo or $39.99/yr.
          </p>
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold text-[color:var(--izzy-ink)]">
            Zero-PII agency tools
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
            CoverQuote gap simulator, ClaimFlow checklists, and de-escalation scripts—never customer names, SSNs, or claim files.
          </p>
        </div>
      </section>
    </div>
  );
}
