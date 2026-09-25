"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";

// Resolved CSS token values, so ECharts (canvas/SVG) follows light/dark mode.
export interface Tokens {
  surface: string;
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  axis: string;
  border: string;
  critical: string;
  series: string[];
}

function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    surface: v("--surface"),
    ink: v("--text-primary"),
    ink2: v("--text-secondary"),
    muted: v("--text-muted"),
    grid: v("--grid"),
    axis: v("--axis"),
    border: v("--border"),
    critical: v("--critical"),
    series: Array.from({ length: 8 }, (_, i) => v(`--series-${i + 1}`)),
  };
}

function useTokens(): Tokens | null {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  useEffect(() => {
    const update = () => setTokens(readTokens());
    update();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);
  return tokens;
}

/** Axis styling for any axis type: hairline solid grid, muted labels, no ticks. */
export function axisStyle(t: Tokens) {
  return {
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.grid, type: "solid" as const, width: 1 } },
    nameTextStyle: { color: t.ink2, fontSize: 12 },
  };
}

/** Shared text/tooltip/legend styling. */
export function baseOption(t: Tokens) {
  return {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: t.ink2 },
    animationDuration: 300,
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 1,
      textStyle: { color: t.ink, fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 16px rgba(0,0,0,0.12); border-radius: 8px;",
    } as echarts.TooltipComponentOption,
    legend: {
      top: 0,
      left: 0,
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 4,
      textStyle: { color: t.ink2, fontSize: 12 },
    } as echarts.LegendComponentOption,
  };
}

export function Chart({
  build,
  height = 340,
  ariaLabel,
}: {
  build: (t: Tokens) => echarts.EChartsOption;
  height?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tokens = useTokens();

  useEffect(() => {
    if (!ref.current || !tokens) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption(build(tokens));
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [build, tokens]);

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ height, width: "100%" }} />;
}
