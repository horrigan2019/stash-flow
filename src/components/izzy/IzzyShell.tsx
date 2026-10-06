import Link from "next/link";
import { ComplianceFooter } from "@/components/izzy/ComplianceFooter";
import { IZZY_NAME } from "@/lib/izzy/brand";

const NAV = [
  { href: "/izzy", label: "Home" },
  { href: "/izzy/decode", label: "Decode" },
  { href: "/izzy/changes", label: "Changes" },
  { href: "/izzy/vault", label: "Vault" },
  { href: "/izzy/agency", label: "Agency" },
];

export function IzzyShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="izzy-root flex min-h-dvh flex-col text-[color:var(--izzy-ink)]">
      <header className="izzy-header print:hidden sticky top-0 z-30 border-b border-[color:var(--izzy-line)] bg-[color:var(--izzy-foam)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/izzy"
            className="font-[family-name:var(--font-izzy-display)] text-2xl font-semibold tracking-tight text-[color:var(--izzy-ink)]"
          >
            {IZZY_NAME}
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 text-xs font-semibold sm:gap-2 sm:text-sm">
            {NAV.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-1.5 transition ${
                    isActive
                      ? "bg-[color:var(--izzy-ink)] text-[color:var(--izzy-foam)]"
                      : "text-[color:var(--izzy-ink)]/75 hover:bg-[color:var(--izzy-ink)]/8"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="relative flex flex-1 flex-col">{children}</main>
      <ComplianceFooter />
    </div>
  );
}
