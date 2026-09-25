import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Swatch, TH } from "@/components/Card";
import { SampleBanner } from "@/components/SampleBanner";
import { loadRuns } from "@/lib/data";
import { fmtMaxUsers, hardwareLabel, runLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Runs · silybench" };

export default function RunsPage() {
  const runs = loadRuns();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Runs"
        title="All benchmark runs"
        description="One run = one model × precision on one hardware target. Open a run for every concurrency level and accuracy task."
      />
      {runs.some((r) => r.sample) && <SampleBanner />}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <table className="tabular w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2/60 text-left">
            <tr>
              <th className={`${TH} px-5`}>Model</th>
              <th className={`${TH} px-5`}>Hardware</th>
              <th className={`${TH} px-5`}>Engine</th>
              <th className={`${TH} px-5 text-right`}>Peak users (SLO)</th>
              <th className={`${TH} px-5`}>Date</th>
              <th className={`${TH} px-5`}>Run ID</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => (
              <tr key={r.run_id} className="border-t border-line hover:bg-surface-2/50">
                <td className="px-5 py-3">
                  <Link href={`/runs/${r.run_id}/`} className="flex items-center gap-2 font-medium hover:underline">
                    <Swatch color={`var(--series-${(i % 8) + 1})`} />
                    {runLabel(r)}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-2">{hardwareLabel(r)}</td>
                <td className="px-5 py-3 text-ink-2">vLLM {r.software.engine_version ?? "?"}</td>
                <td className="px-5 py-3 text-right font-semibold">
                  {r.capacity.length
                    ? fmtMaxUsers(r.capacity.reduce((m, c) => (c.max_users_slo > m.max_users_slo ? c : m)))
                    : "–"}
                </td>
                <td className="px-5 py-3 text-ink-2">{r.created_at.slice(0, 10)}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{r.run_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
