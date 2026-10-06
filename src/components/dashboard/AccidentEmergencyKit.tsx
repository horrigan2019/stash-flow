"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Camera,
  Droplets,
  Flame,
  Phone,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import type {
  OfflineEmergencyCard,
  OtherPartyRecord,
  PolicyCategory,
  ScenePhotoChecklistState,
} from "@/lib/izzy/types";
import {
  EMPTY_SCENE_PHOTOS,
  SCENE_PHOTO_ITEMS,
  clearOtherPartyRecord,
  getOtherPartyRecord,
  getScenePhotoChecklist,
  listEmergencyCards,
  saveOtherPartyRecord,
  saveScenePhotoChecklist,
  seedDemoVaultCard,
  subscribeConnectivity,
  telHref,
} from "@/lib/offline-vault";

export type EmergencyMode = "auto" | "home";

type KitProps = {
  /** Preferred line when opened from a category tab */
  initialCategory?: PolicyCategory;
  /** Force open on Home emergency mode */
  initialMode?: EmergencyMode;
  compact?: boolean;
};

function pickCard(
  cards: OfflineEmergencyCard[],
  mode: EmergencyMode,
  preferred?: PolicyCategory,
): OfflineEmergencyCard | null {
  if (mode === "home") {
    return (
      cards.find((c) => c.category === "home") ??
      cards.find((c) => c.category === preferred) ??
      cards[0] ??
      null
    );
  }
  return (
    cards.find((c) => c.category === (preferred || "auto")) ??
    cards.find((c) => c.category === "auto") ??
    cards[0] ??
    null
  );
}

function emptyParty(): OtherPartyRecord {
  return {
    id: "scene-other-party",
    driverName: "",
    phone: "",
    insuranceCarrier: "",
    policyNumber: "",
    policeReportOrBadge: "",
    notes: "",
    updatedAt: "",
  };
}

/**
 * Full Offline Accident Emergency crisis toolkit.
 * Works 100% from IndexedDB — no network required after seeding.
 */
