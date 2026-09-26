import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/Card";
import { loadExperiments } from "@/lib/data";

export const metadata: Metadata = { title: "Experiments · silybench" };

const STATUS: Record<string, string> = {
  published: "bg-accent-soft text-accent",
  planned: "bg-warning-bg text-warning-ink",
  pipeline: "bg-surface-2 text-ink-2",
};

export default function Experiments() {
  const exps = loadExperiments().sort((a, b) =>
    a.status === b.status ? b.id.localeCompare(a.id) : a.status === "pipeline" ? 1 : b.status === "pipeline" ? -1 : 0,
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Experiments"
        title="Every experiment, exactly reproducible"
        description="An experiment is one model on one machine at one provider, run from a tagged commit with a recorded hardware fingerprint. All raw data is downloadable, and anyone can re-run it with one prompt to Claude."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {exps.map((e) => {
          const env = e.environments[0];
          return (
            <Link
              key={e.id}
              href={`/experiments/${e.id}/`}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[e.status]}`}>{e.status}</span>
                <span className="font-mono text-xs text-muted">{e.id}</span>
              </div>
              <div className="mt-3 text-lg font-semibold tracking-tight group-hover:text-accent">{e.title}</div>
              <p className="mt-1 line-clamp-3 text-sm text-ink-2">{e.description}</p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-muted">
                <span>{env.provider.toUpperCase()} {env.machine_type}</span>
                <span>{e.scenarios.length} scenarios</span>
                <span>{e.models.map((m) => m.precision.toUpperCase()).join(" + ")}</span>
                <span>{e.runs.length ? `${e.runs.length} runs` : "not measured yet"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
