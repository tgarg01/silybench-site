import type { Metadata } from "next";

import { Card, PageHeader, TH } from "@/components/Card";
import { CopyBlock } from "@/components/CopyBlock";
import { DATA_RAW, REPOS } from "@/content/links";
import { loadCost } from "@/lib/data";

export const metadata: Metadata = { title: "Data · silybench" };

const FILES: [string, string][] = [
  ["silybench.sqlite", "All tables below in one SQLite database"],
  ["cost.json", "Hosted vs API cost model: deployments × offers, comparisons"],
  ["index.json", "One entry per published deployment"],
  ["csv/runs.csv", "Deployments: hardware, provider, price, model revision, engine, provenance"],
  ["csv/perf_points.csv", "Every workload × concurrency point: p95/p99 latencies, throughput, power"],
  ["csv/capacity.csv", "Max concurrent users within the SLO, and the KV-cache limit"],
  ["csv/accuracy.csv", "lm-evaluation-harness scores per task"],
  ["csv/hosted_costs.csv", "Each deployment priced with every provider renting that GPU"],
  ["csv/comparisons.csv", "Cheapest self-hosted vs cheapest API per model × request shape"],
  ["csv/gpu_prices.csv", "GPU rental list prices with source and date"],
  ["csv/api_prices.csv", "API list prices for the same models"],
  ["schema.json", "JSON Schema of a run result"],
];

export default function DataPage() {
  const cost = loadCost();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data"
        title="All the numbers, open"
        description="Everything on this site is generated from the public silybench-data repository: measured runs, dated price tables and the cost model. Download it, query it, or check our math."
      />

      <Card title="Downloads" subtitle={`Latest build of ${REPOS.data.replace("https://github.com/", "")} (main)`}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {FILES.map(([f, d]) => (
                <tr key={f} className="border-b border-line last:border-0">
                  <td className="py-2.5 pl-5 pr-4">
                    <a className="font-mono text-[13px] text-accent hover:underline" href={`${DATA_RAW}/${f}`}>
                      {f}
                    </a>
                  </td>
                  <td className="pr-5 text-ink-2">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-2">
          Column definitions and units: the{" "}
          <a className="text-accent hover:underline" href={`${REPOS.data}#data-dictionary`}>data dictionary</a>.
        </p>
      </Card>

      <Card title="Query it">
        <CopyBlock
          text={`curl -LO ${DATA_RAW}/silybench.sqlite
sqlite3 silybench.sqlite "select model, workload, hosted_provider, hosted_usd_per_1k_requests, api_provider, api_usd_per_1k_requests, savings_at_capacity from comparisons"`}
        />
      </Card>

      <Card title="GPU prices used" subtitle="USD per GPU-hour, list prices. Taxes, storage and egress excluded.">
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[640px] text-sm">
            <thead className="text-left">
              <tr className="border-b border-line">
                <th className={`${TH} pl-5`}>GPU</th>
                <th className={TH}>Provider</th>
                <th className={TH}>Product</th>
                <th className={`${TH} text-right`}>$/GPU-h</th>
                <th className={`${TH} pr-5`}>Checked</th>
              </tr>
            </thead>
            <tbody>
              {cost.gpu_offers.map((o, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-2 pl-5 font-medium text-ink">{o.gpu_type}</td>
                  <td className="px-3 text-ink-2">{o.provider}{o.provisioning !== "on-demand" ? ` (${o.provisioning})` : ""}</td>
                  <td className="px-3 text-ink-2">{o.product}{o.min_gpus > 1 ? ` · min ${o.min_gpus} GPUs` : ""}</td>
                  <td className="px-3 text-right font-medium">${o.usd_per_gpu_hour.toFixed(2)}</td>
                  <td className="pr-5 text-ink-2">
                    <a className="hover:underline" href={o.source}>{o.checked_at}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="API prices used" subtitle="USD per 1M tokens for the same open models.">
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[560px] text-sm">
            <thead className="text-left">
              <tr className="border-b border-line">
                <th className={`${TH} pl-5`}>Model</th>
                <th className={TH}>Provider</th>
                <th className={`${TH} text-right`}>Input</th>
                <th className={`${TH} text-right`}>Output</th>
                <th className={TH}>Weights</th>
                <th className={`${TH} pr-5`}>Fetched</th>
              </tr>
            </thead>
            <tbody>
              {cost.api_offers.map((o, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="py-2 pl-5 font-medium text-ink">{o.model.split("/").pop()}</td>
                  <td className="px-3 text-ink-2">{o.provider}</td>
                  <td className="px-3 text-right">${o.usd_per_1m_input}</td>
                  <td className="px-3 text-right">${o.usd_per_1m_output}</td>
                  <td className="px-3 text-ink-2">{o.quantization ?? "not stated"}</td>
                  <td className="pr-5 text-ink-2">
                    <a className="hover:underline" href={o.source}>{o.fetched_at}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
