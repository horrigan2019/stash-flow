"use client";

import { useState } from "react";
import { Mic } from "lucide-react";

interface VoiceIntakeButtonProps {
  onSpill?: (phrase: string) => void;
}

const DEMO_PHRASES = [
  "Grab cilantro and limes",
  "We need eggs and cream",
  "Add frozen berries",
];

export function VoiceIntakeButton({ onSpill }: VoiceIntakeButtonProps) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  function handlePress() {
    setListening(true);
    setHint("Listening… (demo)");
    window.setTimeout(() => {
      const phrase =
        DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)];
      setListening(false);
      setHint(`Heard: “${phrase}”`);
      onSpill?.(phrase);
      window.setTimeout(() => setHint(null), 2200);
    }, 900);
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-2">
      <button
        type="button"
        onClick={handlePress}
        aria-label="Voice intake: Spill it—what are we stuffing in the cart?"
        className={`group relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-700/25 transition active:scale-95 ${
          listening ? "animate-pulse ring-4 ring-amber-300/80" : "hover:scale-[1.03]"
        }`}
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-amber-400/30 opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        <Mic className="relative h-8 w-8" strokeWidth={2.25} />
      </button>
      <p className="max-w-[16rem] text-center text-sm font-medium text-neutral-700">
        Spill it—what are we stuffing in the cart?
      </p>
      {hint ? (
        <p className="text-xs font-medium text-amber-800" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
