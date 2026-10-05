import { NextResponse } from "next/server";
import { extractSchemaOrgRecipe } from "@/lib/recipe-import/extract-schema";
import {
  extractOgImage,
  extractPageSnippet,
  fetchPageHtml,
  isValidHttpUrl,
} from "@/lib/recipe-import/fetch-page";
import { extractRecipeWithClaude } from "@/lib/recipe-import/claude-extract";
import type { ImportRecipeResponse } from "@/lib/recipe-import/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(
  status: number,
  type:
    | "invalid_url"
    | "invalid_request"
    | "fetch_blocked"
    | "parse_failed"
    | "configuration_error"
    | "api_error",
  message: string,
  needsPaste?: boolean,
) {
  const body: ImportRecipeResponse = {
    error: {
      type,
      message,
      ...(needsPaste ? { needsPaste: true } : {}),
    },
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_request", "Request body must be JSON.");
  }

  if (!body || typeof body !== "object") {
    return errorResponse(400, "invalid_request", "Request body must be an object.");
  }

  const payload = body as { url?: unknown; pasteText?: unknown };
  const pasteText =
    typeof payload.pasteText === "string" ? payload.pasteText.trim() : "";
  const urlRaw = typeof payload.url === "string" ? payload.url.trim() : "";

  // Manual paste / caption fallback — no fetch required
  if (pasteText && pasteText.length >= 20) {
    try {
      const recipe = await extractRecipeWithClaude(pasteText, {
        source: "paste",
        sourceUrl: urlRaw && isValidHttpUrl(urlRaw) ? urlRaw : undefined,
      });
      return NextResponse.json({ recipe } satisfies ImportRecipeResponse);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code || "")
          : "";
      const message =
        err instanceof Error ? err.message : "Could not read that recipe text.";
      if (code === "configuration_error") {
        return errorResponse(503, "configuration_error", message);
      }
      return errorResponse(422, "parse_failed", message);
    }
  }

  if (!urlRaw) {
    return errorResponse(
      400,
      "invalid_request",
      "Paste a recipe link, or paste the recipe text / caption.",
    );
  }

  if (!isValidHttpUrl(urlRaw)) {
    return errorResponse(
      400,
      "invalid_url",
      "That doesn’t look like a valid web link. Use an https:// address.",
    );
  }

  let page: Awaited<ReturnType<typeof fetchPageHtml>>;
  try {
    page = await fetchPageHtml(urlRaw);
  } catch {
    return errorResponse(
      422,
      "fetch_blocked",
      "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.",
      true,
    );
  }

  // Tier 1 — schema.org Recipe
  const structured = extractSchemaOrgRecipe(page.html, page.finalUrl);
  if (structured) {
    if (!structured.image) {
      structured.image = extractOgImage(page.html);
    }
    return NextResponse.json({ recipe: structured } satisfies ImportRecipeResponse);
  }

  // Tier 2 — AI / social fallback
  try {
    const snippet = extractPageSnippet(page.html);
    if (!snippet || snippet.length < 40) {
      return errorResponse(
        422,
        "fetch_blocked",
        "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.",
        true,
      );
    }
    const recipe = await extractRecipeWithClaude(snippet, {
      source: "ai",
      sourceUrl: page.finalUrl,
      image: extractOgImage(page.html),
    });
    return NextResponse.json({ recipe } satisfies ImportRecipeResponse);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code || "")
        : "";
    const message =
      err instanceof Error ? err.message : "Could not extract a recipe.";
    if (code === "configuration_error") {
      return errorResponse(503, "configuration_error", message, true);
    }
    return errorResponse(
      422,
      "parse_failed",
      message ||
        "Couldn't load this link automatically. Tap here to paste the recipe text or caption directly.",
      true,
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
