export type PolicyCategory =
  | "auto"
  | "home"
  | "commercial"
  | "life"
  | "health";

export type PolicyDocType = "dec_page" | "carrier_letter" | "audit" | "bill";

export type ExtractedCoverage = {
  carrier?: string;
  policyNumber?: string;
  state?: string;
  liabilityBodilyInjury?: string;
  liabilityPropertyDamage?: string;
  comprehensiveDeductible?: string;
  collisionDeductible?: string;
  roadside?: boolean | null;
  rental?: boolean | null;
  exclusions?: string[];
  gaps?: Array<{ id: string; title: string; detail: string }>;
  claimsPhone?: string;
  roadsidePhone?: string;
};

export type AnalyzePolicyResult = {
  category: PolicyCategory;
  state: string;
  extracted: ExtractedCoverage;
  plainEnglishSummary: string;
  policyId?: string;
  teaserGaps: Array<{ id: string; title: string; detail: string; locked: true }>;
};

export type OfflineEmergencyCard = {
  id: string;
  label: string;
  carrierName?: string;
  policyNumber?: string;
  claimsPhone?: string;
  roadsidePhone?: string;
  state?: string;
  category?: PolicyCategory;
  updatedAt: string;
};

export type PostAccidentStep = {
  id: string;
  title: string;
  detail: string;
  order: number;
};
