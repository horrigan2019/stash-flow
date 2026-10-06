import { IzzyShell } from "@/components/izzy/IzzyShell";
import { AgencyDesk } from "@/components/izzy/AgencyDesk";

export const metadata = {
  title: "Agency Desk Sidekick",
  description:
    "Zero-PII CoverQuote simulator, ClaimFlow checklists, and empathy-first de-escalation scripts (bill increases, household/unlisted drivers) for agency staff.",
};

export default function IzzyAgencyPage() {
  return (
    <IzzyShell active="/izzy/agency">
      <AgencyDesk />
    </IzzyShell>
  );
}
