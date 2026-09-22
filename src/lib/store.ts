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
  /** weekly ($1.99) or yearly ($39.99); legacy "monthly" treated as weekly */
  plan?: "weekly" | "yearly" | "monthly" | null;
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
