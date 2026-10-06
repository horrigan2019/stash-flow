"use client";

import { useSearchParams } from "next/navigation";
import { AccidentEmergencyKit } from "@/components/dashboard/AccidentEmergencyKit";
import type { PolicyCategory } from "@/lib/izzy/types";

const CATEGORIES: PolicyCategory[] = [
  "auto",
  "home",
  "commercial",
  "life",
  "health",
];

export function VaultKitPage() {
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const categoryParam = params.get("category");
  const category =
    categoryParam && CATEGORIES.includes(categoryParam as PolicyCategory)
      ? (categoryParam as PolicyCategory)
      : modeParam === "home"
        ? "home"
        : "auto";
  const mode = modeParam === "home" || category === "home" ? "home" : "auto";

  return (
    <AccidentEmergencyKit initialCategory={category} initialMode={mode} />
  );
}
