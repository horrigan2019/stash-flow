/**
 * Holidays & Event Plans — payday schedule + calendar export entry.
 * Loaded once from public/index.html. Does not touch aisle sorting or recipes.
 */
import { mountEventPlannerEnhancements } from "./ui.js";

function boot() {
  mountEventPlannerEnhancements();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
