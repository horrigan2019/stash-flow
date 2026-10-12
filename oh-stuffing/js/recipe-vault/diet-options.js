export var DIET_OPTIONS = [
  { id: "gluten-free", label: "Gluten-Free", emoji: "🌾", promptLabel: "Gluten-Free" },
  { id: "dairy-free", label: "Dairy-Free", emoji: "🧀", promptLabel: "Dairy-Free" },
  { id: "low-carb", label: "Low Carb / Keto", emoji: "🥑", promptLabel: "Low Carb / Keto" },
  {
    id: "diabetic",
    label: "Diabetic / Low Glycemic",
    emoji: "🩸",
    promptLabel: "Diabetic / Low Glycemic",
  },
  {
    id: "vegetarian-vegan",
    label: "Vegetarian / Vegan",
    emoji: "🌱",
    promptLabel: "Vegetarian / Vegan",
  },
  { id: "nut-free", label: "Nut-Free", emoji: "🥜", promptLabel: "Nut-Free" },
  { id: "custom", label: "Custom Dietary Note", emoji: "✍️", promptLabel: "Custom" },
];

export function dietLabelsForPrompt(selected, customNote) {
  var labels = [];
  (selected || []).forEach(function (id) {
    if (id === "custom") return;
    for (var i = 0; i < DIET_OPTIONS.length; i++) {
      if (DIET_OPTIONS[i].id === id) {
        labels.push(DIET_OPTIONS[i].promptLabel);
        break;
      }
    }
  });
  var note = String(customNote || "").trim();
  if ((selected || []).indexOf("custom") !== -1 && note) labels.push(note);
  return labels;
}
