/**
 * Dietary Restriction Modifications — pills + side-by-side adapt preview.
 */
import { DIET_OPTIONS, dietLabelsForPrompt } from "./diet-options.js";
import { dietAdaptPrompt } from "./prompts.js";
import { variationTitle } from "./auto-format.js";

var overlayEl = null;
var currentRecipe = null;
var selected = [];
var customNote = "";
var result = null;

function bridge() {
  return window.OhStuffingBridge || {};
}

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.id = "rvDietOverlay";
  overlayEl.setAttribute("role", "dialog");
  overlayEl.setAttribute("aria-modal", "true");
  overlayEl.setAttribute("aria-labelledby", "rvDietTitle");
  overlayEl.hidden = true;
  overlayEl.innerHTML =
    '<div class="rv-sheet">' +
    '<div class="rv-head"><div><h2 id="rvDietTitle">Adapt for Diet</h2>' +
    '<p class="rv-sub" id="rvDietSub"></p></div>' +
    '<button type="button" class="rv-x" id="rvDietClose" aria-label="Close">✕</button></div>' +
    '<div class="rv-body" id="rvDietBody"></div>' +
    "</div>";
  document.body.appendChild(overlayEl);
  overlayEl.querySelector("#rvDietClose").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlayEl && !overlayEl.hidden) close();
  });
  return overlayEl;
}

function render() {
  ensureOverlay();
  overlayEl.querySelector("#rvDietSub").textContent = currentRecipe
    ? currentRecipe.title
    : "";
  var body = overlayEl.querySelector("#rvDietBody");
  var pills = DIET_OPTIONS.map(function (opt) {
    var on = selected.indexOf(opt.id) !== -1;
    return (
      '<button type="button" class="rv-pill" data-diet="' +
      opt.id +
      '" aria-pressed="' +
      (on ? "true" : "false") +
      '"><span aria-hidden="true">' +
      opt.emoji +
      "</span> " +
      opt.label +
      "</button>"
    );
  }).join("");

  var customHtml =
    selected.indexOf("custom") !== -1
      ? '<label class="rv-label">Custom dietary note' +
        '<input type="text" id="rvCustomNote" placeholder=\'e.g., "no cilantro", "low sodium"\' value="' +
        escapeAttr(customNote) +
        '"></label>'
      : "";

  var previewHtml = "";
  if (result) {
    var swaps = (result.swappedIngredients || [])
      .map(function (s) {
        return (
          "<li><span class=\"from\">" +
          escapeHtml(s.from) +
          '</span> → <span class="to">' +
          escapeHtml(s.to) +
          "</span></li>"
        );
      })
      .join("");
    previewHtml =
      '<div class="rv-compare">' +
      '<div class="rv-panel"><div class="rv-panel-label">Original</div>' +
      '<div class="rv-panel-title">' +
      escapeHtml(currentRecipe.title) +
      '</div><div class="rv-panel-text">' +
      escapeHtml(currentRecipe.text) +
      "</div></div>" +
      '<div class="rv-panel rv-panel-new"><div class="rv-panel-label">Adapted</div>' +
      '<div class="rv-panel-title">' +
      escapeHtml(result.title) +
      '</div><div class="rv-panel-text">' +
      escapeHtml(result.text) +
      "</div></div></div>" +
      (swaps ? '<ul class="rv-swaps">' + swaps + "</ul>" : "") +
      '<div class="rv-actions" style="flex-direction:column;">' +
      '<button type="button" class="rv-btn rv-btn-primary rv-btn-block" id="rvSaveVariation">Save as New Diet Variation</button>' +
      '<button type="button" class="rv-btn rv-btn-block" id="rvApplyThis">Apply to This Recipe</button>' +
      "</div>";
  }

  body.innerHTML =
    '<div class="rv-pills" id="rvDietPills">' +
    pills +
    "</div>" +
    customHtml +
    '<button type="button" class="rv-btn rv-btn-primary rv-btn-block" id="rvRunAdapt">Adapt recipe</button>' +
    '<p class="rv-status" id="rvDietStatus"></p>' +
    previewHtml;

  body.querySelectorAll("[data-diet]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-diet");
      var idx = selected.indexOf(id);
      if (idx === -1) selected.push(id);
      else selected.splice(idx, 1);
      result = null;
      render();
    });
  });

  var noteInput = body.querySelector("#rvCustomNote");
  if (noteInput) {
    noteInput.addEventListener("input", function () {
      customNote = noteInput.value;
      result = null;
    });
  }

  var runBtn = body.querySelector("#rvRunAdapt");
  if (runBtn) runBtn.addEventListener("click", runAdapt);

  var saveVar = body.querySelector("#rvSaveVariation");
  if (saveVar) saveVar.addEventListener("click", saveAsNew);

  var applyBtn = body.querySelector("#rvApplyThis");
  if (applyBtn) applyBtn.addEventListener("click", applyToThis);
}

