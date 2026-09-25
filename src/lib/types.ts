// Mirrors gpubench/schema.py (RunResult) in silybench-bench. The JSON Schema is published
// as derived/schema.json in silybench-data; keep these in sync with it.

export interface Percentiles {
  p95: number;
  p99: number;
}

export interface ITL extends Percentiles {
  median: number;
}

export interface SLO {
  ttft_p99_ms: number;
  itl_median_ms: number;
}

export interface PerfPoint {
  workload: string;
  input_len: number | null;
  output_len: number | null;
  concurrency: number;
  num_prompts: number;
  repeats: number;
  completed: number;
  failed: number;
  duration_s: number;
  ttft_ms: Percentiles;
  tpot_ms: Percentiles;
  itl_ms: ITL;
  e2el_ms: Percentiles;
  request_throughput: number;
  output_throughput: number;
  total_token_throughput: number;
  output_throughput_per_gpu: number;
  tokens_per_s_per_user: number;
  avg_power_w: number | null;
  peak_memory_gb: number | null;
  output_tokens_per_joule: number | null;
  usd_per_1m_output_tokens: number | null;
  slo_pass: boolean;
}

export interface CapacityResult {
  workload: string;
  slo: SLO;
  max_users_slo: number;
  max_users_kv_cache: number | null;
  output_throughput_at_max_users: number | null;
  probed: Record<string, boolean>;
}

export interface AccuracyResult {
  task: string;
  metric: string;
  value: number;
  stderr: number | null;
  num_fewshot: number | null;
  limit: number | null;
  num_samples: number | null;
}

export interface RunResult {
  schema_version: number;
  run_id: string;
  campaign: string;
  created_at: string;
  git_commit: string | null;
  config_hash: string;
  sample: boolean;
  complete?: boolean;
  hardware: {
    gpu_type: string;
    gpu_count: number;
    node_count: number;
    provider: string;
    machine_type: string | null;
    zone: string | null;
    provisioning: string;
    price_per_hour_usd: number | null;
  };
  parallelism: { tp: number; pp: number; dp: number; ep: number };
  software: {
    engine: string;
    engine_version: string | null;
    engine_image: string;
    engine_image_digest: string | null;
    lm_eval_version: string | null;
    gpubench_version: string;
    nvidia_driver: string | null;
    cuda_version: string | null;
    runtime?: "docker" | "native" | null;
  };
  model: {
    hf_id: string;
    revision: string;
    precision: string;
    max_model_len: number;
    thinking: boolean;
  };
  serving_args: string[];
  kv_cache_tokens: number | null;
  merged_from: string[];
  perf: PerfPoint[];
  capacity: CapacityResult[];
  accuracy: AccuracyResult[];
}

// derived/cost.json (gpubench/cost.py)
export interface GpuOffer {
  provider: string;
  gpu_type: string;
  provisioning: string;
  usd_per_gpu_hour: number;
  min_gpus: number;
  product: string | null;
  source: string;
  checked_at: string;
  notes: string | null;
}

export interface ApiOffer {
  model: string;
  provider: string;
  usd_per_1m_input: number;
  usd_per_1m_output: number;
  quantization: string | null;
  context_length: number | null;
  source: string;
  fetched_at: string;
  notes: string | null;
}

export interface PricedOffer {
  provider: string;
  provisioning: string;
  product: string | null;
  source: string;
  checked_at: string;
  measured?: boolean;
  usd_per_hour: number;
  usd_per_month: number;
  usd_per_1m_output_tokens: number;
  usd_per_1m_total_tokens: number | null;
  usd_per_1k_requests: number;
}

export interface Deployment {
  run_id: string;
  model: string;
  precision: string;
  gpu_type: string;
  gpu_count: number;
  engine_version: string | null;
  workload: string;
  input_len: number;
  output_len: number;
  slo: SLO;
  max_users_slo: number;
  max_users_kv_cache: number | null;
  capacity_is_lower_bound: boolean;
  requests_per_s: number;
  output_tokens_per_s: number;
  total_tokens_per_s: number;
  ttft_p99_ms: number;
  itl_median_ms: number;
  accuracy: Record<string, number>;
  offers: PricedOffer[];
}

export interface ApiRow {
  model: string;
  workload: string;
  provider: string;
  quantization: string | null;
  usd_per_1m_input: number;
  usd_per_1m_output: number;
  usd_per_1k_requests: number;
}

export interface Comparison {
  model: string;
  workload: string;
  input_len: number;
  output_len: number;
  hosted: {
    run_id: string;
    precision: string;
    gpu_type: string;
    gpu_count: number;
    provider: string;
    provisioning: string;
    usd_per_hour: number;
    usd_per_1k_requests: number;
    usd_per_1m_output_tokens: number;
    max_users_slo: number;
    requests_per_day_at_capacity: number;
  };
  api_cheapest: ApiRow | null;
  api_median_usd_per_1k_requests: number | null;
  breakeven_requests_per_day?: number;
  breakeven_utilization?: number;
  savings_at_capacity?: number;
}

export interface CostData {
  assumptions: { hours_per_month: number; hosted: string; api: string };
  gpu_offers: GpuOffer[];
  api_offers: ApiOffer[];
  deployments: Deployment[];
  api: ApiRow[];
  comparisons: Comparison[];
}
