import Link from "next/link";
import { Siren } from "lucide-react";

/** High-visibility entry into the Offline Accident Emergency Kit. */
export function EmergencyHeaderButton({
  href = "/izzy/vault",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`izzy-emergency-btn inline-flex items-center gap-1.5 rounded-md border-2 border-[#7F1D1D] bg-[#DC2626] px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[0_0_0_2px_#FDE68A] transition hover:brightness-110 sm:px-3 sm:text-xs ${className}`}
      aria-label="In Case of Accident / Emergency — open Emergency Vault"
    >
      <Siren className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="leading-tight">
        <span className="hidden sm:inline">In Case of Accident / Emergency</span>
        <span className="sm:hidden">Emergency</span>
      </span>
    </Link>
  );
}
