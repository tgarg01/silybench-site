import type { Fingerprint as FP } from "@/lib/types";

function Row({ k, v, note }: { k: string; v: React.ReactNode; note?: string }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="py-2 pl-5 pr-4 text-ink-2">{k}</td>
      <td className="py-2 pr-5 font-medium text-ink">
        {v ?? "–"}
        {note && <span className="ml-2 text-xs font-normal text-muted">{note}</span>}
      </td>
    </tr>
  );
}

const n = (v: number | null | undefined, d = 0, unit = "") =>
  v == null ? "–" : `${v.toLocaleString("en-US", { maximumFractionDigits: d })}${unit}`;

/** The reference hardware a reproduction must match (identity exact, measured within ±5%). */
export function FingerprintTable({ fp }: { fp: FP }) {
  const g = fp.gpu.gpus[0] ?? ({} as FP["gpu"]["gpus"][0]);
  const m = fp.measured;
  const hot = fp.conditions.after_load_temperature_c?.[0];
  const limits = fp.conditions.after_load_clock_limits?.flat() ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        {
          title: "Identity (must match exactly)",
          rows: [
            ["GPU", `${fp.gpu.count}× ${g.name}`, g.architecture ?? undefined],
            ["PCI device id", g.pci_device_id, "tells H100 SXM from PCIe/NVL"],
            ["Memory", n(g.memory_total_mib, 0, " MiB")],
            ["Power limit", n(g.default_power_limit_w, 0, " W")],
            ["Max clocks", `${n(g.max_sm_clock_mhz)} / ${n(g.max_mem_clock_mhz)} MHz`, "SM / memory"],
            ["ECC · MIG", `${g.ecc_mode ?? "–"} · ${g.mig_mode ?? "–"}`],
            ["PCIe", g.pcie_max_gen ? `Gen ${g.pcie_max_gen} ${g.pcie_max_width ?? ""}` : "–"],
            ["VBIOS", g.vbios],
            ["Driver · CUDA", `${fp.gpu.driver ?? "–"} · ${fp.gpu.cuda ?? "–"}`],
            ["CPU", `${fp.host.vcpus ?? "–"} vCPU, ${fp.host.cpu_model ?? "–"}`],
            ["RAM", n(fp.host.ram_gib, 0, " GiB")],
          ],
        },
        {
          title: "Measured (must match within ±5%)",
          rows: [
            ["HBM copy bandwidth", n(m.hbm_copy_gbs, 0, " GB/s")],
            ["BF16 matmul", n(m.bf16_tflops, 0, " TFLOPS"), "8192³"],
            ["FP8 matmul", n(m.fp8_tflops, 0, " TFLOPS"), "8192³"],
            ["Host → GPU", n(m.h2d_gbs, 1, " GB/s"), "pinned, 1 GiB"],
            ["GPU → host", n(m.d2h_gbs, 1, " GB/s")],
            ["Download from Hugging Face", n(m.hf_download_mbps, 0, " MB/s"), "warning only"],
          ],
        },
        {
          title: "Machine and conditions",
          rows: [
            ["Provider", fp.cloud.provider],
            ["Machine type", fp.cloud.machine_type],
            ["Zone", fp.cloud.zone],
            ["Boot image", fp.cloud.image ?? undefined],
            ["Temperature idle → after load", `${n(fp.conditions.idle_temperature_c?.[0])} → ${n(hot)} °C`],
            ["Clock limits under load", limits.length ? limits.join(", ") : "none", "thermal limits would be flagged"],
            ["Captured", fp.collected_at.replace("T", " ").slice(0, 16) + " UTC"],
          ],
        },
      ].map((block) => (
        <section key={block.title} className="min-w-0 rounded-2xl border border-line bg-surface shadow-card">
          <h3 className="px-5 pb-2 pt-4 text-sm font-semibold">{block.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {block.rows.map(([k, v, note]) => (
                  <Row key={k as string} k={k as string} v={v as string} note={note as string | undefined} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
