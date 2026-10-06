/** High-level state context for Claude prompts (educational, not legal advice). */

const DEFAULT =
  "Apply general US personal-lines auto concepts. Note that liability minimums and PIP/no-fault rules vary by state—flag when the document is silent.";

const BY_STATE: Record<string, string> = {
  NY: "New York: no-fault PIP is common; FS-20 proof of insurance often needed for DMV/vehicle changes; mention household/driver disclosure norms.",
  FL: "Florida: PIP / no-fault framework; property damage liability minimums matter; household members and garaging address often drive underwriting.",
  MI: "Michigan: unique PIP choice / residual liability landscape; household selection for PIP can be material—do not invent dollar limits.",
  CA: "California: Good Driver discount concepts; Proposition 103 rate norms; disclose household drivers carefully.",
  TX: "Texas: at-fault liability state; confirm BI/PD limits vs. state minimums when visible on the dec page.",
  NJ: "New Jersey: choice no-fault options may appear; note PIP election language if present.",
  PA: "Pennsylvania: tort options (limited vs. full) may appear; highlight if the document is silent.",
};

export function statePromptContext(state: string | undefined): string {
  const code = (state || "").trim().toUpperCase().slice(0, 2);
  if (!code) return DEFAULT;
  return BY_STATE[code] ?? `${DEFAULT} Focus on ${code} when interpreting limits and exclusions.`;
}

/** Rough educational minimums for free-tier gap teasers (not binding). */
export function suggestTeaserGaps(extracted: {
  liabilityPropertyDamage?: string;
  rental?: boolean | null;
  roadside?: boolean | null;
  liabilityBodilyInjury?: string;
}): Array<{ id: string; title: string; detail: string }> {
  const gaps: Array<{ id: string; title: string; detail: string }> = [];
  const pd = (extracted.liabilityPropertyDamage || "").replace(/[^\d]/g, "");
  const pdNum = pd ? Number(pd) : NaN;
  if (!Number.isNaN(pdNum) && pdNum > 0 && pdNum < 50000) {
    gaps.push({
      id: "low-pd",
      title: "Low property damage limit warning",
      detail:
        "Your PD liability looks lower than what many modern repair bills run. Ask what a single at-fault crash could cost you out of pocket.",
    });
  }
  if (extracted.rental === false || extracted.rental == null) {
    gaps.push({
      id: "no-rental",
      title: "No rental reimbursement detected",
      detail:
        "If your car is in the shop after a covered loss, you may pay for a rental yourself unless this endorsement is added.",
    });
  }
  if (extracted.roadside === false) {
    gaps.push({
      id: "no-roadside",
      title: "Roadside assistance not clearly listed",
      detail:
        "Tow and lockout help may be missing or sold separately—confirm before you need it on the shoulder.",
    });
  }
  if (gaps.length < 2) {
    gaps.push({
      id: "wallet-impact",
      title: "Wallet impact still unclear",
      detail:
        "Limits and deductibles only tell part of the story. Pro unlocks Ask Izzy for plain-English wallet scenarios.",
    });
  }
  return gaps.slice(0, 2);
}
