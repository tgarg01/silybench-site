"use client";

// Live API prices: fetched in the visitor's browser from OpenRouter's public endpoint list
// (the same source CI snapshots every 6 hours into cost.json). Hand-checked prices for
// providers OpenRouter doesn't carry are kept as they are. If the fetch fails, the snapshot stays.
import { useEffect, useState } from "react";

import type { ApiOffer, CostData } from "./types";

export interface LivePrices {
  offers: ApiOffer[];
  live: boolean; // true once the browser fetch succeeded
  fetchedAt: Date | null;
}

interface Endpoint {
  provider_name: string;
  quantization?: string | null;
  context_length?: number | null;
  pricing: { prompt: string; completion: string };
}

async function fetchModel(hfId: string, slug: string): Promise<ApiOffer[]> {
  const res = await fetch(`https://openrouter.ai/api/v1/models/${slug}/endpoints`);
  if (!res.ok) throw new Error(`${slug}: ${res.status}`);
  const data = (await res.json()) as { data: { endpoints: Endpoint[] } };
  const today = new Date().toISOString().slice(0, 10);
  return data.data.endpoints
    .map((e) => ({
      model: hfId,
      provider: e.provider_name,
      usd_per_1m_input: Number(e.pricing.prompt) * 1e6,
      usd_per_1m_output: Number(e.pricing.completion) * 1e6,
      quantization: e.quantization && e.quantization !== "unknown" ? e.quantization : null,
      context_length: e.context_length ?? null,
      source: `https://openrouter.ai/${slug}/providers`,
      fetched_at: today,
      notes: null,
    }))
    .filter((o) => o.usd_per_1m_input > 0 || o.usd_per_1m_output > 0);
}

export function useLivePrices(cost: CostData, models: string[]): LivePrices {
  const [state, setState] = useState<LivePrices>({ offers: cost.api_offers, live: false, fetchedAt: null });
  const key = models.join("|");

  useEffect(() => {
    const slugs = cost.openrouter_slugs ?? {};
    const wanted = key.split("|").filter((m) => m && slugs[m]);
    if (!wanted.length) return;
    let cancelled = false;
    Promise.allSettled(wanted.map((m) => fetchModel(m, slugs[m]))).then((results) => {
      if (cancelled) return;
      const refreshed = new Set<string>();
      const fresh: ApiOffer[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.length) {
          refreshed.add(wanted[i]);
          fresh.push(...r.value);
        }
      });
      if (!refreshed.size) return;
      const kept = cost.api_offers.filter((o) => !(refreshed.has(o.model) && o.source.includes("openrouter.ai")));
      // A live OpenRouter row replaces a hand-checked one for the same provider.
      const liveProviders = new Set(fresh.map((o) => `${o.model}|${o.provider.toLowerCase()}`));
      setState({
        offers: [...kept.filter((o) => !liveProviders.has(`${o.model}|${o.provider.toLowerCase()}`)), ...fresh],
        live: true,
        fetchedAt: new Date(),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [cost, key]);

  return state;
}
