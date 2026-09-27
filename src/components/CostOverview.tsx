"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { apiSide, fmtCompact, fmtMoney, setupLabel, shortModel, workloadLabel, workloadOrder } from "@/lib/cost";
import { useLivePrices } from "@/lib/livePrices";
import type { CostData } from "@/lib/types";

import { Card, TH } from "./Card";
import { PriceBadge } from "./PriceBadge";
import { CostChart, type HostedLine } from "./CostChart";

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "good" }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="text-sm text-ink-2">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "good" ? "text-good" : ""}`}>{value}</div>
      {note && <div className="mt-auto pt-3 text-xs text-muted">{note}</div>}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${
            o.value === value ? "bg-surface font-medium text-ink shadow-card" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CostOverview({ cost }: { cost: CostData }) {
  const models = useMemo(() => Array.from(new Set(cost.comparisons.map((c) => c.model))), [cost]);
  const [model, setModel] = useState(models[0] ?? "");
  const comps = cost.comparisons.filter((c) => c.model === model).sort((a, b) => workloadOrder(a.workload, b.workload));
  const workloads = comps.map((c) => c.workload);
  const [workload, setWorkload] = useState(
    workloads.includes("chat-128-128") ? "chat-128-128" : (workloads[0] ?? ""),
  );
  const comp = comps.find((c) => c.workload === workload) ?? comps[0];
  const prices = useLivePrices(cost, models);
  const expId = comp ? cost.deployments.find((d) => d.run_id === comp.hosted.run_id)?.experiment : null;

  // Per precision: the cheapest offer for that deployment (the React Compiler memoizes this).
  const hosted: HostedLine[] = !comp
    ? []
    : cost.deployments
      .filter((d) => d.model === comp.model && d.workload === comp.workload && d.experiment === expId)
      .sort((a, b) => a.precision.localeCompare(b.precision))
      .flatMap((d) => {
        const offer = [...d.offers].sort((a, b) => a.usd_per_hour - b.usd_per_hour)[0];
        return offer
          ? [{ label: `${d.gpu_count}× ${d.gpu_type} ${setupLabel(d.precision, d.variant)} · ${offer.provider} $${offer.usd_per_hour.toFixed(2)}/h`, dep: d, offer }]
          : [];
      });
  const side = comp ? apiSide(comp, prices.offers) : null;
  const apis = side?.rows ?? [];

  if (!comp) {
    return <Card title="No cost data yet">Publish a run to silybench-data to see comparisons.</Card>;
  }
  const h = comp.hosted;
  const lowerBound = cost.deployments.some(
    (d) => d.run_id === h.run_id && d.workload === comp.workload && d.capacity_is_lower_bound,
  );
  const perM = (perK: number) => perK * 1000; // $/1k requests -> $/1M requests

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <PriceBadge live={prices.live} fetchedAt={prices.fetchedAt} />
        {models.length > 1 && (
          <Segmented label="Model" value={model} onChange={setModel} options={models.map((m) => ({ value: m, label: shortModel(m) }))} />
        )}
        <Segmented
          label="Request shape"
          value={comp.workload}
          onChange={setWorkload}
          options={comps.map((c) => ({ value: c.workload, label: workloadLabel(c.workload) }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Self-hosted, per 1M requests"
          value={fmtMoney(perM(h.usd_per_1k_requests))}
          note={`${h.gpu_count}× ${h.gpu_type} ${setupLabel(h.precision, h.variant)} on ${h.provider} at $${h.usd_per_hour.toFixed(2)}/h, kept busy at its latency limit (${lowerBound ? "≥ " : ""}${h.max_users_slo} users${lowerBound ? ", the most tested, so a conservative figure" : ""})`}
        />
        <Tile
          label="Cheapest API, per 1M requests"
          value={side?.cheapest ? fmtMoney(perM(side.cheapest.usd_per_1k_requests)) : "–"}
          note={side?.cheapest ? `${side.cheapest.provider}${side.cheapest.quantization ? ` (${side.cheapest.quantization})` : ""}, $${+side.cheapest.usd_per_1m_input.toFixed(4)}/1M in, $${+side.cheapest.usd_per_1m_output.toFixed(4)}/1M out` : "no API lists this model"}
        />
        <Tile
          label="Saving at full load"
          value={side?.savings != null ? `${Math.round(side.savings * 100)}%` : "–"}
          tone={side?.savings != null && side.savings > 0 ? "good" : undefined}
          note="Self-hosted vs cheapest API, when the GPU runs at its measured capacity"
        />
        <Tile
          label="Break-even volume"
          value={side?.breakevenRequestsPerDay != null ? `${fmtCompact(side.breakevenRequestsPerDay)}/day` : "–"}
          note={
            side?.breakevenUtilization != null
              ? `Above this, one always-on GPU beats the API. That's ${Math.round(side.breakevenUtilization * 100)}% of its capacity.`
              : undefined
          }
        />
      </div>

      <Card
        title="Monthly cost as traffic grows"
        subtitle={`${shortModel(comp.model)} · ${workloadLabel(comp.workload)} (${comp.input_len} in → ${comp.output_len} out tokens). Dashed: pay-per-token APIs. Solid: rented GPUs, adding one each time capacity runs out. Steady load assumed; the calculator handles peaks.`}
      >
        <CostChart hosted={hosted} apis={apis} inputTokens={comp.input_len} outputTokens={comp.output_len} />
      </Card>

      <Card title="Every request shape" subtitle={`${shortModel(comp.model)}: cheapest self-hosted setup vs cheapest API, per 1M requests`}>
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[720px] text-sm">
            <thead className="text-left">
              <tr className="border-b border-line">
                <th className={`${TH} pl-5`}>Request shape</th>
                <th className={TH}>Best self-hosted</th>
                <th className={`${TH} text-right`}>Self-hosted</th>
                <th className={`${TH} text-right`}>Cheapest API</th>
                <th className={`${TH} text-right`}>Saving</th>
                <th className={`${TH} pr-5 text-right`}>Break-even</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c) => {
                const cs = apiSide(c, prices.offers);
                return (
                <tr key={c.workload} className="border-b border-line last:border-0">
                  <td className="py-2.5 pl-5">
                    <div className="font-medium text-ink">{workloadLabel(c.workload)}</div>
                    <div className="text-xs text-muted">{c.input_len} in → {c.output_len} out</div>
                  </td>
                  <td className="px-3 text-ink-2">
                    {c.hosted.gpu_type} {setupLabel(c.hosted.precision, c.hosted.variant)} · {c.hosted.provider}
                  </td>
                  <td className="px-3 text-right">{fmtMoney(perM(c.hosted.usd_per_1k_requests))}</td>
                  <td className="px-3 text-right">
                    {cs.cheapest ? fmtMoney(perM(cs.cheapest.usd_per_1k_requests)) : "–"}
                  </td>
                  <td className="px-3 text-right font-medium text-good">
                    {cs.savings != null ? `${Math.round(cs.savings * 100)}%` : "–"}
                  </td>
                  <td className="pr-5 text-right text-ink-2">
                    {cs.breakevenRequestsPerDay != null ? `${fmtCompact(cs.breakevenRequestsPerDay)}/day` : "–"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/calculator/" className="group rounded-2xl border border-line bg-surface p-5 shadow-card hover:border-accent">
          <div className="text-sm font-medium text-accent">Calculator →</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">Price your own traffic</div>
          <p className="mt-1 text-sm text-ink-2">
            Enter requests per day, prompt and answer length and peak load. You get the cheapest GPU,
            provider and precision against every API, sized from measured capacity.
          </p>
        </Link>
        <Link href="/services/" className="group rounded-2xl border border-line bg-accent-soft p-5 hover:border-accent">
          <div className="text-sm font-medium text-accent">Managed hosting →</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">Want the savings without running GPUs?</div>
          <p className="mt-1 text-sm text-ink-2">
            We deploy, monitor and keep your open model up to date on the cheapest rented GPUs that
            meet your latency target.
          </p>
        </Link>
      </div>
    </div>
  );
}
