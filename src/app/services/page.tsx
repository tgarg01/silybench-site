import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeader } from "@/components/Card";
import { business } from "@/content/business";
import { fmtCompact } from "@/lib/cost";
import { loadCost } from "@/lib/data";

export const metadata: Metadata = { title: "Managed hosting · silybench" };

export default function Services() {
  const cost = loadCost();
  const best = [...cost.comparisons]
    .filter((c) => c.savings_at_capacity != null)
    .sort((a, b) => (b.savings_at_capacity ?? 0) - (a.savings_at_capacity ?? 0))[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Managed hosting"
        title="Open models on rented GPUs, run for you"
        description="silybench measures what self-hosting really costs. We then deploy and operate your open model on the cheapest GPUs that meet your latency target, and keep proving it's cheaper than the API."
      >
        <div className="flex flex-wrap gap-3 pt-2">
          <a href={business.contactUrl} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            {business.contactLabel}
          </a>
          <Link href="/calculator/" className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2">
            Price your traffic first
          </Link>
        </div>
      </PageHeader>

      {best && (
        <div className="rounded-2xl bg-accent-soft p-5 text-sm text-ink-2">
          <strong className="text-ink">Why it pays:</strong> measured on {best.hosted.gpu_type}, serving{" "}
          {best.model.split("/").pop()} costs{" "}
          <strong className="text-good">{Math.round((best.savings_at_capacity ?? 0) * 100)}% less</strong> than the
          cheapest API at full load, and breaks even from about{" "}
          {fmtCompact(best.breakeven_requests_per_day)} requests/day.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {business.tiers.map((tier) => (
          <section
            key={tier.name}
            className={`flex flex-col rounded-2xl border bg-surface p-6 shadow-card ${tier.highlight ? "border-accent" : "border-line"}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{tier.name}</h2>
              {tier.highlight && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Most chosen</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-2">{tier.tagline}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              {tier.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 text-good">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5 text-sm font-medium text-ink">{tier.price}</div>
          </section>
        ))}
      </div>

      <Card title="How it works">
        <ol className="grid gap-4 text-sm text-ink-2 md:grid-cols-4">
          {[
            ["Measure", "We benchmark your model and request shape on candidate GPUs, the same way as every run on this site."],
            ["Choose", "Cheapest GPU × provider × precision that meets your latency and accuracy bar."],
            ["Deploy", "vLLM behind an OpenAI-compatible endpoint, so switching from an API is a base-URL change."],
            ["Operate", "Monitoring, scaling, upgrades and a monthly cost report against the API alternative."],
          ].map(([h, d], i) => (
            <li key={h}>
              <div className="text-xs font-medium text-accent">Step {i + 1}</div>
              <div className="mt-0.5 font-medium text-ink">{h}</div>
              <p className="mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="FAQ">
        <dl className="divide-y divide-line">
          {business.faq.map((f) => (
            <div key={f.q} className="py-3 first:pt-0 last:pb-0">
              <dt className="font-medium text-ink">{f.q}</dt>
              <dd className="mt-1 text-sm text-ink-2">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
