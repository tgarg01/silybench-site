"use client";

/** Shows whether API prices on the page are live (fetched just now) or the CI snapshot. */
export function PriceBadge({ live, fetchedAt }: { live: boolean; fetchedAt: Date | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
        live ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2"
      }`}
      title={
        live
          ? "API prices fetched from OpenRouter in your browser just now; GPU prices refresh every 6 hours"
          : "API prices from the last 6-hourly snapshot (live fetch not available)"
      }
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${live ? "bg-accent" : "bg-muted"}`} />
      {live && fetchedAt
        ? `Live API prices · ${fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "API prices: 6-hourly snapshot"}
    </span>
  );
}
