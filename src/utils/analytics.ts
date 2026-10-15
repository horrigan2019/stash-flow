/**
 * Lightweight product analytics for Oh Stuffing.
 *
 * Provider is chosen from public env (no keys → console only, no third-party scripts):
 * - NEXT_PUBLIC_ANALYTICS_PROVIDER = "gtag" | "posthog" | "console"
 * - NEXT_PUBLIC_GA_MEASUREMENT_ID (alias: NEXT_PUBLIC_GTAG_ID)
 * - NEXT_PUBLIC_POSTHOG_KEY
 * - NEXT_PUBLIC_POSTHOG_HOST (optional, default https://us.i.posthog.com)
 *
 * If the provider is omitted, PostHog is used when its key is set, otherwise gtag.
 * The static homepage (public/index.html) uses public/analytics.js, which follows
 * the same rules via /api/analytics-config. Keep the two in sync.
 *
 * trackEvent never throws and never waits on the network.
 */

export type AnalyticsProvider = "gtag" | "posthog" | "console";

export type AnalyticsConfig = {
  provider?: string;
  gaMeasurementId?: string;
  posthogKey?: string;
  posthogHost?: string;
};

type GtagFn = (...args: unknown[]) => void;

type PosthogStub = {
  __SV?: number;
  _i?: unknown[];
  init: (key: string, options: Record<string, unknown>, name?: string) => void;
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  people?: unknown[];
  push: (item: unknown[]) => void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    posthog?: PosthogStub;
    __ohGtagId?: string;
    __ohPosthogStarted?: boolean;
  }
}

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function readBuildConfig(): AnalyticsConfig {
  return {
    provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
    gaMeasurementId:
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_GTAG_ID,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  };
}

export function resolveAnalyticsProvider(config: AnalyticsConfig): AnalyticsProvider {
  const choice = (config.provider || "").trim().toLowerCase();
  const gaId = (config.gaMeasurementId || "").trim();
  const posthogKey = (config.posthogKey || "").trim();

  if (choice === "console") return "console";
  if (choice === "gtag" || choice === "ga") return gaId ? "gtag" : "console";
  if (choice === "posthog") return posthogKey ? "posthog" : "console";
  if (posthogKey) return "posthog";
  if (gaId) return "gtag";
  return "console";
}

function ensureGtag(measurementId: string) {
  if (typeof window === "undefined") return;
  const id = measurementId.trim();
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag's official snippet forwards `arguments`, not a rest array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
  }
  if (window.__ohGtagId === id) return;
  window.__ohGtagId = id;
  window.gtag("config", id, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(script);
}

function ensurePosthog(key: string, host?: string) {
  if (typeof window === "undefined" || window.__ohPosthogStarted) return;
  const apiKey = key.trim();
  if (!apiKey) return;
  window.__ohPosthogStarted = true;

  const apiHost = (host || DEFAULT_POSTHOG_HOST).trim().replace(/\/$/, "");
  const assetsHost = apiHost.includes(".i.posthog.com")
    ? apiHost.replace(".i.posthog.com", "-assets.i.posthog.com")
    : apiHost;

  const posthog = (window.posthog || ([] as unknown as PosthogStub)) as PosthogStub;
  window.posthog = posthog;
  if (!posthog.__SV) {
    posthog._i = [];
    posthog.init = function init(apiKeyArg, options, name) {
      const target = posthog;
      const methods = ["capture", "identify", "register"];
      methods.forEach((method) => {
        (target as unknown as Record<string, (...args: unknown[]) => void>)[method] =
          function queued() {
            // Match PostHog's array stub so array.js can replay the call.
            // eslint-disable-next-line prefer-rest-params
            target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
      });
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = assetsHost + "/static/array.js";
      const first = document.getElementsByTagName("script")[0];
      if (first && first.parentNode) first.parentNode.insertBefore(script, first);
      else document.head.appendChild(script);
      posthog._i = posthog._i || [];
      posthog._i.push([apiKeyArg, options, name]);
    };
    posthog.__SV = 1;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    autocapture: false,
    disable_session_recording: true,
    persistence: "localStorage",
  });
}

function dispatch(config: AnalyticsConfig, eventName: string, properties: Record<string, any>) {
  const provider = resolveAnalyticsProvider(config);
  if (provider === "gtag") {
    ensureGtag(config.gaMeasurementId || "");
    window.gtag?.("event", eventName, properties);
    return;
  }
  if (provider === "posthog") {
    ensurePosthog(config.posthogKey || "", config.posthogHost);
    window.posthog?.capture(eventName, properties);
    return;
  }
  console.info("[oh-stuffing]", eventName, properties);
}

export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  if (!eventName || typeof window === "undefined") return;
  try {
    dispatch(readBuildConfig(), eventName, properties ?? {});
  } catch {
    // Analytics must never affect shopping, scans, or checkout.
  }
}
