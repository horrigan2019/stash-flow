import { redirect } from "next/navigation";

/**
 * Canonical crisis dashboard lives under Izzy.
 * Keep /dashboard as a stable alias for the product plan path.
 */
export default async function DashboardAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ emergency?: string; category?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.emergency) qs.set("emergency", String(params.emergency));
  if (params.category) qs.set("category", String(params.category));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/izzy/dashboard${suffix}`);
}
