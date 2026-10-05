/** ISO-8601 duration (PT1H30M) → short kitchen label. */
export function formatDuration(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    const mins = Math.max(0, Math.round(value));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (!/^P/i.test(raw)) return raw;

  const match = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
  );
  if (!match) return raw;
  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10) + days * 24;
  const mins = parseInt(match[3] || "0", 10);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} hr`);
  if (mins) parts.push(`${mins} min`);
  return parts.length ? parts.join(" ") : raw;
}

export function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((s) => s.replace(/^[\s•\-\d.)]+/, "").trim())
      .filter(Boolean);
  }
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const t = entry.trim();
      if (t) out.push(t);
      continue;
    }
    if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const text =
        (typeof obj.text === "string" && obj.text) ||
        (typeof obj.name === "string" && obj.name) ||
        (typeof obj.itemListElement === "string" && obj.itemListElement) ||
        "";
      const cleaned = String(text).trim();
      if (cleaned) out.push(cleaned);
      else if (Array.isArray(obj.itemListElement)) {
        out.push(...asStringArray(obj.itemListElement));
      }
    }
  }
  return out;
}

export function pickImage(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickImage(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url.trim() || undefined;
    if (typeof obj.contentUrl === "string")
      return obj.contentUrl.trim() || undefined;
    if (typeof obj["@id"] === "string" && /^https?:/i.test(obj["@id"])) {
      return obj["@id"];
    }
  }
  return undefined;
}

export function pickServings(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.min(99, Math.round(value));
  }
  if (typeof value === "string") {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const n = parseFloat(match[1]);
      if (Number.isFinite(n) && n > 0) return Math.min(99, Math.round(n));
    }
  }
  return undefined;
}

export function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const t = (node as Record<string, unknown>)["@type"];
  if (typeof t === "string") return /(^|\/)Recipe$/i.test(t);
  if (Array.isArray(t)) return t.some((x) => /(^|\/)Recipe$/i.test(String(x)));
  return false;
}

/** Walk JSON-LD graphs / @graph / arrays for the first Recipe node. */
export function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (isRecipeNode(obj)) return obj;
  if ("@graph" in obj) {
    const found = findRecipeNode(obj["@graph"]);
    if (found) return found;
  }
  // Some pages nest Recipe under mainEntity
  if ("mainEntity" in obj) {
    const found = findRecipeNode(obj["mainEntity"]);
    if (found) return found;
  }
  return null;
}
