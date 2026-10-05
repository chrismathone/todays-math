#!/usr/bin/env node
/**
 * Replays every held official question and writes, once:
 *
 *   <held-validation dir>/official/<run>/candidates.json    the supplement
 *   <held-validation dir>/official/<run>/disposition.json   all held official rows
 *
 *   node build-official-supplement.mjs --run supplement-001
 *
 * The supplement holds only questions the completed replay held, in the frozen
 * producer row shape, for the independent verifier to replay from the source.
 * It is an offline finding: nothing here writes a database, Storage or media,
 * and no row claims human review.
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
import { METHOD, RULES } from "./lib/identity.mjs";
import { replayOfficial } from "./lib/official.mjs";
import { FROZEN, PATHS, sha256 } from "./lib/store.mjs";
import { settleOffered, supplementRow } from "./lib/supplement.mjs";

const { values } = parseArgs({
  options: { run: { type: "string" }, "dry-run": { type: "boolean" } },
});
if (!values.run) throw new Error("--run is required");
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(PATHS.heldOut, "official", values.run);
if (!values["dry-run"] && existsSync(outDir))
  throw new Error("Run exists: " + outDir);

const context = loadContext();
const held = context.held.filter((row) => !row.reconstructed);
const { results, sources, store } = replayOfficial(context, held);
settleOffered(context, results, sources, store);

const heldIds = new Set(held.map((row) => row.questionId));
const records = [];
const disposition = [];
for (const row of held) {
  const result = results.get(row.questionId);
  const { script } = sources.get(row.sourceRecordId);
  const frozen = context.marksByQuestion.get(row.questionId);
  const offered = result.outcome === "candidate";
  if (offered) records.push(supplementRow(result, frozen, script, store));
  const proof = result.proof ?? null;
  disposition.push({
    questionId: row.questionId,
    sourceRecordId: row.sourceRecordId,
    setId: row.setId,
    sourceNumber: row.sourceNumber,
    reconstructed: false,
    kind: result.kind,
    priorReasons: row.reasons,
    outcome: offered
      ? "offered"
      : result.outcome === "diagnostic"
        ? "evidence_below_agreed_route"
        : "held",
    route: offered ? result.route : null,
    tier: proof?.tier ?? null,
    numberGrade: proof?.numberGrade ?? null,
    reason: offered ? null : result.reason,
    reasonDetail: offered ? null : (result.detail ?? null),
    ownEvidenceReplayed: Boolean(proof),
    seekStartMs: proof ? result.claim.seekStartMs : null,
    seekEndMs: proof ? result.claim.seekEndMs : null,
    place: proof?.place ?? null,
    number: proof?.number ?? null,
    sentence: proof?.sentence ?? null,
    dialogue: proof?.dialogue
      ? {
          method: proof.dialogue.method,
          quotes: proof.dialogue.quotes,
          startFrame: proof.dialogue.startFrame,
          onsetFrame: proof.dialogue.onsetFrame,
          probeId: proof.dialogue.probeId,
          selectedSegmentIds: proof.dialogue.selectedSegmentIds,
        }
      : null,
    references: result.claim
      ? {
          cueProbe: result.claim.cueProbe,
          numberClip: result.claim.numberClip ?? null,
          dialogueProbe: result.claim.dialogueProbe ?? null,
        }
      : null,
    neighbors: result.neighbors ?? null,
    dependsOnProposedQuestionIds: result.dependsOnProposed ?? [],
    tested: result.diagnostics ?? null,
    placesTried: result.placesTried ?? 0,
  });
}
if (records.some((row) => !heldIds.has(row.questionId)))
  throw new Error("A supplement row is not a prior-held question");
if (records.some((row) => context.baselineByQuestion.has(row.questionId)))
  throw new Error("A supplement row already has a verified start");
if (new Set(records.map((row) => row.questionId)).size !== records.length)
  throw new Error("Duplicate supplement row");
if (
  disposition.length !== 397 ||
  new Set(disposition.map((row) => row.questionId)).size !== 397
)
  throw new Error("The official held population is not 397 unique questions");

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
const tool = {
  commit: git("rev-parse", "HEAD"),
  uncommittedToolFiles: (git("status", "--porcelain", "--", ".") ?? "")
    .split("\n")
    .filter(Boolean).length,
  sha256: Object.fromEntries(
    toolFiles.map((f) => [f, sha256(readFileSync(join(here, f)))]),
  ),
};
const probeRounds = Object.fromEntries(
  context.probeRoots.map((root) => [
    root,
    existsSync(join(root, "probes"))
      ? readdirSync(join(root, "probes")).sort()
      : [],
  ]),
);
const head = {
  schemaVersion: 1,
  evidenceContractVersion: 1,
  provider: "claude",
  createdAt: new Date().toISOString(),
  statement:
    "Offline findings for questions the completed replay held. A row is not permission to write anything; the independent verifier replays it from the original bytes.",
  writesDatabase: false,
  writesStorage: false,
  writesMedia: false,
  originalAudioModified: false,
  officialContentModified: false,
  humanReviewed: false,
  inventorySha256: FROZEN.inventory.sha256,
  frozenInputs: FROZEN,
  baseline: {
    certificate: FROZEN.certificate,
    verifiedStarts: context.baselineByQuestion.size,
    changed: 0,
  },
  identityMethod: METHOD,
  identityRules: RULES,
  tool,
  probeRoundsRead: probeRounds,
};
const candidates = {
  ...head,
  supplementOf: FROZEN.claudeMarks,
  onlyPriorHeldQuestions: true,
  counts: {
    records: records.length,
    byRoute: count(records, (r) => r.claudeHeldValidation.route),
    byTierAndNumber: count(
      records,
      (r) =>
        r.claudeHeldValidation.tier +
        " / " +
        r.claudeHeldValidation.numberGrade,
    ),
    byPriorReason: count(records, (r) =>
      r.claudeHeldValidation.priorHoldReasons.join("|"),
    ),
    sources: new Set(records.map((r) => r.sourceRecordId)).size,
    withNumberClip: records.filter((r) => r.numberClipEvidence).length,
    leaningOnAnotherProposedStart: records.filter(
      (r) => r.claudeHeldValidation.dependsOnProposedQuestionIds.length,
    ).length,
  },
  records,
};
const report = {
  ...head,
  population: { heldOfficial: 397 },
  counts: {
    byOutcome: count(disposition, (r) => r.outcome),
    offeredByRoute: count(
      disposition.filter((r) => r.outcome === "offered"),
      (r) => r.route,
    ),
    notOfferedByReason: count(
      disposition.filter((r) => r.outcome !== "offered"),
      (r) => r.outcome + ": " + r.reason,
    ),
    byPriorReasonAndOutcome: count(
      disposition,
      (r) =>
        r.priorReasons.join("|") +
        " -> " +
        (r.outcome === "offered"
          ? "offered/" + r.route
          : r.outcome + "/" + r.reason),
    ),
  },
  records: disposition,
};
console.log(
  JSON.stringify(
    {
      run: values.run,
      supplement: candidates.counts,
      disposition: report.counts.byOutcome,
      notOffered: report.counts.notOfferedByReason,
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
  candidates: write("candidates.json", candidates),
  disposition: write("disposition.json", report),
};
writeFileSync(
  join(outDir, "sha256.json"),
  JSON.stringify(written, null, 1) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify(written, null, 1));
