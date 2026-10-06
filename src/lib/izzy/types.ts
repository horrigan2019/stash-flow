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
  /** Exact deductibles for Claims & Deductible Reality Check */
  collisionDeductible?: string;
  comprehensiveDeductible?: string;
  homeDeductible?: string;
  updatedAt: string;
};

export type PostAccidentStep = {
  id: string;
  title: string;
  detail: string;
  order: number;
};

/** Other-party info captured at the scene — IndexedDB only. */
export type OtherPartyRecord = {
  id: string;
  driverName: string;
  phone: string;
  insuranceCarrier: string;
  policyNumber: string;
  policeReportOrBadge: string;
  notes: string;
  updatedAt: string;
};

export type ScenePhotoCheckId =
  | "vehicle_damage"
  | "license_plates"
  | "intersection_skid"
  | "wider_scene";

export type ScenePhotoChecklistState = Record<ScenePhotoCheckId, boolean>;
