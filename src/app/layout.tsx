import type { Metadata } from "next";

import { Sidebar, THEME_SCRIPT } from "@/components/Sidebar";
import { loadRuns } from "@/lib/data";

import "./globals.css";

export const metadata: Metadata = {
  title: "silybench",
  description:
    "What it really costs to serve open LLMs: measured capacity on rented GPUs vs pay-per-token APIs, with open data and a one-prompt way to reproduce it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const runs = loadRuns();
  const uniq = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter(Boolean))) as string[];
  const stack = [
    ...uniq(runs.map((r) => r.hardware.gpu_type)),
    ...uniq(runs.map((r) => r.software.engine_version)).map((v) => `vLLM ${v}`),
    ...uniq(runs.map((r) => r.hardware.provider.toUpperCase())),
  ];

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full lg:flex">
        <Sidebar stack={stack} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
          <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-xs text-muted sm:px-6 lg:px-10">
            silybench · measured with vLLM and lm-evaluation-harness on rented GPUs ·{" "}
            <a className="hover:text-ink" href="https://github.com/tgarg01/silybench-data">open data</a> ·{" "}
            <a className="hover:text-ink" href="https://github.com/tgarg01/silybench-bench">reproduce</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
