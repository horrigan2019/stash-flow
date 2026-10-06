export type WorkflowId =
  | "add-vehicle"
  | "add-driver"
  | "home-closing"
  | "remove-driver-vehicle";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
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
      title: "MI PIP household members",
      detail:
        "Michigan no-fault PIP rating can include all household members. Carriers may ask for names/DOBs of residents even if they do not drive the insured vehicle.",
      workflows: ["add-driver", "remove-driver-vehicle", "add-vehicle"],
    },
  ],
  FL: [
    {
      id: "fl-pip",
      title: "FL PIP household members",
      detail:
        "Florida PIP and UM underwriting often reviews household composition. Expect questions about resident relatives and other vehicles in the household.",
      workflows: ["add-driver", "remove-driver-vehicle", "add-vehicle"],
    },
  ],
  CA: [
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
      "Gather VIN, odometer, lien/lease details, purchase date, and coverage choices before calling the carrier.",
    items: [
      {
        id: "vin",
        label: "VIN (17 characters)",
        hint: "From the dash plate, door jamb, or title/registration.",
        required: true,
      },
      {
        id: "odometer",
        label: "Current odometer reading",
        hint: "Used for mileage rating and usage class.",
        required: true,
      },
      {
        id: "lienholder",
        label: "Lienholder / lease clause",
        hint: "Exact legal name and mailing address for loss-payee wording.",
        required: true,
      },
      {
        id: "purchase-date",
        label: "Purchase / lease start date",
        hint: "Effective date carriers use for coverage start.",
        required: true,
      },
      {
        id: "coverage",
        label: "Coverage selection",
        hint: "Liability limits, comprehensive/collision deductibles, rental & roadside.",
        required: true,
      },
    ],
  },
  {
    id: "add-driver",
    title: "Add a Driver",
    summary:
      "Have identity, license, student-discount proof, and vehicle assignment ready.",
    items: [
      {
        id: "name",
        label: "Full legal name",
        hint: "Must match the driver’s license.",
        required: true,
      },
      {
        id: "dob",
        label: "Date of birth",
        required: true,
      },
      {
        id: "dl",
        label: "Driver’s license number & state",
        required: true,
      },
      {
        id: "student-proof",
        label: "Student discount proof (if applicable)",
        hint: "Report card, transcript, or enrollment letter for good-student discount.",
      },
      {
        id: "vehicle-assignment",
        label: "Primary vehicle assignment",
        hint: "Which listed vehicle this driver will mainly use.",
        required: true,
      },
    ],
  },
  {
    id: "home-closing",
    title: "Home Closing / Mortgage Update",
    summary:
      "Update the mortgagee clause and escrow contacts so the lender is protected at closing.",
    items: [
      {
        id: "mortgagee",
        label: "Mortgagee clause (exact wording)",
        hint: "Lender’s ISAOA/ATIMA name and notice address from closing docs.",
        required: true,
      },
      {
        id: "escrow",
        label: "Escrow / loan servicer details",
        hint: "Loan number, escrow company, and billing contact if premiums are escrowed.",
        required: true,
      },
      {
        id: "closing-date",
        label: "Closing date",
        hint: "Evidence of insurance must often be issued before this date.",
        required: true,
      },
    ],
  },
  {
    id: "remove-driver-vehicle",
    title: "Remove Driver / Vehicle",
    summary:
      "Document sale, separate residence, or other insurance so the carrier can delete exposure.",
    items: [
      {
        id: "bill-of-sale",
        label: "Bill of sale (vehicle removal)",
        hint: "Buyer name, sale date, and VIN if available.",
      },
      {
        id: "separate-residence",
        label: "Proof of separate residence (driver removal)",
        hint: "Lease, utility bill, or mail showing a new address.",
      },
      {
        id: "other-insurance",
        label: "Proof of other insurance",
        hint: "Declarations page showing the person/vehicle is covered elsewhere.",
      },
    ],
  },
];

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
