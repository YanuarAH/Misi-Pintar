"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-muted hover:text-ink"
    >
      {copied ? <Check className="size-3.5 text-leaf" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "Tersalin" : label}
      <span className="sr-only" aria-live="polite">
        {copied ? `${value} tersalin ke papan klip` : ""}
      </span>
    </button>
  );
}
