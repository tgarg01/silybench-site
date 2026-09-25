// Fetch the site's data (derived/ of silybench-data) into ./data before dev/build.
//   SILYBENCH_DATA_DIR=../silybench-data/derived  -> copy from a local checkout (development)
//   SILYBENCH_DATA_REF=<branch|sha>                -> which commit of the data repo (default main)
// The site never computes numbers itself beyond simple arithmetic: everything comes from here.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "data");
const REPO = process.env.SILYBENCH_DATA_REPO ?? "tgarg01/silybench-data";
const REF = process.env.SILYBENCH_DATA_REF ?? "main";
const LOCAL = process.env.SILYBENCH_DATA_DIR;
const FILES = ["index.json", "cost.json"];

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "runs"), { recursive: true });

  if (LOCAL) {
    for (const f of FILES) fs.copyFileSync(path.join(LOCAL, f), path.join(OUT, f));
    for (const f of fs.readdirSync(path.join(LOCAL, "runs"))) {
      fs.copyFileSync(path.join(LOCAL, "runs", f), path.join(OUT, "runs", f));
    }
    console.log(`data: copied from ${LOCAL}`);
    return;
  }

  const base = `https://raw.githubusercontent.com/${REPO}/${REF}/derived`;
  const get = async (rel) => {
    const res = await fetch(`${base}/${rel}`);
    if (!res.ok) throw new Error(`GET ${base}/${rel}: ${res.status}`);
    return res.text();
  };
  for (const f of FILES) fs.writeFileSync(path.join(OUT, f), await get(f));
  const index = JSON.parse(fs.readFileSync(path.join(OUT, "index.json"), "utf8"));
  await Promise.all(
    index.map(async (r) =>
      fs.writeFileSync(path.join(OUT, "runs", `${r.run_id}.json`), await get(`runs/${r.run_id}.json`)),
    ),
  );
  console.log(`data: ${index.length} runs from ${REPO}@${REF}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
