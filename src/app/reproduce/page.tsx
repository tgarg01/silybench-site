import type { Metadata } from "next";

import { Card, PageHeader } from "@/components/Card";
import { CopyBlock } from "@/components/CopyBlock";
import { CLAUDE_PROMPT, REPOS } from "@/content/links";

export const metadata: Metadata = { title: "Reproduce · silybench" };

const MANUAL = `git clone ${REPOS.bench} && cd silybench-bench
./setup.sh configs/qwen3-8b-quick.yaml
uv run gpubench plan configs/qwen3-8b-quick.yaml --price-per-hour 2.69
uv run gpubench run  configs/qwen3-8b-quick.yaml --provider runpod --price-per-hour 2.69 --resume --detach
uv run gpubench status
gh auth login && uv run gpubench submit results/*/`;

export default function Reproduce() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reproduce"
        title="Run the benchmark on your own GPU"
        description="Every number here can be re-measured on any rented GPU (RunPod, Vast, Lambda, Hyperbolic, a cloud VM or your own box). An AI agent can do the whole thing from one prompt."
      />

      <Card title="1 · Rent a GPU and start Claude Code on it" subtitle="Any Linux box with an NVIDIA GPU, SSH, and ~100 GB of disk. Docker is optional: RunPod/Vast pods work as-is.">
        <p className="mb-3 text-sm text-ink-2">Paste this into Claude:</p>
        <CopyBlock text={CLAUDE_PROMPT} />
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>Claude runs setup and pre-flight checks (GPU, disk, limits, tokens) and picks Docker or a pip-installed vLLM.</li>
          <li>It asks for your provider and hourly price, then shows <strong className="text-ink">the estimated hours and dollars and waits for your OK</strong>.</li>
          <li>The run is detached and resumable, so a dropped SSH session or crash loses at most one measurement.</li>
          <li>When it finishes, it opens a pull request with the results on the public dataset and reminds you to shut the box down.</li>
        </ul>
      </Card>

      <Card title="2 · Or by hand" subtitle="The same steps without an agent.">
        <CopyBlock text={MANUAL} />
        <div className="mt-4 overflow-x-auto">
          <table className="tabular w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">Campaign</th>
                <th className="py-2 pr-4 font-medium">What</th>
                <th className="py-2 font-medium">~1× H100</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              <tr className="border-t border-line"><td className="py-2 pr-4 font-mono text-xs">smoke</td><td className="pr-4">Pipeline check, not published</td><td>15 min</td></tr>
              <tr className="border-t border-line"><td className="py-2 pr-4 font-mono text-xs">qwen3-8b-quick</td><td className="pr-4">BF16 + FP8, 3 request shapes, no accuracy</td><td>1.5 h</td></tr>
              <tr className="border-t border-line"><td className="py-2 pr-4 font-mono text-xs">qwen3-8b</td><td className="pr-4">Full: 5 shapes × 8 load levels × 3 repeats, capacity search, 6 accuracy tasks</td><td>12-16 h</td></tr>
              <tr className="border-t border-line"><td className="py-2 pr-4 font-mono text-xs">qwen3-14b</td><td className="pr-4">Full, Qwen3-14B</td><td>20+ h</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="3 · Re-run a specific published result">
        <p className="text-sm text-ink-2">
          <a className="text-accent underline-offset-2 hover:underline" href={`${REPOS.data}/blob/main/derived/REPRODUCE.md`}>
            REPRODUCE.md
          </a>{" "}
          lists, for every run, the bench commit, vLLM image digest, model revision, serving flags and the
          exact command. Raw per-repeat measurements and GPU telemetry are in each run&apos;s{" "}
          <code className="rounded bg-surface-2 px-1">raw.tar.gz</code>.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["silybench-bench", REPOS.bench, "The benchmark harness and the AGENTS.md runbook"],
          ["silybench-data", REPOS.data, "Every result, price table and derived cost number"],
          ["silybench-site", REPOS.site, "This website (static, rebuilt when data changes)"],
        ].map(([name, href, d]) => (
          <a key={name} href={href} className="rounded-2xl border border-line bg-surface p-5 shadow-card hover:border-accent">
            <div className="font-mono text-sm font-medium text-accent">{name}</div>
            <p className="mt-1 text-sm text-ink-2">{d}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
