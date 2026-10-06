import { Suspense } from "react";
import { IzzyShell } from "@/components/izzy/IzzyShell";
import { VaultKitPage } from "@/components/izzy/VaultKitPage";

export const metadata = {
  title: "Accident Emergency Vault",
};

export default function IzzyVaultPage() {
  return (
    <IzzyShell active="/izzy/vault">
      <Suspense
        fallback={
          <p className="px-4 py-10 text-sm text-[color:var(--izzy-ink)]/60">
            Loading emergency vault…
          </p>
        }
      >
        <VaultKitPage />
      </Suspense>
    </IzzyShell>
  );
}
