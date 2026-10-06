"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, X } from "lucide-react";

export interface PolicyContext {
  state?: string;
  workflow?: string;
  notes?: string;
  carrier?: string;
  policyNumber?: string;
}

interface AskIzzyDrawerProps {
  open: boolean;
  topic: string;
  policyContext?: PolicyContext;
  onClose: () => void;
}

export function AskIzzyDrawer({
  open,
  topic,
  policyContext,
  onClose,
}: AskIzzyDrawerProps) {
  const [message, setMessage] = useState(topic);
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMessage(topic);
      setReply(null);
      setError(null);
    }
  }, [open, topic]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          topic,
          policyContext: policyContext ?? {},
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: { message?: string; type?: string };
      };
      if (!res.ok) {
        setError(data.error?.message || "Ask Izzy is unavailable right now.");
        return;
      }
      setReply(data.reply || "No answer returned.");
    } catch {
      setError("Could not reach Ask Izzy. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="ask-izzy-drawer fixed inset-0 z-50 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-izzy-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-amber-950/35"
        aria-label="Close Ask Izzy"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-md flex-col rounded-t-3xl border border-amber-200/80 bg-[#FBF7F0] shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-200/70 px-4 py-3">
          <div className="flex items-center gap-2 text-[#2C4A34]">
            <Sparkles className="h-4 w-4" aria-hidden />
            <h2 id="ask-izzy-title" className="text-sm font-semibold">
              Ask Izzy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-amber-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {(policyContext?.state ||
            policyContext?.workflow ||
            policyContext?.policyNumber) && (
            <div className="mb-3 rounded-xl border border-[#3F6B4A]/20 bg-[#3F6B4A]/08 px-3 py-2 text-xs text-neutral-700">
              <p className="font-semibold text-[#2C4A34]">Policy context</p>
              <p className="mt-0.5">
                {[
                  policyContext.state && `State: ${policyContext.state}`,
                  policyContext.workflow && `Change: ${policyContext.workflow}`,
                  policyContext.carrier && `Carrier: ${policyContext.carrier}`,
                  policyContext.policyNumber &&
                    `Policy #: ${policyContext.policyNumber}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-amber-950">
                Your question
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-amber-200/80 bg-white px-3 py-2.5 text-sm text-amber-950 outline-none ring-amber-300 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3F6B4A] px-4 py-2.5 text-sm font-bold text-[#F7FBF5] disabled:opacity-50"
            >
              {busy ? "Asking Izzy…" : "Send to Ask Izzy"}
            </button>
          </form>

          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {reply ? (
            <div className="mt-3 rounded-xl border border-[#3F6B4A]/20 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2C4A34]">
                Izzy says
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
                {reply}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
