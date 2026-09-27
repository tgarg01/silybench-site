"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  allOptions,
  fmtCompact,
  fmtMoney,
  type Option,
  optionLabel,
  setupLabel,
  shortModel,
  type Traffic,
  workloadLabel,
} from "@/lib/cost";
import { useLivePrices } from "@/lib/livePrices";
import type { CostData } from "@/lib/types";

import { PriceBadge } from "./PriceBadge";

import { Card, TH } from "./Card";
import { CostChart } from "./CostChart";

const PRESETS: { label: string; t: Traffic }[] = [
  { label: "Support chatbot", t: { requestsPerDay: 50_000, inputTokens: 600, outputTokens: 250, peakToAverage: 3 } },
  { label: "RAG search", t: { requestsPerDay: 200_000, inputTokens: 2_000, outputTokens: 200, peakToAverage: 2.5 } },
  { label: "Batch summaries", t: { requestsPerDay: 1_000_000, inputTokens: 1_500, outputTokens: 150, peakToAverage: 1 } },
  { label: "Writing assistant", t: { requestsPerDay: 20_000, inputTokens: 300, outputTokens: 1_000, peakToAverage: 3 } },
];

function NumberField({ label, value, onChange, min, step, suffix, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <div className="mt-1 flex items-center rounded-lg border border-line bg-surface focus-within:border-accent">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step ?? 1}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
          className="tabular w-full min-w-0 rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
        />
        {suffix && <span className="pr-3 text-xs text-muted">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

function detail(o: Option): string {
  if (o.kind === "api") {
    return `$${o.offer.usd_per_1m_input}/1M in · $${o.offer.usd_per_1m_output}/1M out${o.offer.quantization ? ` · ${o.offer.quantization}` : ""}`;
  }
  return `${fmtCompact(o.requestsPerSCapacity * 86400)} req/day per machine within the SLO · ${Math.round(o.utilization * 100)}% average use`;
}

export function Calculator({ cost }: { cost: CostData }) {
  const models = useMemo(() => Array.from(new Set(cost.deployments.map((d) => d.model))), [cost]);
  const precisions = useMemo(() => Array.from(new Set(cost.deployments.map((d) => d.precision))).sort(), [cost]);
  const [model, setModel] = useState(models[0] ?? "");
  const [t, setT] = useState<Traffic>(PRESETS[0].t);
  const [allowed, setAllowed] = useState<string[]>(precisions);
  const [includeSpot, setIncludeSpot] = useState(false);
  const set = (k: keyof Traffic) => (v: number) => setT((prev) => ({ ...prev, [k]: v }));

  const prices = useLivePrices(cost, models);
  const { workload, options } = useMemo(
    () => allOptions({ ...cost, api_offers: prices.offers }, model, t, { precisions: allowed, includeSpot }),
    [cost, prices.offers, model, t, allowed, includeSpot],
  );
  const bestHosted = options.find((o) => o.kind === "hosted");
  const bestApi = options.find((o) => o.kind === "api");
  const dep = bestHosted?.kind === "hosted" ? bestHosted.dep : undefined;
  const slo = dep?.slo ?? cost.deployments[0]?.slo;
  const saving = bestHosted && bestApi ? 1 - bestHosted.monthlyUsd / bestApi.monthlyUsd : null;
  const verdict =
    !bestHosted || !bestApi
      ? null
      : bestHosted.monthlyUsd < bestApi.monthlyUsd
        ? { tone: "good" as const, text: `Self-hosting saves ${fmtMoney(bestApi.monthlyUsd - bestHosted.monthlyUsd)}/month (${Math.round((saving ?? 0) * 100)}%)` }
        : { tone: "api" as const, text: `The API is cheaper by ${fmtMoney(bestHosted.monthlyUsd - bestApi.monthlyUsd)}/month at this volume` };

  const hostedLines = useMemo(() => {
    const seen = new Set<string>();
    return options
      .filter((o): o is Extract<Option, { kind: "hosted" }> => o.kind === "hosted")
      .filter((o) => {
        const k = `${o.dep.precision}-${o.dep.variant ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((o) => ({ label: `${o.dep.gpu_type} ${setupLabel(o.dep.precision, o.dep.variant)} · ${o.offer.provider}`, dep: o.dep, offer: o.offer }));
  }, [options]);
  const apiLines = useMemo(
    () =>
      options
        .filter((o): o is Extract<Option, { kind: "api" }> => o.kind === "api")
        .map((o) => ({ ...o.offer, workload: workload ?? "", usd_per_1k_requests: 0 })),
    [options, workload],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card title="Your traffic" className="h-fit lg:sticky lg:top-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setT(p.t)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-accent hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
          {models.length > 1 && (
            <div>
              <label htmlFor="model" className="text-sm font-medium text-ink">Model</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{shortModel(m)}</option>
                ))}
              </select>
            </div>
          )}
          <NumberField label="Requests per day" value={t.requestsPerDay} onChange={set("requestsPerDay")} min={1} step={1000} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Prompt" value={t.inputTokens} onChange={set("inputTokens")} min={1} suffix="tokens" />
            <NumberField label="Answer" value={t.outputTokens} onChange={set("outputTokens")} min={1} suffix="tokens" />
          </div>
          <NumberField
            label="Peak ÷ average load"
            value={t.peakToAverage}
            onChange={set("peakToAverage")}
            min={1}
            step={0.5}
            suffix="×"
            hint="GPUs are sized for the busiest hour. 1 = perfectly flat traffic; 2-4 is typical for daytime apps."
          />
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-ink">Self-hosting options</legend>
            {precisions.map((p) => (
              <Check
                key={p}
                label={p === "fp8" ? "FP8 (quantized, faster)" : `${p.toUpperCase()} (full precision)`}
                checked={allowed.includes(p)}
                onChange={(on) => setAllowed((prev) => (on ? [...prev, p] : prev.filter((x) => x !== p)))}
              />
            ))}
            <Check label="Spot / preemptible GPUs" checked={includeSpot} onChange={setIncludeSpot} />
          </fieldset>
          {slo && (
            <p className="text-xs text-muted">
              Latency target (every self-hosted option meets it): first token within {slo.ttft_p99_ms / 1000} s for
              99% of requests, and at least {Math.round(1000 / slo.itl_median_ms)} tokens/s per user.
            </p>
          )}
        </div>
      </Card>

      <div className="min-w-0 space-y-6">
        <PriceBadge live={prices.live} fetchedAt={prices.fetchedAt} />
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="text-sm text-ink-2">Cheapest self-hosted</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{bestHosted ? fmtMoney(bestHosted.monthlyUsd) : "–"}<span className="text-sm font-normal text-muted">/mo</span></div>
            <div className="mt-2 text-xs text-muted">{bestHosted ? optionLabel(bestHosted) : "no matching benchmark"}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="text-sm text-ink-2">Cheapest API</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{bestApi ? fmtMoney(bestApi.monthlyUsd) : "–"}<span className="text-sm font-normal text-muted">/mo</span></div>
            <div className="mt-2 text-xs text-muted">{bestApi ? optionLabel(bestApi) : "no API lists this model"}</div>
          </div>
          <div className={`rounded-2xl border p-5 sm:col-span-2 2xl:col-span-1 ${verdict?.tone === "good" ? "border-transparent bg-accent-soft" : "border-line bg-surface shadow-card"}`}>
            <div className="text-sm text-ink-2">Verdict</div>
            <div className={`mt-2 text-lg font-semibold leading-snug tracking-tight ${verdict?.tone === "good" ? "text-good" : ""}`}>
              {verdict?.text ?? "–"}
            </div>
          </div>
        </div>

        {workload && (
          <p className="text-sm text-ink-2">
            Sized with the measured <strong className="text-ink">{workloadLabel(workload)}</strong> benchmark
            {dep ? ` (${dep.input_len} in → ${dep.output_len} out)` : ""}, the closest shape to your
            requests, scaled by your answer length.
          </p>
        )}

        <Card title="Every option, cheapest first" subtitle="Monthly cost for your traffic (730 h). Self-hosted = enough always-on machines for the peak.">
          <div className="-mx-5 overflow-x-auto">
            <table className="tabular w-full min-w-[640px] text-sm">
              <thead className="text-left">
                <tr className="border-b border-line">
                  <th className={`${TH} pl-5`}>Option</th>
                  <th className={`${TH} text-right`}>Per month</th>
                  <th className={`${TH} pr-5 text-right`}>vs cheapest</th>
                </tr>
              </thead>
              <tbody>
                {options.slice(0, 14).map((o, i) => (
                  <tr key={i} className={`border-b border-line last:border-0 ${i === 0 ? "bg-accent-soft" : ""}`}>
                    <td className="py-2.5 pl-5">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${o.kind === "api" ? "bg-surface-2 text-ink-2" : "bg-accent-soft text-accent"}`}>
                          {o.kind === "api" ? "API" : "GPU"}
                        </span>
                        <span className="font-medium text-ink">{optionLabel(o)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">{detail(o)}</div>
                    </td>
                    <td className="px-3 text-right font-medium">{fmtMoney(o.monthlyUsd)}</td>
                    <td className="pr-5 text-right text-ink-2">
                      {i === 0 ? "cheapest" : `+${Math.round((o.monthlyUsd / options[0].monthlyUsd - 1) * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {hostedLines.length > 0 && (
          <Card title="How the answer changes with volume" subtitle="Same request shape and peak factor; dashed lines are APIs.">
            <CostChart
              hosted={hostedLines}
              apis={apiLines}
              inputTokens={t.inputTokens}
              outputTokens={t.outputTokens}
              peakToAverage={t.peakToAverage}
              height={320}
            />
          </Card>
        )}

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="text-lg font-semibold tracking-tight">Self-hosting wins, but you don&apos;t want to run GPUs?</div>
          <p className="mt-1 text-sm text-ink-2">
            Rented GPUs need deployment, autoscaling for peaks, monitoring, upgrades and failover.
            We do that for a fixed monthly fee, on the provider this page picks.
          </p>
          <Link href="/services/" className="mt-3 inline-flex rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:opacity-90">
            See managed hosting
          </Link>
        </div>
      </div>
    </div>
  );
}
