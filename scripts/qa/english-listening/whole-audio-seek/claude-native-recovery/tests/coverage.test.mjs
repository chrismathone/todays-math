import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  STOPPED_REQUESTS_PATH,
  coverageOf,
  readStages,
} from "../lib/coverage.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const probe = (id, startFrame, language = "ko") => ({
  id,
  purpose: "heading_onset",
  language,
  startFrame,
  frameCount: 352800,
});
const source = (id, ...probes) => ({
  sourceRecordId: id,
  sourceAudioSha256: "audio-" + id,
  probes,
});

/** An output root with requests and the raw containers a recognizer left. */
function world() {
  const path = mkdtempSync(join(tmpdir(), "native-recovery-coverage-"));
  const w = {
    roots: [{ name: "claude", path }],
    stopped: [],
    stages: [],
    /** Writes a request; returns a function that answers one of its sources. */
    request(round, stage, sources) {
      const dir = join(path, "probe-requests");
      mkdirSync(dir, { recursive: true });
      const bytes = Buffer.from(
        JSON.stringify({ round, summary: { stage }, sources }),
      );
      writeFileSync(join(dir, "round-" + round + ".json"), bytes);
      const requestSha256 = sha256(bytes);
      return (id, change = (container) => container) => {
        const asked =
          sources.find((s) => s.sourceRecordId === id) ?? source(id);
        const folder = join(path, "probes", "round-" + round);
        mkdirSync(folder, { recursive: true });
        const container = change({
          sourceRecordId: id,
          sourceAudioSha256: asked.sourceAudioSha256,
          requestSha256,
          requestedLanguage: "ko",
          probes: asked.probes.map((p) => ({
            id: p.id,
            startFrame: p.startFrame,
            frameCount: p.frameCount,
            requestedLanguage: p.language,
            clipPcmSha256: "clip",
            overflow: false,
            segments: [],
          })),
        });
        writeFileSync(join(folder, id + ".json"), JSON.stringify(container));
      };
    },
    coverage: () => coverageOf(w),
  };
  return w;
}
const row = (receipt, round) => receipt.requests.find((r) => r.round === round);

test("a request whose every source has its exact container is complete", () => {
  const w = world();
  const answer = w.request("020", "headings", [
    source("a", probe(1, 0), probe(2, 441000)),
    source("b", probe(1, 882000, "en")),
  ]);
  answer("a");
  answer("b");
  const receipt = w.coverage();
  assert.equal(receipt.complete, true);
  assert.deepEqual(
    [
      row(receipt, "020").sourcesComplete,
      row(receipt, "020").probesHeard,
      row(receipt, "020").stage,
    ],
    [2, 3, "headings"],
  );
  assert.deepEqual(receipt.summary.requestsIncompleteUndeclared, []);
  assert.equal(receipt.humanReviewed, false);
});

test("a source that was never answered leaves the request, and the whole coverage, incomplete", () => {
  const w = world();
  const answer = w.request("022", "variants", [
    source("a", probe(1, 0)),
    source("b", probe(1, 0)),
  ]);
  answer("a");
  const receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.requestsIncompleteUndeclared, [
    "claude:022",
  ]);
  assert.deepEqual(row(receipt, "022").missingSources, ["b"]);
  assert.equal(row(receipt, "022").missingProbes, 1);
  assert.equal(row(receipt, "022").missingProbesHeardNowhere, 1);
});

test("a container of another request, another original, fewer probes, another start or without its recognition does not count", () => {
  const damage = {
    another_request: (c) => ({ ...c, requestSha256: "x" }),
    another_original: (c) => ({ ...c, sourceAudioSha256: "x" }),
    another_source: (c) => ({ ...c, sourceRecordId: "x" }),
    probe_count: (c) => ({ ...c, probes: c.probes.slice(1) }),
    probe_identity: (c) => ({
      ...c,
      probes: c.probes.map((p, i) =>
        i ? p : { ...p, startFrame: p.startFrame + 1 },
      ),
    }),
  };
  for (const [reason, change] of Object.entries(damage)) {
    const w = world();
    w.request("020", "headings", [source("a", probe(1, 0), probe(2, 441000))])(
      "a",
      change,
    );
    const receipt = w.coverage();
    assert.equal(receipt.complete, false, reason);
    assert.deepEqual(row(receipt, "020").unboundContainers, [
      { sourceRecordId: "a", reasons: [reason] },
    ]);
    assert.equal(row(receipt, "020").probesHeard, 0);
  }
  for (const change of [
    (c) => ({ ...c, probes: c.probes.map(({ segments, ...p }) => p) }),
    (c) => ({ ...c, probes: c.probes.map((p) => ({ ...p, frameCount: 1 })) }),
    (c) => ({
      ...c,
      probes: c.probes.map((p) => ({ ...p, requestedLanguage: "en" })),
    }),
  ]) {
    const w = world();
    w.request("020", "headings", [source("a", probe(1, 0))])("a", change);
    assert.deepEqual(row(w.coverage(), "020").unboundContainers[0].reasons, [
      "probe_identity",
    ]);
  }
});

