"use client";

import { Printer, Square } from "lucide-react";

export interface CallSheetProps {
  changeType: string;
  stateName: string;
  carrierName?: string;
  policyNumber?: string;
  dataFields: { label: string; value: string }[];
  stateQuestions: string[];
  /** Optional: hide the on-screen print bar when parent already has a Generate button */
  showActionBar?: boolean;
  onPrint?: () => void;
}

export default function PrintableCallSheet({
  changeType = "Add a Vehicle",
  stateName = "Michigan",
  carrierName = "",
  policyNumber = "",
  dataFields = [
    { label: "17-Digit VIN", value: "7FARW2H87RE129482" },
    { label: "Odometer Reading", value: "14,250 miles" },
    { label: "Purchase/Lease Date", value: "October 12, 2026" },
    {
      label: "Lienholder / Loss Payee",
      value: "Ally Financial, PO Box 9001951, Louisville, KY",
    },
    {
      label: "Primary Assigned Driver",
      value: "Debra Horrigan (Annual Commute: 12k mi)",
    },
  ],
  stateQuestions = [
    "Does adding this vehicle affect our current PIP medical selection under state law?",
    "Will our multi-vehicle discount apply automatically on this billing cycle?",
    "Can you email a temporary 30-day proof of insurance (ID card) right now?",
  ],
  showActionBar = true,
  onPrint,
}: CallSheetProps) {
  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="mx-auto my-6 w-full max-w-4xl">
      {showActionBar ? (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-100/80 p-4 print:hidden">
          <div>
            <h3 className="font-bold text-amber-950">Ready to call your carrier?</h3>
            <p className="text-sm text-neutral-600">
              Print or save this cheat sheet so you have every answer ready before you dial.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-md bg-[#3F6B4A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#355a3f]"
          >
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>
      ) : null}

      <div className="printable-card rounded-xl border border-slate-300 bg-white p-8 text-slate-900 print:m-0 print:w-full print:border-none print:p-0 print:text-black">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#3F6B4A] print:text-black">
              Izzy: Insurance Decoder — No BS
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Policyholder Call &amp; Change Sheet
            </h1>
            <p className="text-xs italic text-slate-500 print:text-slate-700">
              &ldquo;Insurance companies work for their bottom line. Izzy works for
              you.&rdquo;
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold">Generated:</span>{" "}
            {new Date().toLocaleDateString()}
            <br />
            <span className="font-bold">Jurisdiction:</span> {stateName}
          </div>
        </div>

        <div className="my-3 grid grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50 py-3 text-xs print:bg-transparent">
          <div>
            <span className="font-bold">Requested Change:</span> {changeType}
          </div>
          <div>
            <span className="font-bold">Carrier:</span>{" "}
            {carrierName || "_________________"}
          </div>
          <div>
            <span className="font-bold">Policy #:</span>{" "}
            {policyNumber || "_________________"}
          </div>
        </div>

        <div className="my-4">
          <h2 className="border-b border-slate-300 pb-1 text-xs font-black uppercase tracking-wider">
            1. Information to Read to the Customer Service Rep
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {dataFields.map((field, idx) => (
              <div
                key={`${field.label}-${idx}`}
                className="rounded border border-slate-200 p-2"
              >
                <span className="block font-semibold text-slate-500 print:text-slate-800">
                  {field.label}
                </span>
                <span className="font-bold text-slate-900">
                  {field.value || "_________________"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="my-4">
          <h2 className="border-b border-slate-300 pb-1 text-xs font-black uppercase tracking-wider">
            2. Strategic Questions to Ask During the Call
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs">
            {stateQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-4 border-t-2 border-dashed border-slate-300 pt-3">
          <h2 className="border-b border-slate-300 pb-1 text-xs font-black uppercase tracking-wider">
            3. Call Record &amp; Verification (Fill in during call)
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="border-b border-slate-300 py-1">
                <span className="font-bold">Representative Name:</span>{" "}
              </p>
              <p className="mt-2 border-b border-slate-300 py-1">
                <span className="font-bold">Confirmation / Endorsement #:</span>{" "}
              </p>
            </div>
            <div>
              <p className="border-b border-slate-300 py-1">
                <span className="font-bold">New Monthly / Annual Cost:</span> $
              </p>
              <p className="mt-2 border-b border-slate-300 py-1">
                <span className="font-bold">Effective Date Confirmed:</span> [ ]
                Yes [ ] No
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs">
            <span className="font-bold">Temporary ID Card / Proof Sent:</span> [ ]
            In Carrier Mobile App &nbsp;&nbsp;&nbsp; [ ] Emailed Directly
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-3 text-[10px] leading-tight text-slate-500">
          <strong>Notice:</strong> Izzy provides educational policy summaries and
          call-prep tools only. Izzy is not a licensed insurance agency, carrier,
          broker, or legal advisor. Coverage is not legally bound until issued and
          confirmed by your official carrier.
        </div>
      </div>
    </div>
  );
}
