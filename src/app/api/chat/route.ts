import { NextResponse } from "next/server";
import { UNDERWRITING_FAQ } from "@/lib/izzy/underwriting-faq";
import { STATE_NUANCES } from "@/lib/izzy/checklists";

export const runtime = "nodejs";
export const maxDuration = 30;

type PolicyContext = {
  state?: string;
  workflow?: string;
  notes?: string;
  carrier?: string;
  policyNumber?: string;
};

const SYSTEM_CONTEXT = `You are Izzy, a friendly consumer insurance guide helping people prepare for carrier underwriting questions and mid-term policy changes.
Explain why carriers ask for documents in plain language. Be practical and concise (2–4 short paragraphs max).
Use any provided policy context (state, workflow, carrier, policy number, notes) to tailor the answer.
Never invent legal requirements as absolute facts—frame state nuances as "often" / "commonly" and suggest confirming with the carrier or agent.
Do not provide legal advice. Do not invent policy numbers or claim that coverage was bound.`;

function offlineReply(message: string, policyContext: PolicyContext): string {
  const lower = message.toLowerCase();
  const ctxBits = [
    policyContext.state && `state ${policyContext.state}`,
    policyContext.workflow && `change type “${policyContext.workflow}”`,
    policyContext.carrier && `carrier ${policyContext.carrier}`,
  ].filter(Boolean);

  const ctxLead = ctxBits.length
    ? `Given your ${ctxBits.join(" and ")}: `
    : "";

  const faqHit = UNDERWRITING_FAQ.find(
    (card) =>
      card.tags.some((tag) => lower.includes(tag)) ||
      lower.includes(card.question.toLowerCase().slice(0, 24)),
  );

  if (lower.includes("fs-20") || (lower.includes("ny") && lower.includes("proof"))) {
    const nuance = STATE_NUANCES.NY?.[0];
    return [
      `${ctxLead}In New York, carriers and the DMV often rely on FS-20 (or equivalent) proof of auto insurance when you add a vehicle or change coverage.`,
      nuance?.detail ?? "",
      "Ask your carrier for the FS-20 before any DMV appointment, and confirm the effective date matches when you need to drive the vehicle.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (
    lower.includes("good driver") ||
    (lower.includes("ca") && lower.includes("discount"))
  ) {
    return [
      `${ctxLead}California Good Driver rules generally look at recent points, at-fault accidents, and major violations.`,
      "Ask whether each listed driver still qualifies and how adding someone mid-term affects the household discount. Confirm specifics with your carrier—eligibility formulas can vary by company within CA regulations.",
    ].join("\n\n");
  }

  if (
    lower.includes("health") ||
    lower.includes("pip") ||
    lower.includes("coordination")
  ) {
    return [
      `${ctxLead}Carriers may request a health insurance card to set PIP coordination of benefits—whether auto PIP or health coverage pays first after an injury.`,
      "Have a clear front/back copy ready and ask if PIP is primary or secondary on your form and in your state.",
    ].join("\n\n");
  }

  if (faqHit) {
    return [
      `${ctxLead}${faqHit.shortAnswer}`,
      `Why they ask: ${faqHit.whyTheyAsk}`,
      `Tip: ${faqHit.tip}`,
    ].join("\n\n");
  }

  return [
    `${ctxLead}I can help decode carrier requests about household members, mileage, prior declarations, lienholder/loss payee details, or health cards for PIP.`,
    "If this is for a mid-term change, gather documents first, note your state, then call with your Izzy cheat sheet so nothing gets missed.",
  ].join("\n\n");
}

function parsePolicyContext(raw: unknown): PolicyContext {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pick = (k: string) =>
    typeof o[k] === "string" ? String(o[k]).trim().slice(0, 120) : undefined;
  return {
    state: pick("state"),
    workflow: pick("workflow"),
    notes: pick("notes"),
    carrier: pick("carrier"),
    policyNumber: pick("policyNumber"),
  };
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

  const topic =
    body &&
    typeof body === "object" &&
    typeof (body as { topic?: unknown }).topic === "string"
      ? String((body as { topic: string }).topic).trim()
      : "";

  const policyContext = parsePolicyContext(
    body && typeof body === "object"
      ? (body as { policyContext?: unknown }).policyContext
      : undefined,
  );

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
      reply: offlineReply(message, policyContext),
      source: "offline",
    });
  }

  const contextBlock = [
    topic && `Topic: ${topic}`,
    policyContext.state && `State: ${policyContext.state}`,
    policyContext.workflow && `Workflow: ${policyContext.workflow}`,
    policyContext.carrier && `Carrier: ${policyContext.carrier}`,
    policyContext.policyNumber && `Policy #: ${policyContext.policyNumber}`,
    policyContext.notes && `Notes: ${policyContext.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userText = contextBlock
    ? `${contextBlock}\n\nQuestion: ${message}`
    : message;

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
            content: [{ type: "text", text: userText }],
          },
        ],
      }),
    });
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json(
      { error: { type: "api_error", message: errMessage } },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({
      reply: offlineReply(message, policyContext),
      source: "offline-fallback",
    });
  }

  const raw = await upstream.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
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
      reply: offlineReply(message, policyContext),
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
