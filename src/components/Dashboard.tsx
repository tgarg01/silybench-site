"use client";

import type * as echarts from "echarts";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

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
import type { PerfPoint, RunResult } from "@/lib/types";

import { Card, Swatch, TH } from "./Card";
import { axisStyle, baseOption, Chart, type Tokens } from "./Chart";

function workloadShape(w: string): string | null {
  const m = w.match(/(\d+)-(\d+)$/);
  return m ? `${fmtInt(+m[1])} in → ${fmtInt(+m[2])} out tokens` : null;
}

interface Tile {
  label: string;
  value: string;
  unit?: string;
  who?: { label: string; color: string }[];
  note?: string;
}

function StatTile({ tile, hero }: { tile: Tile; hero?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="text-sm text-ink-2">{tile.label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`font-semibold tracking-tight ${hero ? "text-5xl" : "text-3xl"}`}>{tile.value}</span>
        {tile.unit && <span className="text-sm text-muted">{tile.unit}</span>}
      </div>
      <div className="mt-auto space-y-1 pt-3 text-xs">
        {tile.who && tile.who.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            {tile.who.length > 1 && <span className="font-medium text-ink">Tie</span>}
            {tile.who.map((w) => (
              <span key={w.label} className="flex items-center gap-1.5">
                <Swatch color={w.color} />
                <span className="truncate">{w.label}</span>
              </span>
            ))}
          </div>
        )}
        {tile.note && <div className="text-muted">{tile.note}</div>}
      </div>
    </div>
  );
}

/** Rank rows on a metric: the leaders (all rows tied at the best value) and the runner-up. */
function leader<T>(items: T[], get: (x: T) => number | null | undefined, higherIsBetter: boolean) {
  const ranked = items
    .map((x) => ({ x, v: get(x) }))
    .filter((e): e is { x: T; v: number } => e.v != null)
    .sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  const top = ranked[0];
  const tied = top ? ranked.filter((e) => e.v === top.v) : [];
  return { top, tied, next: ranked[tied.length] };
}

