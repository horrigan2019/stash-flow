/**
 * Create Recipe modal — Type/Paste, Photo Snap, Ask AI tabs.
 */
import {
  autoFormatRecipePaste,
  draftToRecipeText,
  parsedJsonToDraft,
} from "./auto-format.js";
import { askRecipePrompt, photoExtractFullPrompt } from "./prompts.js";

var overlayEl = null;
var draft = emptyDraft();
var activeTab = "type";
var effort = "weeknight";
var photoFile = null;

function bridge() {
  return window.OhStuffingBridge || {};
}

function emptyDraft() {
  return {
    title: "",
    servings: 4,
    prepTime: "",
    cookTime: "",
    ingredientsText: "",
    instructionsText: "",
    notes: "",
    source: "",
  };
}

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.id = "rvCreateOverlay";
  overlayEl.setAttribute("role", "dialog");
  overlayEl.setAttribute("aria-modal", "true");
  overlayEl.setAttribute("aria-labelledby", "rvCreateTitle");
  overlayEl.hidden = true;
  overlayEl.innerHTML =
    '<div class="rv-sheet">' +
    '<div class="rv-head"><div><h2 id="rvCreateTitle">Add / Create Recipe</h2>' +
    '<p class="rv-sub">Type, snap a page, or ask for a weeknight idea.</p></div>' +
    '<button type="button" class="rv-x" id="rvCreateClose" aria-label="Close">✕</button></div>' +
    '<div class="rv-tabs" role="tablist">' +
    '<button type="button" class="rv-tab" data-tab="type" aria-pressed="true">Type or Paste Recipe</button>' +
    '<button type="button" class="rv-tab" data-tab="photo" aria-pressed="false">📸 Snap a Recipe</button>' +
    '<button type="button" class="rv-tab" data-tab="ask" aria-pressed="false">✨ Ask for a Recipe</button>' +
    "</div>" +
    '<div class="rv-body" id="rvCreateBody"></div>' +
    '<p class="rv-status" id="rvCreateStatus" style="padding:0 16px 8px;"></p>' +
    '<div class="rv-foot">' +
    '<button type="button" class="rv-btn" id="rvCreateCancel">Cancel</button>' +
    '<button type="button" class="rv-btn rv-btn-primary" id="rvCreateSave">Save recipe</button>' +
    "</div></div>";
  document.body.appendChild(overlayEl);

  overlayEl.querySelector("#rvCreateClose").addEventListener("click", close);
  overlayEl.querySelector("#rvCreateCancel").addEventListener("click", close);
  overlayEl.querySelector("#rvCreateSave").addEventListener("click", save);
  overlayEl.querySelectorAll(".rv-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeTab = btn.getAttribute("data-tab");
      renderBody();
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlayEl && !overlayEl.hidden) close();
  });
  return overlayEl;
}

function setStatus(msg) {
  var el = overlayEl && overlayEl.querySelector("#rvCreateStatus");
  if (el) el.textContent = msg || "";
}

function readFieldsFromDom() {
  if (!overlayEl) return;
  var q = function (id) {
    return overlayEl.querySelector("#" + id);
  };
  var title = q("rvFieldTitle");
  var servings = q("rvFieldServings");
  var prep = q("rvFieldPrep");
  var cook = q("rvFieldCook");
  var ingredients = q("rvFieldIngredients");
  var instructions = q("rvFieldInstructions");
  var notes = q("rvFieldNotes");
  var ask = q("rvAskPrompt");
  if (title) draft.title = title.value;
  if (servings) draft.servings = parseInt(servings.value, 10) || 4;
  if (prep) draft.prepTime = prep.value;
  if (cook) draft.cookTime = cook.value;
  if (ingredients) draft.ingredientsText = ingredients.value;
  if (instructions) draft.instructionsText = instructions.value;
  if (notes) {
    draft.notes = notes.value;
    draft.source = notes.value;
  }
  if (ask) draft._askPrompt = ask.value;
}

function askExtrasHtml() {
  return (
    '<label class="rv-label">What would you like to make?' +
    '<textarea id="rvAskPrompt" rows="3" placeholder="e.g., Authentic Bolognese, Quick 20-min lemon salmon, Grandma\'s style beef stew">' +
    escapeHtml(draft._askPrompt || "") +
    "</textarea></label>" +
    '<div><div class="rv-label" style="margin-bottom:6px;">Prep time / effort</div>' +
    '<div class="rv-pills" id="rvEffortPills">' +
    effortPill("quick", "Quick (~20 min)") +
    effortPill("weeknight", "Weeknight") +
    effortPill("weekend", "Weekend project") +
    "</div></div>" +
    '<button type="button" class="rv-btn rv-btn-primary rv-btn-block" id="rvAskGenerate">✨ Generate recipe</button>'
  );
}

