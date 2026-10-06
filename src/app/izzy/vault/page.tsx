import { IzzyShell } from "@/components/izzy/IzzyShell";
import { OfflineVaultPanel } from "@/components/izzy/OfflineVaultPanel";

export const metadata = {
  title: "Offline Accident Vault",
};

export default function IzzyVaultPage() {
  return (
    <IzzyShell active="/izzy/vault">
      <OfflineVaultPanel />
    </IzzyShell>
  );
}