export function Dashboard({ runs }: { runs: RunResult[] }) {
  // Config order (capacity is recorded in workload order), not alphabetical.
  const workloads = useMemo(
    () =>
      Array.from(
        new Set(runs.flatMap((r) => [...r.capacity.map((c) => c.workload), ...r.perf.map((p) => p.workload)])),
      ),
    [runs],
  );
  const [workload, setWorkload] = useState(workloads[0] ?? "");
  const slo = useMemo(
    () => runs[0]?.capacity[0]?.slo ?? { ttft_p99_ms: 2000, itl_median_ms: 50 },
    [runs],
  );
  // Color follows the run (entity), by its stable index, never its rank.
  const color = (i: number) => `var(--series-${(i % 8) + 1})`;

  const pts = useCallback(
    (r: RunResult): PerfPoint[] =>
      r.perf.filter((p) => p.workload === workload).sort((a, b) => a.concurrency - b.concurrency),
    [workload],
  );

  const rows = runs.map((r, i) => {
    const cap = r.capacity.find((c) => c.workload === workload);
    const p = pts(r);
    const atMax = p.find((x) => x.concurrency === cap?.max_users_slo);
    const single = p.find((x) => x.concurrency === 1);
    const best = p.reduce<PerfPoint | undefined>(
      (m, x) => (!m || x.output_throughput > m.output_throughput ? x : m),
      undefined,
    );
    const acc = r.accuracy.length ? r.accuracy.reduce((s, a) => s + a.value, 0) / r.accuracy.length : null;
    return { r, i, cap, atMax, single, best, acc };
  });

  const throughputChart = useCallback(
    (t: Tokens): echarts.EChartsOption => ({
      ...baseOption(t),
      grid: { left: 64, right: 24, top: 40, bottom: 48 },
      tooltip: {
        ...baseOption(t).tooltip,
        trigger: "item",
        formatter: (p: unknown) => {
          const { seriesName, data } = p as { seriesName: string; data: [number, number, number] };
          return `<b>${seriesName}</b><br/>${fmtInt(data[2])} concurrent users<br/>${fmtNum(
            data[0],
          )} tok/s per user<br/>${fmtInt(data[1])} tok/s total`;
        },
      },
      legend: { ...baseOption(t).legend, data: runs.map(runLabel) },
      xAxis: {
        ...axisStyle(t),
        type: "value",
        name: "Tokens/s per user (1000 ÷ median inter-token time)",
        nameLocation: "middle",
        nameGap: 30,
      },
      yAxis: {
        ...axisStyle(t),
        type: "value",
        name: "Total output tokens/s",
        nameLocation: "middle",
        nameGap: 50,
      },
      series: runs.map((r, i) => ({
        name: runLabel(r),
        type: "line",
        color: t.series[i % 8],
        lineStyle: { width: 2 },
        symbolSize: 8,
        itemStyle: { borderColor: t.surface, borderWidth: 2 },
        data: pts(r).map((p) => [p.tokens_per_s_per_user, p.output_throughput, p.concurrency]),
        markLine:
          i === 0
            ? {
                silent: true,
                symbol: "none",
                lineStyle: { color: t.muted, type: "solid", width: 1 },
                label: { formatter: `SLO ≥ ${fmtNum(1000 / slo.itl_median_ms, 0)} tok/s/user`, color: t.ink2 },
                data: [{ xAxis: 1000 / slo.itl_median_ms }],
              }
            : undefined,
      })),
    }),
    [runs, pts, slo.itl_median_ms],
  );

  const latencyChart = useMemo(
    () => (metric: "ttft" | "itl") =>
      (t: Tokens): echarts.EChartsOption => ({
        ...baseOption(t),
        grid: { left: 64, right: 24, top: 40, bottom: 48 },
        tooltip: { ...baseOption(t).tooltip, trigger: "axis", valueFormatter: (v) => fmtMs(v as number) },
        legend: { ...baseOption(t).legend, data: runs.map(runLabel) },
        xAxis: {
          ...axisStyle(t),
          type: "log",
          logBase: 2,
          name: "Concurrent users",
          nameLocation: "middle",
          nameGap: 30,
        },
        yAxis: {
          ...axisStyle(t),
          // TTFT spans ms to tens of seconds once requests queue; log keeps the SLO line readable.
          type: metric === "ttft" ? "log" : "value",
          name: metric === "ttft" ? "p99 time to first token (ms, log)" : "Median inter-token time (ms)",
          // Always show the SLO line, even when every point is well under it.
          max: (v: { max: number }) => {
            const m = Math.max(v.max, (metric === "ttft" ? slo.ttft_p99_ms : slo.itl_median_ms) * 1.5);
            // Round up to a clean tick so the top label isn't a raw data value.
            return metric === "ttft" ? 10 ** Math.ceil(Math.log10(m)) : Math.ceil(m / 10) * 10;
          },
          nameLocation: "middle",
          nameGap: 50,
        },
        series: runs.map((r, i) => ({
          name: runLabel(r),
          type: "line",
          color: t.series[i % 8],
          lineStyle: { width: 2 },
          symbolSize: 8,
          itemStyle: { borderColor: t.surface, borderWidth: 2 },
          data: pts(r).map((p) => [p.concurrency, metric === "ttft" ? p.ttft_ms.p99 : p.itl_ms.median]),
          markLine:
            i === 0
              ? {
                  silent: true,
                  symbol: "none",
                  lineStyle: { color: t.critical, type: "solid", width: 1 },
                  label: { formatter: "SLO limit", color: t.ink2 },
                  data: [{ yAxis: metric === "ttft" ? slo.ttft_p99_ms : slo.itl_median_ms }],
                }
              : undefined,
        })),
      }),
    [runs, pts, slo],
  );

  const accuracyChart = useCallback(
    (t: Tokens): echarts.EChartsOption => {
      const tasks = Array.from(new Set(runs.flatMap((r) => r.accuracy.map((a) => a.task))));
      return {
        ...baseOption(t),
        grid: { left: 48, right: 16, top: 40, bottom: 32 },
        tooltip: { ...baseOption(t).tooltip, trigger: "axis", valueFormatter: (v) => fmtPct(v as number) },
        legend: { ...baseOption(t).legend, data: runs.map(runLabel) },
        xAxis: {
          ...axisStyle(t),
          type: "category",
          data: tasks.map((k) => TASK_LABELS[k] ?? k),
          // Show every task name; wrap instead of auto-hiding labels on narrow screens.
          axisLabel: { color: t.muted, fontSize: 11, interval: 0, width: 64, overflow: "break" },
        },
        yAxis: {
          ...axisStyle(t),
          type: "value",
          max: 1,
          axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => `${Math.round(v * 100)}%` },
        },
        series: runs.map((r, i) => ({
          name: runLabel(r),
          type: "bar",
          color: t.series[i % 8],
          barMaxWidth: 24,
          barGap: "10%",
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: tasks.map((k) => r.accuracy.find((a) => a.task === k)?.value ?? null),
        })),
      };
    },
    [runs],
  );

  const ttftChart = useMemo(() => latencyChart("ttft"), [latencyChart]);
  const itlChart = useMemo(() => latencyChart("itl"), [latencyChart]);

  if (!runs.length) {
    return <p className="text-ink-2">No results yet. Run a benchmark and `gpubench aggregate`.</p>;
  }

  const present = rows.filter((x) => x.cap || x.best);
  const who = (x: (typeof rows)[number]) => ({ label: runLabel(x.r), color: color(x.i) });
  const ratio = (a: number, b: number) => `${fmtNum(a / b, 2)}×`;
  const maxUsers = Math.max(1, ...rows.map((x) => x.cap?.max_users_slo ?? 0));

  // Max users. When runs tie (typically all still passing at the highest level tested, so
  // no true limit was found), rank the tied runs by latency headroom at that level instead.
  const users = leader(present, (x) => x.cap?.max_users_slo, true);
  const usersTied = [...users.tied].sort(
    (a, b) => (a.x.atMax?.ttft_ms.p99 ?? Infinity) - (b.x.atMax?.ttft_ms.p99 ?? Infinity),
  );
  const saturated = users.top && fmtMaxUsers(users.top.x.cap).startsWith("≥");
  let usersNote: string | undefined;
  if (usersTied.length > 1) {
    const [a, b] = usersTied;
    usersNote = `${saturated ? `All met the SLO at ${fmtInt(users.top!.v)} users, the most tested. ` : ""}${runLabel(
      a.x.r,
    )} has more headroom there: p99 TTFT ${fmtMs(a.x.atMax?.ttft_ms.p99)} vs ${fmtMs(b.x.atMax?.ttft_ms.p99)}.`;
  } else if (users.top && users.next) {
    usersNote = `${ratio(users.top.v, users.next.v)} the next best`;
  }

  const tput = leader(present, (x) => x.best?.output_throughput, true);

  // $/1M output tokens = hourly GPU price ÷ output tokens generated per hour, measured while
  // serving the max number of users that still meets the SLO.
  const cost = leader(present, (x) => x.atMax?.usd_per_1m_output_tokens, false);
  const costRun = cost.top?.x;
  const costNote =
    costRun &&
    `GPU price (${fmtUsd(costRun.r.hardware.price_per_hour_usd)}/h) ÷ tokens generated while serving ${fmtMaxUsers(
      costRun.cap,
    )} users within SLO.${cost.next ? ` ${ratio(cost.next.v, cost.top!.v)} cheaper than the next best.` : ""}`;

  const tiles: Tile[] = [
    {
      label: "Max concurrent users within SLO",
      value: users.top ? fmtMaxUsers(users.top.x.cap) : "–",
      unit: "users",
      who: usersTied.map((e) => who(e.x)),
      note: usersNote,
    },
    {
      label: "Peak output throughput",
      value: tput.top ? fmtInt(tput.top.v) : "–",
      unit: "tok/s",
      who: tput.tied.map((e) => who(e.x)),
      note: tput.top && tput.next && `${ratio(tput.top.v, tput.next.v)} the next best`,
    },
    {
      label: "Cost per 1M output tokens",
      value: cost.top ? fmtUsd(cost.top.v) : "–",
      unit: "USD",
      who: cost.tied.map((e) => who(e.x)),
      note: costNote,
    },
  ];

  const shape = workloadShape(workload);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-card"
          role="radiogroup"
          aria-label="Workload"
        >
          {workloads.map((w) => (
            <button
              key={w}
              role="radio"
              aria-checked={w === workload}
              onClick={() => setWorkload(w)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                w === workload ? "bg-accent text-white shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        {shape && <span className="text-sm text-muted">{shape} per request</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiles.map((t, k) => (
          <StatTile key={t.label} tile={t} hero={k === 0} />
        ))}
      </div>

      <Card
        title="How many users can one deployment serve?"
        subtitle={`Max concurrent users while p99 time to first token ≤ ${fmtMs(slo.ttft_p99_ms)} and median inter-token time ≤ ${fmtMs(slo.itl_median_ms)}. Memory limit = requests that fit in the KV cache. Cost = GPU price per hour ÷ output tokens per hour at max users.`}
      >
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[860px] text-sm">
            <thead className="bg-surface-2/60">
              <tr className="text-left">
                <th className={`${TH} pl-5`}>Model</th>
                <th className={TH}>Hardware</th>
                <th className={`${TH} w-48`}>Max users (SLO)</th>
                <th className={`${TH} text-right`}>Memory limit</th>
                <th className={`${TH} text-right`}>Inter-token, 1 user</th>
                <th className={`${TH} text-right`}>p99 TTFT @ max</th>
                <th className={`${TH} text-right`}>Peak tok/s</th>
                <th className={`${TH} text-right`}>$ / 1M output tok</th>
                <th className={`${TH} pr-5 text-right`}>Avg accuracy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, i, cap, atMax, single, best, acc }) => (
                <tr key={r.run_id} className="border-t border-line hover:bg-surface-2/50">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/runs/${r.run_id}/`} className="flex items-center gap-2 font-medium hover:underline">
                      <Swatch color={color(i)} />
                      {runLabel(r)}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{hardwareLabel(r)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-base font-semibold">{fmtMaxUsers(cap)}</span>
                      <span className="h-1.5 flex-1 rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${((cap?.max_users_slo ?? 0) / maxUsers) * 100}%`, background: color(i) }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-2">{fmtInt(cap?.max_users_kv_cache)}</td>
                  <td className="px-3 py-3 text-right">{fmtMs(single?.itl_ms.median)}</td>
                  <td className="px-3 py-3 text-right">{fmtMs(atMax?.ttft_ms.p99)}</td>
                  <td className="px-3 py-3 text-right">{fmtInt(best?.output_throughput)}</td>
                  <td className="px-3 py-3 text-right">{fmtUsd(atMax?.usd_per_1m_output_tokens)}</td>
                  <td className="py-3 pl-3 pr-5 text-right">{fmtPct(acc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="Throughput vs. per-user speed"
          subtitle="Each point is one concurrency level. Moving left adds users: total throughput rises while each user's token rate falls."
        >
          <Chart build={throughputChart} ariaLabel="Total output throughput versus tokens per second per user" />
        </Card>
        <Card
          className="xl:col-span-2"
          title="Accuracy"
          subtitle="lm-evaluation-harness against the same vLLM server. Thinking mode off."
        >
          <Chart build={accuracyChart} ariaLabel="Accuracy by task and model" />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="p99 time to first token" subtitle="How long the slowest 1% of users wait for the first token.">
          <Chart build={ttftChart} height={300} ariaLabel="p99 time to first token by concurrency" />
        </Card>
        <Card title="Median inter-token time" subtitle="Typical gap between streamed tokens (IDT).">
          <Chart build={itlChart} height={300} ariaLabel="Median inter-token time by concurrency" />
        </Card>
      </div>
    </div>
  );
}
