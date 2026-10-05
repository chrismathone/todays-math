#!/usr/bin/env node
/**
 * One disposition row for every question the completed replay held (1,496),
 * joined from an official run and a reconstructed run, with counts that are
 * computed here and nowhere typed by hand.
 *
 *   node build-disposition.mjs --official supplement-002 --reconstructed census-001 --run report-001
 *
 * Writes once under <held-validation dir>/report/<run>/:
 *   disposition.json   1,496 rows
 *   summary.json       counts, inputs, outputs and their SHA-256
 *   REPORT.md          the same numbers for a reader
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { FROZEN, PATHS, readFrozen, sha256 } from "./lib/store.mjs";

const { values } = parseArgs({
  options: {
    official: { type: "string" },
    reconstructed: { type: "string" },
    run: { type: "string" },
  },
});
for (const key of ["official", "reconstructed", "run"])
  if (!values[key]) throw new Error(`--${key} is required`);
const outDir = join(PATHS.heldOut, "report", values.run);
if (existsSync(outDir)) throw new Error("Run exists: " + outDir);

const readOwn = (path) => {
  const bytes = readFileSync(path);
  return {
    value: JSON.parse(bytes.toString("utf8")),
    reference: { path: path.replace(/\\/g, "/"), sha256: sha256(bytes) },
  };
};
const officialDir = join(PATHS.heldOut, "official", values.official);
const reconstructedDir = join(
  PATHS.heldOut,
  "reconstructed",
  values.reconstructed,
);
const official = readOwn(join(officialDir, "disposition.json"));
const officialCandidates = readOwn(join(officialDir, "candidates.json"));
const census = readOwn(join(reconstructedDir, "census.json"));
const reconstructedCandidates = readOwn(
  join(reconstructedDir, "candidates.json"),
);

const held = readFrozen("heldDiagnostics").records;
const rows = [...official.value.records, ...census.value.records];
const byId = new Map(rows.map((row) => [row.questionId, row]));
if (rows.length !== 1496 || byId.size !== 1496)
  throw new Error("Not 1,496 unique rows");
for (const row of held)
  if (!byId.has(row.questionId))
    throw new Error("Held question missing: " + row.questionId);
const offered = new Set(
  [
    ...officialCandidates.value.records,
    ...reconstructedCandidates.value.records,
  ].map((r) => r.questionId),
);
for (const row of rows) {
  const isOffered =
    row.outcome === "offered" || row.outcome === "offered_conditional";
  if (isOffered !== offered.has(row.questionId))
    throw new Error("Disposition and candidates disagree: " + row.questionId);
}

const count = (list, key) => {
  const counts = {};
  for (const row of list) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
};
const officialRows = official.value.records;
const reconstructedRows = census.value.records;

/** Every recognition round of this work: what was asked, from its own request and result files. */
const rounds = [];
const requestDir = join(PATHS.heldOut, "probe-requests");
for (const name of readdirSync(requestDir).sort()) {
  const request = readOwn(join(requestDir, name));
  const round = request.value.round;
  const resultDir = join(PATHS.heldOut, "probes", "round-" + round);
  const results = existsSync(resultDir)
    ? readdirSync(resultDir).filter((f) => f.endsWith(".json"))
    : [];
  let heardProbes = 0;
  let overflow = 0;
  let gpuSeconds = 0;
  const purposes = {};
  for (const file of results) {
    const container = JSON.parse(readFileSync(join(resultDir, file), "utf8"));
    gpuSeconds += container.gpuSeconds ?? 0;
    for (const probe of container.probes) {
      heardProbes++;
      overflow += probe.overflow ? 1 : 0;
      purposes[probe.purpose] = (purposes[probe.purpose] ?? 0) + 1;
    }
  }
  const asked = request.value.sources.reduce((n, s) => n + s.probes.length, 0);
  rounds.push({
    round,
    mode: request.value.mode,
    language: request.value.language,
    request: request.reference,
    sourcesAsked: request.value.sources.length,
    probesAsked: asked,
    audioSecondsAsked: Math.round(
      request.value.sources.reduce(
        (n, s) =>
          n + s.probes.reduce((m, p) => m + p.frameCount / s.sampleRate, 0),
        0,
      ),
    ),
    sourcesRecognized: results.length,
    probesRecognized: heardProbes,
    complete: heardProbes === asked,
    overflow,
    gpuSeconds: Math.round(gpuSeconds),
    purposes,
  });
}

