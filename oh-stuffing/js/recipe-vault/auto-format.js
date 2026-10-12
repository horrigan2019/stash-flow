/**
 * Quick client-side parser: messy paste → clean ingredient lines + instruction block.
 */

var FRACTION = "(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?)";
var UNIT =
  "(?:cups?|tbsps?|tbsp|tsps?|tsp|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|cloves?|cans?|jars?|pkgs?|packages?|slices?|pinch(?:es)?|dash(?:es)?|bunches?|heads?|stalks?|sprigs?)";
var INGREDIENT_RE = new RegExp(
  "^[-•*]?\\s*(" + FRACTION + ")\\s*(" + UNIT + ")?\\b|^[-•*]\\s+\\S+",
  "i"
);

export function autoFormatRecipePaste(raw) {
  var text = String(raw || "").replace(/\r\n/g, "\n").trim();
  var empty = {
    ingredientsText: "",
    instructionsText: "",
    titleGuess: "",
    servingsGuess: null,
    prepTimeGuess: "",
    cookTimeGuess: "",
  };
  if (!text) return empty;

  var lines = text.split("\n").map(function (l) {
    return l.trimEnd();
  });
  var titleGuess = "";
  var servingsGuess = null;
  var prepTimeGuess = "";
  var cookTimeGuess = "";

  var firstIdx = -1;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      firstIdx = i;
      break;
    }
  }
  if (firstIdx >= 0) {
    var first = lines[firstIdx].trim();
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

  var body = lines.join("\n");

  var servingsMatch = body.match(/(?:serves?|servings?|yield)\s*[:=]?\s*(\d+)/i);
  if (servingsMatch) {
    servingsGuess = parseInt(servingsMatch[1], 10) || null;
    body = body.replace(servingsMatch[0], "");
  }

  var prepMatch = body.match(/(?:prep(?:\s*time)?)\s*[:=]?\s*([^\n,·|]+)/i);
  if (prepMatch) {
    prepTimeGuess = prepMatch[1].trim();
    body = body.replace(prepMatch[0], "");
  }
  var cookMatch = body.match(
    /(?:cook(?:\s*time)?|bake(?:\s*time)?)\s*[:=]?\s*([^\n,·|]+)/i
  );
  if (cookMatch) {
    cookTimeGuess = cookMatch[1].trim();
    body = body.replace(cookMatch[0], "");
  }

  var instrSplit = body.match(
    /\n\s*(instructions?|directions?|method|steps?)\s*:?\s*\n/i
  );
  var ingredientsBlock = body;
  var instructionsBlock = "";
  if (instrSplit && instrSplit.index != null) {
    ingredientsBlock = body.slice(0, instrSplit.index);
    instructionsBlock = body.slice(instrSplit.index + instrSplit[0].length);
  }
  ingredientsBlock = ingredientsBlock
    .replace(/^\s*ingredients?\s*:?\s*/i, "")
    .trim();

  var ingredientLines = ingredientsBlock
    .split("\n")
    .map(cleanIngredientLine)
    .filter(Boolean);

  if (!instructionsBlock.trim()) {
    var leftover = [];
    var steps = [];
    ingredientLines.forEach(function (line) {
      if (
        /^\d+[\).\]]\s+/.test(line) ||
        /^(step\s*\d+|then|next|finally)\b/i.test(line)
      ) {
        steps.push(line.replace(/^\d+[\).\]]\s+/, ""));
      } else if (!looksIngredient(line) && line.length > 60) {
        steps.push(line);
      } else {
        leftover.push(line);
      }
    });
    if (steps.length) {
      return {
        ingredientsText: leftover.map(bullet).join("\n"),
        instructionsText: numberSteps(steps).join("\n"),
        titleGuess: titleGuess,
        servingsGuess: servingsGuess,
        prepTimeGuess: prepTimeGuess,
        cookTimeGuess: cookTimeGuess,
      };
    }
  }

  var instructionLines = instructionsBlock
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean)
    .map(function (l) {
      return l.replace(/^\d+[\).\]]\s+/, "");
    });

  var kept = ingredientLines.filter(function (l) {
    return looksIngredient(l) || l.length < 90;
  });

  return {
    ingredientsText: (kept.length ? kept : ingredientLines).map(bullet).join("\n"),
    instructionsText: numberSteps(instructionLines).join("\n"),
    titleGuess: titleGuess,
    servingsGuess: servingsGuess,
    prepTimeGuess: prepTimeGuess,
    cookTimeGuess: cookTimeGuess,
  };
}

