import { IzzyShell } from "@/components/izzy/IzzyShell";
import { AgencyDesk } from "@/components/izzy/AgencyDesk";

export const metadata = {
  title: "Agency Desk Sidekick",
  description:
    "Zero-PII CoverQuote simulator, ClaimFlow checklists, and de-escalation scripts for agency staff.",
};

export default function IzzyAgencyPage() {
  return (
    <IzzyShell active="/izzy/agency">
      <AgencyDesk />
    </IzzyShell>
  );
}
