import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";

import { Card, PageHeader, TH } from "@/components/Card";
import { SampleBanner } from "@/components/SampleBanner";
import { setupLabel } from "@/lib/cost";
import { loadRun, loadRuns } from "@/lib/data";
import {
  fmtInt,
  fmtMaxUsers,
  fmtMs,
  fmtNum,
  fmtPct,
  fmtUsd,
  hardwareLabel,
  runLabel,
  TASK_LABELS,
} from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadRuns().map((r) => ({ id: r.run_id }));
}

export async function generateMetadata({ params }: PageProps<"/runs/[id]">): Promise<Metadata> {
  const run = loadRun((await params).id);
  return { title: run ? `${runLabel(run)} · silybench` : "Run" };
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  const run = loadRun((await params).id);
  if (!run) notFound();

  const workloads = Array.from(new Set(run.perf.map((p) => p.workload)));
  const th = `${TH} text-right`;
  const td = "px-3 py-2 text-right";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/runs/" className="hover:text-ink">
            ← All runs
          </Link>
        }
        title={runLabel(run)}
        description={`${hardwareLabel(run)} · ${run.created_at.slice(0, 10)}`}
      />
      {run.sample && <SampleBanner />}

      <Card title="Configuration">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Meta label="Model" value={`${run.model.hf_id} @ ${run.model.revision.slice(0, 12)}`} />
          <Meta label="Precision" value={setupLabel(run.model.precision, run.model.variant)} />
          <Meta label="Max model length" value={fmtInt(run.model.max_model_len)} />
          <Meta label="Thinking mode" value={run.model.thinking ? "On" : "Off"} />
          <Meta
            label="Machine"
            value={`${run.hardware.provider}${run.hardware.machine_type ? ` · ${run.hardware.machine_type}` : ""} (${run.hardware.provisioning})`}
          />
          <Meta
            label="Engine"
            value={`vLLM ${run.software.engine_version ?? "?"}${run.software.runtime ? ` (${run.software.runtime})` : ""}`}
          />
          <Meta label="Driver / CUDA" value={`${run.software.nvidia_driver ?? "?"} / ${run.software.cuda_version ?? "?"}`} />
          <Meta label="KV cache" value={`${fmtInt(run.kv_cache_tokens)} tokens`} />
          <Meta label="Parallelism" value={`TP${run.parallelism.tp} PP${run.parallelism.pp} DP${run.parallelism.dp} EP${run.parallelism.ep}`} />
          <Meta label="Price" value={run.hardware.price_per_hour_usd ? `${fmtUsd(run.hardware.price_per_hour_usd)}/h` : "–"} />
          <Meta label="Git commit" value={<span className="font-mono text-xs">{run.git_commit?.slice(0, 12) ?? "–"}</span>} />
          <Meta label="Run date" value={run.created_at.slice(0, 10)} />
        </dl>
        {run.serving_args.length > 0 && (
          <pre className="mt-5 overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-xs text-ink-2">
            vllm serve {run.model.hf_id} {run.serving_args.join(" ")}
          </pre>
        )}
      </Card>

      {workloads.map((w) => {
        const cap = run.capacity.find((c) => c.workload === w);
        const points = run.perf.filter((p) => p.workload === w).sort((a, b) => a.concurrency - b.concurrency);
        // Multi-turn agent sessions: first-turn vs later-turn TTFT and prefix-cache hit rate.
        const turns = points.some((p) => p.ttft_first_turn_p95_ms != null);
        const hits = points.some((p) => p.prefix_cache_hit_rate != null);
        return (
          <Card
            key={w}
            title={w}
            subtitle={
              cap && (
                <>
                Max concurrent users: <strong className="text-ink">{fmtMaxUsers(cap)}</strong> within
                SLO (p99 TTFT ≤ {fmtMs(cap.slo.ttft_p99_ms)}, median inter-token ≤ {fmtMs(cap.slo.itl_median_ms)}) ·
                memory limit {fmtInt(cap.max_users_kv_cache)}
                </>
              )
            }
          >
            <div className="-mx-5 overflow-x-auto">
              <table className="tabular w-full min-w-[980px] text-sm">
                <thead className="bg-surface-2/60">
                  <tr>
                    <th className={th}>Users</th>
                    <th className={th}>TTFT p95</th>
                    <th className={th}>TTFT p99</th>
                    {turns && <th className={th}>Turn 1 TTFT p95</th>}
                    {turns && <th className={th}>Later turns TTFT p99</th>}
                    {hits && <th className={th}>Cache hits</th>}
                    <th className={th}>Inter-token median</th>
                    <th className={th}>Inter-token p95</th>
                    <th className={th}>Inter-token p99</th>
                    <th className={th}>TPOT p99</th>
                    <th className={th}>E2E p95</th>
                    <th className={th}>E2E p99</th>
                    <th className={th}>Output tok/s</th>
                    <th className={th}>tok/s/user</th>
                    <th className={th}>Tokens/J</th>
                    <th className={th}>$/1M tok</th>
                    <th className={th}>SLO</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.concurrency} className="border-t border-line hover:bg-surface-2/50">
                      <td className={`${td} font-medium`}>{p.concurrency}</td>
                      <td className={td}>{fmtMs(p.ttft_ms.p95)}</td>
                      <td className={td}>{fmtMs(p.ttft_ms.p99)}</td>
                      {turns && <td className={td}>{fmtMs(p.ttft_first_turn_p95_ms ?? null)}</td>}
                      {turns && <td className={td}>{fmtMs(p.ttft_later_turns_p99_ms ?? null)}</td>}
                      {hits && <td className={td}>{fmtPct(p.prefix_cache_hit_rate ?? null)}</td>}
                      <td className={`${td} font-medium`}>{fmtMs(p.itl_ms.median)}</td>
                      <td className={td}>{fmtMs(p.itl_ms.p95)}</td>
                      <td className={td}>{fmtMs(p.itl_ms.p99)}</td>
                      <td className={td}>{fmtMs(p.tpot_ms.p99)}</td>
                      <td className={td}>{fmtMs(p.e2el_ms.p95)}</td>
                      <td className={td}>{fmtMs(p.e2el_ms.p99)}</td>
                      <td className={td}>{fmtInt(p.output_throughput)}</td>
                      <td className={td}>{fmtNum(p.tokens_per_s_per_user)}</td>
                      <td className={td}>{fmtNum(p.output_tokens_per_joule, 2)}</td>
                      <td className={td}>{fmtUsd(p.usd_per_1m_output_tokens)}</td>
                      <td className={td}>
                        {p.slo_pass ? (
                          <span className="text-good">✓ pass</span>
                        ) : (
                          <span className="text-critical">✕ fail</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      {run.accuracy.length > 0 && (
        <Card title="Accuracy">
          <table className="tabular w-full max-w-2xl text-sm">
            <thead className="text-left">
              <tr>
                <th className={`${TH} pl-0`}>Task</th>
                <th className={TH}>Metric</th>
                <th className={`${TH} text-right`}>Score</th>
                <th className={`${TH} pr-0 text-right`}>± stderr</th>
              </tr>
            </thead>
            <tbody>
              {run.accuracy.map((a) => (
                <tr key={a.task} className="border-t border-line">
                  <td className="py-2 pr-3">{TASK_LABELS[a.task] ?? a.task}</td>
                  <td className="py-2 pr-3 text-ink-2">{a.metric}</td>
                  <td className="py-2 pr-3 text-right font-medium">{fmtPct(a.value)}</td>
                  <td className="py-2 text-right text-ink-2">{fmtPct(a.stderr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
