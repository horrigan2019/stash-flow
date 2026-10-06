import { NextResponse } from "next/server";
import { UNDERWRITING_FAQ } from "@/lib/izzy/underwriting-faq";
import { STATE_NUANCES } from "@/lib/izzy/checklists";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_CONTEXT = `You are Izzy, a friendly consumer insurance guide helping people prepare for carrier underwriting questions and mid-term policy changes.
Explain why carriers ask for documents in plain language. Be practical and concise (2–4 short paragraphs max).
Never invent legal requirements as absolute facts—frame state nuances as "often" / "commonly" and suggest confirming with the carrier or agent.
Do not provide legal advice. Do not invent policy numbers or claim that coverage was bound.`;

function offlineReply(message: string): string {
  const lower = message.toLowerCase();
  const faqHit = UNDERWRITING_FAQ.find((card) =>
    card.tags.some((tag) => lower.includes(tag)) ||
    lower.includes(card.question.toLowerCase().slice(0, 24)),
  );

  if (lower.includes("fs-20") || (lower.includes("ny") && lower.includes("proof"))) {
    const nuance = STATE_NUANCES.NY?.[0];
    return [
      "In New York, carriers and the DMV often rely on FS-20 (or equivalent) proof of auto insurance when you add a vehicle or change coverage.",
      nuance?.detail ?? "",
      "Ask your carrier for the FS-20 before any DMV appointment, and confirm the effective date matches when you need to drive the vehicle.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (lower.includes("pip") && (lower.includes("mi") || lower.includes("michigan") || lower.includes("fl") || lower.includes("florida"))) {
    return [
      "PIP states like Michigan and Florida commonly review household members because no-fault benefits and rating can extend beyond the named insured.",
      "Have names and dates of birth for licensed residents ready, even if someone rarely drives. If a person should be excluded, ask the carrier for written exclusion wording.",
    ].join("\n\n");
  }

  if (faqHit) {
    return [
      faqHit.shortAnswer,
      `Why they ask: ${faqHit.whyTheyAsk}`,
      `Tip: ${faqHit.tip}`,
    ].join("\n\n");
  }

  return [
    "I can help decode carrier requests. Try asking about household members, annual mileage, prior declarations pages, or mortgagee/lienholder clauses.",
    "If this is for a mid-term change, gather VIN/DL details first, note your state, then call with a printed checklist so nothing gets missed.",
  ].join("\n\n");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          type: "invalid_request",
          message: "Request body must be JSON.",
        },
      },
      { status: 400 },
    );
  }

  const message =
    body &&
    typeof body === "object" &&
    typeof (body as { message?: unknown }).message === "string"
      ? String((body as { message: string }).message).replace(/\s+/g, " ").trim()
      : "";

  if (!message || message.length < 2) {
    return NextResponse.json(
      {
        error: {
          type: "invalid_request",
          message: "Type a question for Izzy first.",
        },
      },
      { status: 400 },
    );
  }

  if (message.length > 500) {
    return NextResponse.json(
      {
        error: {
          type: "invalid_request",
          message: "Keep questions under 500 characters.",
        },
      },
      { status: 400 },
    );
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({
      reply: offlineReply(message),
      source: "offline",
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 500,
        system: SYSTEM_CONTEXT,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: message }],
          },
        ],
      }),
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { error: { type: "api_error", message: errMessage } },
      { status: 502 },
    );
  }

  const raw = await upstream.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!upstream.ok) {
    // Fall back so the explainer still works if the key is misconfigured.
    return NextResponse.json({
      reply: offlineReply(message),
      source: "offline-fallback",
    });
  }

  const content =
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray((data as { content: unknown }).content)
      ? (data as { content: Array<{ type?: string; text?: string }> }).content
      : [];
  let text = "";
  for (const block of content) {
    if (block.type === "text" && block.text) text += block.text;
  }

  if (!text.trim()) {
    return NextResponse.json({
      reply: offlineReply(message),
      source: "offline-fallback",
    });
  }

  return NextResponse.json({
    reply: text.trim(),
    source: "ai",
  });
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
