import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

const SCRAPE_TIMEOUT_MS = 12_000;
const MIN_USEFUL_TEXT = 40;

const BLOCKED_RETAILER_DOMAINS = ["meijer.com", "walmart.com", "target.com", "kroger.com"];

const BLOCK_PAGE_MARKERS = [
  "access denied",
  "attention required",
  "just a moment",
  "verify you are human",
  "please enable javascript",
  "pardon our interruption",
  "unusual traffic",
  "request blocked",
  "bot detection",
  "captcha",
  "cf-browser-verification",
];

type AdLinkBody = { url?: unknown };

function isBlockedRetailerHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return BLOCKED_RETAILER_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function sanitizeAdUrl(raw: string): string {
  let value = raw.trim();
  let previous = "";
  while (value !== previous) {
    previous = value;
    value = value.replace(/^['"“”‘’]+|['"“”‘’]+$/g, "").trim();
  }
  return value
    .replace(/^<+|>+$/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, "")
    .replace(/[.,;:!?)]+$/g, "");
}

function publicHttpUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(sanitizeAdUrl(raw));
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return null;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map((part) => Number(part));
    if (parts.some((part) => part > 255)) return null;
    const [a, b] = parts;
    const privateRange =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (privateRange) return null;
  }
  return url;
}

function htmlToText(html: string): string {
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
    .trim();
}

function looksLikeBlockPage(raw: string, text: string): boolean {
  const haystack = `${raw}\n${text}`.toLowerCase();
  return BLOCK_PAGE_MARKERS.some((marker) => haystack.includes(marker));
}

function isTimeoutError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  );
}

function retailerBlocked() {
  return NextResponse.json(
    { error: "Couldn't open that ad link.", code: "retailer_blocked" },
    { status: 422 }
  );
}

function scrapeFailed(blockedRetailer: boolean, code: "timeout" | "scrape_failed" = "scrape_failed") {
  if (blockedRetailer) return retailerBlocked();
  return NextResponse.json(
    { error: "Couldn't open that ad link.", code },
    { status: 502 }
  );
}

export async function POST(request: Request) {
  let body: AdLinkBody;
  try {
    body = (await request.json()) as AdLinkBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON.", code: "ad_link" },
      { status: 400 }
    );
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  const url = publicHttpUrl(rawUrl);
  if (!url) {
    return NextResponse.json(
      { error: "That link doesn't look usable.", code: "ad_link" },
      { status: 400 }
    );
  }

  const blockedRetailer = isBlockedRetailerHost(url.hostname);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        "user-agent": "OhStuffingFlyerCheck/1.0",
      },
    });
  } catch (err) {
    return scrapeFailed(blockedRetailer, isTimeoutError(err) ? "timeout" : "scrape_failed");
  }

  if (upstream.status === 403 || upstream.status === 401 || upstream.status === 429) {
    return scrapeFailed(blockedRetailer);
  }

  if (!upstream.ok) {
    return scrapeFailed(blockedRetailer);
  }

  let raw = "";
  try {
    raw = await upstream.text();
  } catch (err) {
    return scrapeFailed(blockedRetailer, isTimeoutError(err) ? "timeout" : "scrape_failed");
  }

  const text = htmlToText(raw).slice(0, 12_000);
  if (
    blockedRetailer &&
    (looksLikeBlockPage(raw, text) || text.length < MIN_USEFUL_TEXT)
  ) {
    return retailerBlocked();
  }

  return NextResponse.json({ text });
}
