/**
 * Quick client-side parser: messy paste → clean ingredient lines + instruction block.
 * No network calls — safe to run on every "Auto-Format & Clean" tap.
 */

export interface AutoFormatResult {
  ingredientsText: string;
  instructionsText: string;
  titleGuess: string;
  servingsGuess: number | null;
  prepTimeGuess: string;
  cookTimeGuess: string;
}

const FRACTION = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
const UNIT =
  String.raw`(?:cups?|tbsps?|tbsp|tsps?|tsp|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|cans?|jars?|pkgs?|packages?|slices?|pinch(?:es)?|dash(?:es)?|bunches?|heads?|stalks?|sprigs?)`;

const INGREDIENT_RE = new RegExp(
  `^[-•*]?\\s*(${FRACTION})\\s*(${UNIT})?\\b|^[-•*]\\s+\\S+`,
  "i"
);

export function autoFormatRecipePaste(raw: string): AutoFormatResult {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  const empty: AutoFormatResult = {
    ingredientsText: "",
    instructionsText: "",
    titleGuess: "",
    servingsGuess: null,
    prepTimeGuess: "",
    cookTimeGuess: "",
  };
  if (!text) return empty;

  let body = text;
  let titleGuess = "";
  let servingsGuess: number | null = null;
  let prepTimeGuess = "";
  let cookTimeGuess = "";

  const lines = body.split("\n").map((l) => l.trimEnd());

  // Title: first non-empty line if it doesn't look like an ingredient/step
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx >= 0) {
    const first = lines[firstIdx].trim();
    if (
      first.length < 80 &&
      !INGREDIENT_RE.test(first) &&
      !/^(ingredients?|instructions?|directions?|method|steps?)\b/i.test(first) &&
      !/^\d+[\).\]]\s/.test(first)
    ) {
      titleGuess = first.replace(/^#+\s*/, "");
      lines.splice(firstIdx, 1);
    }
  }

  body = lines.join("\n");

  const servingsMatch = body.match(
    /(?:serves?|servings?|yield)\s*[:=]?\s*(\d+)/i
  );
  if (servingsMatch) {
    servingsGuess = parseInt(servingsMatch[1], 10) || null;
    body = body.replace(servingsMatch[0], "");
  }

  const prepMatch = body.match(/(?:prep(?:\s*time)?)\s*[:=]?\s*([^\n,·|]+)/i);
  if (prepMatch) {
    prepTimeGuess = prepMatch[1].trim();
    body = body.replace(prepMatch[0], "");
  }
  const cookMatch = body.match(
    /(?:cook(?:\s*time)?|bake(?:\s*time)?)\s*[:=]?\s*([^\n,·|]+)/i
  );
  if (cookMatch) {
    cookTimeGuess = cookMatch[1].trim();
    body = body.replace(cookMatch[0], "");
  }

  const instrSplit = body.match(
    /\n\s*(instructions?|directions?|method|steps?)\s*:?\s*\n/i
  );
  let ingredientsBlock = body;
  let instructionsBlock = "";

  if (instrSplit && instrSplit.index != null) {
    ingredientsBlock = body.slice(0, instrSplit.index);
    instructionsBlock = body.slice(instrSplit.index + instrSplit[0].length);
  }

  ingredientsBlock = ingredientsBlock
    .replace(/^\s*ingredients?\s*:?\s*/i, "")
    .trim();

  const ingredientLines = ingredientsBlock
    .split("\n")
    .map((l) => cleanIngredientLine(l))
    .filter(Boolean);

  // If no explicit instructions header, peel numbered/step lines out of the blob
  if (!instructionsBlock.trim()) {
    const leftover: string[] = [];
    const steps: string[] = [];
    for (const line of ingredientLines.slice()) {
      if (/^\d+[\).\]]\s+/.test(line) || /^(step\s*\d+|then|next|finally)\b/i.test(line)) {
        steps.push(line.replace(/^\d+[\).\]]\s+/, ""));
      } else if (!looksIngredient(line) && line.length > 60) {
        steps.push(line);
      } else {
        leftover.push(line);
      }
    }
    if (steps.length) {
      return {
        ingredientsText: leftover.map(bullet).join("\n"),
        instructionsText: numberSteps(steps).join("\n"),
        titleGuess,
        servingsGuess,
        prepTimeGuess,
        cookTimeGuess,
      };
    }
  }

  const instructionLines = instructionsBlock
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\d+[\).\]]\s+/, ""));

  return {
    ingredientsText: ingredientLines.filter(looksIngredient).length
      ? ingredientLines.filter((l) => looksIngredient(l) || l.length < 90).map(bullet).join("\n")
      : ingredientLines.map(bullet).join("\n"),
    instructionsText: numberSteps(instructionLines).join("\n"),
    titleGuess,
    servingsGuess,
    prepTimeGuess,
    cookTimeGuess,
  };
}

function cleanIngredientLine(line: string): string {
  return line
    .replace(/^[-•*]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksIngredient(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (INGREDIENT_RE.test(t)) return true;
  if (/^[A-Za-z].{0,40}$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

function bullet(line: string): string {
  const t = line.replace(/^[-•*]\s*/, "").trim();
  return t ? `- ${t}` : "";
}

function numberSteps(steps: string[]): string[] {
  return steps
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`);
}