function photoExtrasHtml() {
  return (
    '<p class="rv-sub">Snap a cookbook page, recipe card, magazine clipping, or handwritten note.</p>' +
    '<div class="rv-camera">' +
    '<div class="rv-camera-tile"><input type="file" id="rvPhotoInput" accept="image/*" capture="environment">' +
    '<div class="rv-camera-label"><span style="font-size:1.6rem;">📷</span><span>Snap / upload</span></div></div>' +
    '<img class="rv-camera-preview" id="rvPhotoPreview" alt="Recipe photo preview" hidden>' +
    "</div>" +
    '<button type="button" class="rv-btn" id="rvPhotoRead" hidden>🔍 Read photo into the form</button>'
  );
}

function recipeFieldsHtml() {
  return (
    '<label class="rv-label">Recipe Title' +
    '<input type="text" id="rvFieldTitle" autocomplete="off" placeholder="e.g. Grandma\'s Lasagna" value="' +
    escapeAttr(draft.title) +
    '"></label>' +
    '<div class="rv-row3">' +
    '<label class="rv-label">Servings<input type="number" id="rvFieldServings" min="1" value="' +
    (draft.servings || 4) +
    '"></label>' +
    '<label class="rv-label">Prep<input type="text" id="rvFieldPrep" placeholder="15 min" value="' +
    escapeAttr(draft.prepTime) +
    '"></label>' +
    '<label class="rv-label">Cook<input type="text" id="rvFieldCook" placeholder="30 min" value="' +
    escapeAttr(draft.cookTime) +
    '"></label></div>' +
    '<label class="rv-label">Ingredients<textarea id="rvFieldIngredients" rows="5" placeholder="2 cups flour&#10;1 tsp salt&#10;…">' +
    escapeHtml(draft.ingredientsText) +
    "</textarea></label>" +
    '<label class="rv-label">Step-by-Step Instructions<textarea id="rvFieldInstructions" rows="5" placeholder="1. Mix dry ingredients&#10;2. …">' +
    escapeHtml(draft.instructionsText) +
    "</textarea></label>" +
    '<label class="rv-label">Notes / Source (optional)<input type="text" id="rvFieldNotes" placeholder="Family cookbook, p. 42" value="' +
    escapeAttr(draft.notes || draft.source || "") +
    '"></label>' +
    '<div class="rv-actions"><button type="button" class="rv-btn" id="rvAutoFormat">Auto-Format &amp; Clean</button></div>'
  );
}

function effortPill(id, label) {
  return (
    '<button type="button" class="rv-pill" data-effort="' +
    id +
    '" aria-pressed="' +
    (effort === id ? "true" : "false") +
    '">' +
    label +
    "</button>"
  );
}

function renderBody() {
  readFieldsFromDom();
  ensureOverlay();
  overlayEl.querySelectorAll(".rv-tab").forEach(function (btn) {
    btn.setAttribute(
      "aria-pressed",
      btn.getAttribute("data-tab") === activeTab ? "true" : "false"
    );
  });
  var body = overlayEl.querySelector("#rvCreateBody");
  var hasDraft =
    !!(draft.title || draft.ingredientsText || draft.instructionsText);
  var html = "";
  if (activeTab === "ask") html += askExtrasHtml();
  if (activeTab === "photo") html += photoExtrasHtml();
  if (activeTab === "type" || activeTab === "photo" || (activeTab === "ask" && hasDraft)) {
    html += recipeFieldsHtml();
  }
  body.innerHTML = html;
  wireBodyHandlers();
}

function wireBodyHandlers() {
  var autoBtn = overlayEl.querySelector("#rvAutoFormat");
  if (autoBtn) {
    autoBtn.addEventListener("click", function () {
      readFieldsFromDom();
      var blob = [draft.title, draft.ingredientsText, draft.instructionsText]
        .filter(Boolean)
        .join("\n");
      var result = autoFormatRecipePaste(blob);
      if (!draft.title && result.titleGuess) draft.title = result.titleGuess;
      if (result.servingsGuess) draft.servings = result.servingsGuess;
      if (!draft.prepTime && result.prepTimeGuess) draft.prepTime = result.prepTimeGuess;
      if (!draft.cookTime && result.cookTimeGuess) draft.cookTime = result.cookTimeGuess;
      if (result.ingredientsText) draft.ingredientsText = result.ingredientsText;
      if (result.instructionsText) draft.instructionsText = result.instructionsText;
      renderBody();
      setStatus("Cleaned and structured — review, then save.");
    });
  }

  var photoInput = overlayEl.querySelector("#rvPhotoInput");
  var preview = overlayEl.querySelector("#rvPhotoPreview");
  var readBtn = overlayEl.querySelector("#rvPhotoRead");
  if (photoInput) {
    photoInput.addEventListener("change", function () {
      photoFile = photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
      if (preview) {
        if (photoFile) {
          preview.src = URL.createObjectURL(photoFile);
          preview.hidden = false;
        } else {
          preview.hidden = true;
        }
      }
      if (readBtn) readBtn.hidden = !photoFile;
      if (photoFile) runPhotoExtract(photoFile);
    });
  }
  if (readBtn) {
    readBtn.addEventListener("click", function () {
      if (photoFile) runPhotoExtract(photoFile);
    });
  }

  overlayEl.querySelectorAll("[data-effort]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      effort = btn.getAttribute("data-effort");
      renderBody();
    });
  });

  var askGen = overlayEl.querySelector("#rvAskGenerate");
  if (askGen) {
    askGen.addEventListener("click", runAskGenerate);
  }
}

