/**
 * Lightweight user store for Oh Stuffing paid accounts.
 * Production: Upstash Redis REST (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * Local/dev: in-memory Map so the app boots without credentials.
 */

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  /** monthly ($6.99) or annual ($39.99); legacy weekly/yearly kept for existing records */
  plan?: "monthly" | "annual" | "weekly" | "yearly" | null;
  /** ISO timestamp when free trial ends (subscriptionStatus may be trialing) */
  trialEndsAt?: string | null;
};

const USER_PREFIX = "ohstuffing:user:";
const EMAIL_PREFIX = "ohstuffing:email:";

type MemoryBag = Map<string, string>;

function memoryStore(): MemoryBag {
  const g = globalThis as typeof globalThis & { __ohStuffingStore?: MemoryBag };
  if (!g.__ohStuffingStore) g.__ohStuffingStore = new Map();
  return g.__ohStuffingStore;
}

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function redisCommand<T>(...args: (string | number)[]): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { result: T };
  return data.result ?? null;
}

async function kvGet(key: string): Promise<string | null> {
  if (redisConfigured()) {
    const result = await redisCommand<string | null>("GET", key);
    return result ?? null;
  }
  return memoryStore().get(key) ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (redisConfigured()) {
    await redisCommand("SET", key, value);
    return;
  }
  memoryStore().set(key, value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isSubscribed(user: UserRecord | null | undefined): boolean {
  if (!user) return false;
  return user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const raw = await kvGet(USER_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserRecord;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const id = await kvGet(EMAIL_PREFIX + normalizeEmail(email));
  if (!id) return null;
  return getUserById(id);
}

export async function saveUser(user: UserRecord): Promise<void> {
  await kvSet(USER_PREFIX + user.id, JSON.stringify(user));
  await kvSet(EMAIL_PREFIX + normalizeEmail(user.email), user.id);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
}): Promise<UserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("An account with that email already exists.");
  }
  const user: UserRecord = {
    id: crypto.randomUUID(),
    email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
    subscriptionStatus: "none",
    plan: null,
  };
  await saveUser(user);
  return user;
}

export function storeBackend(): "upstash" | "memory" {
  return redisConfigured() ? "upstash" : "memory";
}

const STASH_PREFIX = "ohstuffing:stash:";
const STASH_MAX_BYTES = 450_000;

export type UserStash = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function countArray(state: UserStash, key: string): number {
  const value = state[key];
  return Array.isArray(value) ? value.length : 0;
}

function countObject(state: UserStash, key: string): number {
  const value = state[key];
  return isRecord(value) ? Object.keys(value).length : 0;
}

/** True when the stash has lists or plans worth keeping. Photos do not count. */
export function stashHasContent(state: UserStash | null | undefined): boolean {
  if (!state) return false;
  const lists = Array.isArray(state.lists) ? state.lists : [];
  let items = 0;
  if (lists.length) {
    for (const list of lists) {
      if (isRecord(list) && Array.isArray(list.items)) items += list.items.length;
    }
  } else if (Array.isArray(state.items)) {
    items = state.items.length;
  }
  return (
    items > 0 ||
    countArray(state, "meals") > 0 ||
    countArray(state, "recipes") > 0 ||
    countArray(state, "tracked") > 0 ||
    countArray(state, "events") > 0 ||
    countArray(state, "myStores") > 0 ||
    countArray(state, "customDepts") > 0 ||
    countObject(state, "regulars") > 0 ||
    countObject(state, "learned") > 0 ||
    countObject(state, "learnedMeals") > 0 ||
    countObject(state, "learnedEvents") > 0 ||
    countObject(state, "pantryItems") > 0 ||
    countObject(state, "priceEntries") > 0
  );
}

function stripPhotos(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPhotos);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "pantryPhotos" || key === "dataUrl") continue;
    if (typeof child === "string" && child.startsWith("data:image/")) continue;
    out[key] = stripPhotos(child);
  }
  return out;
}

export function sanitizeStash(value: unknown): UserStash | null {
  if (!isRecord(value)) return null;
  return stripPhotos(value) as UserStash;
}

export async function getUserStash(userId: string): Promise<UserStash | null> {
  const raw = await kvGet(STASH_PREFIX + userId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeStash(parsed);
  } catch {
    return null;
  }
}

export async function saveUserStash(userId: string, incoming: UserStash): Promise<void> {
  const cleaned = sanitizeStash(incoming);
  if (!cleaned) throw new Error("List data was empty.");
  const existing = await getUserStash(userId);
  // A blank phone must not wipe lists already saved on the account.
  if (stashHasContent(existing) && !stashHasContent(cleaned)) return;
  const json = JSON.stringify(cleaned);
  if (json.length > STASH_MAX_BYTES) {
    throw new Error("List data is too large to save on the account.");
  }
  await kvSet(STASH_PREFIX + userId, json);
}
