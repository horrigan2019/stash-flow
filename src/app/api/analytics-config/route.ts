import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Public analytics ids for the static homepage (public/analytics.js).
 * Server secrets are never returned. Missing keys mean console-only tracking.
 */
export function GET() {
  const body = {
    provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "").trim(),
    gaMeasurementId: (
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_GTAG_ID ||
      ""
    ).trim(),
    posthogKey: (process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim(),
    posthogHost: (
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
    ).trim(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
