/**
 * Recipe Vault create + dietary adapt entry points.
 * Loaded once from public/index.html — does not touch aisle sorting or fridge scanner.
 */
import { openCreateRecipeModal } from "./create-modal.js";
import { openDietaryModifierModal } from "./dietary-modal.js";

function boot() {
  var addBtn = document.getElementById("rvAddCreateBtn");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      openCreateRecipeModal({ tab: "type" });
    });
  }

  // Expose for recipe cards / detail dialog wired from the main app.
  window.OhRecipeVault = {
    openCreate: openCreateRecipeModal,
    openDietary: openDietaryModifierModal,
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
