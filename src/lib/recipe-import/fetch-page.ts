const USER_AGENT =
  "Mozilla/5.0 (compatible; OhStuffingBot/1.0; +https://ohstuffing.app; recipe-import)";

export interface FetchedPage {
  url: string;
  html: string;
  finalUrl: string;
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchPageHtml(url: string): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      const err = new Error(`Fetch failed with status ${res.status}`);
      (err as Error & { code?: string }).code =
        res.status === 401 || res.status === 403 || res.status === 999
          ? "fetch_blocked"
          : "api_error";
      throw err;
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/plain")
    ) {
      const err = new Error("Link did not return a web page");
      (err as Error & { code?: string }).code = "fetch_blocked";
      throw err;
    }
    const html = await res.text();
    if (!html || html.length < 40) {
      const err = new Error("Page was empty");
      (err as Error & { code?: string }).code = "fetch_blocked";
      throw err;
    }
    return { url, html, finalUrl: res.url || url };
  } catch (e) {
    if (e instanceof Error && (e as Error & { code?: string }).code) throw e;
    const err = new Error(
      e instanceof Error ? e.message : "Could not load this link",
    );
    (err as Error & { code?: string }).code = "fetch_blocked";
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ");
}

function metaContent(html: string, key: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return "";
}

/** Pull OpenGraph / title / description + a stripped body snippet for AI. */
export function extractPageSnippet(html: string, maxChars = 12000): string {
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/\s+/g, " ")
      .trim();
  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    metaContent(html, "twitter:description");
  const site = metaContent(html, "og:site_name");

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Prefer article / main when present
  const mainMatch =
    body.match(/<article[\s\S]*?<\/article>/i) ||
    body.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) body = mainMatch[0];

  body = body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  body = decodeEntities(body);

  const header = [
    title ? `Title: ${title}` : "",
    site ? `Site: ${site}` : "",
    description ? `Description: ${description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const combined = `${header}\n\n${body}`.trim();
  return combined.slice(0, maxChars);
}

export function extractOgImage(html: string): string | undefined {
  return (
    metaContent(html, "og:image") ||
    metaContent(html, "twitter:image") ||
    undefined
  );
}
