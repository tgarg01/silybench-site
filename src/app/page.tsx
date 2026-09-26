import Link from "next/link";

import { Chip, PageHeader } from "@/components/Card";
import { CostOverview } from "@/components/CostOverview";
import { workloadLabel } from "@/lib/cost";
import { loadCost, loadExperiments, publishedRuns } from "@/lib/data";
import { fmtMs } from "@/lib/format";

export default function Home() {
  const cost = loadCost();
  const runs = publishedRuns();
  const upcoming = loadExperiments().find((e) => e.status === "planned");
  const providers = new Set(cost.gpu_offers.map((o) => o.provider));
  const apiProviders = new Set(cost.api_offers.map((o) => o.provider));
  const checked = [...cost.gpu_offers.map((o) => o.checked_at), ...cost.api_offers.map((o) => o.fetched_at)]
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-host vs API"
        title="What does it really cost to serve an open model?"
        description="Measured on rented GPUs with vLLM: how many users one GPU serves within a latency target, turned into dollars with every provider's list price and compared with pay-per-token APIs for the same model."
      >
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>
            <strong className="font-semibold text-ink">{runs.length}</strong> measured deployments
          </Chip>
          <Chip>
            <strong className="font-semibold text-ink">{providers.size}</strong> GPU clouds priced
          </Chip>
          <Chip>
            <strong className="font-semibold text-ink">{apiProviders.size}</strong> API providers
          </Chip>
          {checked && <Chip>Prices checked {checked}</Chip>}
        </div>
      </PageHeader>
      {cost.comparisons.length > 0 ? (
        <CostOverview cost={cost} />
      ) : (
        upcoming && (
          <Link
            href={`/experiments/${upcoming.id}/`}
            className="block rounded-2xl border border-line bg-surface p-6 shadow-card hover:border-accent"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-warning-ink">First experiment · running soon</div>
            <div className="mt-2 text-xl font-semibold tracking-tight">{upcoming.title}</div>
            <p className="mt-2 max-w-3xl text-sm text-ink-2">{upcoming.description}</p>
            <ul className="mt-4 grid gap-2 text-sm text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.scenarios.map((s) => (
                <li key={s.name} className="rounded-lg bg-surface-2 px-3 py-2">
                  <div className="font-medium text-ink">{workloadLabel(s.name)}</div>
                  <div className="text-xs">
                    {s.input_len.toLocaleString()} → {s.output_len.toLocaleString()} tokens · first token ≤{" "}
                    {fmtMs(s.slo.ttft_p99_ms)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm font-medium text-accent">What will be measured, exactly where, and how to reproduce it →</div>
          </Link>
        )
      )}
      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Self-hosting figures are rented-GPU list prices at the most concurrent users that still get
        a first token within 2 s (p99) and at least 20 tokens/s each. They exclude engineering and
        operations time, storage and egress. APIs are list prices for the same model; some serve
        quantized weights. All inputs and the method are open: see Data and Methodology.
      </p>
    </div>
  );
}
