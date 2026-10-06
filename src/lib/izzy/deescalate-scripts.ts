/**
 * Agency Desk — De-escalate & Resolve Buffer scripts.
 * 100% zero-PII: templates never include customer names, SSNs, DL#s, policy #s, or claim files.
 */

export type DeescalateScenarioId =
  | "bill-up"
  | "household-refusal"
  | "nonrenew"
  | "cancel";

export interface FollowUpBeat {
  id: string;
  pushback: string;
  reply: string;
}

export interface ExplainerBlock {
  heading: string;
  body: string;
}

export interface DeescalateScenario {
  id: DeescalateScenarioId;
  label: string;
  title: string;
  subtitle: string;
  empathy: string[];
  explainers: ExplainerBlock[];
  softCompliance?: string;
  nextSteps: string[];
  documentChecklist?: string[];
  followUps: FollowUpBeat[];
  /** Sanitized CRM memo — paste-ready, zero identifiers. */
  crmNote: string;
}

export const DEESCALATE_SCENARIOS: DeescalateScenario[] = [
  {
    id: "bill-up",
    label: "Why did my bill go up?",
    title: "Why did my bill go up?",
    subtitle:
      "Plain-language rate-increase talking points for CSRs—empathy first, then factors and options. No fault admission for the agency.",
    empathy: [
      "I completely understand why a higher bill feels unfair—especially when nothing about your day-to-day feels different.",
      "You’re not wrong to ask for a clear explanation. Let’s walk through the kinds of things that commonly move a premium, without blaming you personally.",
      "My job here is to translate the product-side factors into plain English and offer next-step options you can choose from with a licensed producer.",
    ],
    explainers: [
      {
        heading: "Rating factors (product-side)",
        body: "Premiums often reflect territory/zip banding, vehicle symbols or model-year curves, coverage limits and deductibles, and household driving-record bands. A change in any one of those can move the bill even when the insured “didn’t do anything.”",
      },
      {
        heading: "Mid-term changes",
        body: "Endorsements mid-term—adding a vehicle or driver, swapping garaging address, raising limits, or removing a discount—can reprice the remaining term. Confirm what changed on the schedule in generic terms (no policy numbers in this tool).",
      },
      {
        heading: "Loss history bands",
        body: "Carriers often use claim or incident history bands over a look-back window. Even a closed claim, or a household incident the insured doesn’t think of as “theirs,” can affect the next rating cycle. Describe bands educationally—don’t litigate fault here.",
      },
      {
        heading: "Carrier-wide filings",
        body: "Many renewals include carrier rate filings approved for a whole book of business in that state. Those apply broadly and are not an agency decision. Frame as “industry/product pricing update,” not personal targeting.",
      },
      {
        heading: "Multi-car / multi-driver changes",
        body: "Adding or removing cars, changing primary operators, teen or new drivers, or household composition shifts can rebalance discounts and exposures across the package. Multi-car discounts can go up or down when the mix changes.",
      },
    ],
    softCompliance:
      "Educational talking points only. Do not admit agency fault for carrier rating. Izzy does not bind coverage or decide underwriting outcomes.",
    nextSteps: [
      "Offer a discount review checklist (multi-car, bundling, paperless, telematics, good-student, defensive-driving—availability varies by carrier/state).",
      "Discuss payment-plan or due-date options if the carrier product allows—without collecting bank or card data in Izzy.",
      "Walk deductible or coverage tradeoffs only as educational options for the licensed producer of record to confirm.",
      "If the insured fears non-renewal because of the bill, pivot to the Non-renewal script for timeline clarity—don’t invent guarantees.",
    ],
    documentChecklist: [
      "Renewal or mid-term change summary (generic—no policy # pasted into Izzy)",
      "List of vehicles/drivers on the schedule vs. household (role labels only: “teen driver,” “spouse,” not names)",
      "Any known discount enrollment status (telematics, multi-policy, etc.)",
      "Prior-term vs. current-term coverage comparison notes (limits/deductibles only)",
    ],
    followUps: [
      {
        id: "never-claim",
        pushback: "I’ve never had a claim—why is my rate up?",
        reply:
          "I hear you. “No claims” doesn’t always freeze a premium—carrier-wide filings, territory updates, vehicle symbols, and household or vehicle mix can still move the number. Let’s separate personal loss history from book-level pricing so this feels less personal.",
      },
      {
        id: "nonrenew-fear",
        pushback: "If my bill keeps going up, are they going to non-renew me?",
        reply:
          "A rate increase alone isn’t the same as a non-renewal notice. If you’ve received a non-renewal or cancellation letter, we’ll switch to that script and focus on dates and options. If you haven’t, we can still review discounts and coverage choices on this renewal.",
      },
      {
        id: "shop-threat",
        pushback: "I’m just going to shop around / cancel.",
        reply:
          "That’s fair to consider. Before you decide, we can outline what to compare (limits, deductibles, household drivers listed) so you don’t trade a lower price for a coverage gap. A licensed producer can help you shop if that’s the path you choose.",
      },
    ],
    crmNote:
      "CRM memo (sanitized — no PII): Discussed renewal/mid-term premium increase using educational factors (rating bands, mid-term changes, loss-history look-back, carrier-wide filings, multi-car/driver mix). Empathy-first; no agency fault admission. Offered discount review, payment-plan inquiry (if product allows), and coverage/deductible tradeoff talking points for producer of record. Document checklist reviewed in generic terms. No customer identifiers, policy numbers, or claim files recorded in Izzy.",
  },
  {
    id: "household-refusal",
    label: "Household / unlisted driver",
    title: "Household / unlisted driver refusal",
    subtitle:
      "When the insured declines to list a household member or licensed resident that state/carrier rules may require—empathy first, then exposure education and options.",
    empathy: [
      "I hear how frustrating this feels—especially when it’s a family member and you’re sure they won’t drive your cars.",
      "You’re not alone; a lot of people feel protective about who gets listed. Let’s slow down and make the “why” clear in plain English.",
      "My goal isn’t to argue with you—it’s to explain the coverage risk so you can make an informed choice with the options that actually exist.",
    ],
    explainers: [
      {
        heading: "Why carriers ask (household exposure)",
        body: "Anyone who lives in the household and has a license can be viewed as having access to listed vehicles. Carriers rate that household exposure and screen for drivers who aren’t on the policy.",
      },
      {
        heading: "Unlisted driver exclusion risk",
        body: "Many policies limit or exclude coverage when an unlisted household driver is involved in a loss. That can mean a claim dispute or denial fight later—even if today’s intent is “they never drive.”",
      },
      {
        heading: "Underwriting / listing requirements",
        body: "State rules and carrier guidelines often require listing household members or licensed residents, or documenting an approved exclusion / proof of other insurance or separate residence. Declining without an approved alternative may leave a coverage gap or block underwriting from completing.",
      },
    ],
    softCompliance:
      "Educational only—not legal advice. The agency cannot ignore carrier or state listing rules. Official requirements and binding decisions stay with the carrier and policy contract. Confirm exclusion availability and proof standards for the specific state and product with a licensed producer.",
    nextSteps: [
      "Option A — Add the driver (or household member) per carrier guidelines and review any premium impact educationally.",
      "Option B — Named-driver exclusion if available in that state/product (must be in writing / carrier-approved forms—not a verbal “they won’t drive”).",
      "Option C — Proof of separate residence and/or other insurance when the carrier accepts that documentation path.",
      "Document the conversation in CRM with sanitized role labels only (e.g., “adult household resident,” not names).",
    ],
    documentChecklist: [
      "Carrier household / driver questionnaire (complete outside Izzy)",
      "If excluding: carrier exclusion form status (requested / pending / signed)—no form images stored here",
      "If separate residence: acceptable proof types per carrier (lease, utility—handled in agency workflow, not Izzy)",
      "If other insurance: proof-of-insurance request note (no policy numbers pasted into Izzy)",
    ],
    followUps: [
      {
        id: "never-drives",
        pushback: "She never drives my cars.",
        reply:
          "I believe that’s your intent. Carriers still underwrite access and household exposure, not just who usually drives. “Never drives” is hard to prove after a loss—listing or a formal exclusion (where allowed) is how we protect the claim path.",
      },
      {
        id: "just-visiting",
        pushback: "She’s just visiting.",
        reply:
          "Visitors and residents are treated differently. If it’s a short visit, we can note temporary presence per carrier rules. If she’s living there—even part-time—most carriers treat that as household. Let’s match the facts to the right option without guessing.",
      },
      {
        id: "remove-from-house",
        pushback: "I’ll just remove her from the house / say she doesn’t live here.",
        reply:
          "I can’t coach anyone to misstate residency—that can create claim and underwriting problems later. If she truly has a separate residence, we can follow the carrier’s proof path. If she lives there, we need add / exclude / other-insurance options that are real.",
      },
      {
        id: "own-policy",
        pushback: "My sister has her own policy.",
        reply:
          "Having her own policy can help in some underwriting paths, but it doesn’t always remove a household listing or exclusion requirement on this policy. We can request the proof type the carrier accepts and see whether that satisfies their rule—without pasting policy numbers into Izzy.",
      },
      {
        id: "absolute-decline",
        pushback:
          "They’re my sister and she isn’t on my insurance—I absolutely decline adding them.",
        reply:
          "I respect that you want to decline. I also need to be clear: we can’t ignore carrier or state listing rules from our side. Declining without an approved exclusion or accepted proof path may leave a coverage gap or stop underwriting. Let’s look at add, exclude-if-available, or proof-of-other-insurance/residence—whichever fits the facts.",
      },
    ],
    crmNote:
      "CRM memo (sanitized — no PII): Discussed household / licensed-resident listing requirement after insured declined to add household member. Empathy-first; explained household exposure, unlisted-driver claim risk, and underwriting listing rules (educational, not legal advice). Advised agency cannot ignore carrier/state listing rules. Options offered: add driver; named exclusion if available in state/product; proof of separate residence and/or other insurance per carrier. Pushback topics covered as applicable (never drives / visiting / residency / own policy). No names, DOBs, DL#s, policy numbers, or claim files recorded in Izzy.",
  },
  {
    id: "nonrenew",
    label: "Non-renewal",
    title: "Non-renewal notice",
    subtitle:
      "Slow the conversation down: timelines, documentation windows, and shopping handoff—without storing claim or policy files.",
    empathy: [
      "A non-renewal notice is stressful. I’m here to slow this down and clarify timelines—not to argue the underwriting decision.",
      "You’re allowed to feel blindsided. Let’s focus on dates and options you still have.",
    ],
    explainers: [
      {
        heading: "Notice vs. last day of coverage",
        body: "Separate the notice date from the last day of coverage. Those drive shopping urgency and any documentation windows still open with the carrier.",
      },
      {
        heading: "What we can and can’t do here",
        body: "Izzy stays educational and zero-PII. We prepare talking points and a handoff checklist; licensed producers and the carrier own binding and underwriting outcomes.",
      },
    ],
    softCompliance:
      "Do not promise placement or overturn of a non-renewal in this tool. Confirm notice details in the agency system of record—not in Izzy.",
    nextSteps: [
      "Confirm notice date and last day of coverage in the agency management system (outside Izzy).",
      "List remaining documentation or appeal windows in generic terms.",
      "Prepare a clean market-shopping handoff checklist for the producer of record.",
    ],
    followUps: [
      {
        id: "bill-caused",
        pushback: "Is this because my bill went up / I complained?",
        reply:
          "Non-renewal is an underwriting action with its own notice rules—it’s not the same as a renewal rate change. If you also have a bill question, we can cover that on the rate script after we lock the coverage end date.",
      },
      {
        id: "never-claim-nr",
        pushback: "I’ve never had a claim—how can they non-renew me?",
        reply:
          "Carriers can non-renew for reasons beyond a single claim (eligibility, household exposure, payment history, book appetite). We won’t litigate fault here; we’ll clarify the notice and your options to shop or document.",
      },
    ],
    crmNote:
      "CRM memo (sanitized — no PII): Reviewed non-renewal notice empathy script. Clarified notice vs. coverage-end timing for follow-up in AMS. Outlined documentation window and shopping handoff checklist for producer of record. No policy numbers, claim files, or customer identifiers stored in Izzy.",
  },
  {
    id: "cancel",
    label: "Cancellation",
    title: "Cancellation",
    subtitle:
      "Calm process focus: restore continuity when possible, separate carrier needs from talking points.",
    empathy: [
      "Thanks for telling me what’s going on. Cancellations have strict timing—let’s focus on restoring continuity if that’s the goal.",
      "I’ll stay calm with you while we list only process steps.",
    ],
    explainers: [
      {
        heading: "Timing windows",
        body: "Cancellation and rewrite/reinstatement windows are product- and state-specific. Confirm exact dates in the agency system—not in this workspace.",
      },
      {
        heading: "Carrier needs vs. talking points",
        body: "Separate what the carrier requires (payment, forms, underwriting items) from educational talking points you can prep for a licensed agent.",
      },
    ],
    softCompliance:
      "No SSNs, licenses, bank details, or claim packets in Izzy. Handle reinstatement documents in approved agency channels only.",
    nextSteps: [
      "Identify whether the goal is reinstate, rewrite, or shop new coverage.",
      "List carrier process steps in generic terms for the producer/CSR workflow.",
      "If household listing or bill shock contributed, cross-link those de-escalation scripts.",
    ],
    followUps: [
      {
        id: "refuse-household-cancel",
        pushback: "I’ll cancel before I add my sister to the policy.",
        reply:
          "I hear that frustration. Before you cancel, know that a coverage gap can create its own problems (lapse, proof-of-insurance needs). We can still explore add / exclude-if-available / proof paths on the household script if you want options short of canceling.",
      },
    ],
    crmNote:
      "CRM memo (sanitized — no PII): Used cancellation de-escalation buffer. Confirmed insured goal (reinstate / rewrite / shop) for AMS follow-up. Listed process talking points only; no payment data, SSNs, DL#s, policy numbers, or claim files in Izzy.",
  },
];

export function getDeescalateScenario(
  id: DeescalateScenarioId
): DeescalateScenario {
  const found = DEESCALATE_SCENARIOS.find((s) => s.id === id);
  if (!found) return DEESCALATE_SCENARIOS[0];
  return found;
}
