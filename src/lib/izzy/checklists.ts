export type WorkflowId =
  | "add-vehicle"
  | "add-driver"
  | "home-closing"
  | "remove-driver-vehicle";

export type FieldKind = "checkbox" | "vin" | "text" | "date" | "number";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  kind?: FieldKind;
}

export interface WorkflowDef {
  id: WorkflowId;
  title: string;
  summary: string;
  items: ChecklistItem[];
}

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
] as const;

export type UsState = (typeof US_STATES)[number];

export interface StateNuance {
  id: string;
  title: string;
  detail: string;
  workflows: WorkflowId[] | "all";
}

/** State-specific carrier / DMV nuances shown when that state is selected. */
export const STATE_NUANCES: Partial<Record<UsState, StateNuance[]>> = {
  NY: [
    {
      id: "ny-fs20",
      title: "NY FS-20 auto proof",
      detail:
        "New York often requires an FS-20 (or equivalent) proof of insurance when adding a vehicle or changing coverage. Ask the carrier for the form before the DMV visit.",
      workflows: ["add-vehicle", "add-driver"],
    },
  ],
  MI: [
    {
      id: "mi-pip",
      title: "MI PIP household member selection",
      detail:
        "Michigan no-fault PIP rating can include household members. Be ready to select which residents apply for PIP and provide names/DOBs even if they do not drive the insured vehicle.",
      workflows: ["add-driver", "remove-driver-vehicle", "add-vehicle"],
    },
  ],
  FL: [
    {
      id: "fl-pip",
      title: "FL PIP household member selection",
      detail:
        "Florida PIP underwriting often reviews household composition. Expect questions about resident relatives and which household members should be selected for PIP / UM rating.",
      workflows: ["add-driver", "remove-driver-vehicle", "add-vehicle"],
    },
  ],
  CA: [
    {
      id: "ca-good-driver",
      title: "CA Good Driver rules",
      detail:
        "California’s Good Driver Discount generally requires a qualifying driving record (commonly no more than one point violation in the prior three years, with at-fault accidents and major violations affecting eligibility). Ask whether each listed driver still qualifies and how a mid-term add affects the household discount.",
      workflows: ["add-driver", "add-vehicle", "remove-driver-vehicle"],
    },
    {
      id: "ca-sr22",
      title: "CA financial responsibility",
      detail:
        "If a driver needs an SR-22 filing, California carriers may require extra lead time and a separate endorsement when adding or removing that driver.",
      workflows: ["add-driver", "remove-driver-vehicle"],
    },
  ],
  TX: [
    {
      id: "tx-proof",
      title: "TX proof of insurance",
      detail:
        "Texas carriers commonly issue digital ID cards quickly after a mid-term vehicle add—confirm coverage effective date before driving the new vehicle.",
      workflows: ["add-vehicle"],
    },
  ],
  NJ: [
    {
      id: "nj-pip",
      title: "NJ PIP options",
      detail:
        "New Jersey PIP selection (basic vs medical expense) can change when household drivers are added. Confirm the current PIP choice with the carrier.",
      workflows: ["add-driver", "add-vehicle"],
    },
  ],
};

