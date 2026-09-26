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
  max_gpu_temp_c?: number | null;
  thermal_throttle_fraction?: number | null;
  slo_pass: boolean;
}

export interface CapacityResult {
  workload: string;
  slo: SLO;
  max_users_slo: number;
  max_users_kv_cache: number | null;
  output_throughput_at_max_users: number | null;
  probed: Record<string, boolean>;
  skipped_levels?: number[];
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
    checkpoint?: string | null;
    revision: string;
    precision: string;
    max_model_len: number;
    thinking: boolean;
  };
  serving_args: string[];
  kv_cache_tokens: number | null;
  merged_from: string[];
  experiment?: string | null;
  fingerprint?: Fingerprint | null;
  raw_assets?: RawAsset[];
  profiles?: Profile[];
  quality?: QualityResult[];
  perf: PerfPoint[];
  capacity: CapacityResult[];
  accuracy: AccuracyResult[];
}

export interface RawAsset {
  name: string;
  url: string;
  sha256: string;
  bytes: number;
  contents: string;
}

export interface QualityResult {
  workload: string;
  dataset_sha256: string;
  responses: string;
  recall_n: number;
  recall_accuracy: number | null;
  recall_exact: number | null;
  drift_n: number;
  drift_tool_call_rate: number | null;
}

export interface Profile {
  tool: "nsys" | "ncu";
  workload: string;
  concurrency: number;
  summary: Record<string, unknown>;
  asset: string | null;
}

export interface FingerprintGpu {
  name: string | null;
  architecture: string | null;
  pci_device_id: string | null;
  vbios: string | null;
  memory_total_mib: number | null;
  default_power_limit_w: number | null;
  max_sm_clock_mhz: number | null;
  max_mem_clock_mhz: number | null;
  ecc_mode: string | null;
  mig_mode: string | null;
  pcie_max_gen: string | null;
  pcie_max_width: string | null;
  temperature_c: number | null;
  active_clock_limits: string[];
}

export interface Fingerprint {
  collected_at: string;
  cloud: { provider: string; machine_type: string | null; zone: string | null; provisioning?: string | null; image?: string | null };
  host: { cpu_model: string | null; vcpus: number | null; ram_gib: number | null; os: string; kernel: string; in_container: boolean };
  gpu: { driver: string | null; cuda: string | null; count: number; gpus: FingerprintGpu[] };
  measured: {
    hbm_copy_gbs?: number;
    bf16_tflops?: number;
    fp8_tflops?: number | null;
    h2d_gbs?: number;
    d2h_gbs?: number;
    hf_download_mbps?: number | null;
    torch?: string;
  };
  conditions: { idle_temperature_c?: (number | null)[]; after_load_temperature_c?: (number | null)[]; after_load_clock_limits?: string[][] };
}

export interface ExperimentEnv {
  provider: string;
  machine_type: string | null;
  zone: string | null;
  provisioning: string | null;
  image: string | null;
  runtime: string | null;
  terraform_env: string | null;
}

export interface ExperimentDataset {
  name: string;
  kind?: string;
  scenario: string;
  description: string;
  source: string;
  license: string;
  builder: string;
  url: string;
  sha256: string;
}

export interface Experiment {
  id: string;
  title: string;
  status: "planned" | "published" | "pipeline";
  description: string;
  bench: { repo: string; tag: string; commit: string | null; config: string };
  environments: ExperimentEnv[];
  runs: string[];
  merged_runs: string[];
  release: string | null;
  published_at: string | null;
  fingerprint: Fingerprint | null;
  assets: RawAsset[];
  datasets: ExperimentDataset[];
  has_prices_at_run: boolean;
  models: { hf_id: string; precision: string; checkpoint: string; max_model_len: number }[];
  scenarios: {
    name: string;
    input_len: number;
    output_len: number;
    dataset: string;
    users: number[];
    repeats: number;
    slo: SLO;
    quality?: boolean;
  }[];
  phases?: string[];
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
  experiment: string | null;
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
  openrouter_slugs?: Record<string, string>;
}
