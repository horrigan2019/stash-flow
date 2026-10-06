import type { UsState, WorkflowId } from "@/lib/izzy/checklists";

export const CALL_SHEET_TITLE =
  "IZZY POLICY CALL SHEET: READY TO CALL MY CARRIER";

export const CALL_SHEET_TAGLINE =
  "Insurance companies work for their bottom line. Izzy works for you.";

export const CALL_SHEET_DISCLAIMER =
  "Izzy provides educational preparation tools only. Official changes and binding authority are strictly executed through your licensed carrier or agent.";

export const ACTION_TYPE_LABELS: Record<WorkflowId, string> = {
  "add-vehicle": "Adding a Vehicle",
  "add-driver": "Adding a Driver",
  "home-closing": "Home Closing / Mortgage Update",
  "remove-driver-vehicle": "Removing Driver / Vehicle",
};

/** Short state context line for the header (e.g. MI No-Fault PIP). */
export const STATE_CONTEXT_LABELS: Partial<Record<UsState, string>> = {
  MI: "No-Fault PIP Rules",
  FL: "PIP Household Rules",
  NY: "FS-20 Auto Proof",
  CA: "Good Driver Rules",
  NJ: "PIP Options",
  TX: "Proof of Insurance",
};

export function formatCallSheetDate(d = new Date()): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOdometer(raw: string): string {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n)) return raw ? `${raw} miles` : "";
  return `${n.toLocaleString("en-US")} miles`;
}

export function stateHeaderLabel(state: UsState | ""): string {
  if (!state) return "________________";
  const ctx = STATE_CONTEXT_LABELS[state];
  return ctx ? `${state} (${ctx})` : state;
}

export interface CallSheetDetailLine {
  id: string;
  label: string;
  value: string;
  checked: boolean;
  multiline?: boolean;
}