export function AccidentEmergencyKit({
  initialCategory = "auto",
  initialMode,
  compact = false,
}: KitProps) {
  const [mode, setMode] = useState<EmergencyMode>(
    initialMode ?? (initialCategory === "home" ? "home" : "auto"),
  );
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<OfflineEmergencyCard[]>([]);
  const [photos, setPhotos] =
    useState<ScenePhotoChecklistState>(EMPTY_SCENE_PHOTOS);
  const [party, setParty] = useState<OtherPartyRecord>(emptyParty());
  const [partySavedAt, setPartySavedAt] = useState<string | null>(null);
  const [savingParty, setSavingParty] = useState(false);

  const card = useMemo(
    () => pickCard(cards, mode, initialCategory),
    [cards, mode, initialCategory],
  );

  useEffect(() => {
    const unsub = subscribeConnectivity(setOffline);
    void (async () => {
      await seedDemoVaultCard();
      const [nextCards, nextPhotos, nextParty] = await Promise.all([
        listEmergencyCards(),
        getScenePhotoChecklist(),
        getOtherPartyRecord(),
      ]);
      setCards(nextCards);
      setPhotos(nextPhotos);
      if (nextParty) {
        setParty(nextParty);
        setPartySavedAt(nextParty.updatedAt || null);
      }
      setReady(true);
    })();
    return unsub;
  }, []);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
    else if (initialCategory === "home") setMode("home");
    else if (initialCategory === "auto") setMode("auto");
  }, [initialCategory, initialMode]);

  async function togglePhoto(id: keyof ScenePhotoChecklistState) {
    const next = { ...photos, [id]: !photos[id] };
    setPhotos(next);
    await saveScenePhotoChecklist(next);
  }

  async function onSaveParty(e: FormEvent) {
    e.preventDefault();
    setSavingParty(true);
    try {
      const saved = await saveOtherPartyRecord(party);
      setParty(saved);
      setPartySavedAt(saved.updatedAt);
    } finally {
      setSavingParty(false);
    }
  }

  async function onClearParty() {
    await clearOtherPartyRecord();
    setParty(emptyParty());
    setPartySavedAt(null);
  }

  const claimsTel = telHref(card?.claimsPhone);
  const roadsideTel = telHref(card?.roadsidePhone);

  return (
    <div
      className={`accident-emergency-kit mx-auto w-full ${compact ? "max-w-md" : "max-w-3xl"} px-4 py-6`}
      data-offline={offline ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#B45309]">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            Crisis toolkit · Offline vault
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-izzy-display)] text-2xl font-semibold text-[color:var(--izzy-ink)] sm:text-3xl">
            In Case of Accident / Emergency
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--izzy-ink)]/75">
            Hotlines, scene steps, other-party notes, and deductible reality checks — cached on this device.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold ${
            offline
              ? "bg-[#DC2626] text-white"
              : "bg-[color:var(--izzy-teal)]/15 text-[color:var(--izzy-teal)]"
          }`}
          role="status"
        >
          {offline ? <WifiOff className="h-3.5 w-3.5" /> : null}
          {offline ? "Offline — IndexedDB only" : "Online · vault ready"}
        </div>
      </div>

      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--izzy-ink)]/8 p-1"
        role="tablist"
        aria-label="Emergency mode"
      >
        {(
          [
            ["auto", "Auto accident"],
            ["home", "Home & property"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
              mode === id
                ? "bg-white text-[color:var(--izzy-ink)] shadow-sm"
                : "text-[color:var(--izzy-ink)]/65"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="mt-8 text-sm text-[color:var(--izzy-ink)]/60">
          Loading emergency vault…
        </p>
      ) : mode === "home" ? (
        <HomeEmergencyMode card={card} claimsTel={claimsTel} />
      ) : (
        <div className="mt-6 space-y-6">
          {/* Emergency ID Card & Hotlines */}
          <section className="rounded-xl border-2 border-[#DC2626]/35 bg-gradient-to-br from-[#FEF2F2] to-white p-4 shadow-sm">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold text-[#7F1D1D]">
              Emergency ID card & hotlines
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">
                  Carrier
                </dt>
                <dd className="font-bold text-[color:var(--izzy-ink)]">
                  {card?.carrierName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">
                  Policy #
                </dt>
                <dd className="font-bold text-[color:var(--izzy-ink)]">
                  {card?.policyNumber || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9A3412]">
                  State
                </dt>
                <dd className="font-bold">{card?.state || "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <HotlineButton
                href={claimsTel}
                label="Call 24/7 claims"
                phone={card?.claimsPhone}
                tone="red"
              />
              <HotlineButton
                href={roadsideTel}
                label="Call roadside / tow"
                phone={card?.roadsidePhone}
                tone="amber"
              />
            </div>
            <a
              href="tel:911"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#7F1D1D] bg-[#7F1D1D] px-3 py-3 text-sm font-bold text-white"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call 911 — injuries / danger
            </a>
          </section>

          {/* At the Scene */}
          <section className="rounded-xl border border-[color:var(--izzy-line)] bg-white/90 p-4">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold">
              At the scene — step-by-step
            </h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>
                <span className="font-bold">Safety check & 911</span>
                <span className="mt-0.5 block text-[color:var(--izzy-ink)]/75">
                  Check for injuries. Move to a safe spot if the law allows and
                  it is safe. Turn on hazards. Call 911 if anyone is hurt or the
                  roadway is blocked.
                </span>
              </li>
              <li>
                <span className="font-bold">Do not admit fault</span>
                <div
                  className="mt-2 rounded-lg border-2 border-[#B45309] bg-[#FFFBEB] px-3 py-3 text-[#7C2D12]"
                  role="alert"
                >
                  <p className="flex items-start gap-2 text-sm font-extrabold leading-snug">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                    What NOT to say: Do not apologize or admit fault. Exchange
                    factual contact details only.
                  </p>
                </div>
              </li>
              <li>
                <span className="font-bold">Photo evidence checklist</span>
                <ul className="mt-2 space-y-2">
                  {SCENE_PHOTO_ITEMS.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)]/60 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(photos[item.id])}
                          onChange={() => void togglePhoto(item.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <Camera className="h-3.5 w-3.5 text-[color:var(--izzy-teal)]" />
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-[color:var(--izzy-ink)]/65">
                            {item.detail}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            </ol>
          </section>

          {/* Other Party Info */}
          <section className="rounded-xl border border-[color:var(--izzy-line)] bg-white/90 p-4">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold">
              Other party info recorder
            </h2>
            <p className="mt-1 text-xs text-[color:var(--izzy-ink)]/65">
              Saved only in IndexedDB on this device — works offline.
            </p>
            <form onSubmit={onSaveParty} className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["driverName", "Other driver name"],
                  ["phone", "Phone"],
                  ["insuranceCarrier", "Insurance carrier"],
                  ["policyNumber", "Policy #"],
                  ["policeReportOrBadge", "Police report / badge #"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold sm:col-span-1">
                  {label}
                  <input
                    value={party[key]}
                    onChange={(e) =>
                      setParty((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-[color:var(--izzy-line)] bg-white px-3 py-2 text-sm font-normal"
                    autoComplete="off"
                  />
                </label>
              ))}
              <label className="block text-xs font-semibold sm:col-span-2">
                Notes
                <textarea
                  value={party.notes}
                  onChange={(e) =>
                    setParty((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[color:var(--izzy-line)] bg-white px-3 py-2 text-sm font-normal"
                />
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingParty}
                  className="rounded-md bg-[color:var(--izzy-ink)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingParty ? "Saving…" : "Save to device"}
                </button>
                <button
                  type="button"
                  onClick={() => void onClearParty()}
                  className="rounded-md border border-[color:var(--izzy-line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Clear
                </button>
                {partySavedAt ? (
                  <span className="self-center text-[11px] text-[color:var(--izzy-ink)]/50">
                    Saved {new Date(partySavedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </form>
          </section>

          {/* Deductible Reality Check */}
          <section className="rounded-xl border border-[color:var(--izzy-coral)]/40 bg-gradient-to-br from-white to-[color:var(--izzy-coral)]/10 p-4">
            <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold">
              Claims & deductible reality check
            </h2>
            <p className="mt-1 text-sm text-[color:var(--izzy-ink)]/75">
              Know your out-of-pocket before you call the adjuster. These are
              educational figures from your cached vault card — not a claim
              decision.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DeductibleTile
                label="Collision deductible"
                value={card?.collisionDeductible}
                hint="Typical for crash damage when collision applies."
              />
              <DeductibleTile
                label="Comprehensive deductible"
                value={card?.comprehensiveDeductible}
                hint="Typical for non-collision (theft, glass, animal, weather) when comp applies."
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[color:var(--izzy-ink)]/70">
              Out-of-pocket reminder: you generally pay the applicable deductible
              first on a covered claim. Rental, storage, and betterment can add
              costs — ask the adjuster what is covered before authorizing repairs
              or a long tow hold.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function HotlineButton({
  href,
  label,
  phone,
  tone,
}: {
  href: string | null;
  label: string;
  phone?: string;
  tone: "red" | "amber";
}) {
  const classes =
    tone === "red"
      ? "border-[#DC2626] bg-[#DC2626] text-white"
      : "border-[#D97706] bg-[#D97706] text-white";
  if (!href) {
    return (
      <div
        className={`rounded-md border px-3 py-3 text-center text-sm font-bold opacity-60 ${classes}`}
      >
        {label}
        <span className="mt-0.5 block text-[11px] font-normal">Not on file</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center rounded-md border px-3 py-3 text-sm font-bold ${classes}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Phone className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span className="mt-0.5 text-[11px] font-semibold opacity-90">{phone}</span>
    </a>
  );
}

function DeductibleTile({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--izzy-line)] bg-white/90 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--izzy-teal)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[color:var(--izzy-ink)]">
        {value || "Not cached"}
      </p>
      <p className="mt-1 text-xs text-[color:var(--izzy-ink)]/65">{hint}</p>
    </div>
  );
}

function HomeEmergencyMode({
  card,
  claimsTel,
}: {
  card: OfflineEmergencyCard | null;
  claimsTel: string | null;
}) {
  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border-2 border-[#DC2626]/35 bg-gradient-to-br from-[#FEF2F2] to-white p-4">
        <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold text-[#7F1D1D]">
          Home emergency ID & claims
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] font-semibold uppercase text-[#9A3412]">
              Carrier
            </dt>
            <dd className="font-bold">{card?.carrierName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase text-[#9A3412]">
              Policy #
            </dt>
            <dd className="font-bold">{card?.policyNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase text-[#9A3412]">
              Home deductible
            </dt>
            <dd className="text-xl font-bold">{card?.homeDeductible || "Not cached"}</dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <HotlineButton
            href={claimsTel}
            label="Call home claims"
            phone={card?.claimsPhone}
            tone="red"
          />
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 rounded-md border-2 border-[#7F1D1D] bg-[#7F1D1D] px-3 py-3 text-sm font-bold text-white"
          >
            <Phone className="h-4 w-4" />
            Call 911
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--izzy-line)] bg-white/90 p-4">
        <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold">
          Water & gas shut-off reminders
        </h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed">
          <li className="flex gap-2 rounded-lg border border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)]/50 px-3 py-3">
            <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--izzy-teal)]" />
            <span>
              <span className="font-bold">Water:</span> Know your main shut-off
              (often near the water heater or where the line enters). Stop the
              source first, then move valuables and start drying only if safe.
            </span>
          </li>
          <li className="flex gap-2 rounded-lg border border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)]/50 px-3 py-3">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
            <span>
              <span className="font-bold">Gas:</span> If you smell gas, leave
              immediately and call 911 / the gas utility from outside. Do not
              flip switches or use phones indoors near the leak.
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[#B45309]/40 bg-[#FFFBEB] p-4">
        <h2 className="font-[family-name:var(--font-izzy-display)] text-lg font-semibold text-[#7C2D12]">
          Duty to prevent further damage
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#7C2D12]/95">
          Most home policies expect reasonable mitigation — temporary tarps,
          boarding openings, shutting water, and documenting damage — so a
          covered loss does not get worse. Keep receipts. Do not begin permanent
          repairs until your carrier confirms next steps. This is educational
          guidance, not a coverage decision.
        </p>
      </section>
    </div>
  );
}
