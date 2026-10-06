"use client";

import { useEffect, useState } from "react";
import { WifiOff, Shield } from "lucide-react";
import {
  readVault,
  seedDemoVaultCard,
  subscribeConnectivity,
  type OfflineVaultMeta,
} from "@/lib/offline-vault";
import type { OfflineEmergencyCard, PostAccidentStep } from "@/lib/izzy/types";

export function OfflineVaultPanel() {
  const [offline, setOffline] = useState(false);
  const [cards, setCards] = useState<OfflineEmergencyCard[]>([]);
  const [checklist, setChecklist] = useState<PostAccidentStep[]>([]);
  const [meta, setMeta] = useState<OfflineVaultMeta | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    const vault = await readVault();
    setOffline(vault.offline);
    setCards(vault.cards);
    setChecklist(vault.checklist);
    setMeta(vault.meta);
    setReady(true);
  }

  useEffect(() => {
    const unsub = subscribeConnectivity((isOffline) => {
      setOffline(isOffline);
      void refresh();
    });
    void (async () => {
      await seedDemoVaultCard();
      await refresh();
    })();
    return unsub;
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--izzy-teal)]">
        Pro · Offline Accident Emergency Vault
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-izzy-display)] text-3xl font-semibold text-[color:var(--izzy-ink)]">
        Pocket help when cell service fails
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
        Digital emergency cards, tow/claims lines, and post-accident steps cache in IndexedDB on this device.
      </p>

      <div
        className={`mt-5 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold ${
          offline
            ? "bg-[color:var(--izzy-coral)] text-white"
            : "bg-[color:var(--izzy-teal)]/15 text-[color:var(--izzy-teal)]"
        }`}
        role="status"
      >
        {offline ? <WifiOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
        {offline ? "Offline — serving IndexedDB cache" : "Online — vault ready / syncing"}
      </div>

      {!ready ? (
        <p className="mt-8 text-sm text-[color:var(--izzy-ink)]/60">Loading vault…</p>
      ) : (
        <>
          <section className="mt-8 space-y-3">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
              Emergency cards
            </h2>
            {cards.length === 0 ? (
              <p className="text-sm text-[color:var(--izzy-ink)]/70">
                No cards cached yet. Decode a policy on Pro to sync one here.
              </p>
            ) : (
              cards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-xl border border-[color:var(--izzy-line)] bg-white/85 p-4"
                >
                  <p className="text-sm font-bold text-[color:var(--izzy-ink)]">{card.label}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-[color:var(--izzy-ink)]/55">Carrier</dt>
                      <dd className="font-semibold">{card.carrierName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--izzy-ink)]/55">Claims</dt>
                      <dd className="font-semibold">{card.claimsPhone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--izzy-ink)]/55">Roadside / tow</dt>
                      <dd className="font-semibold">{card.roadsidePhone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--izzy-ink)]/55">State</dt>
                      <dd className="font-semibold">{card.state || "—"}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-xl font-semibold">
              Post-accident checklist
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {checklist.map((step) => (
                <li key={step.id} className="text-sm leading-relaxed">
                  <span className="font-semibold">{step.title}</span>
                  <span className="block text-[color:var(--izzy-ink)]/70">{step.detail}</span>
                </li>
              ))}
            </ol>
          </section>

          {meta?.lastSyncedAt ? (
            <p className="mt-6 text-[11px] text-[color:var(--izzy-ink)]/50">
              Last synced: {new Date(meta.lastSyncedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
