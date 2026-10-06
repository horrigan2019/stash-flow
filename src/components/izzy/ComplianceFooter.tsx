import { IZZY_COMPLIANCE_FOOTER } from "@/lib/izzy/brand";

export function ComplianceFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`izzy-compliance border-t border-[color:var(--izzy-line)] bg-[color:var(--izzy-ink)]/95 px-4 py-4 text-[11px] leading-relaxed text-[color:var(--izzy-mist)]/85 ${className}`}
      role="contentinfo"
      data-compliance="izzy-educational-only"
    >
      <p className="mx-auto max-w-3xl">{IZZY_COMPLIANCE_FOOTER}</p>
    </footer>
  );
}