export function buildDetailLines(
  workflowId: WorkflowId,
  values: Record<string, string>,
  checked: Record<string, boolean>,
): CallSheetDetailLine[] {
  const v = (id: string) => (values[id] ?? "").trim();
  const has = (id: string) => Boolean(v(id));
  const box = (id: string) => Boolean(checked[id]);

  if (workflowId === "add-vehicle") {
    const lienParts = [
      v("lienholder-name"),
      v("lienholder-address"),
      v("lienholder-account") ? `(Account # ${v("lienholder-account")})` : "",
    ].filter(Boolean);
    const lien = lienParts.join(", ");
    const driver = v("primary-driver");
    const commute = v("commute");
    const driverLine = [
      driver,
      commute ? `(Daily Commute: ${commute} miles)` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return [
      {
        id: "ymm",
        label: "Year / Make / Model",
        value: v("ymm"),
        checked: has("ymm"),
      },
      {
        id: "vin",
        label: "17-Digit VIN",
        value: v("vin"),
        checked: has("vin") && v("vin").length === 17,
      },
      {
        id: "odometer",
        label: "Current Odometer",
        value: v("odometer") ? formatOdometer(v("odometer")) : "",
        checked: has("odometer"),
      },
      {
        id: "purchase-date",
        label: "Effective / Purchase Date",
        value: formatDisplayDate(v("purchase-date")),
        checked: has("purchase-date"),
      },
      {
        id: "lienholder",
        label: "Lienholder / Loss Payee Clause",
        value: lien,
        checked: has("lienholder-name") && has("lienholder-address"),
        multiline: true,
      },
      {
        id: "primary-driver",
        label: "Primary Driver Assigned",
        value: driverLine,
        checked: has("primary-driver"),
      },
      {
        id: "coverage",
        label: "Coverage Selections",
        value: v("coverage"),
        checked: has("coverage"),
      },
    ];
  }

  if (workflowId === "add-driver") {
    return [
      {
        id: "name",
        label: "Full Legal Name",
        value: v("name"),
        checked: has("name"),
      },
      {
        id: "dob",
        label: "Date of Birth",
        value: formatDisplayDate(v("dob")),
        checked: has("dob"),
      },
      {
        id: "dl",
        label: "Driver’s License #",
        value: v("dl"),
        checked: has("dl"),
      },
      {
        id: "gpa-verification",
        label: "Good Student GPA Verification",
        value: box("gpa-verification") ? "Ready to provide" : "Not prepared",
        checked: box("gpa-verification"),
      },
      {
        id: "driver-training",
        label: "Driver Training Certificate",
        value: box("driver-training") ? "Ready to provide" : "Not prepared",
        checked: box("driver-training"),
      },
      {
        id: "vehicle-assignment",
        label: "Vehicle Assignment",
        value: v("vehicle-assignment"),
        checked: has("vehicle-assignment"),
      },
    ];
  }

  if (workflowId === "home-closing") {
    return [
      {
        id: "mortgagee",
        label: "Mortgagee Clause",
        value: v("mortgagee"),
        checked: has("mortgagee"),
        multiline: true,
      },
      {
        id: "escrow-contact",
        label: "Escrow Contact",
        value: v("escrow-contact"),
        checked: has("escrow-contact"),
      },
      {
        id: "loan-number",
        label: "Loan Number",
        value: v("loan-number"),
        checked: has("loan-number"),
      },
      {
        id: "closing-date",
        label: "Closing Date",
        value: formatDisplayDate(v("closing-date")),
        checked: has("closing-date"),
      },
      {
        id: "home-updates",
        label: "Home Updates",
        value: v("home-updates"),
        checked: has("home-updates"),
      },
    ];
  }

  // remove-driver-vehicle
  return [
    {
      id: "bill-of-sale",
      label: "Bill of Sale / Trade-in Proof",
      value: box("bill-of-sale") ? "Ready to provide" : "Not prepared",
      checked: box("bill-of-sale"),
    },
    {
      id: "separate-residence",
      label: "Proof of Separate Residence",
      value: box("separate-residence") ? "Ready to provide" : "Not prepared",
      checked: box("separate-residence"),
    },
    {
      id: "other-insurance",
      label: "Proof of Other Insurance",
      value: box("other-insurance") ? "Ready to provide" : "Not prepared",
      checked: box("other-insurance"),
    },
  ];
}

const BASE_QUESTIONS: Record<WorkflowId, string[]> = {
  "add-vehicle": [
    "Will our multi-car discount apply immediately starting on the effective date?",
    "Are there any connected-car / telematics discount opt-ins available for this VIN?",
    "What is the exact effective date and when will my ID card be ready?",
  ],
  "add-driver": [
    "Will any good-student or driver-training discounts apply on the effective date?",
    "Does adding this driver re-rate the whole policy or only the assigned vehicle?",
    "Do you need a named-driver exclusion for anyone else in the household?",
  ],
  "home-closing": [
    "Can you issue evidence of insurance to the escrow contact before the closing date?",
    "Is the mortgagee clause wording exact as I read it, including ISAOA/ATIMA?",
    "Will premiums move to escrow billing, and when does that start?",
  ],
  "remove-driver-vehicle": [
    "What documents do you need before the removal is effective?",
    "Will removing this exposure change our multi-car or household discounts?",
    "When will the endorsement and updated ID cards be available?",
  ],
};

const STATE_QUESTIONS: Partial<
  Record<UsState, Partial<Record<WorkflowId, string[]>>>
> = {
  MI: {
    "add-vehicle": [
      "Does adding this vehicle alter our PIP medical choice under Michigan No-Fault?",
      "Will our multi-car discount apply immediately starting on the effective date?",
      "Are there any connected-car / telematics discount opt-ins available for this VIN?",
    ],
    "add-driver": [
      "Does adding this driver change who must be selected for Michigan PIP household rating?",
      "Will any good-student or driver-training discounts apply on the effective date?",
      "Do you need names and DOBs for other household members under Michigan No-Fault?",
    ],
  },
  FL: {
    "add-vehicle": [
      "Does adding this vehicle change Florida PIP / UM household rating on our policy?",
      "Will our multi-car discount apply immediately starting on the effective date?",
      "Are there any connected-car / telematics discount opt-ins available for this VIN?",
    ],
    "add-driver": [
      "How should we select household members for Florida PIP when adding this driver?",
      "Will any good-student or driver-training discounts apply on the effective date?",
      "Do you need a health insurance card for PIP coordination of benefits?",
    ],
  },
  NY: {
    "add-vehicle": [
      "Can you issue an FS-20 (or equivalent) for this VIN before my DMV appointment?",
      "Will our multi-car discount apply immediately starting on the effective date?",
      "Are there any connected-car / telematics discount opt-ins available for this VIN?",
    ],
    "add-driver": [
      "Do you need an updated FS-20 when this driver is added?",
      "Will any good-student or driver-training discounts apply on the effective date?",
      "Does adding this driver re-rate the whole policy or only the assigned vehicle?",
    ],
  },
  CA: {
    "add-vehicle": [
      "Does adding this vehicle affect California Good Driver Discount eligibility for any listed driver?",
      "Will our multi-car discount apply immediately starting on the effective date?",
      "Are there any connected-car / telematics discount opt-ins available for this VIN?",
    ],
    "add-driver": [
      "Does this driver qualify for California’s Good Driver Discount under your rules?",
      "Will any good-student or driver-training discounts apply on the effective date?",
      "Is an SR-22 filing required for this driver, and how long does that take?",
    ],
  },
};

export function getStateQuestions(
  state: UsState | "",
  workflowId: WorkflowId,
): { heading: string; questions: string[] } {
  const stateQs =
    state && STATE_QUESTIONS[state]
      ? STATE_QUESTIONS[state]?.[workflowId]
      : undefined;
  const questions = stateQs ?? BASE_QUESTIONS[workflowId];
  const ctx = state
    ? STATE_CONTEXT_LABELS[state]
      ? `${state} CONTEXT`
      : `${state} CONTEXT`
    : "GENERAL";
  const heading =
    state && STATE_CONTEXT_LABELS[state]
      ? `2. STATE-SPECIFIC QUESTIONS TO ASK (${state === "MI" ? "MICHIGAN CONTEXT" : state === "FL" ? "FLORIDA CONTEXT" : state === "NY" ? "NEW YORK CONTEXT" : state === "CA" ? "CALIFORNIA CONTEXT" : `${state} CONTEXT`})`
      : state
        ? `2. STATE-SPECIFIC QUESTIONS TO ASK (${ctx})`
        : "2. QUESTIONS TO ASK THE REPRESENTATIVE";
  return { heading, questions };
}
