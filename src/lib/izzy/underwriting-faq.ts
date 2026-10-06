export interface FaqCard {
  id: string;
  question: string;
  shortAnswer: string;
  whyTheyAsk: string;
  tip: string;
  tags: string[];
  /** Prefill text when opening Ask Izzy from this card. */
  askPrompt: string;
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
    tags: ["household", "drivers", "dob", "unlisted", "residents", "names"],
    askPrompt:
      "Why are carriers asking for names and dates of birth of everyone in my household?",
  },
  {
    id: "mileage-commute",
    question: "Why ask for annual mileage & commute distance?",
    shortAnswer:
      "Mileage and commute distance place the vehicle into rating tiers that change premium.",
    whyTheyAsk:
      "More road time usually means higher claim frequency. Carriers bucket annual miles and work/school commute to set usage class (pleasure, commute, business).",
    tip: "Estimate honestly from odometer history. Understating mileage can void discounts or complicate a claim review.",
    tags: ["mileage", "commute", "rating", "usage", "odometer", "annual"],
    askPrompt:
      "How should I answer annual mileage and commute distance questions for underwriting?",
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
    askPrompt:
      "Why do carriers need prior insurance declaration pages, and what should I send?",
  },
  {
    id: "lienholder-loss-payee",
    question: "Why do they need lienholder / loss payee details?",
    shortAnswer:
      "Lenders have an insurable financial interest and must be named correctly as loss payee.",
    whyTheyAsk:
      "If a bank or lessor has a loan on the vehicle (or a mortgage on the home), the policy must protect that interest. Exact name, address, and account wording ensures claim checks are issued correctly.",
    tip: "Copy the clause verbatim from finance or closing paperwork—abbreviations and missing account numbers often get rejected.",
    tags: [
      "lienholder",
      "loss payee",
      "mortgagee",
      "lender",
      "escrow",
      "clause",
    ],
    askPrompt:
      "What lienholder or loss payee details do I need ready for my carrier?",
  },
  {
    id: "health-card-pip",
    question: "Why ask for a copy of my health insurance card?",
    shortAnswer:
      "In PIP states, carriers coordinate benefits and may need to know if health insurance is primary or secondary.",
    whyTheyAsk:
      "Personal Injury Protection (PIP) can interact with health coverage. Underwriters and claims teams use your health card to set coordination of benefits—whether auto PIP or health insurance pays first after an injury.",
    tip: "Have a clear front/back photo of the card. Ask whether PIP is primary or secondary in your state and on your policy form.",
    tags: [
      "health",
      "pip",
      "primary",
      "secondary",
      "coordination",
      "benefits",
      "card",
    ],
    askPrompt:
      "Why is my carrier asking for a copy of my health insurance card for PIP / coordination of benefits?",
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
