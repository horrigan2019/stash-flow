import { IzzyShell } from "@/components/izzy/IzzyShell";
import { IzzyPocketDashboard } from "@/components/izzy/IzzyPocketDashboard";
import type { PolicyCategory } from "@/lib/izzy/types";

export const metadata = {
  title: "Dashboard · Pocket Vault",
};

const CATEGORIES: PolicyCategory[] = [
  "auto",
  "home",
  "commercial",
  "life",
  "health",
];

function parseCategory(raw: string | undefined): PolicyCategory {
  if (raw && CATEGORIES.includes(raw as PolicyCategory)) {
    return raw as PolicyCategory;
  }
  return "auto";
}

export default async function IzzyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ emergency?: string; category?: string }>;
}) {
  const params = await searchParams;
  const openKit =
    params.emergency === "1" ||
    params.emergency === "true" ||
    params.emergency === "open";

  return (
    <IzzyShell active="/izzy/dashboard">
      <IzzyPocketDashboard
        openKit={openKit}
        initialCategory={parseCategory(params.category)}
      />
    </IzzyShell>
  );
}
