// Build-time data access. ./data is fetched from silybench-data (derived/) by
// scripts/fetch-data.mjs before dev/build. Only server components import this.
import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { CostData, RunResult } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

export function loadRuns(): RunResult[] {
  const dir = path.join(DATA_DIR, "runs");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as RunResult)
    .sort(compareRuns);
}

export function loadRun(runId: string): RunResult | undefined {
  return loadRuns().find((r) => r.run_id === runId);
}

// Stable order (GPU, model, precision) so each run keeps its color across pages.
function compareRuns(a: RunResult, b: RunResult): number {
  const key = (r: RunResult) =>
    [r.hardware.gpu_type, r.hardware.gpu_count, r.model.hf_id, r.model.precision].join("|");
  return key(a).localeCompare(key(b), undefined, { numeric: true });
}

export function loadCost(): CostData {
  const file = path.join(DATA_DIR, "cost.json");
  if (!fs.existsSync(file)) {
    return {
      assumptions: { hours_per_month: 730, hosted: "", api: "" },
      gpu_offers: [],
      api_offers: [],
      deployments: [],
      api: [],
      comparisons: [],
    };
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as CostData;
}