function cleanIngredientLine(line) {
  return line
    .replace(/^[-•*]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksIngredient(line) {
  var t = line.trim();
  if (!t) return false;
  if (INGREDIENT_RE.test(t)) return true;
  if (/^[A-Za-z].{0,40}$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

function bullet(line) {
  var t = line.replace(/^[-•*]\s*/, "").trim();
  return t ? "- " + t : "";
}

function numberSteps(steps) {
  return steps
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean)
    .map(function (s, i) {
      return i + 1 + ". " + s;
    });
}

export function draftToRecipeText(draft) {
  var parts = [];
  var meta = [];
  if (draft.prepTime && String(draft.prepTime).trim()) {
    meta.push("Prep: " + String(draft.prepTime).trim());
  }
  if (draft.cookTime && String(draft.cookTime).trim()) {
    meta.push("Cook: " + String(draft.cookTime).trim());
  }
  if (meta.length) parts.push(meta.join(" · "));

  var ingredients = String(draft.ingredientsText || "")
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (ingredients.length) {
    parts.push("Ingredients:");
    ingredients.forEach(function (line) {
      parts.push(
        line.charAt(0) === "-" || line.charAt(0) === "•" ? line : "- " + line
      );
    });
  }

  var steps = String(draft.instructionsText || "")
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (steps.length) {
    parts.push("");
    parts.push("Instructions:");
    steps.forEach(function (line, i) {
      parts.push(/^\d+[\).\]]\s*/.test(line) ? line : i + 1 + ". " + line);
    });
  }

  if (draft.notes && String(draft.notes).trim()) {
    parts.push("");
    parts.push("Notes: " + String(draft.notes).trim());
  }
  if (draft.source && String(draft.source).trim()) {
    parts.push("Source: " + String(draft.source).trim());
  }

  return parts.join("\n").trim();
}

export function parsedJsonToDraft(data) {
  var draft = {
    title: "",
    servings: 4,
    prepTime: "",
    cookTime: "",
    ingredientsText: "",
    instructionsText: "",
    notes: "",
    source: "",
  };
  if (!data || typeof data !== "object") return draft;
  if (typeof data.title === "string") draft.title = data.title.trim();
  if (typeof data.servings === "number" && data.servings > 0) {
    draft.servings = Math.round(data.servings);
  }
  if (typeof data.prepTime === "string") draft.prepTime = data.prepTime.trim();
  if (typeof data.cookTime === "string") draft.cookTime = data.cookTime.trim();
  if (typeof data.notes === "string") draft.notes = data.notes.trim();
  if (typeof data.source === "string") draft.source = data.source.trim();
  if (typeof data.tips === "string" && data.tips.trim()) {
    draft.notes = [draft.notes, data.tips.trim()].filter(Boolean).join("\n");
  }
  if (Array.isArray(data.ingredients)) {
    draft.ingredientsText = data.ingredients
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(Boolean)
      .join("\n");
  } else if (typeof data.ingredients === "string") {
    draft.ingredientsText = data.ingredients.trim();
  }
  if (Array.isArray(data.instructions)) {
    draft.instructionsText = data.instructions
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(Boolean)
      .join("\n");
  } else if (typeof data.instructions === "string") {
    draft.instructionsText = data.instructions.trim();
  }
  if (
    (!draft.ingredientsText || !draft.instructionsText) &&
    typeof data.text === "string" &&
    data.text.trim()
  ) {
    var fmt = autoFormatRecipePaste(data.text);
    if (!draft.ingredientsText) draft.ingredientsText = fmt.ingredientsText;
    if (!draft.instructionsText) draft.instructionsText = fmt.instructionsText;
    if (!draft.title && fmt.titleGuess) draft.title = fmt.titleGuess;
  }
  return draft;
}

export function variationTitle(baseTitle, dietLabels) {
  var base = String(baseTitle || "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim() || "Recipe";
  if (!dietLabels || !dietLabels.length) return base + " (Diet Variation)";
  return base + " (" + dietLabels.join(" & ") + ")";
}