function setStatus(msg) {
  var el = overlayEl && overlayEl.querySelector("#rvDietStatus");
  if (el) el.textContent = msg || "";
}

function runAdapt() {
  var labels = dietLabelsForPrompt(selected, customNote);
  if (!labels.length) {
    setStatus("Pick at least one dietary restriction (or add a custom note).");
    return;
  }
  var b = bridge();
  if (typeof b.hasTextAI === "function" && !b.hasTextAI()) {
    setStatus(
      typeof b.needApiKeyMessage === "function"
        ? b.needApiKeyMessage()
        : "Diet adaptations need Photo & AI access."
    );
    return;
  }
  if (typeof b.aiJson !== "function") {
    setStatus("AI helper isn't available.");
    return;
  }
  setStatus("Adapting the recipe…");
  result = null;
  var runBtn = overlayEl.querySelector("#rvRunAdapt");
  if (runBtn) runBtn.disabled = true;

  b.aiJson(dietAdaptPrompt(currentRecipe.title, currentRecipe.text, labels), {
    modelTier: "default",
  })
    .then(function (data) {
      var text = data && typeof data.text === "string" ? data.text.trim() : "";
      if (!text) {
        setStatus("Couldn't adapt that recipe — try again.");
        return;
      }
      result = {
        title:
          data && typeof data.title === "string" && data.title.trim()
            ? data.title.trim()
            : variationTitle(currentRecipe.title, labels),
        servings:
          data && typeof data.servings === "number" && data.servings > 0
            ? data.servings
            : currentRecipe.servings,
        text: text,
        changes: Array.isArray(data.changes)
          ? data.changes.map(function (c) {
              return String(c);
            })
          : [],
        swappedIngredients: Array.isArray(data.swappedIngredients)
          ? data.swappedIngredients
              .map(function (s) {
                return {
                  from: String((s && s.from) || ""),
                  to: String((s && s.to) || ""),
                };
              })
              .filter(function (s) {
                return s.from || s.to;
              })
          : [],
      };
      render();
      setStatus("Review the adapted version, then save.");
    })
    .catch(function (e) {
      setStatus(formatErr(e));
    })
    .finally(function () {
      if (runBtn) runBtn.disabled = false;
    });
}

function saveAsNew() {
  if (!result || !currentRecipe) return;
  var labels = dietLabelsForPrompt(selected, customNote);
  var b = bridge();
  if (typeof b.saveRecipe !== "function") return;
  b.saveRecipe({
    title: result.title,
    servings: result.servings,
    text: result.text,
    diets: labels,
    parentId: currentRecipe.id,
    notes: result.changes.length
      ? 'Adapted from "' +
        currentRecipe.title +
        '". Changes: ' +
        result.changes.join("; ")
      : 'Adapted from "' + currentRecipe.title + '".',
  });
  close();
}

function applyToThis() {
  if (!result || !currentRecipe) return;
  var labels = dietLabelsForPrompt(selected, customNote);
  var b = bridge();
  if (typeof b.updateRecipe !== "function") return;
  b.updateRecipe(currentRecipe.id, {
    title: result.title,
    servings: result.servings,
    text: result.text,
    diets: labels,
  });
  close();
}

function formatErr(e) {
  var b = bridge();
  if (typeof b.sampleErrorMessage === "function") {
    return b.sampleErrorMessage(e && e.code, e && e.message);
  }
  return (e && e.message) || "Something went wrong.";
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function openDietaryModifierModal(recipe) {
  if (!recipe) return;
  currentRecipe = recipe;
  selected = [];
  customNote = "";
  result = null;
  ensureOverlay();
  overlayEl.hidden = false;
  render();
  setStatus("");
  document.documentElement.style.overflow = "hidden";
}

export function closeDietaryModifierModal() {
  close();
}

function close() {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  document.documentElement.style.overflow = "";
  currentRecipe = null;
  result = null;
}
