// Copy and contact details for the managed-hosting offer. Edit freely; nothing else depends on it.
export const business = {
  name: "silybench hosting",
  // Where "Get a quote" goes. A mailto:, Cal.com/Calendly link or form URL all work.
  // TODO(owner): replace with your preferred contact channel.
  contactUrl: "https://github.com/tgarg01/silybench-site/issues/new?labels=hosting-inquiry&title=Hosting%20inquiry",
  contactLabel: "Get a quote",
  tiers: [
    {
      name: "Launch",
      tagline: "Your model live on the cheapest GPU that meets your latency target",
      points: [
        "Benchmark your model and traffic shape on 2-3 candidate GPUs",
        "vLLM deployment with an OpenAI-compatible endpoint, TLS and API keys",
        "Right precision (BF16/FP8) chosen from measured accuracy",
        "Hand-over runbook, or move up to Managed",
      ],
      price: "One-off, fixed quote",
    },
    {
      name: "Managed",
      tagline: "We run it; you use the endpoint",
      points: [
        "Everything in Launch",
        "Monitoring of latency, errors and GPU health, with alerts and an on-call response",
        "Autoscaling for peaks, and failover to a second provider",
        "Monthly model/engine upgrades, re-benchmarked before rollout",
        "Monthly cost report: GPU spend vs what the API would have cost",
      ],
      price: "Monthly fee + GPU cost at provider list price",
      highlight: true,
    },
    {
      name: "Optimize",
      tagline: "Already self-hosting? Cut the bill",
      points: [
        "Audit of your current serving stack against silybench numbers",
        "Engine, quantization and batching tuning",
        "Provider and GPU re-selection, spot/reserved strategy",
      ],
      price: "Fixed fee, or a share of the savings",
    },
  ],
  faq: [
    {
      q: "Whose GPUs does it run on?",
      a: "Rented from public GPU clouds (RunPod, Lambda, Nebius, Vast, GCP, …), in your account or ours. We pick by measured cost at your latency target, not by partnership.",
    },
    {
      q: "Is my data sent to a third-party model API?",
      a: "No. The model runs on dedicated GPUs; prompts never leave the deployment. That matters for privacy and compliance, and it's often why teams self-host even at low volume.",
    },
    {
      q: "What if my traffic is small?",
      a: "Below the break-even volume on the home page, an API is cheaper, and we'll tell you so. Managed hosting pays off above break-even, or when privacy, latency or customization matter more than price.",
    },
    {
      q: "Can I check your numbers?",
      a: "Yes. Every benchmark, price and cost formula is public in silybench-data, and anyone can re-run a benchmark on their own rented GPU with one prompt to Claude.",
    },
  ],
};
