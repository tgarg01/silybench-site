"use client";

import type * as echarts from "echarts";
import { useCallback } from "react";

import { apiUsdPerRequest, fmtCompact, fmtMoney, hostedOption, HOURS_PER_MONTH } from "@/lib/cost";
import type { ApiRow, Deployment, PricedOffer } from "@/lib/types";

import { axisStyle, baseOption, Chart, type Tokens } from "./Chart";

const X_MIN = 1e3;
const X_MAX = 1e8;
const SAMPLES = 160;

function xs(): number[] {
  return Array.from({ length: SAMPLES }, (_, i) => X_MIN * Math.pow(X_MAX / X_MIN, i / (SAMPLES - 1)));
}

export interface HostedLine {
  label: string;
  dep: Deployment;
  offer: PricedOffer;
}

/** Monthly cost vs daily requests: per-token APIs are straight lines, GPUs are steps. */
export function CostChart({
  hosted,
  apis,
  inputTokens,
  outputTokens,
  peakToAverage = 1,
  height = 380,
}: {
  hosted: HostedLine[];
  apis: ApiRow[];
  inputTokens: number;
  outputTokens: number;
  peakToAverage?: number;
  height?: number;
}) {
  const build = useCallback(
    (t: Tokens): echarts.EChartsOption => {
      const x = xs();
      const traffic = (rpd: number) => ({ requestsPerDay: rpd, inputTokens, outputTokens, peakToAverage });
      const series: echarts.SeriesOption[] = [
        ...hosted.map((h, i) => ({
          name: h.label,
          type: "line" as const,
          step: "end" as const,
          showSymbol: false,
          lineStyle: { width: 2.5, color: t.series[i % 8] },
          itemStyle: { color: t.series[i % 8] },
          data: x.map((rpd) => [rpd, hostedOption(h.dep, h.offer, traffic(rpd)).monthlyUsd]),
        })),
        ...apis.map((a, i) => {
          const color = t.series[(hosted.length + i) % 8];
          const perReq = apiUsdPerRequest(a, inputTokens, outputTokens);
          return {
            name: `${a.provider} API`,
            type: "line" as const,
            showSymbol: false,
            lineStyle: { width: 2, type: "dashed" as const, color },
            itemStyle: { color },
            data: x.map((rpd) => [rpd, rpd * perReq * (HOURS_PER_MONTH / 24)]),
          };
        }),
      ];
      return {
        ...baseOption(t),
        grid: { left: 72, right: 20, top: 56, bottom: 52 },
        legend: { ...baseOption(t).legend, type: "scroll" },
        tooltip: {
          ...baseOption(t).tooltip,
          trigger: "axis",
          valueFormatter: (v) => fmtMoney(v as number),
          axisPointer: { type: "line", lineStyle: { color: t.axis } },
          formatter: (params: unknown) => {
            const ps = params as { seriesName: string; value: [number, number]; color: string }[];
            if (!ps.length) return "";
            const head = `<b>${fmtCompact(ps[0].value[0])} requests/day</b>`;
            const rows = [...ps]
              .sort((a, b) => a.value[1] - b.value[1])
              .map(
                (p) =>
                  `<div style="display:flex;gap:12px;justify-content:space-between"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:6px"></span>${p.seriesName}</span><b>${fmtMoney(p.value[1])}/mo</b></div>`,
              );
            return [head, ...rows].join("");
          },
        },
        xAxis: {
          type: "log",
          min: X_MIN,
          max: X_MAX,
          name: "Requests per day",
          nameLocation: "middle",
          nameGap: 32,
          ...axisStyle(t),
          axisLabel: { ...axisStyle(t).axisLabel, formatter: (v: number) => fmtCompact(v) },
        },
        yAxis: {
          type: "log",
          min: 10,
          name: "USD per month",
          nameLocation: "middle",
          nameGap: 56,
          ...axisStyle(t),
          axisLabel: { ...axisStyle(t).axisLabel, formatter: (v: number) => fmtMoney(v) },
        },
        series,
      };
    },
    [hosted, apis, inputTokens, outputTokens, peakToAverage],
  );

  return (
    <Chart
      build={build}
      height={height}
      ariaLabel="Monthly cost against daily request volume for self-hosted GPUs and per-token APIs"
    />
  );
}
