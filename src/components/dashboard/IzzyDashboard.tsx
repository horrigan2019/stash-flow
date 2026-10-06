"use client";

import { useState } from "react";
import { ChangeChecklist } from "@/components/dashboard/ChangeChecklist";
import { UnderwritingDecoder } from "@/components/dashboard/UnderwritingDecoder";

type Panel = "checklist" | "decoder";

export function IzzyDashboard() {
  const [panel, setPanel] = useState<Panel>("checklist");

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
      </div>

      {panel === "checklist" ? <ChangeChecklist /> : <UnderwritingDecoder />}
    </div>
  );
}
