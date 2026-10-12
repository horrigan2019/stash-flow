import type { DietOption } from "./types";

export const DIET_OPTIONS: DietOption[] = [
  {
    id: "gluten-free",
    label: "Gluten-Free",
    emoji: "🌾",
    promptLabel: "Gluten-Free",
  },
  {
    id: "dairy-free",
    label: "Dairy-Free",
    emoji: "🧀",
    promptLabel: "Dairy-Free",
  },
  {
    id: "low-carb",
    label: "Low Carb / Keto",
    emoji: "🥑",
    promptLabel: "Low Carb / Keto",
  },
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
  {
    id: "nut-free",
    label: "Nut-Free",
    emoji: "🥜",
    promptLabel: "Nut-Free",
  },
  {
    id: "custom",
    label: "Custom Dietary Note",
    emoji: "✍️",
    promptLabel: "Custom",
  },
];

export function dietLabelsForPrompt(
  selected: string[],
  customNote: string
): string[] {
  const labels: string[] = [];
  for (const id of selected) {
    if (id === "custom") continue;
    const opt = DIET_OPTIONS.find((d) => d.id === id);
    if (opt) labels.push(opt.promptLabel);
  }
  const note = customNote.trim();
  if (selected.includes("custom") && note) labels.push(note);
  return labels;
}
