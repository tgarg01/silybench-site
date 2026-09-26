import type { Metadata } from "next";

import { Calculator } from "@/components/Calculator";
import { PageHeader } from "@/components/Card";
import { loadCost, loadExperiments } from "@/lib/data";

export const metadata: Metadata = { title: "Cost calculator · silybench" };

function headlineCost() {
  const cost = loadCost();
  const published = new Set(loadExperiments().filter((e) => e.status === "published").map((e) => e.id));
  return { ...cost, deployments: cost.deployments.filter((d) => d.experiment && published.has(d.experiment)) };
}

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calculator"
        title="Self-host or pay per token?"
        description="Describe your traffic. We size rented GPUs from measured capacity at a fixed latency target, price them with every provider's list price, and compare them with API list prices for the same model."
      />
      <Calculator cost={headlineCost()} />
    </div>
  );
}
