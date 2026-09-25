"use client";

import { useState } from "react";

export function CopyBlock({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="relative rounded-xl border border-line bg-surface-2">
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 pr-20 font-mono text-[13px] leading-relaxed text-ink">{text}</pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 hover:text-ink"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
