import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/auth";
import { statePromptContext, suggestTeaserGaps } from "@/lib/izzy/state-rules";
import type {
  AnalyzePolicyResult,
  ExtractedCoverage,
  PolicyCategory,
  PolicyDocType,
} from "@/lib/izzy/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORIES: PolicyCategory[] = [
  "auto",
  "home",
  "commercial",
  "life",
  "health",
];

function mockExtract(
  state: string,
  category: PolicyCategory,
): AnalyzePolicyResult {
  const extracted: ExtractedCoverage = {
    carrier: "Sample Mutual",
    policyNumber: "DEMO-1001",
    state,
    liabilityBodilyInjury: "100/300",
    liabilityPropertyDamage: "25000",
    comprehensiveDeductible: "500",
    collisionDeductible: "1000",
    roadside: false,
    rental: false,
    exclusions: ["Custom parts", "Racing"],
    claimsPhone: "1-800-555-0199",
    roadsidePhone: undefined,
  };
  const teaserGaps = suggestTeaserGaps(extracted).map((g) => ({
    ...g,
    locked: true as const,
  }));
  return {
    category,
    state,
    extracted,
    plainEnglishSummary:
      "In plain English: you have solid BI limits on paper, but property damage looks thin for a modern crash, and rental/roadside are not clearly included. This is an educational decode—not a coverage decision.",
    teaserGaps,
  };
}

function parseCategory(raw: unknown): PolicyCategory {
  if (typeof raw === "string" && CATEGORIES.includes(raw as PolicyCategory)) {
    return raw as PolicyCategory;
  }
  return "auto";
}

function parseDocType(raw: unknown): PolicyDocType {
  if (
    raw === "dec_page" ||
    raw === "carrier_letter" ||
    raw === "audit" ||
    raw === "bill"
  ) {
    return raw;
  }
  return "dec_page";
}

function mediaTypeFromName(name: string | undefined, fallback: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (fallback.startsWith("image/") || fallback === "application/pdf") {
    return fallback;
  }
  return "application/pdf";
}

export async function POST(request: Request) {
  let body: {
    fileBase64?: string;
    fileName?: string;
    mimeType?: string;
    state?: string;
    category?: string;
    docType?: string;
    persist?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const state = (body.state || "NY").trim().toUpperCase().slice(0, 2);
  const category = parseCategory(body.category);
  const docType = parseDocType(body.docType);
  const fileBase64 = (body.fileBase64 || "").replace(/^data:[^;]+;base64,/, "");

  if (!fileBase64 || fileBase64.length < 32) {
    return NextResponse.json(
      { error: "Upload a PDF or image (base64) of your dec page." },
      { status: 400 },
    );
  }

  // Cap ~8MB base64 payload for free-tier single decode
  if (fileBase64.length > 11_000_000) {
    return NextResponse.json(
      { error: "File too large. Try a single-page scan under ~8MB." },
      { status: 413 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  let result: AnalyzePolicyResult;

  if (!apiKey) {
    result = mockExtract(state, category);
  } else {
    try {
      const client = new Anthropic({ apiKey });
      const mime = mediaTypeFromName(body.fileName, body.mimeType || "");
      const isImage = mime.startsWith("image/");

      const promptText = `You are Izzy, an empathetic insurance decoder. Extract structured coverage from this ${docType} for line=${category}, state=${state}.
State context: ${statePromptContext(state)}
Return ONLY valid JSON with keys:
carrier, policyNumber, state, liabilityBodilyInjury, liabilityPropertyDamage, comprehensiveDeductible, collisionDeductible, roadside (boolean|null), rental (boolean|null), exclusions (string[]), claimsPhone, roadsidePhone, plainEnglishSummary (2-4 sentences, plain English consequences, no sales pitch), gaps (array of {id,title,detail} — coverage questions/gaps).
Never invent binding coverage. If unclear, use null/empty and say so in the summary.`;

      // SDK content blocks vary by media type; keep flexible for PDF + images.
      const content = (
        isImage
          ? [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: (mime.startsWith("image/")
                    ? mime
                    : "image/png") as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
                  data: fileBase64,
                },
              },
              { type: "text" as const, text: promptText },
            ]
          : [
              {
                type: "document" as const,
                source: {
                  type: "base64" as const,
                  media_type: "application/pdf" as const,
                  data: fileBase64,
                },
              },
              { type: "text" as const, text: promptText },
            ]
      ) as Anthropic.MessageCreateParams["messages"][0]["content"];

      const message = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1400,
        messages: [{ role: "user", content }],
      });

      let text = "";
      for (const block of message.content) {
        if (block.type === "text") text += block.text;
      }
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        result = mockExtract(state, category);
        result.plainEnglishSummary =
          "We could not fully parse the model response. Showing a demo-style decode—re-upload or try again with a clearer scan.";
      } else {
        const parsed = JSON.parse(jsonMatch[0]) as ExtractedCoverage & {
          plainEnglishSummary?: string;
          gaps?: Array<{ id: string; title: string; detail: string }>;
        };
        const extracted: ExtractedCoverage = {
          carrier: parsed.carrier,
          policyNumber: parsed.policyNumber,
          state: parsed.state || state,
          liabilityBodilyInjury: parsed.liabilityBodilyInjury,
          liabilityPropertyDamage: parsed.liabilityPropertyDamage,
          comprehensiveDeductible: parsed.comprehensiveDeductible,
          collisionDeductible: parsed.collisionDeductible,
          roadside: parsed.roadside ?? null,
          rental: parsed.rental ?? null,
          exclusions: parsed.exclusions ?? [],
          claimsPhone: parsed.claimsPhone,
          roadsidePhone: parsed.roadsidePhone,
          gaps: parsed.gaps,
        };
        const teaserSource =
          parsed.gaps?.length && parsed.gaps.length >= 2
            ? parsed.gaps.slice(0, 2)
            : suggestTeaserGaps(extracted);
        result = {
          category,
          state,
          extracted,
          plainEnglishSummary:
            parsed.plainEnglishSummary ||
            "Here is a plain-English read of what we could see on your document.",
          teaserGaps: teaserSource.map((g) => ({ ...g, locked: true as const })),
        };
      }
    } catch {
      result = mockExtract(state, category);
      result.plainEnglishSummary =
        "AI decode unavailable right now—showing an educational sample structure so you can still explore the free flow.";
    }
  }

  // Persist when Supabase + session available (Pro vault / free single decode)
  if (body.persist !== false) {
    const user = await getSessionUser();
    const admin = getSupabaseAdmin();
    if (user && admin) {
      const { data, error } = await admin
        .from("policies")
        .insert({
          user_id: user.id,
          category,
          carrier_name: result.extracted.carrier ?? null,
          policy_number: result.extracted.policyNumber ?? null,
          state: result.state,
          claims_phone: result.extracted.claimsPhone ?? null,
          roadside_phone: result.extracted.roadsidePhone ?? null,
          extracted_json: result.extracted,
          plain_english_summary: result.plainEnglishSummary,
        })
        .select("id")
        .maybeSingle();
      if (!error && data?.id) {
        result.policyId = data.id as string;
        await admin.from("policy_documents").insert({
          policy_id: data.id,
          user_id: user.id,
          file_name: body.fileName || "upload",
          file_url: "inline:base64",
          doc_type: docType,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, result });
}
