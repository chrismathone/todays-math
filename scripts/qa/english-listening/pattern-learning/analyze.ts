import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  analyzeCorpus,
  type PrivateRecord,
  type TranscriptRow,
  type Supplement,
} from "./analyzer";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
function argument(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1] || fallback;
}
function inside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
async function jsonFile(filename: string): Promise<unknown> {
  // Parse failures must never echo private content or source paths into terminal logs.
  try {
    return JSON.parse(
      (await readFile(filename, "utf8")).replace(/^\uFEFF/, ""),
    );
  } catch {
    throw new Error("Private JSON input unreadable");
  }
}
async function run() {
  const mainRoot = path.resolve(
    argument("--main", "C:/Creative/testautocreator"),
  );
  const retirementDir = path.join(
    mainRoot,
    ".qa-artifacts/listening-retirement-20261006",
  );
  const receiptPath = path.join(retirementDir, "pattern-coverage-private.json");
  try {
    execFileSync("git", ["check-ignore", "--quiet", receiptPath], {
      cwd: mainRoot,
      stdio: "ignore",
    });
  } catch {
    throw new Error("Private receipt directory must be Git ignored");
  }
  const packet = (await jsonFile(
    path.join(retirementDir, "corpus-private.json"),
  )) as { records: PrivateRecord[]; transcripts: TranscriptRow[] };
  const inventory = (await jsonFile(
    path.join(
      mainRoot,
      "output/listening-assessments/whole-audio-seek-20261006/native-recovery/rebase-baseline-001/inventory.json",
    ),
  )) as { records: PrivateRecord[] };
  const supplements = new Map<string, Supplement>();
  for (const record of packet.records) {
    const supplement: Supplement = {};
    for (const [field, inputPath] of [
      ["asr", record.asrPath],
      ["prepared", record.preparedPath],
      ["alignment", record.alignmentPath],
    ] as const) {
      if (!inputPath) continue;
      const resolved = path.resolve(mainRoot, inputPath);
      if (!inside(mainRoot, resolved))
        throw new Error(
          "Supplement must remain within authorized MAIN input tree",
        );
      let input: unknown;
      try {
        input = await jsonFile(resolved);
      } catch {
        continue;
      }
      if (field === "asr") supplement.asr = input as Supplement["asr"];
      if (field === "prepared") supplement.prepared = input;
      if (field === "alignment")
        supplement.alignment = input as Supplement["alignment"];
    }
    supplements.set(record.sourceRecordId, supplement);
  }
  const { patterns, privateCoverage } = analyzeCorpus(
    packet,
    inventory,
    supplements,
  );
  const retainedPath = path.join(
    repoRoot,
    "src/lib/english/listening/creation/assessment-patterns.json",
  );
  await mkdir(path.dirname(retainedPath), { recursive: true });
  await mkdir(retirementDir, { recursive: true });
  await writeFile(
    retainedPath,
    JSON.stringify(patterns, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    receiptPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        population: patterns.population,
        coverage: patterns.coverage,
        records: privateCoverage,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(
    JSON.stringify({
      population: patterns.population,
      coverage: patterns.coverage,
    }),
  );
}
run().catch(() => {
  console.error(
    "Pattern analysis failed; no private content printed. Check private inputs and population coverage locally.",
  );
  process.exitCode = 1;
});
