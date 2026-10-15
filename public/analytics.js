/**
 * Browser runtime for the static Oh Stuffing homepage.
 * Same provider rules as src/utils/analytics.ts. Config comes from
 * /api/analytics-config so .env keys apply without a client bundle.
 * Third-party scripts load only after a real event, and only when a key exists.
 */
(function () {
  "use strict";

  var DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
  var queue = [];
  var config = null;
  var configRequest = null;

  function resolveProvider(cfg) {
    var choice = String((cfg && cfg.provider) || "").trim().toLowerCase();
    var gaId = String((cfg && cfg.gaMeasurementId) || "").trim();
    var posthogKey = String((cfg && cfg.posthogKey) || "").trim();
    if (choice === "console") return "console";
    if (choice === "gtag" || choice === "ga") return gaId ? "gtag" : "console";
    if (choice === "posthog") return posthogKey ? "posthog" : "console";
    if (posthogKey) return "posthog";
    if (gaId) return "gtag";
    return "console";
  }

  function ensureGtag(measurementId) {
    var id = String(measurementId || "").trim();
    if (!id) return;
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
    }
    if (window.__ohGtagId === id) return;
    window.__ohGtagId = id;
    window.gtag("config", id, { send_page_view: false });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);
  }

  function ensurePosthog(key, host) {
    if (window.__ohPosthogStarted) return;
    var apiKey = String(key || "").trim();
    if (!apiKey) return;
    window.__ohPosthogStarted = true;

    var apiHost = String(host || DEFAULT_POSTHOG_HOST).trim().replace(/\/$/, "");
    var assetsHost = apiHost.indexOf(".i.posthog.com") !== -1
      ? apiHost.replace(".i.posthog.com", "-assets.i.posthog.com")
      : apiHost;

    var posthog = window.posthog || [];
    window.posthog = posthog;
    if (!posthog.__SV) {
      posthog._i = [];
      posthog.init = function (apiKeyArg, options, name) {
        ["capture", "identify", "register"].forEach(function (method) {
          posthog[method] = function () {
            posthog.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
        });
        var script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = assetsHost + "/static/array.js";
        var first = document.getElementsByTagName("script")[0];
        if (first && first.parentNode) first.parentNode.insertBefore(script, first);
        else document.head.appendChild(script);
        posthog._i.push([apiKeyArg, options, name]);
      };
      posthog.__SV = 1;
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: false,
      autocapture: false,
      disable_session_recording: true,
      persistence: "localStorage"
    });
  }

  function dispatch(eventName, properties) {
    var provider = resolveProvider(config);
    if (provider === "gtag") {
      ensureGtag(config.gaMeasurementId);
      if (window.gtag) window.gtag("event", eventName, properties);
      return;
    }
    if (provider === "posthog") {
      ensurePosthog(config.posthogKey, config.posthogHost);
      if (window.posthog && window.posthog.capture) window.posthog.capture(eventName, properties);
      return;
    }
    console.info("[oh-stuffing]", eventName, properties);
  }

  function flush() {
    var pending = queue.slice();
    queue.length = 0;
    pending.forEach(function (item) {
      dispatch(item[0], item[1]);
    });
  }

  function ensureConfig() {
    if (config || configRequest) return;
    configRequest = fetch("/api/analytics-config", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : {}; })
      .catch(function () { return {}; })
      .then(function (data) {
        config = data || {};
        flush();
      });
  }

  function trackEvent(eventName, properties) {
    try {
      if (!eventName) return;
      var props = properties && typeof properties === "object" ? properties : {};
      if (!config) {
        queue.push([eventName, props]);
        if (queue.length > 30) queue.shift();
        ensureConfig();
        return;
      }
      dispatch(eventName, props);
    } catch (err) {}
  }

  var early = window.__ohTrackQueue || [];
  window.__ohTrackQueue = [];
  window.ohTrackEvent = trackEvent;
  early.forEach(function (item) {
    trackEvent(item[0], item[1]);
  });
  ensureConfig();
})();
