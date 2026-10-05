#!/usr/bin/env node
/**
 * Replays the stored recognitions of a scope and writes one immutable run:
 *
 *   node build-ledger.mjs --run pilot-001 --scope pilot [--dry-run]
 *
 *   ledger.json      one row per held question of the scope (candidate | held)
 *   candidates.json  the offered rows only
 *   tables.json      per source: native headings, closings, passage starts
 *   controls.json    blind replay of questions that already have a certified
 *                    start, heading-level comparison, adversarial inputs
 *   summary.json     counts, input and tool hashes
 *
 * Nothing is recognized here and no audio is decoded: every onset is re-measured
 * from the loudness cache bound to the frozen clock, every probe is read from a
 * container bound to the source bytes, the full PCM and its request file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  OFFICIAL_ADAPTER,
  OFFICIAL_ROUTE,
  resolveOfficial,
} from "./lib/official.mjs";
import { ADAPTER, certifiedStarts, resolveSource } from "./lib/resolve.mjs";
import {
  Hold,
  ROUTE,
  RULES,
  bindQuotes,
  establishHeadings,
  headingReading,
  measuredStart,
  readsHeading,
} from "./lib/rules.mjs";
import { openSession } from "./lib/session.mjs";
import {
  GROUPED_CONTROLS,
  INSPECTED_DURING_DEVELOPMENT,
  PILOT_PLAN,
  ProbeStore,
  readBoundJson,
  sha256,
} from "./lib/store.mjs";

const { values } = parseArgs({
  options: {
    run: { type: "string" },
    scope: { type: "string", default: "pilot" },
    "source-id": { type: "string", multiple: true },
    "dry-run": { type: "boolean" },
    out: { type: "string" },
    inventory: { type: "string" },
    "inventory-sha256": { type: "string" },
    clock: { type: "string" },
    "clock-sha256": { type: "string" },
    certificate: { type: "string" },
    "certificate-sha256": { type: "string" },
  },
});
if (!values.run) throw new Error("--run is required");
const session = openSession(values);
const runDir = join(session.out, "runs", values.run);
if (existsSync(runDir)) throw new Error("Run exists: " + runDir);
const certificateSha256 = session.baseline.inputs.certificate.sha256;
const adversarialStore = new ProbeStore([join(session.out, "adversarial")]);

const count = (map, key, n = 1) => (map[key] = (map[key] ?? 0) + n);
// The coordinator's family-separated partition of the certified controls.
const groups = readBoundJson(
  GROUPED_CONTROLS.path,
  GROUPED_CONTROLS.sha256,
  "Grouped controls",
);
const partitionOf = new Map();
for (const family of groups.families)
  for (const id of family.sourceRecordIds) partitionOf.set(id, family.partition);
const stratum = (record) =>
  [
    INSPECTED_DURING_DEVELOPMENT.includes(record.sourceRecordId)
      ? "inspected_during_development"
      : (partitionOf.get(record.sourceRecordId) ?? "no_partition"),
    record.source.year <= 2012
      ? "2006-2012"
      : record.source.year <= 2017
        ? "2013-2017"
        : "2018+",
  ].join("/");

const ledger = [];
const tables = {};
const controls = {
  blindReplay: [],
  headingComparison: [],
  adversarial: {
    wrongNumber: { tested: 0, passed: 0, cases: [] },
    neighbourQuote: { tested: 0, passed: 0, cases: [] },
    firstMemberKeepsSharedHead: { tested: 0, violated: 0, cases: [] },
    anotherSourcesContainer: { tested: 0, passed: 0 },
    cutAfter400ms: { tested: 0, wroteTheNumber: 0, passed: 0, cases: [] },
    begun300msIntoNumber: { tested: 0, wroteTheNumberFirst: 0, passed: 0, cases: [] },
  },
};
const ids = session.scope(values.scope, values["source-id"]);
let previousWorld = null;

for (const id of ids) {
  const w = session.world(id);
  const held = w.certRows.filter((r) => r.status === "held");
  const identityOf = (row) => ({
    sourceRecordId: id,
    setId: w.record.setId,
    revision: w.record.revision,
    documentSha256: w.record.documentSha256,
    questionId: row.questionId,
    sourceNumber: row.sourceNumber,
    provider: row.provider,
    sourceAudioSha256: w.record.sourceAudioSha256,
    playbackSha256: w.record.audio.sha256,
    reconstructed: Boolean(row.reconstructed),
    route: ROUTE,
    priorReasons: row.reasons,
  });
  if (w.identity.unavailable) {
    for (const row of held)
      ledger.push({
        ...identityOf(row),
        status: "held",
        reasons: [w.identity.unavailable],
        tested: { newListening: false },
      });
    continue;
  }
  if (!w.record.reconstructed) {
    // Official questions: the same measured passages, bound by the question's
    // own printed script section. A separate named route.
    const official = resolveOfficial({
      record: w.record,
      native: w.native,
      certRows: w.certRows,
      koListenings: w.koListenings,
      enListenings: w.enListenings,
      hints: w.hints,
      certificateSha256,
    admissions: session.baseline.admissions,
      terminalScan: session.terminalScan(w),
      script: w.script,
      targets: held,
    });
    tables[id] = official.table;
    for (const row of official.rows)
      ledger.push({
        ...row,
        priorReasons: held.find((r) => r.questionId === row.questionId).reasons,
      });
    continue;
  }
  const base = {
    record: w.record,
    native: w.native,
    certRows: w.certRows,
    koListenings: w.koListenings,
    enListenings: w.enListenings,
    generation: w.generation,
    hints: w.hints,
    certificateSha256,
    admissions: session.baseline.admissions,
    terminalScan: session.terminalScan(w),
  };
  const resolved = resolveSource({
    ...base,
    targets: held.filter((r) => r.reconstructed),
    blind: false,
  });
  tables[id] = resolved.table;
  const priorById = new Map(held.map((r) => [r.questionId, r.reasons]));
  for (const row of resolved.rows)
    ledger.push({ ...row, priorReasons: priorById.get(row.questionId) });

  // ---- controls: the same code, certified starts unread while deciding ----
  const rate = w.native.sampleRate;
  const existing = w.certRows.filter((r) => r.audioRange && r.reconstructed);
  const blind = resolveSource({ ...base, targets: existing, blind: true });
  const certified = certifiedStarts(w.certRows, rate);
  for (const row of blind.rows) {
    const cert = existing.find((r) => r.questionId === row.questionId);
    const scope =
      cert.scopeQuestionNumbers ?? cert.originalScopeEvidence?.scopeQuestionNumbers;
    const entry = {
      sourceRecordId: id,
      stratum: stratum(w.record),
      questionId: row.questionId,
      certifiedStartMs: cert.audioRange.startMs,
      certifiedScope: scope,
    };
    if (row.status !== "candidate")
      controls.blindReplay.push({ ...entry, outcome: "held", reason: row.reasons[0] });
    else {
      const sameScope = row.scopeQuestionNumbers.join() === scope.join();
      const delta = row.seekStartMs - cert.audioRange.startMs;
      controls.blindReplay.push({
        ...entry,
        replayedStartMs: row.seekStartMs,
        replayedScope: row.scopeQuestionNumbers,
        replayedKind: row.kind,
        deltaMs: delta,
        outcome: !sameScope
          ? "other_scope"
          : delta === 0
            ? "identical_start"
            : delta > 0
              ? "later"
              : "earlier",
      });
    }
  }
  for (const start of blind.table.starts) {
    const cert = certified.get(start.number);
    if (!cert || cert.conflict) continue;
    controls.headingComparison.push({
      sourceRecordId: id,
      stratum: stratum(w.record),
      originalNumber: start.number,
      certifiedStartMs: cert.startMs,
      nativeStartMs: start.startMs,
      deltaMs: start.startMs - cert.startMs,
    });
  }

  // ---- adversarial inputs over the real stored evidence ----
  const adv = controls.adversarial;
  const { headings } = establishHeadings(w.native, w.koListenings);
  for (const heading of headings) {
    if (heading.numbers.length !== 1) continue;
    const [n] = heading.numbers;
    for (const wrong of [n - 1, n + 1]) {
      adv.wrongNumber.tested++;
      if (readsHeading(heading.reading, [wrong])) {
        adv.wrongNumber.passed++;
        adv.wrongNumber.cases.push({ sourceRecordId: id, heard: n, asked: wrong });
      }
    }
  }
  // A quote offered for passage N, with N itself taken away, must bind nowhere.
  for (const row of resolved.rows) {
    if (row.status !== "candidate") continue;
    adv.neighbourQuote.tested++;
    try {
      const bound = bindQuotes(
        row.localizedMappingEvidence.quotes.map((q) => q.text),
        resolved.passages.filter((p) => p.key !== row.cueNumber),
        w.enListenings.filter(
          (l) =>
            l.startFrame + l.frameCount <= row.nativeRecovery.passageFrames.fromFrame ||
            l.startFrame >= row.nativeRecovery.passageFrames.toFrame,
        ),
      );
      adv.neighbourQuote.passed++;
      adv.neighbourQuote.cases.push({
        sourceRecordId: id,
        questionId: row.questionId,
        own: row.cueNumber,
        alsoBoundTo: bound.passageKey,
      });
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
    }
  }
  for (const heading of headings) {
    if (heading.kind !== "shared_head") continue;
    adv.firstMemberKeepsSharedHead.tested++;
    const first = heading.covers[0];
    const start = blind.table.starts.find((s) => s.number === first);
    const ownCue = headings.find(
      (h) => h.kind === "member" && h.numbers[0] === first && h.sharedHead === heading,
    );
    if (start && start.startMs !== Math.floor((heading.startFrame * 1000) / rate)) {
      adv.firstMemberKeepsSharedHead.violated++;
      adv.firstMemberKeepsSharedHead.cases.push({ sourceRecordId: id, first });
    } else if (ownCue)
      adv.firstMemberKeepsSharedHead.cases.push({
        sourceRecordId: id,
        first,
        ownCueLaterByMs: Math.floor(((ownCue.startFrame - heading.startFrame) * 1000) / rate),
        keptHead: true,
      });
  }
  if (previousWorld) {
    // Another recording's bounded recognition offered for this one.
    adv.anotherSourcesContainer.tested++;
    const foreign = previousWorld.allListenings[0];
    const container = foreign && JSON.parse(readFileSync(foreign.ref.path, "utf8"));
    if (
      container &&
      container.sourceAudioSha256 === w.record.sourceAudioSha256 &&
      container.nativePcm.sha256 === w.identity.pcmSha256
    )
      adv.anotherSourcesContainer.passed++;
  }
  previousWorld = w;
  for (const listening of adversarialStore.listenings(w.record, w.identity)) {
    const reading = headingReading(listening.probe);
    const expected = listening.probe.expectedNumbers;
    const wrote = Boolean(
      reading.cue && reading.cue.numbers.join() === expected.join(),
    );
    let measured = true;
    try {
      measuredStart(w.native, listening.startFrame, listening.onsetFrame);
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
      measured = false;
    }
    const accepted =
      measured && readsHeading(reading, expected) && Boolean(reading.instruction);
    const bucket =
      listening.purpose === "adversarial_cut_after_400ms"
        ? adv.cutAfter400ms
        : adv.begun300msIntoNumber;
    bucket.tested++;
    if (wrote) count(bucket, bucket === adv.cutAfter400ms ? "wroteTheNumber" : "wroteTheNumberFirst");
    if (accepted) {
      bucket.passed++;
      bucket.cases.push({ sourceRecordId: id, expected, text: reading.text, probe: listening.ref });
    }
  }
}

// ------------------------------------------------------------- summary ----
const candidates = ledger.filter((r) => r.status === "candidate");
const reasons = {};
for (const row of ledger) if (row.status === "held") count(reasons, row.reasons[0]);
const byKind = {};
for (const row of candidates) count(byKind, row.kind);
const blindOutcomes = {};
const blindByStratum = {};
for (const row of controls.blindReplay) {
  count(blindOutcomes, row.outcome === "held" ? "held:" + row.reason : row.outcome);
  blindByStratum[row.stratum] ??= {};
  count(blindByStratum[row.stratum], row.outcome);
}
const headingDelta = {};
for (const row of controls.headingComparison)
  count(headingDelta, row.deltaMs === 0 ? "identical" : row.deltaMs > 0 ? "later" : "earlier");
const here = dirname(fileURLToPath(import.meta.url));
const tool = {};
for (const file of [
  "build-ledger.mjs",
  "plan.mjs",
  "measure-native.mjs",
  ...readdirSync(join(here, "lib")).map((f) => "lib/" + f),
])
  tool[file] = sha256(readFileSync(join(here, file)));
let commit = null;
try {
  commit = execFileSync("git", ["-C", here, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  commit = null;
}
const passages = new Set(candidates.map((r) => r.sourceRecordId + "#" + r.cueNumber));
// The 35 questions the research plan named as a pilot, one line each. Their
// diagnostic scope is the provider transcript's and is shown beside what the
// native route found; it decided nothing here.
const pilotPlan = readBoundJson(PILOT_PLAN.path, PILOT_PLAN.sha256, "Pilot plan");
const byQuestion = new Map(ledger.map((row) => [row.questionId, row]));
const pilotRows = pilotPlan.candidateQuestions
  .filter((q) => byQuestion.has(q.questionId))
  .map((q) => {
    const row = byQuestion.get(q.questionId);
    return {
      questionId: q.questionId,
      sourceRecordId: q.sourceRecordId,
      displayedNumber: q.displayedNumber,
      diagnosticScope: q.originalScopeNumbers,
      diagnosticGrade: q.evidenceGrade,
      outcome: row.status,
      reason: row.status === "held" ? row.reasons[0] : null,
      nativeScope: row.scopeQuestionNumbers ?? null,
      kind: row.kind ?? null,
      seekStartMs: row.seekStartMs ?? null,
      onsetMethod: row.nativeEvidence?.onsetMethod ?? null,
    };
  });
const pilotReasons = {};
for (const row of pilotRows) if (row.outcome === "held") count(pilotReasons, row.reason);
const summary = {
  schemaVersion: 1,
  producer: "claude-native-recovery",
  route: ROUTE,
  run: values.run,
  scope: values.scope,
  createdAt: new Date().toISOString(),
  inputs: session.baseline.inputs,
  rules: RULES,
  tool,
  commit,
  admissionAuthority: false,
  humanReviewed: false,
  writesDatabase: false,
  writesStorage: false,
  writesMedia: false,
  apiCostUsd: 0,
  sources: ids.length,
  questions: ledger.length,
  offered: candidates.length,
  offeredReconstructed: candidates.filter((r) => r.reconstructed).length,
  offeredOfficialForVerifierAdapter: candidates.filter(
    (r) => !r.reconstructed && r.evidenceAdapter,
  ).length,
  officialLaterSentenceFindings: candidates.filter(
    (r) => !r.reconstructed && !r.evidenceAdapter,
  ).length,
  heldReconstructed: ledger.filter((r) => r.status === "held" && r.reconstructed).length,
  heldOfficial: ledger.filter((r) => r.status === "held" && !r.reconstructed).length,
  offeredOriginalPassages: passages.size,
  offeredByKind: byKind,
  pilotCohort: {
    plan: PILOT_PLAN,
    questionsInPlan: pilotPlan.candidateQuestions.length,
    questionsInThisRun: pilotRows.length,
    offered: pilotRows.filter((r) => r.outcome === "candidate").length,
    held: pilotRows.filter((r) => r.outcome === "held").length,
    heldByReason: pilotReasons,
    scopeAgreesWithDiagnostic: pilotRows.filter(
      (r) => r.nativeScope && r.nativeScope.join() === r.diagnosticScope.join(),
    ).length,
    rows: pilotRows,
  },
  held: ledger.length - candidates.length,
  heldByReason: reasons,
  controls: {
    blindReplayQuestions: controls.blindReplay.length,
    blindReplayOutcomes: blindOutcomes,
    blindReplayByStratum: blindByStratum,
    headingComparisons: controls.headingComparison.length,
    headingComparisonOutcomes: headingDelta,
    adversarial: Object.fromEntries(
      Object.entries(controls.adversarial).map(([name, value]) => {
        const { cases, ...numbers } = value;
        return [name, numbers];
      }),
    ),
  },
};
console.log(JSON.stringify(summary.controls, null, 1));
console.log(
  JSON.stringify({ run: values.run, questions: summary.questions, offered: summary.offered, passages: passages.size, byKind, heldByReason: reasons }, null, 1),
);
if (!values["dry-run"]) {
  mkdirSync(runDir, { recursive: true });
  const write = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value, null, 1), "utf8");
    writeFileSync(join(runDir, name), bytes, { flag: "wx" });
    return sha256(bytes);
  };
  const header = {
    schemaVersion: 1,
    evidenceProtocol: 1,
    producer: "claude-native-recovery",
    route: ROUTE,
    run: values.run,
    inputs: session.baseline.inputs,
    rules: RULES,
  };
  // Every bounded recognition of these sources that exists, used or not.
  // Fixed at this moment, one catalog per source: every container of that
  // source that exists in the roots, by literal round folder and file name,
  // used or not. A later round, or another source's round, changes none of them.
  const slash = (path) => path.replace(/\\/g, "/");
  const neighborArtifacts = (sourceRecordId) => {
    const seen = new Map();
    for (const row of ledger)
      if (row.sourceRecordId === sourceRecordId && row.nextCertificateEvidence)
        for (const artifact of session.baseline.admissionArtifacts.get(
          row.nextCertificateEvidence.questionId,
        ) ?? [])
          seen.set(artifact.path, {
            ...artifact,
            certificate: row.nextCertificateEvidence.certificate,
            questionId: row.nextCertificateEvidence.questionId,
          });
    return [...seen.values()];
  };
  const sourceCatalogs = (store, folder) => {
    const refs = {};
    const bySource = new Map();
    for (const artifact of store.catalog) {
      if (!bySource.has(artifact.sourceRecordId))
        bySource.set(artifact.sourceRecordId, []);
      bySource.get(artifact.sourceRecordId).push(artifact);
    }
    if (bySource.size) mkdirSync(join(runDir, folder), { recursive: true });
    for (const [sourceRecordId, artifacts] of bySource) {
      // One entry per file: the root and the literal path under it.
      const roots = artifacts.map((artifact) => ({
        path: artifact.root,
        pattern: "probes/" + artifact.round + "/" + sourceRecordId + ".json",
      }));
      const name = folder + "/" + sourceRecordId + ".json";
      refs[sourceRecordId] = {
        path: slash(join(runDir, name)),
        sha256: write(name, {
          schemaVersion: 1,
          producer: "claude-native-recovery",
          run: values.run,
          sourceRecordId,
          frozenAt: new Date().toISOString(),
          layout: "<root>/probes/<round>/<sourceRecordId>.json; request at <root>/probe-requests/<round>.json",
          roots,
          rawArtifacts: artifacts,
          // Raw recognitions behind a certified start that bounds one of this
          // source's offered passages; they live in the earlier producers' folders.
          certifiedNeighborArtifacts: neighborArtifacts(sourceRecordId),
        }),
      };
    }
    return refs;
  };
  const catalogs = sourceCatalogs(session.store, "catalogs");
  // Deliberately damaged clips: their own catalogs, never a row's evidence.
  const adversarialCatalogs = sourceCatalogs(adversarialStore, "adversarial-catalogs");
  header.probeCatalogs = catalogs;
  for (const row of ledger)
    if (row.status === "candidate") row.probeCatalog = catalogs[row.sourceRecordId];
  summary.probeCatalogs = Object.keys(catalogs).length;
  controls.adversarial.catalogs = adversarialCatalogs;
  summary.files = {
    "catalogs.json": write("catalogs.json", {
      ...header,
      note: "One immutable catalog per source; a row's probeCatalog names its own source's.",
      catalogs,
      adversarialCatalogs,
    }),
    "ledger.json": write("ledger.json", { ...header, records: ledger }),
    // The verifier's adapter covers the reconstructed route only; official
    // rows are a separately named route and are never mixed into that file.
    "candidates.json": write("candidates.json", {
      ...header,
      evidenceAdapter: ADAPTER,
      records: candidates.filter((r) => r.reconstructed),
    }),
    // Official rows whose exact first-utterance opening was heard from a clip
    // at a measured onset: shaped for the verifier's official wrapper.
    "official-candidates.json": write("official-candidates.json", {
      ...header,
      route: OFFICIAL_ROUTE,
      evidenceAdapter: OFFICIAL_ADAPTER,
      records: candidates.filter((r) => !r.reconstructed && r.evidenceAdapter),
    }),
    // Official rows bound only by a later own script sentence: a finding of
    // this producer's route, for which the verifier has no admission route.
    "official-later-sentence-findings.json": write(
      "official-later-sentence-findings.json",
      {
        ...header,
        route: OFFICIAL_ROUTE,
        evidenceAdapter: null,
        admissionRoute: "none: reported, not offered for admission",
        records: candidates.filter((r) => !r.reconstructed && !r.evidenceAdapter),
      },
    ),
    "tables.json": write("tables.json", { ...header, sources: tables }),
    "controls.json": write("controls.json", { ...header, ...controls }),
  };
  write("summary.json", summary);
  console.log(runDir);
}
