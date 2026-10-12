/**
 * Isolated "New Version Available" banner for Oh Stuffing PWA.
 * Uses standard navigator.serviceWorker — no shopping list coupling.
 */

var bannerEl = null;
var waitingWorker = null;
var reloadArmed = false;
var UPDATE_CHECK_MS = 60 * 60 * 1000;

function ensureBanner() {
  if (bannerEl) return bannerEl;
  bannerEl = document.createElement("div");
  bannerEl.id = "ohUpdateBanner";
  bannerEl.setAttribute("role", "status");
  bannerEl.setAttribute("aria-live", "polite");
  bannerEl.hidden = true;
  bannerEl.innerHTML =
    '<div class="oh-update-card">' +
    '<p class="oh-update-msg">A fresh update for Oh Stuffing is ready! 🚀</p>' +
    '<div class="oh-update-actions">' +
    '<button type="button" class="oh-update-btn oh-update-btn-primary" id="ohUpdateNow">Update Now</button>' +
    '<button type="button" class="oh-update-btn oh-update-btn-later" id="ohUpdateLater" aria-label="Later">Later ✕</button>' +
    "</div></div>";
  document.body.appendChild(bannerEl);
  bannerEl.querySelector("#ohUpdateNow").addEventListener("click", updateNow);
  bannerEl.querySelector("#ohUpdateLater").addEventListener("click", dismiss);
  return bannerEl;
}

function showBanner(worker) {
  if (!worker) return;
  waitingWorker = worker;
  ensureBanner().hidden = false;
}

function dismiss() {
  if (bannerEl) bannerEl.hidden = true;
}

function updateNow() {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  reloadArmed = true;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
  // Fallback if controllerchange is missed
  setTimeout(function () {
    window.location.reload();
  }, 1200);
}

function watchRegistration(reg) {
  if (reg.waiting && navigator.serviceWorker.controller) {
    showBanner(reg.waiting);
  }
  reg.addEventListener("updatefound", function () {
    var installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", function () {
      if (
        installing.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        showBanner(reg.waiting || installing);
      }
    });
  });

  function check() {
    reg.update().catch(function () {});
  }
  check();
  setInterval(check, UPDATE_CHECK_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });
}

function boot() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!reloadArmed) return;
    window.location.reload();
  });

  var ready = function () {
    navigator.serviceWorker
      .register("/sw.js")
      .then(watchRegistration)
      .catch(function () {
        /* offline shell optional */
      });
  };

  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready);
}

boot();
