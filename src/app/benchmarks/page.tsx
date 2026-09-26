import type { Metadata } from "next";

import { Chip, PageHeader } from "@/components/Card";
import { Dashboard } from "@/components/Dashboard";
import { SampleBanner } from "@/components/SampleBanner";
import Link from "next/link";

import { loadRuns, publishedRuns } from "@/lib/data";

export const metadata: Metadata = { title: "Benchmarks · silybench" };

export default function Benchmarks() {
  // Headline: published experiments. Until the first one lands, show the pipeline runs, labelled.
  const published = publishedRuns();
  const pipeline = published.length === 0;
  const runs = pipeline ? loadRuns() : published;
  const gpus = Array.from(new Set(runs.map((r) => r.hardware.gpu_type)));
  const engines = Array.from(new Set(runs.map((r) => r.software.engine_version).filter(Boolean)));
  const models = Array.from(new Set(runs.map((r) => r.model.hf_id)));
  const updated = runs.map((r) => r.created_at).sort().at(-1)?.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Benchmarks"
        title="LLM inference benchmarks"
        description={`Latency, throughput, concurrent-user capacity and accuracy of open Hugging Face models, served with vLLM${
          engines.length ? ` v${engines.join(", v")}` : ""
        } on ${gpus.join(", ") || "rented GPUs"}.`}
      >
        {runs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Chip>
              <strong className="font-semibold text-ink">{runs.length}</strong> runs
            </Chip>
            <Chip>
              <strong className="font-semibold text-ink">{models.length}</strong>{" "}
              {models.length === 1 ? "model" : "models"}
            </Chip>
            {updated && <Chip>Updated {updated}</Chip>}
          </div>
        )}
      </PageHeader>
      {runs.some((r) => r.sample) && <SampleBanner />}
      {pipeline && runs.length > 0 && (
        <div role="note" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning-ink">
          <strong>Pipeline validation data.</strong> These Qwen3-8B runs were used to build the benchmark
          pipeline and are not a published experiment. The first published experiment (Qwen3.8-27B on
          H100) is <Link className="underline" href="/experiments/">coming soon</Link>.
        </div>
      )}
      <Dashboard runs={runs} />
    </div>
  );
}
