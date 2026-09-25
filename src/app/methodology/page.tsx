import type { Metadata } from "next";

import { PageHeader } from "@/components/Card";

export const metadata: Metadata = { title: "Methodology · silybench" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-lg font-semibold tracking-tight text-ink first:mt-0">{children}</h2>;
}

export default function Methodology() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Methodology"
        title="How silybench measures"
        description="Serving setup, load generation, capacity search and accuracy evaluation behind every number on the dashboard."
      />
      <article className="max-w-3xl rounded-2xl border border-line bg-surface p-6 leading-relaxed text-ink-2 shadow-card sm:p-8 [&_strong]:text-ink [&_li]:mt-1 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-[0.9em]">
      <p>
        Every result comes from a pinned vLLM release on a rented GPU (the Docker image where the host
        has Docker, otherwise the same version installed from pip), started fresh for each benchmark
        campaign. Configs, code, raw outputs and prices are public and versioned, so any number on
        this site can be reproduced.
      </p>

      <H>Serving</H>
      <ul className="list-disc pl-5">
        <li>One vLLM server per model × precision (BF16, FP8). Model revisions are pinned to a commit.</li>
        <li>Qwen3 runs with thinking mode <strong>off</strong> (server default chat-template kwarg).</li>
        <li>Parallelism (tensor / pipeline / data / expert) is recorded with every run.</li>
      </ul>

      <H>Performance</H>
      <ul className="list-disc pl-5">
        <li>
          Load generator: <code>vllm bench serve</code>, closed loop at a fixed number of concurrent
          users (1 → 512), random prompts with fixed input/output lengths, <code>--ignore-eos</code>{" "}
          so every request does the same work.
        </li>
        <li>Each point: warmup, then 3 repeats; we report the median of each metric across repeats.</li>
        <li>
          Latency is reported at the <strong>95th and 99th percentiles</strong> only: time to first
          token (TTFT), time per output token (TPOT), inter-token latency and end-to-end latency.
        </li>
        <li>
          <strong>Median inter-token time (IDT)</strong>: the typical gap between streamed tokens, and
          its inverse, tokens/s per user.
        </li>
        <li>GPU power and memory are sampled every 500 ms with nvidia-smi → tokens per joule.</li>
        <li>Cost per 1M output tokens on this page uses the hourly price the run was measured at; the cost pages reprice every run with current list prices (below).</li>
      </ul>

      <H>How many users can one deployment serve?</H>
      <p className="mt-2">
        <strong>Max concurrent users (SLO)</strong> is the highest concurrency at which both hold:
        p99 TTFT ≤ 2 s and median inter-token time ≤ 50 ms (≥ 20 tokens/s per user, faster than
        people read). After the coarse sweep we bisect between the last passing and first failing
        level to find the exact number.
      </p>
      <p className="mt-2">
        <strong>Memory limit</strong> is vLLM&apos;s KV-cache capacity divided by the tokens one request
        needs (input + output): how many requests fit on the GPU at once, whatever the latency.
      </p>

      <H>Accuracy</H>
      <p className="mt-2">
        lm-evaluation-harness (chat completions) against the same vLLM server: MMLU-Pro, GPQA Diamond
        (zero-shot CoT), GSM8K, MATH-500, IFEval and ARC-Challenge. Greedy decoding. Running
        accuracy per precision shows what FP8 costs in quality, not just what it gains in speed.
      </p>

      <H>Self-hosting vs API cost</H>
      <ul className="list-disc pl-5">
        <li>
          <strong>Throughput at capacity.</strong> For each request shape we take the measured
          requests/s and tokens/s at the SLO capacity above. That is the most a deployment can serve
          while every user still gets a fast first token and ≥ 20 tokens/s.
        </li>
        <li>
          <strong>Repricing.</strong> Performance depends on the GPU, not on who rents it, so each
          benchmark is priced with every provider renting that GPU type (list prices with source and
          date in <code>prices/gpu_hourly.yaml</code>). Cost per request = hourly price ÷ requests
          per hour at capacity.
        </li>
        <li>
          <strong>APIs.</strong> The same model&apos;s list prices per provider (OpenRouter&apos;s public
          endpoint data plus hand-checked pricing pages): input tokens × input price + output tokens ×
          output price.
        </li>
        <li>
          <strong>Break-even</strong> is the daily volume at which an always-on GPU (730 h/month)
          costs the same as the cheapest API. Below it, pay per token. Above it, self-host.
        </li>
        <li>
          <strong>Calculator sizing</strong> buys enough machines for your peak load (requests/day ×
          peak factor), using the closest measured request shape and scaling capacity by your answer
          length (decode-bound serving scales with output tokens).
        </li>
        <li>
          Not included: engineering and on-call time, storage, egress, and idle time beyond your
          peak factor. FP8 accuracy is measured and shown so its savings aren&apos;t free-lunch claims.
        </li>
      </ul>
      </article>
    </div>
  );
}