function runPhotoExtract(file) {
  var b = bridge();
  if (typeof b.hasVisionAI === "function" && !b.hasVisionAI()) {
    setStatus(
      typeof b.needApiKeyMessage === "function"
        ? b.needApiKeyMessage()
        : "Photo scan needs Photo & AI access."
    );
    return;
  }
  if (typeof b.aiJson !== "function") {
    setStatus("AI helper isn't available.");
    return;
  }
  setStatus("Reading the photo…");
  var saveBtn = overlayEl.querySelector("#rvCreateSave");
  if (saveBtn) saveBtn.disabled = true;

  var compress =
    typeof b.compressImageFile === "function"
      ? b.compressImageFile(file, 1280, 0.75)
      : Promise.resolve(file);

  compress
    .then(function (compressed) {
      var imageFile = file;
      if (typeof compressed === "string" && compressed.indexOf("data:image/") === 0) {
        imageFile = dataUrlToFile(compressed, file.name || "recipe.jpg") || file;
      } else if (compressed instanceof Blob) {
        imageFile =
          compressed instanceof File
            ? compressed
            : new File([compressed], file.name || "recipe.jpg", {
                type: compressed.type || "image/jpeg",
              });
      }
      return b.aiJson(photoExtractFullPrompt(), {
        images: [imageFile],
        modelTier: "default",
      });
    })
    .then(function (data) {
      draft = parsedJsonToDraft(data);
      activeTab = "type";
      renderBody();
      setStatus("Read it — verify below, then save.");
    })
    .catch(function (e) {
      setStatus(formatErr(e));
    })
    .finally(function () {
      if (saveBtn) saveBtn.disabled = false;
    });
}

function runAskGenerate() {
  readFieldsFromDom();
  var q = String(draft._askPrompt || "").trim();
  if (!q) {
    setStatus("Tell us what you'd like to make.");
    return;
  }
  var b = bridge();
  if (typeof b.hasTextAI === "function" && !b.hasTextAI()) {
    setStatus(
      typeof b.needApiKeyMessage === "function"
        ? b.needApiKeyMessage()
        : "Recipe generation needs Photo & AI access."
    );
    return;
  }
  if (typeof b.aiJson !== "function") {
    setStatus("AI helper isn't available.");
    return;
  }
  setStatus("Cooking something up…");
  var genBtn = overlayEl.querySelector("#rvAskGenerate");
  if (genBtn) genBtn.disabled = true;
  b.aiJson(askRecipePrompt(q, effort), { modelTier: "default" })
    .then(function (data) {
      var keepAsk = draft._askPrompt;
      draft = parsedJsonToDraft(data);
      draft._askPrompt = keepAsk;
      activeTab = "type";
      renderBody();
      setStatus("Generated — tweak anything, then save.");
    })
    .catch(function (e) {
      setStatus(formatErr(e));
    })
    .finally(function () {
      if (genBtn) genBtn.disabled = false;
    });
}

function save() {
  readFieldsFromDom();
  var title = String(draft.title || "").trim();
  var text = draftToRecipeText(draft);
  if (!title || !text) {
    setStatus("Add a title plus ingredients or steps before saving.");
    return;
  }
  var b = bridge();
  if (typeof b.saveRecipe !== "function") {
    setStatus("Couldn't save — recipe vault bridge missing.");
    return;
  }
  b.saveRecipe({
    title: title,
    servings: draft.servings || 4,
    text: text,
    prepTime: String(draft.prepTime || "").trim() || undefined,
    cookTime: String(draft.cookTime || "").trim() || undefined,
    notes: String(draft.notes || "").trim() || undefined,
    source: String(draft.source || "").trim() || undefined,
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

function dataUrlToFile(dataUrl, name) {
  var parts = String(dataUrl || "").split(",");
  if (parts.length < 2) return null;
  var meta = parts[0] || "";
  var mimeMatch = meta.match(/data:([^;]+)/);
  var mime = (mimeMatch && mimeMatch[1]) || "image/jpeg";
  try {
    var bin = atob(parts[1]);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name || "recipe.jpg", { type: mime });
  } catch (err) {
    return null;
  }
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

export function openCreateRecipeModal(opts) {
  opts = opts || {};
  draft = emptyDraft();
  if (opts.seedText) {
    var fmt = autoFormatRecipePaste(opts.seedText);
    draft.ingredientsText = fmt.ingredientsText || opts.seedText;
    draft.instructionsText = fmt.instructionsText || "";
    if (fmt.titleGuess) draft.title = fmt.titleGuess;
  }
  activeTab = opts.tab || "type";
  effort = "weeknight";
  photoFile = null;
  ensureOverlay();
  overlayEl.hidden = false;
  renderBody();
  setStatus("");
  document.documentElement.style.overflow = "hidden";
}

export function closeCreateRecipeModal() {
  close();
}

function close() {
  if (!overlayEl) return;
  overlayEl.hidden = true;
  document.documentElement.style.overflow = "";
  setStatus("");
}