const slim = rows.map((row) => ({
  questionId: row.questionId,
  sourceRecordId: row.sourceRecordId,
  setId: row.setId,
  sourceNumber: row.sourceNumber,
  reconstructed: row.reconstructed,
  priorReasons: row.priorReasons,
  outcome: row.outcome,
  route:
    row.route ??
    (row.outcome === "offered_conditional"
      ? "existing_reconstructed_native_adapter"
      : null),
  tier: row.tier ?? null,
  numberGrade: row.numberGrade ?? null,
  reason: row.reason ?? null,
  seekStartMs: row.seekStartMs ?? null,
  seekEndMs: row.seekEndMs ?? null,
  dependsOnProposedQuestionIds: row.dependsOnProposedQuestionIds ?? [],
  newListening: row.reconstructed
    ? row.tested.newListening
    : Boolean(row.tested?.numberClipAttempts?.length),
  detailIn: row.reconstructed ? census.reference.path : official.reference.path,
}));

const summary = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  writesDatabase: false,
  writesStorage: false,
  writesMedia: false,
  originalAudioModified: false,
  humanReviewed: false,
  population: {
    held: 1496,
    official: officialRows.length,
    reconstructed: reconstructedRows.length,
    uniqueQuestionIds: byId.size,
  },
  baseline: official.value.baseline,
  frozenInputs: FROZEN,
  inputs: {
    officialDisposition: official.reference,
    officialCandidates: officialCandidates.reference,
    reconstructedCensus: census.reference,
    reconstructedCandidates: reconstructedCandidates.reference,
  },
  tool: official.value.tool,
  counts: {
    official: {
      byOutcome: count(officialRows, (r) => r.outcome),
      offeredByRoute: count(
        officialRows.filter((r) => r.outcome === "offered"),
        (r) => r.route,
      ),
      offeredByNumberGrade: count(
        officialRows.filter((r) => r.outcome === "offered"),
        (r) => r.numberGrade,
      ),
      notOfferedByReason: count(
        officialRows.filter((r) => r.outcome !== "offered"),
        (r) => r.outcome + ": " + r.reason,
      ),
      byPriorReason: count(
        officialRows,
        (r) => r.priorReasons.join("|") + " -> " + r.outcome,
      ),
      offeredSources: new Set(
        officialRows
          .filter((r) => r.outcome === "offered")
          .map((r) => r.sourceRecordId),
      ).size,
    },
    reconstructed: {
      byOutcome: count(reconstructedRows, (r) => r.outcome),
      byReason: count(
        reconstructedRows,
        (r) => r.reason ?? "offered_conditional",
      ),
      newListening: count(reconstructedRows, (r) =>
        String(r.tested.newListening),
      ),
      offeredSources: new Set(
        reconstructedRows
          .filter((r) => r.outcome === "offered_conditional")
          .map((r) => r.sourceRecordId),
      ).size,
    },
  },
  recognitionRounds: rounds,
  screenshot: officialRows
    .filter(
      (r) =>
        r.sourceRecordId === "ebsi-high-2-2018-2" &&
        [2, 3].includes(r.sourceNumber),
    )
    .map((r) => ({
      questionId: r.questionId,
      sourceNumber: r.sourceNumber,
      outcome: r.outcome,
      route: r.route,
      numberGrade: r.numberGrade,
      seekStartMs: r.seekStartMs,
      seekEndMs: r.seekEndMs,
      startFrame: r.place?.startFrame,
      onsetFrame: r.place?.onsetFrame,
      sampleRate: r.place?.sampleRate,
      longProbeText: r.number?.text,
      numberClipText: r.number?.numberClip?.text,
      sentence: r.sentence && {
        text: r.sentence.text,
        occurrencesInScript: r.sentence.occurrencesInScript,
        hangulShare: r.sentence.hangulShare,
      },
      opening: r.dialogue && {
        quotes: r.dialogue.quotes.map((q) => q.text),
        startFrame: r.dialogue.startFrame,
      },
      references: r.references,
      neighbors: r.neighbors,
    })),
};

const table = (object) =>
  Object.entries(object)
    .map(([k, v]) => `| ${v} | ${k} |`)
    .join("\n");
