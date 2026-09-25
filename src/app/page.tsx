import { Chip, PageHeader } from "@/components/Card";
import { CostOverview } from "@/components/CostOverview";
import { loadCost, loadRuns } from "@/lib/data";

export default function Home() {
  const cost = loadCost();
  const runs = loadRuns();
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
      <CostOverview cost={cost} />
      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Self-hosting figures are rented-GPU list prices at the most concurrent users that still get
        a first token within 2 s (p99) and at least 20 tokens/s each. They exclude engineering and
        operations time, storage and egress. APIs are list prices for the same model; some serve
        quantized weights. All inputs and the method are open: see Data and Methodology.
      </p>
    </div>
  );
}
