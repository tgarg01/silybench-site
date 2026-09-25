// Client-safe cost arithmetic over derived/cost.json. The heavy lifting (throughput at SLO
// capacity, $ per request per offer) is done by gpubench/cost.py in silybench-data; here we only
// size a deployment for a traffic level and compare it with per-token API pricing.
import type { ApiOffer, CostData, Deployment, PricedOffer } from "./types";

export const HOURS_PER_MONTH = 730;
export const DAYS_PER_MONTH = HOURS_PER_MONTH / 24;

export const WORKLOAD_LABELS: Record<string, string> = {
  "chat-128-128": "Short chat",
  "prefill-1024-128": "RAG / long prompt, short answer",
  "decode-128-1024": "Short prompt, long answer",
  "balanced-2048-2048": "Long prompt, long answer",
  "longctx-8192-512": "Long context (8k)",
};

/** Request shapes in a stable, readable order (short chat first), unknown ones last. */
export function workloadOrder(a: string, b: string): number {
  const keys = Object.keys(WORKLOAD_LABELS);
  const ia = keys.indexOf(a) === -1 ? 99 : keys.indexOf(a);
  const ib = keys.indexOf(b) === -1 ? 99 : keys.indexOf(b);
  return ia - ib || a.localeCompare(b);
}

export function workloadLabel(w: string): string {
  return WORKLOAD_LABELS[w] ?? w;
}

export function shortModel(hfId: string): string {
  return hfId.split("/").pop() ?? hfId;
}

export function apiUsdPerRequest(o: Pick<ApiOffer, "usd_per_1m_input" | "usd_per_1m_output">, inTok: number, outTok: number) {
  return (inTok * o.usd_per_1m_input + outTok * o.usd_per_1m_output) / 1e6;
}

/** The benchmarked workload closest to a request shape (log distance on input and output). */
export function nearestWorkload(deps: Deployment[], inTok: number, outTok: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const d of deps) {
    const dist = Math.hypot(Math.log(d.input_len / inTok), Math.log(d.output_len / outTok));
    if (dist < bestD) {
      bestD = dist;
      best = d.workload;
    }
  }
  return best;
}

export interface HostedOption {
  kind: "hosted";
  dep: Deployment;
  offer: PricedOffer;
  machines: number;
  requestsPerSCapacity: number;
  monthlyUsd: number;
  utilization: number; // average load / capacity bought
}

export interface ApiOption {
  kind: "api";
  offer: ApiOffer;
  monthlyUsd: number;
}

export type Option = HostedOption | ApiOption;

export interface Traffic {
  requestsPerDay: number;
  inputTokens: number;
  outputTokens: number;
  peakToAverage: number; // peak request rate / average request rate
}

/**
 * Size self-hosting for the traffic: enough machines that peak load stays within the measured
 * SLO capacity. Capacity is the deployment's output-token throughput at its SLO limit, divided
 * by the requested output length (decode-bound serving scales with output tokens).
 */
export function hostedOption(dep: Deployment, offer: PricedOffer, t: Traffic): HostedOption {
  const rps = dep.output_tokens_per_s / t.outputTokens;
  const peakRps = (t.requestsPerDay / 86400) * t.peakToAverage;
  const machines = Math.max(1, Math.ceil(peakRps / rps));
  return {
    kind: "hosted",
    dep,
    offer,
    machines,
    requestsPerSCapacity: rps,
    monthlyUsd: machines * offer.usd_per_hour * HOURS_PER_MONTH,
    utilization: t.requestsPerDay / 86400 / (machines * rps),
  };
}

export function apiOption(offer: ApiOffer, t: Traffic): ApiOption {
  return { kind: "api", offer, monthlyUsd: t.requestsPerDay * DAYS_PER_MONTH * apiUsdPerRequest(offer, t.inputTokens, t.outputTokens) };
}

export function allOptions(
  cost: CostData,
  model: string,
  t: Traffic,
  filters: { precisions: string[]; includeSpot: boolean },
): { workload: string | null; options: Option[] } {
  const deps = cost.deployments.filter((d) => d.model === model && filters.precisions.includes(d.precision));
  const workload = nearestWorkload(deps, t.inputTokens, t.outputTokens);
  const hosted: Option[] = deps
    .filter((d) => d.workload === workload)
    .flatMap((d) =>
      d.offers
        .filter((o) => filters.includeSpot || o.provisioning !== "spot")
        .map((o) => hostedOption(d, o, t)),
    );
  const api: Option[] = cost.api_offers.filter((o) => o.model === model).map((o) => apiOption(o, t));
  // At equal cost prefer full precision: same price, no quantization accuracy loss.
  const quality = (o: Option) => (o.kind === "hosted" && o.dep.precision === "fp8" ? 1 : 0);
  return {
    workload,
    options: [...hosted, ...api].sort((a, b) => a.monthlyUsd - b.monthlyUsd || quality(a) - quality(b)),
  };
}

export function optionLabel(o: Option): string {
  if (o.kind === "api") return `${o.offer.provider} API`;
  const { dep, offer, machines } = o;
  const n = machines * dep.gpu_count;
  return `${n}× ${dep.gpu_type} · ${offer.provider}${offer.product ? ` (${offer.product})` : ""} · ${dep.precision.toUpperCase()}`;
}

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  if (Math.abs(v) >= 100) return usd0.format(v);
  if (Math.abs(v) >= 0.01) return usd2.format(v);
  return `$${v.toPrecision(2)}`;
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
