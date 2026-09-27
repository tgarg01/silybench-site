import { setupLabel } from "./cost";
import type { CapacityResult, RunResult } from "./types";

export function runLabel(r: RunResult): string {
  const model = r.model.hf_id.split("/").pop();
  return `${model} · ${setupLabel(r.model.precision, r.model.variant)}`;
}

export function hardwareLabel(r: RunResult): string {
  const n = r.hardware.gpu_count * r.hardware.node_count;
  const p = r.parallelism;
  const par = [p.tp > 1 && `TP${p.tp}`, p.pp > 1 && `PP${p.pp}`, p.dp > 1 && `DP${p.dp}`, p.ep > 1 && `EP${p.ep}`]
    .filter(Boolean)
    .join(" ");
  return `${n}× ${r.hardware.gpu_type}${par ? ` (${par})` : ""}`;
}

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function fmtInt(v: number | null | undefined): string {
  return v == null ? "–" : intFmt.format(v);
}

export function fmtMs(v: number | null | undefined): string {
  if (v == null) return "–";
  if (v < 1000) return `${oneFmt.format(v)} ms`;
  // Two decimals below 10 s so values just under an SLO (1,953 ms) don't round up to "2 s".
  return `${(v / 1000).toFixed(v < 10000 ? 2 : 1)} s`;
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  return v == null ? "–" : v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtUsd(v: number | null | undefined): string {
  return v == null ? "–" : `$${v.toFixed(v < 1 ? 3 : 2)}`;
}

export function fmtPct(v: number | null | undefined): string {
  return v == null ? "–" : `${(v * 100).toFixed(1)}%`;
}

export const TASK_LABELS: Record<string, string> = {
  mmlu_pro: "MMLU-Pro",
  gpqa_diamond_cot_zeroshot: "GPQA Diamond",
  gsm8k: "GSM8K",
  minerva_math500: "MATH-500",
  ifeval: "IFEval",
  arc_challenge_chat: "ARC Challenge",
};

/** Max users, as "≥ N" when the highest level tested still met the SLO (true max not reached). */
export function fmtMaxUsers(c: CapacityResult | undefined): string {
  if (!c) return "–";
  const probed = Object.entries(c.probed).map(([k, ok]) => [Number(k), ok] as const);
  const top = Math.max(...probed.map(([k]) => k));
  const saturated = c.max_users_slo === top && probed.every(([, ok]) => ok);
  return `${saturated ? "≥ " : ""}${fmtInt(c.max_users_slo)}`;
}
