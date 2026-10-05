/**
 * Writes an immutable receipt of what was asked for against what was heard.
 *
 *   node receipt.mjs --name full-001-before-build [--sweep]
 *
 * The receipt lists every request with its exact source and probe counts, the
 * requests declared stopped, the drivers' stage records, and whether coverage
 * is complete (lib/coverage.mjs). With --sweep it also asks the planner, in
 * dry-run, what each stage would still plan from everything heard: a count of
 * what further listening the rules would ask for, written down, not acted on.
 *
 * Exit status 0 when coverage is complete, 3 when it is not. The receipt is
 * written either way and never overwritten.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { listeningCoverage } from "./lib/coverage.mjs";
import { OUT, sha256 } from "./lib/store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    name: { type: "string" },
    out: { type: "string", default: OUT },
    sweep: { type: "boolean" },
  },
});
if (!/^[a-z0-9][a-z0-9-]*$/.test(values.name ?? ""))
  throw new Error("--name is required: lower-case letters, digits and hyphens");

const SWEEP = [
  [
    "reconstructed",
    ["headings", "context", "variants", "gaps", "terminal", "quotes"],
    [],
  ],
  ["official", ["headings", "context", "numberclip", "variants", "quotes"], []],
  [
    "reconstructed",
    ["headings", "context", "variants", "gaps", "terminal", "quotes"],
    ["--converted"],
  ],
];

function sweep() {
  const rows = [];
  for (const [scope, stages, flags] of SWEEP)
    for (const stage of stages) {
      const args = [
        "plan.mjs",
        "--stage",
        stage,
        "--round",
        "999",
        "--scope",
        scope,
        "--dry-run",
      ];
      if (stage === "quotes") args.push("--controls");
      const line = execFileSync(process.execPath, [...args, ...flags], {
        cwd: HERE,
        encoding: "utf8",
        maxBuffer: 1 << 26,
      })
        .trim()
        .split("\n")
        .at(-1);
      const { requestPath, dryRun, ...planned } = JSON.parse(line);
      if (dryRun !== true)
        throw new Error("The planner did not run dry: " + stage);
      rows.push({
        scope,
        converted: flags.includes("--converted"),
        ...planned,
      });
    }
  return rows;
}

const receipt = {
  ...listeningCoverage(values.out),
  name: values.name,
  createdAt: new Date().toISOString(),
};
if (values.sweep) {
  receipt.plannerSweep = {
    note: "Dry-run plans from everything heard at this moment. A stage that would still plan probes names listening the rules would ask for and that was not done; it does not make a request incomplete.",
    stages: sweep(),
  };
  receipt.plannerSweep.probesStillPlanned = receipt.plannerSweep.stages.reduce(
    (n, row) => n + row.probes,
    0,
  );
}
const bytes = Buffer.from(JSON.stringify(receipt, null, 1), "utf8");
const path = join(values.out, "receipts", values.name + ".json");
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, bytes, { flag: "wx" });
console.log(
  JSON.stringify(
    {
      receipt: path.replace(/\\/g, "/"),
      sha256: sha256(bytes),
      complete: receipt.complete,
      ...receipt.summary,
      probesStillPlanned: receipt.plannerSweep?.probesStillPlanned,
    },
    null,
    1,
  ),
);
process.exit(receipt.complete ? 0 : 3);
