/**
 * Event Planner payday UI + calendar actions (isolated from aisle/recipe code).
 */
import {
  loadPaySchedule,
  savePaySchedule,
  formatShortDate,
} from "./pay-schedule.js";
import { buildEventShoppingPlan } from "./payday-align.js";
import {
  downloadIcsFile,
  googleCalendarUrl,
  shoppingRunCalendarEvent,
} from "./calendar-export.js";

function todayStr() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function ensurePayPanel() {
  var dialog = document.getElementById("eventDialog");
  if (!dialog) return null;
  var existing = document.getElementById("epPayPanel");
  if (existing) return existing;

  var form = document.getElementById("eventForm");
  var panel = document.createElement("div");
  panel.id = "epPayPanel";
  panel.className = "ep-pay-panel";
  panel.innerHTML =
    '<label class="ep-pay-toggle">' +
    '<input type="checkbox" id="epPayEnabled">' +
    "<span>Align shopping runs with my pay schedule 💰</span>" +
    "</label>" +
    '<div class="ep-pay-fields" id="epPayFields" hidden>' +
    '<label>Pay Frequency' +
    '<select id="epPayFrequency">' +
    '<option value="biweekly">Every 2 Weeks / Bi-Weekly</option>' +
    '<option value="semimonthly">Twice a Month (1st &amp; 15th)</option>' +
    '<option value="weekly">Weekly</option>' +
    '<option value="monthly">Monthly</option>' +
    "</select></label>" +
    '<label>Next Payday Date' +
    '<input type="date" id="epNextPayday">' +
    "</label></div>";

  if (form && form.parentNode) {
    form.parentNode.insertBefore(panel, form.nextSibling);
  } else {
    dialog.querySelector(".dialog-inner").appendChild(panel);
  }

  var schedule = loadPaySchedule();
  var enabledEl = panel.querySelector("#epPayEnabled");
  var fieldsEl = panel.querySelector("#epPayFields");
  var freqEl = panel.querySelector("#epPayFrequency");
  var nextEl = panel.querySelector("#epNextPayday");
  enabledEl.checked = !!schedule.enabled;
  fieldsEl.hidden = !schedule.enabled;
  freqEl.value = schedule.frequency || "biweekly";
  nextEl.value = schedule.nextPayday || "";

  function persistAndRefresh() {
    savePaySchedule({
      enabled: enabledEl.checked,
      frequency: freqEl.value || "biweekly",
      nextPayday: nextEl.value || "",
    });
    fieldsEl.hidden = !enabledEl.checked;
    if (typeof window.OhEventPlannerRefresh === "function") {
      window.OhEventPlannerRefresh();
    }
  }

  enabledEl.addEventListener("change", persistAndRefresh);
  freqEl.addEventListener("change", persistAndRefresh);
  nextEl.addEventListener("change", persistAndRefresh);
  return panel;
}

function appUrl() {
  try {
    return window.location.origin + "/";
  } catch (e) {
    return "https://www.ohstuffing.com/";
  }
}

function runToCalendarEvent(eventName, run, index) {
  return shoppingRunCalendarEvent({
    eventName: eventName,
    runNumber: index + 1,
    runTitle: run.title,
    shoppingDate: run.shoppingDate,
    itemNames: run.items.map(function (it) {
      return it.text;
    }),
    appUrl: appUrl(),
  });
}

function makeCalButtons(eventName, run, index) {
  var wrap = document.createElement("div");
  wrap.className = "ep-cal-actions";

  var icsBtn = document.createElement("button");
  icsBtn.type = "button";
  icsBtn.className = "ep-cal-btn ep-cal-btn-primary";
  icsBtn.textContent = "📅 Add to Calendar (.ics)";
  icsBtn.addEventListener("click", function () {
    var ev = runToCalendarEvent(eventName, run, index);
    var safe = String(eventName || "event")
      .replace(/[^\w\-]+/g, "-")
      .slice(0, 40);
    downloadIcsFile(
      "oh-stuffing-" + safe + "-run-" + (index + 1) + ".ics",
      [ev]
    );
  });

  var gBtn = document.createElement("a");
  gBtn.className = "ep-cal-btn";
  gBtn.target = "_blank";
  gBtn.rel = "noopener noreferrer";
  gBtn.textContent = "🗓️ Open in Google Calendar";
  gBtn.href = googleCalendarUrl(runToCalendarEvent(eventName, run, index));

  wrap.appendChild(icsBtn);
  wrap.appendChild(gBtn);
  return wrap;
}

/**
 * Append payday-aligned shopping milestones + calendar buttons onto an event card.
 * Does not remove existing Ready / Buy later / Already on list sections.
 */
export function appendShoppingMilestones(card, ev) {
  if (!card || !ev) return;
  var schedule = loadPaySchedule();
  var plan = buildEventShoppingPlan(
    ev.date,
    todayStr(),
    ev.items || [],
    schedule
  );
  if (!plan.runs.length) return;

  var head = document.createElement("div");
  head.className = "ep-milestone-head";
  head.textContent = schedule.enabled
    ? "Payday shopping runs"
    : "Suggested shopping runs";
  card.appendChild(head);

  plan.runs.forEach(function (run, index) {
    var block = document.createElement("div");
    block.className = "ep-run-card" + (run.paydayTagged ? " ep-payday" : "");
    var title = document.createElement("div");
    title.className = "ep-run-title";
    title.textContent = run.label;
    var sub = document.createElement("div");
    sub.className = "ep-run-sub";
    sub.textContent = run.subtitle + " · " + formatShortDate(run.shoppingDate);

    var chips = document.createElement("div");
    chips.className = "event-chip-list";
    run.items.forEach(function (it) {
      var chip = document.createElement("span");
      chip.className = "event-chip";
      chip.textContent = it.text;
      chips.appendChild(chip);
    });

    block.appendChild(title);
    block.appendChild(sub);
    block.appendChild(chips);
    block.appendChild(makeCalButtons(ev.name, run, index));
    card.appendChild(block);
  });

  var allWrap = document.createElement("div");
  allWrap.className = "ep-all-cal ep-cal-actions";
  var allIcs = document.createElement("button");
  allIcs.type = "button";
  allIcs.className = "ep-cal-btn ep-cal-btn-primary";
  allIcs.textContent = "📅 Add All Shopping Runs to Calendar";
  allIcs.addEventListener("click", function () {
    var events = plan.runs.map(function (run, index) {
      return runToCalendarEvent(ev.name, run, index);
    });
    var safe = String(ev.name || "event")
      .replace(/[^\w\-]+/g, "-")
      .slice(0, 40);
    downloadIcsFile("oh-stuffing-" + safe + "-shopping-runs.ics", events);
  });
  allWrap.appendChild(allIcs);
  card.appendChild(allWrap);
}

export function mountEventPlannerEnhancements() {
  ensurePayPanel();
  window.OhEventPlanner = {
    appendShoppingMilestones: appendShoppingMilestones,
    loadPaySchedule: loadPaySchedule,
    buildEventShoppingPlan: buildEventShoppingPlan,
  };
}
