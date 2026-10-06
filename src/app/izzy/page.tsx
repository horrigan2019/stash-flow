import { IzzyDashboard } from "@/components/dashboard/IzzyDashboard";

export const metadata = {
  title: "Izzy · Change Checklist",
  description:
    "Consumer change checklist and underwriting explainer for insurance policy updates.",
};

export default function IzzyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#FBF7F0] text-[#2C261C] shadow-[0_0_0_1px_rgba(63,107,74,0.08)]">
      <header className="flex items-center justify-between border-b border-amber-200/70 px-4 py-3 print:hidden">
        <a
          href="/"
          className="text-sm font-semibold text-[#3F6B4A] underline-offset-2 hover:underline"
        >
          ← Oh Stuffing
        </a>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-amber-950">
          Izzy
        </p>
        <span className="w-16" aria-hidden />
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <IzzyDashboard />
      </main>
    </div>
  );
}
