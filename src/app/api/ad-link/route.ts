import { NextResponse } from "next/server";
import {
  fetchPublicPage,
  htmlToText,
  isTimeoutError,
  publicHttpUrl,
} from "@/lib/public-fetch";

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

function looksLikeBlockPage(raw: string, text: string): boolean {
  const haystack = `${raw}\n${text}`.toLowerCase();
  return BLOCK_PAGE_MARKERS.some((marker) => haystack.includes(marker));
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
    upstream = await fetchPublicPage(url, {
      timeoutMs: SCRAPE_TIMEOUT_MS,
      userAgent: "OhStuffingFlyerCheck/1.0",
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
