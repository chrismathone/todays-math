#!/usr/bin/env node
/**
 * Census of every held reconstructed question, and conditional rows for the
 * ones whose original number was heard first at a measured onset.
 *
 *   node build-reconstructed-census.mjs --run census-001 [--dry-run]
 *
 * Writes once under <held-validation dir>/reconstructed/<run>/:
 *   census.json      one row per held reconstructed question (1,099)
 *   candidates.json  rows in the frozen ledger's candidate shape, for the
 *                    independent verifier's existing reconstructed route
 *
 * A row is an offline finding. The passage a question belongs to is the frozen
 * mapping audit's and is not re-decided here; nothing writes a database,
 * Storage or media, and no row claims human review.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { loadContext } from "./lib/context.mjs";
import { replayReconstructed } from "./lib/reconstructed.mjs";
import { FROZEN, PATHS, readFrozen, sha256 } from "./lib/store.mjs";

const { values } = parseArgs({
  options: { run: { type: "string" }, "dry-run": { type: "boolean" } },
});
if (!values.run) throw new Error("--run is required");
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(PATHS.heldOut, "reconstructed", values.run);
if (!values["dry-run"] && existsSync(outDir))
  throw new Error("Run exists: " + outDir);

const context = {
  ...loadContext(),
  audit: readFrozen("mappingAudit"),
  ledger: readFrozen("geminiLedger"),
  nativeDir: PATHS.grokOut,
  probeRoots: [PATHS.grokOut, PATHS.heldOut],
};
const { census, candidates } = replayReconstructed(context);
if (
  census.length !== 1099 ||
  new Set(census.map((r) => r.questionId)).size !== 1099
)
  throw new Error(
    "The reconstructed held population is not 1,099 unique questions",
  );
const heldIds = new Set(census.map((r) => r.questionId));
if (
  candidates.some(
    (r) =>
      !heldIds.has(r.questionId) ||
      context.baselineByQuestion.has(r.questionId),
  )
)
  throw new Error("A candidate is not a prior-held question");

const count = (rows, key) => {
  const counts = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
};
const git = (...args) => {
  try {
    return execFileSync("git", args, { cwd: here, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};
const toolFiles = [
  ...readdirSync(here),
  ...readdirSync(join(here, "lib")).map((f) => "lib/" + f),
]
  .filter((f) => f.endsWith(".mjs"))
  .sort();
const head = {
  schemaVersion: 1,
  evidenceContractVersion: 1,
  createdAt: new Date().toISOString(),
  statement:
    "Offline findings for reconstructed questions the completed replay held. Not an admission: the passage is the frozen mapping audit's, and the independent verifier replays every row from the original bytes.",
  writesDatabase: false,
  writesStorage: false,
  writesMedia: false,
  originalAudioModified: false,
  humanReviewed: false,
  inventorySha256: FROZEN.inventory.sha256,
  frozenInputs: FROZEN,
  baseline: {
    certificate: FROZEN.certificate,
    verifiedStarts: context.baselineByQuestion.size,
    changed: 0,
  },
  tool: {
    commit: git("rev-parse", "HEAD"),
    uncommittedToolFiles: (git("status", "--porcelain", "--", ".") ?? "")
      .split("\n")
      .filter(Boolean).length,
    sha256: Object.fromEntries(
      toolFiles.map((f) => [f, sha256(readFileSync(join(here, f)))]),
    ),
  },
  probeRoundsRead: Object.fromEntries(
    context.probeRoots.map((root) => [
      root,
      readdirSync(join(root, "probes"))
        .filter((name) => name.startsWith("round-"))
        .sort(),
    ]),
  ),
};
const censusFile = {
  ...head,
  population: { heldReconstructed: 1099 },
  counts: {
    byOutcome: count(census, (r) => r.outcome),
    byReason: count(census, (r) => r.reason ?? "offered_conditional"),
    byPriorReasonAndOutcome: count(
      census,
      (r) =>
        r.priorReasons.join("|") + " -> " + (r.reason ?? "offered_conditional"),
    ),
    sourcesWithOffer: new Set(
      census
        .filter((r) => r.outcome === "offered_conditional")
        .map((r) => r.sourceRecordId),
    ).size,
  },
  records: census,
};
const candidateFile = {
  ...head,
  provider: "grok",
  compilerProvider: "claude",
  compilerModel: "claude-opus-5-5",
  upstreamProducer: "grok",
  upstreamArtifacts: [FROZEN.geminiLedger, FROZEN.mappingAudit],
  conditional:
    "Rows use the existing reconstructed native adapter shape. They are offered for independent replay only; original-scope inheritance against existing reconstructed starts is checked by the coordinator.",
  onlyPriorHeldQuestions: true,
  counts: {
    records: candidates.length,
    sources: new Set(candidates.map((r) => r.sourceRecordId)).size,
    originalPassages: new Set(
      candidates.map((r) => r.sourceRecordId + "#" + r.cueSegmentIds.join(",")),
    ).size,
  },
  records: candidates,
};
console.log(
  JSON.stringify(
    {
      run: values.run,
      census: censusFile.counts,
      candidates: candidateFile.counts,
    },
    null,
    1,
  ),
);
if (values["dry-run"]) process.exit(0);
mkdirSync(outDir, { recursive: true });
const write = (name, value) => {
  const bytes = Buffer.from(JSON.stringify(value, null, 1) + "\n", "utf8");
  writeFileSync(join(outDir, name), bytes, { flag: "wx" });
  return {
    path: join(outDir, name).replace(/\\/g, "/"),
    sha256: sha256(bytes),
  };
};
const written = {
  census: write("census.json", censusFile),
  candidates: write("candidates.json", candidateFile),
};
writeFileSync(
  join(outDir, "sha256.json"),
  JSON.stringify(written, null, 1) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify(written, null, 1));
