"use client";

import { useState } from "react";
import { ChangeChecklist } from "@/components/dashboard/ChangeChecklist";
import { UnderwritingFAQ } from "@/components/dashboard/UnderwritingFAQ";

type Panel = "checklist" | "decoder";

export function IzzyDashboard() {
  const [panel, setPanel] = useState<Panel>("checklist");
  const [policyState, setPolicyState] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b border-amber-200/60 bg-[#FBF7F0]/95 px-5 py-2 backdrop-blur-sm print:hidden">
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-amber-100/70 p-1"
          role="tablist"
          aria-label="Izzy modules"
        >
          <button
            type="button"
            role="tab"
            aria-selected={panel === "checklist"}
            onClick={() => setPanel("checklist")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              panel === "checklist"
                ? "bg-white text-amber-950 shadow-sm"
                : "text-neutral-600 hover:text-amber-950"
            }`}
          >
            Change checklist
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === "decoder"}
            onClick={() => setPanel("decoder")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              panel === "decoder"
                ? "bg-white text-amber-950 shadow-sm"
                : "text-neutral-600 hover:text-amber-950"
            }`}
          >
            Why are they asking?
          </button>
        </div>

        {panel === "decoder" ? (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <input
              value={policyState}
              onChange={(e) => setPolicyState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="ST"
              aria-label="Policy state"
              className="rounded-lg border border-amber-200/80 bg-white/90 px-2 py-1.5 text-xs"
            />
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Carrier"
              aria-label="Carrier name"
              className="rounded-lg border border-amber-200/80 bg-white/90 px-2 py-1.5 text-xs"
            />
            <input
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="Policy #"
              aria-label="Policy number"
              className="rounded-lg border border-amber-200/80 bg-white/90 px-2 py-1.5 text-xs"
            />
          </div>
        ) : null}
      </div>

      {panel === "checklist" ? (
        <ChangeChecklist />
      ) : (
        <UnderwritingFAQ
          policyContext={{
            state: policyState || undefined,
            carrier: carrier || undefined,
            policyNumber: policyNumber || undefined,
          }}
        />
      )}
    </div>
  );
}
