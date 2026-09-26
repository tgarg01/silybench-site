import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, PageHeader, TH } from "@/components/Card";
import { CopyBlock } from "@/components/CopyBlock";
import { Dashboard } from "@/components/Dashboard";
import { ExperimentCost } from "@/components/ExperimentCost";
import { FingerprintTable } from "@/components/Fingerprint";
import { REPOS } from "@/content/links";
import { workloadLabel } from "@/lib/cost";
import { loadCost, loadCostAtRun, loadExperiment, loadExperiments, loadRuns } from "@/lib/data";
import { fmtMs } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadExperiments().map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/experiments/[id]">): Promise<Metadata> {
  const exp = loadExperiment((await params).id);
  return { title: exp ? `${exp.title} · silybench` : "Experiment", description: exp?.description };
}

const STATUS: Record<string, { label: string; cls: string }> = {
  published: { label: "Published", cls: "bg-accent-soft text-accent" },
  planned: { label: "Planned · running soon", cls: "bg-warning-bg text-warning-ink" },
  pipeline: { label: "Pipeline validation", cls: "bg-surface-2 text-ink-2" },
};

function Meta({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {href ? (
          <a className="text-accent hover:underline" href={href}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function bytes(n: number): string {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} kB`;
}

export default async function ExperimentPage({ params }: PageProps<"/experiments/[id]">) {
  const exp = loadExperiment((await params).id);
  if (!exp) notFound();
  const runs = loadRuns().filter((r) => r.experiment === exp.id);
  const cost = loadCost();
  const atRun = loadCostAtRun(exp.id);
  const env = exp.environments[0];
  const fp = exp.fingerprint ?? runs.find((r) => r.fingerprint)?.fingerprint ?? null;
  const engine = runs[0]?.software;
  const status = STATUS[exp.status] ?? STATUS.planned;
  const prompt = `Clone ${REPOS.bench} and follow its AGENTS.md to reproduce experiment ${exp.id}. Show me the cost before creating anything.`;
  const profiles = runs.flatMap((r) => (r.profiles ?? []).map((p) => ({ run: r, p })));
  const codeUrl = exp.bench.tag.startsWith("pipeline")
    ? `${REPOS.data}/releases/tag/${exp.release}`
    : `${REPOS.bench}/tree/${exp.bench.tag}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/experiments/" className="hover:text-ink">
            ← Experiments
          </Link>
        }
        title={exp.title}
        description={exp.description}
      >
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>{status.label}</span>
          <span className="font-mono text-xs text-muted">{exp.id}</span>
        </div>
      </PageHeader>

      <Card title="Exactly what ran" subtitle="Reproductions must use this provider, machine, image and code. The agent refuses anything else.">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Provider" value={`${env.provider.toUpperCase()} · ${env.provisioning ?? ""}`} />
          <Meta label="Machine" value={`${env.machine_type ?? "–"} · ${env.zone ?? ""}`} />
          <Meta label="Boot image" value={env.image ?? "–"} />
          <Meta label="Runtime" value={env.runtime ?? "–"} />
          <Meta label="Code" value={`silybench-bench @ ${exp.bench.tag}`} href={codeUrl} />
          <Meta
            label="Commit"
            value={
              exp.bench.commit
                ? exp.bench.commit.slice(0, 12)
                : exp.status === "pipeline"
                  ? "uncommitted working tree (exact code bundles in the release)"
                  : "set when the experiment is tagged"
            }
          />
          <Meta label="Config" value={exp.bench.config} href={exp.bench.tag.startsWith("pipeline") ? undefined : `${REPOS.bench}/blob/${exp.bench.tag}/${exp.bench.config}`} />
          <Meta
            label="Engine"
            value={engine ? `vLLM ${engine.engine_version}${engine.engine_image_digest ? ` (${engine.engine_image_digest.split("@")[1]?.slice(0, 19)}…)` : ""}` : "vLLM 0.30.0 (pinned image)"}
          />
          {exp.models.map((m) => (
            <Meta key={m.precision} label={`Model · ${m.precision.toUpperCase()}`} value={m.checkpoint} href={`https://huggingface.co/${m.checkpoint}`} />
          ))}
        </dl>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Hardware fingerprint</h2>
        {fp ? (
          <FingerprintTable fp={fp} />
        ) : exp.status === "pipeline" ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-2">
            Not captured: these runs predate hardware fingerprinting. Recorded: GPU model, driver{" "}
            {engine?.nvidia_driver ?? "–"}, CUDA {engine?.cuda_version ?? "–"}.
          </p>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-2">
            Captured automatically when the experiment runs: GPU identity (model, PCI device id, power limit,
            VBIOS), driver/CUDA, CPU/RAM, measured memory bandwidth and matmul throughput, download speed and
            temperatures. It becomes the reference every reproduction is checked against.
          </p>
        )}
      </section>

      <Card title="Scenarios" subtitle="Each scenario is measured at every listed number of simultaneous users, then the most users that still meet its latency target are searched for.">
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[720px] text-sm">
            <thead className="text-left">
              <tr className="border-b border-line">
                <th className={`${TH} pl-5`}>Scenario</th>
                <th className={TH}>Prompt → answer</th>
                <th className={TH}>Prompts</th>
                <th className={TH}>Users measured</th>
                <th className={`${TH} pr-5`}>Latency target</th>
              </tr>
            </thead>
            <tbody>
              {exp.scenarios.map((s) => {
                const ds = exp.datasets.find((d) => d.scenario === s.name);
                return (
                  <tr key={s.name} className="border-b border-line last:border-0">
                    <td className="py-2.5 pl-5">
                      <div className="font-medium text-ink">{workloadLabel(s.name)}</div>
                      <div className="font-mono text-xs text-muted">{s.name}</div>
                    </td>
                    <td className="px-3">{s.input_len.toLocaleString()} → {s.output_len.toLocaleString()} tokens</td>
                    <td className="px-3 text-ink-2">
                      {ds ? (
                        <a className="text-accent hover:underline" href={ds.url} title={ds.description}>
                          real agent traces ({ds.license})
                        </a>
                      ) : (
                        "random tokens"
                      )}
                    </td>
                    <td className="px-3 text-ink-2">{s.users.join(", ")} × {s.repeats}</td>
                    <td className="pr-5 text-ink-2">
                      first token ≤ {fmtMs(s.slo.ttft_p99_ms)} (p99), ≥ {Math.round(1000 / s.slo.itl_median_ms)} tok/s per user
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {exp.datasets.map((d) => (
          <p key={d.name} className="mt-3 text-xs text-muted">
            <strong className="text-ink-2">{d.name}</strong>: {d.description} sha256 <span className="font-mono">{d.sha256.slice(0, 16)}…</span>{" "}
            · rebuild: <span className="font-mono">{d.builder}</span>
          </p>
        ))}
      </Card>

      {runs.length > 0 ? (
        <>
          <ExperimentCost experiment={exp.id} cost={cost} atRun={atRun} />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Measurements</h2>
            <Dashboard runs={runs} />
          </section>
        </>
      ) : (
        <Card title="Measurements">
          <p className="text-sm text-ink-2">
            Not measured yet. Results, per-scenario latency percentiles, users served and the cost comparison
            appear here as soon as the runs are merged into{" "}
            <a className="text-accent hover:underline" href={REPOS.data}>silybench-data</a>.
          </p>
        </Card>
      )}

      {profiles.length > 0 && (
        <Card title="GPU profiles" subtitle="Nsight Systems (where GPU time goes) and Nsight Compute (why a kernel is slow).">
          <ul className="space-y-1 text-sm">
            {profiles.map(({ run, p }, i) => {
              const asset = run.raw_assets?.find((a) => a.name === p.asset);
              return (
                <li key={i}>
                  {p.tool} · {workloadLabel(p.workload)} @ {p.concurrency} users ·{" "}
                  {asset ? <a className="text-accent hover:underline" href={asset.url}>{asset.name}</a> : "summary only"}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Downloads" subtitle={`Everything captured, including per-repeat raw measurements, telemetry, logs and code. Release ${exp.release ?? "–"}.`}>
        {exp.assets.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {exp.assets.map((a) => (
                  <tr key={a.name} className="border-b border-line last:border-0">
                    <td className="py-2 pl-5 pr-4">
                      <a className="font-mono text-[13px] text-accent hover:underline" href={a.url}>{a.name}</a>
                      <div className="text-xs text-muted">{a.contents}</div>
                    </td>
                    <td className="whitespace-nowrap pr-4 text-right text-ink-2">{bytes(a.bytes)}</td>
                    <td className="pr-5 font-mono text-xs text-muted" title={a.sha256}>sha256 {a.sha256.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-2">Published with the results.</p>
        )}
        {runs.length > 0 && (
          <p className="mt-3 text-sm text-ink-2">
            Result files:{" "}
            {runs.map((r, i) => (
              <span key={r.run_id}>
                {i > 0 && " · "}
                <a className="font-mono text-xs text-accent hover:underline" href={`${REPOS.data}/blob/main/runs/${r.run_id}/result.json`}>
                  {r.run_id}
                </a>
              </span>
            ))}
          </p>
        )}
      </Card>

      {exp.status !== "pipeline" && (
        <Card title="Reproduce this experiment" subtitle="The agent checks out the exact code, refuses other providers, verifies the hardware fingerprint before measuring, and shows the cost (from this experiment's measured durations) before creating anything.">
          <CopyBlock text={prompt} />
        </Card>
      )}
    </div>
  );
}