export const WORKFLOWS: WorkflowDef[] = [
  {
    id: "add-vehicle",
    title: "Add a Vehicle",
    summary:
      "Validate the VIN, gather odometer and lien details, assign a primary driver, and lock coverage choices before you call.",
    items: [
      {
        id: "ymm",
        label: "Year / Make / Model",
        hint: "e.g. 2024 Honda CR-V EX-L",
        required: true,
        kind: "text",
      },
      {
        id: "vin",
        label: "17-digit VIN",
        hint: "Letters/numbers only — VIN never uses I, O, or Q.",
        required: true,
        kind: "vin",
      },
      {
        id: "odometer",
        label: "Current odometer reading",
        hint: "Used for mileage rating and usage class.",
        required: true,
        kind: "number",
      },
      {
        id: "purchase-date",
        label: "Purchase / lease date",
        hint: "Effective date carriers use for coverage start.",
        required: true,
        kind: "date",
      },
      {
        id: "lienholder-name",
        label: "Lienholder name",
        hint: "Exact legal name for the loss-payee / lease clause.",
        required: true,
        kind: "text",
      },
      {
        id: "lienholder-address",
        label: "Lienholder address",
        hint: "Mailing address from the finance or lease contract.",
        required: true,
        kind: "text",
      },
      {
        id: "lienholder-account",
        label: "Lienholder account #",
        hint: "Loan or lease account number if shown on paperwork.",
        required: true,
        kind: "text",
      },
      {
        id: "primary-driver",
        label: "Primary driver",
        hint: "Who will mainly operate this vehicle.",
        required: true,
        kind: "text",
      },
      {
        id: "commute",
        label: "Daily commute (miles)",
        hint: "One-way miles if used for rating / usage class.",
        kind: "number",
      },
      {
        id: "coverage",
        label: "Coverage selections",
        hint: "Liability limits, comprehensive/collision deductibles, rental & roadside.",
        required: true,
        kind: "text",
      },
    ],
  },
  {
    id: "add-driver",
    title: "Add a Driver",
    summary:
      "Collect legal identity, license, good-student / training proof, and vehicle assignment.",
    items: [
      {
        id: "name",
        label: "Full legal name",
        hint: "Must match the driver’s license.",
        required: true,
        kind: "text",
      },
      {
        id: "dob",
        label: "Date of birth",
        required: true,
        kind: "date",
      },
      {
        id: "dl",
        label: "Driver’s license number",
        hint: "Include issuing state.",
        required: true,
        kind: "text",
      },
      {
        id: "gpa-verification",
        label: "Good student GPA verification",
        hint: "Transcript or report card showing qualifying GPA for the discount.",
        kind: "checkbox",
      },
      {
        id: "driver-training",
        label: "Driver training certificate",
        hint: "Certificate of completion if required for youth / new-driver discounts.",
        kind: "checkbox",
      },
      {
        id: "vehicle-assignment",
        label: "Vehicle assignment",
        hint: "Which listed vehicle this driver will mainly use.",
        required: true,
        kind: "text",
      },
    ],
  },
  {
    id: "home-closing",
    title: "Home Closing / Mortgage Update",
    summary:
      "Update mortgagee, escrow, loan, and closing details so the lender is protected.",
    items: [
      {
        id: "mortgagee",
        label: "Mortgagee clause (exact wording)",
        hint: "Lender’s ISAOA/ATIMA name and notice address from closing docs.",
        required: true,
        kind: "text",
      },
      {
        id: "escrow-contact",
        label: "Escrow contact",
        hint: "Escrow/title company or loan servicer contact for evidence of insurance.",
        required: true,
        kind: "text",
      },
      {
        id: "loan-number",
        label: "Loan number",
        required: true,
        kind: "text",
      },
      {
        id: "closing-date",
        label: "Closing date",
        hint: "Evidence of insurance must often be issued before this date.",
        required: true,
        kind: "date",
      },
      {
        id: "home-updates",
        label: "Home updates",
        hint: "Renovations, roof, alarm, or square-footage changes that affect underwriting.",
        kind: "text",
      },
    ],
  },
  {
    id: "remove-driver-vehicle",
    title: "Remove Driver / Vehicle",
    summary:
      "Document sale/trade-in, separate residence, or other insurance so the carrier can delete exposure.",
    items: [
      {
        id: "bill-of-sale",
        label: "Bill of sale / trade-in proof",
        hint: "Buyer or dealer paperwork with sale date and VIN if available.",
        kind: "checkbox",
      },
      {
        id: "separate-residence",
        label: "Proof of separate residence",
        hint: "Lease, utility bill, or mail showing a new address for a removed driver.",
        kind: "checkbox",
      },
      {
        id: "other-insurance",
        label: "Proof of other insurance",
        hint: "Declarations page showing the person/vehicle is covered elsewhere.",
        kind: "checkbox",
      },
    ],
  },
];

/** Questions consumers should ask the carrier rep on the call sheet. */
export const CALL_SHEET_QUESTIONS = [
  "Will this change trigger a telematics or usage-based discount?",
  "What is the exact effective date and when will my ID card / EOI be ready?",
  "Does this mid-term change re-rate my whole policy or only the new exposure?",
  "Are there documents you still need before coverage is bound?",
  "Will any discounts (good student, multi-car, good driver) change?",
];

export const IZZY_EDUCATIONAL_DISCLAIMER =
  "Educational information from Izzy only — not a quote, binder, or legal advice. Confirm all requirements, rates, and forms with your licensed insurance carrier or agent before acting.";

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function normalizeVin(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 17);
}

export function isValidVin(value: string): boolean {
  return VIN_REGEX.test(value.trim());
}

export function getWorkflow(id: WorkflowId): WorkflowDef {
  const found = WORKFLOWS.find((w) => w.id === id);
  if (!found) throw new Error(`Unknown workflow: ${id}`);
  return found;
}

export function nuancesForState(
  state: UsState | "",
  workflowId: WorkflowId,
): StateNuance[] {
  if (!state) return [];
  const list = STATE_NUANCES[state] ?? [];
  return list.filter(
    (n) => n.workflows === "all" || n.workflows.includes(workflowId),
  );
}
