import { IzzyShell } from "@/components/izzy/IzzyShell";
import { IzzyDashboard } from "@/components/dashboard/IzzyDashboard";

export const metadata = {
  title: "Change Checklist",
  description:
    "Consumer change checklist and underwriting explainer for insurance policy updates.",
};

export default function IzzyChangesPage() {
  return (
    <IzzyShell active="/izzy/changes">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <IzzyDashboard />
      </div>
    </IzzyShell>
  );
}
