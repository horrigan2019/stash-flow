/**
 * Fetch a page the user pasted (store flyer, recipe link) without letting it
 * reach private network addresses — including via redirects.
 */

const MAX_REDIRECTS = 5;

function sanitizeUrl(raw: string): string {
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

function isPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host.startsWith("[")
  ) {
    // Bracketed hosts are IPv6 literals — no shopper link needs one.
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map((part) => Number(part));
    if (parts.some((part) => part > 255)) return true;
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return false;
}

/** A public http(s) URL, or null if the link is unusable or points inward. */
export function publicHttpUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(sanitizeUrl(raw));
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isPrivateHost(url.hostname.toLowerCase())) return null;
  return url;
}

/** GET a public page, re-checking every redirect hop. Throws on a blocked hop. */
export async function fetchPublicPage(
  start: URL,
  init: { timeoutMs: number; userAgent: string }
): Promise<Response> {
  const signal = AbortSignal.timeout(init.timeoutMs);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal,
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        "user-agent": init.userAgent,
      },
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    const next = publicHttpUrl(new URL(location, url).toString());
    if (!next) throw new Error("blocked_redirect");
    url = next;
  }
  throw new Error("too_many_redirects");
}

export function htmlToText(html: string): string {
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

export function isTimeoutError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "name" in err &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  );
}
