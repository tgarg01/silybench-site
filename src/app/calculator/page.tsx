import type { Metadata } from "next";

import { Calculator } from "@/components/Calculator";
import { PageHeader } from "@/components/Card";
import { loadCost } from "@/lib/data";

export const metadata: Metadata = { title: "Cost calculator · silybench" };

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calculator"
        title="Self-host or pay per token?"
        description="Describe your traffic. We size rented GPUs from measured capacity at a fixed latency target, price them with every provider's list price, and compare them with API list prices for the same model."
      />
      <Calculator cost={loadCost()} />
    </div>
  );
}