test("a stopped request counts as stopped only when declared, and stays short either way", () => {
  const w = world();
  const old = w.request("022", "variants", [
    source("a", probe(1, 0)),
    source("b", probe(1, 0)),
  ]);
  old("a");
  // Planned again under a new id: source b's same start and length is heard there.
  w.request("024", "variants", [
    source("b", probe(1, 0)),
    source("c", probe(1, 0)),
  ])("b");
  let receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.requestsIncompleteUndeclared, [
    "claude:022",
    "claude:024",
  ]);
  w.stopped = [
    { root: "claude", round: "022", reason: "driver ended by hand" },
  ];
  receipt = w.coverage();
  // 022 is declared; 024 is still short of source c, so nothing is complete yet.
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.requestsIncompleteUndeclared, [
    "claude:024",
  ]);
  assert.equal(row(receipt, "022").stopped, "driver ended by hand");
  assert.equal(row(receipt, "022").complete, false);
  assert.equal(row(receipt, "022").missingProbesHeardInAnotherRound, 1);
  w.request("025", "variants", [source("c", probe(1, 0))])("c");
  w.stopped.push({
    root: "claude",
    round: "024",
    reason: "failed, planned again as 025",
  });
  receipt = w.coverage();
  assert.equal(receipt.complete, true);
  assert.deepEqual(receipt.summary.requestsStopped, [
    "claude:022",
    "claude:024",
  ]);
  // A declaration for a request that did finish changes nothing about it.
  w.stopped.push({ root: "claude", round: "025", reason: "not true" });
  assert.equal(row(w.coverage(), "025").stopped, null);
});

test("raw containers without their request, or beside it, are not complete coverage", () => {
  const orphan = world();
  orphan.request("020", "headings", [source("a", probe(1, 0))])("a");
  mkdirSync(join(orphan.roots[0].path, "probes", "round-023"), {
    recursive: true,
  });
  let receipt = orphan.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.rawFoldersWithoutRequest, [
    "claude:round-023",
  ]);
  const extra = world();
  const answer = extra.request("020", "headings", [source("a", probe(1, 0))]);
  answer("a");
  answer("z");
  receipt = extra.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(row(receipt, "020").unrequestedContainers, ["z.json"]);
});

test("a failed stage on record blocks coverage until its request is declared stopped; a stage that planned nothing does not", () => {
  const w = world();
  const root = w.roots[0].path.replace(/\\/g, "/");
  w.request("023", "context", [source("a", probe(1, 0))])("a");
  const failed = w.request("024", "variants", [
    source("a", probe(2, 0)),
    source("b", probe(1, 0)),
  ]);
  failed("a");
  w.stages = [
    {
      driver: "run-rounds",
      scope: "reconstructed",
      stage: "context",
      round: "023",
      root,
      plannedProbes: 1,
      runnerExit: 0,
    },
    {
      driver: "run-rounds",
      scope: "reconstructed",
      stage: "gaps",
      round: null,
      root,
      plannedProbes: 0,
      runnerExit: null,
    },
    {
      driver: "run-rounds",
      scope: "reconstructed",
      stage: "variants",
      round: "024",
      root,
      plannedProbes: 2,
      runnerExit: 1,
    },
  ];
  let receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.stagesFailedUndeclared, [
    "run-rounds:variants:024",
  ]);
  assert.equal(receipt.summary.stagesThatPlannedNothing, 1);
  // Planned again and finished under a new id; the failed request is declared.
  w.request("025", "variants", [source("b", probe(1, 0))])("b");
  w.stages.push({
    driver: "run-rounds",
    scope: "reconstructed",
    stage: "variants",
    round: "025",
    root,
    plannedProbes: 1,
    runnerExit: 0,
  });
  assert.equal(w.coverage().complete, false);
  w.stopped = [
    { root: "claude", round: "024", reason: "recognizer failed on source b" },
  ];
  receipt = w.coverage();
  assert.equal(receipt.complete, true);
  assert.deepEqual(receipt.summary.stagesFailed, ["run-rounds:variants:024"]);
  assert.deepEqual(receipt.summary.stagesFailedUndeclared, []);
  // A stage on record whose request does not exist is not coverage.
  w.stages.push({
    driver: "run-rounds",
    scope: "reconstructed",
    stage: "terminal",
    round: "026",
    root,
    plannedProbes: 4,
    runnerExit: 0,
  });
  receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.stagesWithoutRequest, [
    "run-rounds:terminal:026",
  ]);
});

test("stage records are read one object per line, and no file means no stages", () => {
  const dir = mkdtempSync(join(tmpdir(), "native-recovery-stages-"));
  assert.deepEqual(readStages(join(dir, "stages.jsonl")), []);
  writeFileSync(
    join(dir, "stages.jsonl"),
    '{"stage":"context","round":"023"}\n{"stage":"gaps","round":null}\n',
  );
  assert.deepEqual(readStages(join(dir, "stages.jsonl")), [
    { stage: "context", round: "023" },
    { stage: "gaps", round: null },
  ]);
});

test("the tracked list of stopped requests names each with a root, a three-digit round and a reason", () => {
  const { requests } = JSON.parse(readFileSync(STOPPED_REQUESTS_PATH, "utf8"));
  assert.ok(requests.length >= 2);
  for (const entry of requests) {
    assert.match(entry.root, /^(claude|adversarial)$/);
    assert.match(entry.round, /^\d{3}$/);
    assert.ok(entry.reason.length > 40);
  }
  assert.equal(
    new Set(requests.map((r) => r.root + ":" + r.round)).size,
    requests.length,
  );
});
