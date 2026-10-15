import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGE = 2000;
const MAX_EMAIL = 200;

type FeedbackBody = {
  message?: unknown;
  email?: unknown;
};

function asText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formUrlWithNote(base: string, message: string, email: string): string {
  const url = new URL(base);
  url.searchParams.set("message", message);
  if (email) url.searchParams.set("email", email);
  return url.toString();
}

async function sendResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  replyTo: string;
  message: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      reply_to: input.replyTo || undefined,
      subject: "Oh Stuffing feedback",
      text: [
        input.message,
        "",
        input.replyTo
          ? `Reply to: ${input.replyTo}`
          : "No reply email was given.",
      ].join("\n"),
    }),
  });
  if (!res.ok) {
    throw new Error("email_failed");
  }
}

async function postWebhook(
  webhookUrl: string,
  message: string,
  email: string,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "oh-stuffing",
      message,
      email: email || null,
    }),
  });
  if (!res.ok) {
    throw new Error("webhook_failed");
  }
}

export async function POST(request: Request) {
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const message = asText(body.message, MAX_MESSAGE);
  const email = asText(body.email, MAX_EMAIL);
  if (message.length < 3) {
    return NextResponse.json(
      { error: "Please write a short note before sending." },
      { status: 400 },
    );
  }
  if (email && !isEmail(email)) {
    return NextResponse.json(
      { error: "That email doesn't look right." },
      { status: 400 },
    );
  }

  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  const to = (process.env.FEEDBACK_TO_EMAIL || "").trim();
  const from = (process.env.FEEDBACK_FROM_EMAIL || "").trim();
  const webhook = (process.env.FEEDBACK_WEBHOOK_URL || "").trim();
  const formUrl = (process.env.FEEDBACK_FORM_URL || "").trim();

  try {
    if (resendKey && to && from) {
      await sendResendEmail({
        apiKey: resendKey,
        from,
        to,
        replyTo: email,
        message,
      });
      return NextResponse.json({ ok: true, delivered: "email" });
    }

    if (webhook) {
      await postWebhook(webhook, message, email);
      return NextResponse.json({ ok: true, delivered: "webhook" });
    }
  } catch {
    return NextResponse.json(
      { error: "We couldn't send that just now. Please try again." },
      { status: 502 },
    );
  }

  if (formUrl) {
    try {
      const openUrl = formUrlWithNote(formUrl, message, email);
      return NextResponse.json({ ok: true, delivered: "form", openUrl });
    } catch {
      return NextResponse.json(
        { error: "The feedback form link is not set up correctly." },
        { status: 500 },
      );
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[feedback]", { email: email || null, message });
    return NextResponse.json({ ok: true, delivered: "log" });
  }

  return NextResponse.json(
    { error: "Feedback isn't set up yet. Please try again later." },
    { status: 503 },
  );
}
