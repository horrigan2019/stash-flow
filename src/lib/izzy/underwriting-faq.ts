export interface FaqCard {
  id: string;
  question: string;
  shortAnswer: string;
  whyTheyAsk: string;
  tip: string;
  tags: string[];
}

export const UNDERWRITING_FAQ: FaqCard[] = [
  {
    id: "household-members",
    question: "Why do they want names & DOBs of household members?",
    shortAnswer:
      "Carriers rate household risk and screen for unlisted drivers who might operate the car.",
    whyTheyAsk:
      "Anyone living with you who has a license can potentially drive a listed vehicle. Underwriters check household composition to price that exposure and avoid “unlisted driver” claim disputes.",
    tip: "List every licensed resident even if they “never drive.” If someone is excluded, ask for a named-driver exclusion in writing.",
    tags: ["household", "drivers", "dob", "unlisted", "residents"],
  },
  {
    id: "mileage-commute",
    question: "Why ask for annual mileage or commute distance?",
    shortAnswer:
      "Mileage and commute distance place the vehicle into rating tiers that change premium.",
    whyTheyAsk:
      "More road time usually means higher claim frequency. Carriers bucket annual miles and work/school commute to set usage class (pleasure, commute, business).",
    tip: "Estimate honestly from odometer history. Understating mileage can void discounts or complicate a claim review.",
    tags: ["mileage", "commute", "rating", "usage", "odometer"],
  },
  {
    id: "prior-insurance",
    question: "Why request prior insurance declaration pages?",
    shortAnswer:
      "They verify continuous coverage history for discounts and lapse surcharges.",
    whyTheyAsk:
      "Continuous coverage discounts reward customers who stayed insured. Declaration pages prove prior limits, carriers, and whether there was a gap in coverage.",
    tip: "Download the last 1–3 years of dec pages from your prior carrier portal before shopping or mid-term changes.",
    tags: ["prior", "declarations", "continuous", "lapse", "discount"],
  },
  {
    id: "mortgagee-lienholder",
    question: "Why do they need mortgagee or lienholder clauses?",
    shortAnswer:
      "Lenders have an insurable financial interest and must be named as loss payee / mortgagee.",
    whyTheyAsk:
      "If the bank or lessor has a loan on the home or vehicle, the policy must protect that interest. Exact clause wording ensures claim checks are issued correctly.",
    tip: "Copy the clause verbatim from closing or lease paperwork—abbreviations and missing “ISAOA/ATIMA” language often get rejected.",
    tags: ["mortgagee", "lienholder", "lender", "escrow", "clause"],
  },
  {
    id: "garaging-address",
    question: "Why confirm the garaging address?",
    shortAnswer:
      "Territory rating uses where the vehicle overnight parks, not just your mailing address.",
    whyTheyAsk:
      "Claim costs vary by ZIP. A vehicle garaged in a different city can change premium and eligibility.",
    tip: "If a teen takes a car to college, ask whether a school address should be listed as garaging.",
    tags: ["garaging", "address", "territory", "zip"],
  },
  {
    id: "other-vehicles",
    question: "Why ask about other vehicles in the household?",
    shortAnswer:
      "Underwriters look for rating consistency and vehicles that should be listed or excluded.",
    whyTheyAsk:
      "Unlisted household cars can signal underinsurance or misrated primary use. Some states and carriers require disclosure of all owned vehicles.",
    tip: "Have year/make/model and who primarily drives each household vehicle ready when you call.",
    tags: ["vehicles", "household", "ownership", "disclosure"],
  },
];

export function searchFaq(query: string): FaqCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return UNDERWRITING_FAQ;
  return UNDERWRITING_FAQ.filter((card) => {
    const hay = [
      card.question,
      card.shortAnswer,
      card.whyTheyAsk,
      card.tip,
      ...card.tags,
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((term) => hay.includes(term));
  });
}
