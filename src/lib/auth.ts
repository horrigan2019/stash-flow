import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  getUserById,
  isSubscribed,
  type SubscriptionStatus,
  type UserRecord,
} from "@/lib/store";

const COOKIE_NAME = "oh_stuffing_session";
const SESSION_DAYS = 30;

export type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
  /** Snapshotted at cookie issue time — lets /api/vision auth across serverless isolates without shared KV. */
  subscriptionStatus?: SubscriptionStatus;
  plan?: "weekly" | "yearly" | "monthly" | null;
  trialEndsAt?: string | null;
};

function authSecret(): string {
  const secret = (process.env.AUTH_SECRET || "").trim();
  if (secret) return secret;
  // Local/dev fallback — sessions reset across restarts; fine without Redis too.
  return "oh-stuffing-dev-secret-change-me";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", authSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function unsign(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", authSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: UserRecord): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    subscriptionStatus: user.subscriptionStatus || "none",
    plan: user.plan ?? null,
    trialEndsAt: user.trialEndsAt ?? null,
  };
  return sign(payload);
}

export async function setSessionCookie(user: UserRecord): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

export async function getSessionUser(): Promise<UserRecord | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const payload = unsign(token);
  if (!payload) return null;
  const user = await getUserById(payload.userId);
  if (user) return user;

  // Vercel runs API routes in separate serverless isolates. Without Upstash, the
  // in-memory user Map is NOT shared — /api/auth/session may find the user while
  // /api/vision cannot. Fall back to signed cookie claims so Photo & AI still works.
  return {
    id: payload.userId,
    email: payload.email,
    passwordHash: "",
    createdAt: "",
    subscriptionStatus: payload.subscriptionStatus || "none",
    plan: payload.plan ?? null,
    trialEndsAt: payload.trialEndsAt ?? null,
  };
}

function trialDaysRemaining(user: UserRecord): number {
  if (user.subscriptionStatus !== "trialing") return 0;
  const end = user.trialEndsAt ? Date.parse(user.trialEndsAt) : NaN;
  if (!Number.isFinite(end)) return 0;
  const ms = end - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export type PublicSession = {
  authenticated: boolean;
  email: string | null;
  subscribed: boolean;
  isPro: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  plan: "weekly" | "yearly" | "monthly" | null;
  subscriptionStatus: string;
  mockPayments: boolean;
  storeBackend: "upstash" | "memory";
};

export function toPublicSession(
  user: UserRecord | null,
  extras: { mockPayments: boolean; storeBackend: "upstash" | "memory" }
): PublicSession {
  if (!user) {
    return {
      authenticated: false,
      email: null,
      subscribed: false,
      isPro: false,
      isInTrial: false,
      trialDaysRemaining: 0,
      plan: null,
      subscriptionStatus: "none",
      mockPayments: extras.mockPayments,
      storeBackend: extras.storeBackend,
    };
  }
  const subscribed = isSubscribed(user);
  const isInTrial = user.subscriptionStatus === "trialing";
  return {
    authenticated: true,
    email: user.email,
    subscribed,
    isPro: subscribed,
    isInTrial,
    trialDaysRemaining: trialDaysRemaining(user),
    plan: user.plan ?? null,
    subscriptionStatus: user.subscriptionStatus,
    mockPayments: extras.mockPayments,
    storeBackend: extras.storeBackend,
  };
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "That email doesn't look right.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  return null;
}
