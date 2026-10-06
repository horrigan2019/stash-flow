/**
 * Pro Offline Accident Emergency Vault
 *
 * Caches active policies, emergency contact numbers, and post-accident
 * checklists in IndexedDB. Detects offline (navigator.onLine + online/offline
 * events), serves cached vault data when the network is unavailable, and
 * re-syncs when connectivity returns.
 */

"use client";

import { get, set, del, keys } from "idb-keyval";
import type {
  OfflineEmergencyCard,
  PostAccidentStep,
  PolicyCategory,
} from "@/lib/izzy/types";

const VAULT_META_KEY = "izzy:offline-vault:meta";
const CARD_PREFIX = "izzy:offline-vault:card:";
const CHECKLIST_KEY = "izzy:offline-vault:post-accident";

export type OfflineVaultMeta = {
  lastSyncedAt: string | null;
  lastOnlineAt: string | null;
  offlineDetectedAt: string | null;
};

export const DEFAULT_POST_ACCIDENT_CHECKLIST: PostAccidentStep[] = [
  {
    id: "safety",
    order: 1,
    title: "Check for injuries & move to safety",
    detail:
      "If anyone is hurt, call 911. Turn on hazards. Only move vehicles if required by law and it is safe.",
  },
  {
    id: "document",
    order: 2,
    title: "Document the scene",
    detail:
      "Photos of vehicles, plates, damage, and the intersection. Note time, weather, and street names.",
  },
  {
    id: "exchange",
    order: 3,
    title: "Exchange information",
    detail:
      "Other driver’s name, phone, insurer, and policy number if offered. Do not admit fault.",
  },
  {
    id: "police",
    order: 4,
    title: "Get a police report number when required",
    detail:
      "Ask for the report/incident number and the responding agency before you leave.",
  },
  {
    id: "carrier",
    order: 5,
    title: "Call your claims / roadside line",
    detail:
      "Use the numbers on your emergency card below. Ask about rental, tow network, and claim filing steps.",
  },
  {
    id: "tow",
    order: 6,
    title: "Arrange tow if needed",
    detail:
      "Prefer your carrier’s roadside network when listed. Keep the tow receipt and yard location.",
  },
];

function cardKey(id: string): string {
  return `${CARD_PREFIX}${id}`;
}

export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

/** Subscribe to online/offline flips. Returns unsubscribe. */
export function subscribeConnectivity(
  onChange: (offline: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const fire = () => onChange(isBrowserOffline());
  window.addEventListener("online", fire);
  window.addEventListener("offline", fire);
  fire();
  return () => {
    window.removeEventListener("online", fire);
    window.removeEventListener("offline", fire);
  };
}

export async function getVaultMeta(): Promise<OfflineVaultMeta> {
  const meta = await get<OfflineVaultMeta>(VAULT_META_KEY);
  return (
    meta ?? {
      lastSyncedAt: null,
      lastOnlineAt: null,
      offlineDetectedAt: null,
    }
  );
}

async function writeMeta(patch: Partial<OfflineVaultMeta>): Promise<OfflineVaultMeta> {
  const current = await getVaultMeta();
  const next = { ...current, ...patch };
  await set(VAULT_META_KEY, next);
  return next;
}

export async function markOfflineDetected(): Promise<void> {
  await writeMeta({ offlineDetectedAt: new Date().toISOString() });
}

export async function markOnline(): Promise<void> {
  await writeMeta({
    lastOnlineAt: new Date().toISOString(),
    offlineDetectedAt: null,
  });
}

export async function cacheEmergencyCard(
  card: Omit<OfflineEmergencyCard, "updatedAt"> & { updatedAt?: string },
): Promise<OfflineEmergencyCard> {
  const full: OfflineEmergencyCard = {
    ...card,
    updatedAt: card.updatedAt ?? new Date().toISOString(),
  };
  await set(cardKey(full.id), full);
  await writeMeta({ lastSyncedAt: full.updatedAt });
  return full;
}

export async function cacheEmergencyCards(
  cards: Array<Omit<OfflineEmergencyCard, "updatedAt"> & { updatedAt?: string }>,
): Promise<OfflineEmergencyCard[]> {
  const saved: OfflineEmergencyCard[] = [];
  for (const card of cards) {
    saved.push(await cacheEmergencyCard(card));
  }
  return saved;
}

export async function listEmergencyCards(): Promise<OfflineEmergencyCard[]> {
  const allKeys = await keys();
  const cardKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(CARD_PREFIX),
  ) as string[];
  const cards: OfflineEmergencyCard[] = [];
  for (const key of cardKeys) {
    const card = await get<OfflineEmergencyCard>(key);
    if (card) cards.push(card);
  }
  return cards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function removeEmergencyCard(id: string): Promise<void> {
  await del(cardKey(id));
}

export async function cachePostAccidentChecklist(
  steps: PostAccidentStep[] = DEFAULT_POST_ACCIDENT_CHECKLIST,
): Promise<PostAccidentStep[]> {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  await set(CHECKLIST_KEY, sorted);
  await writeMeta({ lastSyncedAt: new Date().toISOString() });
  return sorted;
}

export async function getPostAccidentChecklist(): Promise<PostAccidentStep[]> {
  const steps = await get<PostAccidentStep[]>(CHECKLIST_KEY);
  return steps?.length ? steps : DEFAULT_POST_ACCIDENT_CHECKLIST;
}

/**
 * Primary read path for the Accident Vault UI:
 * - If offline, serve IndexedDB cache only (no network).
 * - If online, return cache immediately and optionally refresh via `syncFromNetwork`.
 */
export async function readVault(opts?: {
  syncFromNetwork?: () => Promise<
    Array<Omit<OfflineEmergencyCard, "updatedAt"> & { updatedAt?: string }>
  >;
}): Promise<{
  offline: boolean;
  cards: OfflineEmergencyCard[];
  checklist: PostAccidentStep[];
  meta: OfflineVaultMeta;
}> {
  const offline = isBrowserOffline();
  if (offline) {
    await markOfflineDetected();
  } else {
    await markOnline();
    if (opts?.syncFromNetwork) {
      try {
        const remote = await opts.syncFromNetwork();
        if (remote.length) await cacheEmergencyCards(remote);
        await cachePostAccidentChecklist();
      } catch {
        // Keep serving last-known cache if sync fails.
      }
    }
  }

  const [cards, checklist, meta] = await Promise.all([
    listEmergencyCards(),
    getPostAccidentChecklist(),
    getVaultMeta(),
  ]);

  return { offline, cards, checklist, meta };
}

/** Seed a demo Pro vault card for local testing / demos. */
export async function seedDemoVaultCard(input?: {
  carrierName?: string;
  claimsPhone?: string;
  roadsidePhone?: string;
  state?: string;
  category?: PolicyCategory;
}): Promise<OfflineEmergencyCard> {
  await cachePostAccidentChecklist();
  return cacheEmergencyCard({
    id: "demo-auto",
    label: "Auto — emergency card",
    carrierName: input?.carrierName ?? "Sample Mutual",
    policyNumber: "•••-DEMO",
    claimsPhone: input?.claimsPhone ?? "1-800-555-0199",
    roadsidePhone: input?.roadsidePhone ?? "1-800-555-0144",
    state: input?.state ?? "NY",
    category: input?.category ?? "auto",
  });
}