const md = `# Held whole-original starts — disposition ${values.run}

Generated by \`claude-ambiguity/build-disposition.mjs\` from the files named below.
Every number is counted from those files.

- writesDatabase: **false** · writesStorage: **false** · writesMedia: **false** · humanReview: **false**
- baseline: ${summary.baseline.verifiedStarts} existing starts, ${summary.baseline.changed} changed
- population: ${summary.population.held} held = ${summary.population.official} official + ${summary.population.reconstructed} reconstructed, ${summary.population.uniqueQuestionIds} unique question IDs
- tool commit: \`${summary.tool.commit}\` (${summary.tool.uncommittedToolFiles} uncommitted tool files when the official run was built)

An "offered" row is an offline finding for the independent verifier to replay
from the original bytes. It is not an admission.

## Official (${summary.population.official})

| rows | outcome |
| ---: | --- |
${table(summary.counts.official.byOutcome)}

Offered, by route:

| rows | route |
| ---: | --- |
${table(summary.counts.official.offeredByRoute)}

Offered, by how the number was established:

| rows | number |
| ---: | --- |
${table(summary.counts.official.offeredByNumberGrade)}

Not offered, by reason:

| rows | reason |
| ---: | --- |
${table(summary.counts.official.notOfferedByReason)}

By prior hold reason:

| rows | prior reason -> outcome |
| ---: | --- |
${table(summary.counts.official.byPriorReason)}

## Reconstructed (${summary.population.reconstructed})

| rows | outcome |
| ---: | --- |
${table(summary.counts.reconstructed.byOutcome)}

| rows | reason |
| ---: | --- |
${table(summary.counts.reconstructed.byReason)}

Rows with a new listening in this work: ${summary.counts.reconstructed.newListening.true ?? 0}; counted from the frozen audit only: ${summary.counts.reconstructed.newListening.false ?? 0}.

## Screenshot: ebsi-high-2-2018-2 questions 2 and 3

${summary.screenshot
  .map(
    (
      r,
    ) => `- **Q${r.sourceNumber}** \`${r.questionId}\` — ${r.outcome} (${r.route}, ${r.numberGrade}); seek ${r.seekStartMs} ms → ${r.seekEndMs} ms; start frame ${r.startFrame}, number onset frame ${r.onsetFrame} at ${r.sampleRate} Hz.
  Long probe: "${r.longProbeText}". Number-only clip: "${r.numberClipText}". Sentence printed ${r.sentence?.occurrencesInScript}× in the script (Hangul share heard ${r.sentence?.hangulShare}). Own opening: "${r.opening?.quotes.join(" / ")}" from frame ${r.opening?.startFrame}. Previous known start ${r.neighbors?.previous?.startMs} ms, next ${r.neighbors?.next?.startMs} ms.`,
  )
  .join("\n")}

## Recognition actually run in this work

| round | mode | language | sources | probes asked | recognized | audio s | GPU s | overflow | purposes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rounds
  .map(
    (r) =>
      `| ${r.round} | ${r.mode} | ${r.language} | ${r.sourcesAsked} | ${r.probesAsked} | ${r.probesRecognized}${r.complete ? "" : " (incomplete)"} | ${r.audioSecondsAsked} | ${r.gpuSeconds} | ${r.overflow} | ${Object.entries(
        r.purposes,
      )
        .map(([k, v]) => k + " " + v)
        .join(", ")} |`,
  )
  .join("\n")}

## Files

| what | path | SHA-256 |
| --- | --- | --- |
${Object.entries(summary.inputs)
  .map(([k, v]) => `| ${k} | \`${v.path}\` | \`${v.sha256}\` |`)
  .join("\n")}
`;

mkdirSync(outDir, { recursive: true });
const write = (name, bytes) => {
  writeFileSync(join(outDir, name), bytes, { flag: "wx" });
  return {
    path: join(outDir, name).replace(/\\/g, "/"),
    sha256: sha256(bytes),
  };
};
const outputs = {
  disposition: write(
    "disposition.json",
    Buffer.from(
      JSON.stringify({ ...summary, records: slim }, null, 1) + "\n",
      "utf8",
    ),
  ),
  report: write("REPORT.md", Buffer.from(md, "utf8")),
};
write(
  "summary.json",
  Buffer.from(JSON.stringify({ ...summary, outputs }, null, 1) + "\n", "utf8"),
);
console.log(
  JSON.stringify(
    {
      outputs,
      official: summary.counts.official.byOutcome,
      reconstructed: summary.counts.reconstructed.byOutcome,
    },
    null,
    1,
  ),
);
