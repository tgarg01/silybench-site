"use client";

import { apiRowsFor, fmtMoney, setupLabel, workloadLabel, workloadOrder } from "@/lib/cost";
import { useLivePrices } from "@/lib/livePrices";
import type { CostData, Deployment, PricedOffer } from "@/lib/types";

import { Card, TH } from "./Card";
import { PriceBadge } from "./PriceBadge";

function best(deps: Deployment[], workload: string): { dep: Deployment; offer: PricedOffer } | null {
  let out: { dep: Deployment; offer: PricedOffer } | null = null;
  for (const dep of deps.filter((d) => d.workload === workload)) {
    for (const offer of dep.offers) {
      if (!out || offer.usd_per_1k_requests < out.offer.usd_per_1k_requests) out = { dep, offer };
    }
  }
  return out;
}

const perM = (perK: number | undefined) => (perK == null ? null : perK * 1000);

/** Self-hosted vs API per 1M requests, at today's prices (API live) and on the experiment day. */
export function ExperimentCost({ experiment, cost, atRun }: { experiment: string; cost: CostData; atRun: CostData | null }) {
  const deps = cost.deployments.filter((d) => d.experiment === experiment);
  const models = Array.from(new Set(deps.map((d) => d.model)));
  const prices = useLivePrices(cost, models);
  const workloads = Array.from(new Set(deps.map((d) => d.workload))).sort(workloadOrder);
  if (!deps.length) return null;

  return (
    <Card
      title="Cost: self-hosted vs API"
      subtitle="Per 1M requests of each shape. Self-hosted = the cheapest GPU offer kept busy at the measured capacity (any precision). Today's GPU prices refresh every 6 h; API prices are fetched live. The experiment-day columns are frozen."
      action={<PriceBadge live={prices.live} fetchedAt={prices.fetchedAt} />}
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="tabular w-full min-w-[820px] text-sm">
          <thead className="text-left">
            <tr className="border-b border-line">
              <th className={`${TH} pl-5`}>Request shape</th>
              <th className={TH}>Cheapest self-hosted today</th>
              <th className={`${TH} text-right`}>Today</th>
              <th className={`${TH} text-right`}>Experiment day</th>
              <th className={TH}>Cheapest API now</th>
              <th className={`${TH} text-right`}>Now</th>
              <th className={`${TH} text-right`}>Experiment day</th>
              <th className={`${TH} pr-5 text-right`}>Saving now</th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w) => {
              const today = best(deps, w);
              const then = atRun ? best(atRun.deployments, w) : null;
              if (!today) return null;
              const { input_len, output_len, model } = today.dep;
              const apiNow = apiRowsFor(prices.offers, model, w, input_len, output_len)[0];
              const apiThen = atRun ? apiRowsFor(atRun.api_offers, model, w, input_len, output_len)[0] : undefined;
              const saving = apiNow ? 1 - today.offer.usd_per_1k_requests / apiNow.usd_per_1k_requests : null;
              return (
                <tr key={w} className="border-b border-line last:border-0">
                  <td className="py-2.5 pl-5">
                    <div className="font-medium text-ink">{workloadLabel(w)}</div>
                    <div className="text-xs text-muted">{input_len.toLocaleString()} in → {output_len} out</div>
                  </td>
                  <td className="px-3 text-ink-2">
                    {setupLabel(today.dep.precision, today.dep.variant)} · {today.offer.provider}
                    {today.offer.product ? ` (${today.offer.product})` : ""}
                  </td>
                  <td className="px-3 text-right font-medium">{fmtMoney(perM(today.offer.usd_per_1k_requests))}</td>
                  <td className="px-3 text-right text-ink-2">{fmtMoney(perM(then?.offer.usd_per_1k_requests))}</td>
                  <td className="px-3 text-ink-2">
                    {apiNow ? `${apiNow.provider}${apiNow.quantization ? ` (${apiNow.quantization})` : ""}` : "–"}
                  </td>
                  <td className="px-3 text-right font-medium">{fmtMoney(perM(apiNow?.usd_per_1k_requests))}</td>
                  <td className="px-3 text-right text-ink-2">{fmtMoney(perM(apiThen?.usd_per_1k_requests))}</td>
                  <td className={`pr-5 text-right font-medium ${saving != null && saving > 0 ? "text-good" : "text-critical"}`}>
                    {saving == null ? "–" : `${Math.round(saving * 100)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
