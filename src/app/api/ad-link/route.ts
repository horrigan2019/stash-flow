import { lookup } from "dns/promises";
import { isIP } from "net";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isSubscribed } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

const BETA_CODE = "OHSTUFFINGBETA";
const MAX_BYTES = 1_500_000;
const MAX_TEXT = 20_000;
const MAX_REDIRECTS = 3;

function hasBetaUnlock(request: Request) {
  const code = (request.headers.get("x-beta-code") || "").replace(/\s+/g, "").toUpperCase();
  return code === BETA_CODE;
}

function isPrivateAddress(address: string) {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "").replace(/^::ffff:/, "");
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  if (ip.startsWith("10.") || ip.startsWith("127.") || ip.startsWith("0.") || ip.startsWith("169.254.") || ip.startsWith("192.168.")) {
    return true;
  }
  const match = ip.match(/^172\.(\d{1,3})\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function publicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (isIP(host)) {
    if (isPrivateAddress(host)) return null;
    return url;
  }
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) return null;
  } catch {
    return null;
  }
  return url;
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

async function readPublicPage(start: URL) {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const allowed = await publicUrl(current.href);
    if (!allowed) {
      return { error: "That link can't be opened from here. Paste the ad text instead." };
    }
    const response = await fetch(allowed.href, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: {
        accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        "user-agent": "OhStuffingAdLink/1.0",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { error: "That ad link redirected somewhere we couldn't follow. Paste the ad text instead." };
      current = new URL(location, allowed);
      continue;
    }
    if (!response.ok) {
      return { error: "That ad link didn't open (" + response.status + "). Paste the ad text, or take a photo of the flyer." };
    }
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type && !type.includes("text/html") && !type.includes("text/plain") && !type.includes("application/xhtml")) {
      return { error: "That link isn't a web page of the ad. Paste the sale text, or take a photo of the flyer." };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const slice = bytes.byteLength > MAX_BYTES ? bytes.slice(0, MAX_BYTES) : bytes;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const text = htmlToText(html);
    if (text.length < 40) {
      return { error: "That page didn't include the sale list in the text we could read. Paste the ad text, or take a photo of the flyer." };
    }
    return { text };
  }
  return { error: "That ad link redirected too many times. Paste the ad text instead." };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const allowed = hasBetaUnlock(request) || (user ? isSubscribed(user) : false);
  if (!allowed) {
    return NextResponse.json(
      { error: "Sign in with Pro, or use your tester code, to check an ad link." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Paste a store ad link." }, { status: 400 });
  }
  const raw = body && typeof body === "object" && "url" in body ? String((body as { url?: unknown }).url || "") : "";
  const url = await publicUrl(raw);
  if (!url) {
    return NextResponse.json(
      { error: "Paste a normal web link to the store's ad (it should start with https://)." },
      { status: 400 }
    );
  }

  try {
    const page = await readPublicPage(url);
    if (page.error) return NextResponse.json({ error: page.error }, { status: 422 });
    return NextResponse.json({ text: page.text });
  } catch {
    return NextResponse.json(
      { error: "Couldn't open that ad link. Paste the ad text, or take a photo of the flyer." },
      { status: 502 }
    );
  }
}
