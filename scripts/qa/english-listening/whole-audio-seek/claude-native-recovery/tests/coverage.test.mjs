import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  FULL_RUN_PLAN_PATH,
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
    plan: null,
    sha: {},
    /** Writes a request; returns a function that answers one of its sources. */
    request(round, stage, sources, counted = {}) {
      const dir = join(path, "probe-requests");
      mkdirSync(dir, { recursive: true });
      // The planner writes its own counts into the request it plans.
      const summary = {
        stage,
        sources: sources.length,
        probes: sources.reduce((n, s) => n + s.probes.length, 0),
        ...counted,
      };
      const bytes = Buffer.from(JSON.stringify({ round, summary, sources }));
      writeFileSync(join(dir, "round-" + round + ".json"), bytes);
      const requestSha256 = sha256(bytes);
      w.sha[round] = requestSha256;
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

// ---------------------------------------------------------------- a plan ----

/**
 * A full run as it should end: the heading round that existed before stage
 * records, pinned; then context (heard), gaps (planned nothing), variants
 * (heard), each on record. Returns the world and the records in order.
 */
function fullRun() {
  const w = world();
  const root = w.roots[0].path.replace(/\\/g, "/");
  const headings = w.request("020", "headings", [
    source("a", probe(1, 0), probe(2, 441000)),
    source("b", probe(1, 0)),
  ]);
  headings("a");
  headings("b");
  w.request("023", "context", [source("a", probe(1, 882000))])("a");
  w.request("024", "variants", [
    source("a", probe(1, 1323000)),
    source("b", probe(1, 1323000)),
  ])("a");
  const record = (stage, round, plannedProbes, runnerExit, more = {}) => ({
    driver: "run-rounds",
    scope: "reconstructed",
    stage,
    round,
    root,
    plannedProbes,
    runnerExit,
    ...more,
  });
  const records = {
    context: record("context", "023", 1, 0),
    gaps: record("gaps", null, 0, null),
    variants: record("variants", "024", 2, 0),
  };
  w.plan = {
    requests: [
      {
        root: "claude",
        round: "020",
        stage: "headings",
        requestSha256: w.sha["020"],
        sourcesRequested: 2,
        sourcesComplete: 2,
        probesRequested: 3,
        probesHeard: 3,
      },
    ],
    stages: ["context", "gaps", "variants"].map((stage) => ({
      driver: "run-rounds",
      scope: "reconstructed",
      stage,
    })),
  };
  return { w, root, record, records };
}
/** Answers the one source of round 024 that fullRun leaves unanswered. */
function finish(w) {
  const folder = join(w.roots[0].path, "probes", "round-024");
  const a = JSON.parse(readFileSync(join(folder, "a.json"), "utf8"));
  writeFileSync(
    join(folder, "b.json"),
    JSON.stringify({ ...a, sourceRecordId: "b", sourceAudioSha256: "audio-b" }),
  );
}

test("with a plan, coverage is complete only when every planned stage is on record, in order, and heard to the end", () => {
  const { w, records } = fullRun();
  finish(w);
  w.stages = [records.context, records.gaps, records.variants];
  const receipt = w.coverage();
  assert.equal(receipt.complete, true, JSON.stringify(receipt.summary));
  assert.equal(receipt.comparedWithPlan, true);
  assert.deepEqual(receipt.plan.stagesSucceededInOrder, [
    "run-rounds/reconstructed/context",
    "run-rounds/reconstructed/gaps",
    "run-rounds/reconstructed/variants",
  ]);
  assert.equal(receipt.summary.stagesThatPlannedNothing, 1);
  // Without a plan the same world says nothing about what should have run.
  w.plan = null;
  w.stages = [];
  assert.equal(w.coverage().comparedWithPlan, false);
});

test("no stage on record, a stage missing at the end or in the middle, stages out of order and a stage too many are each not the plan", () => {
  const cases = {
    empty: (r) => [],
    truncated: (r) => [r.context, r.gaps],
    "zero-plan stage not on record": (r) => [r.context, r.variants],
    permuted: (r) => [r.gaps, r.context, r.variants],
    "first missing": (r) => [r.gaps, r.variants],
    "one too many": (r) => [r.context, r.gaps, r.variants, r.gaps],
  };
  for (const [name, pick] of Object.entries(cases)) {
    const { w, records } = fullRun();
    finish(w);
    w.stages = pick(records);
    const receipt = w.coverage();
    assert.equal(receipt.complete, false, name);
    assert.equal(receipt.summary.plan.stageSequenceComplete, false, name);
    assert.ok(receipt.summary.plan.firstStageDifference.position >= 1, name);
  }
  // Every request there is finished in each of these worlds: only the record
  // of the stages says the run is short.
  const { w } = fullRun();
  finish(w);
  w.plan = { ...w.plan, stages: [] };
  w.stopped = [
    { root: "claude", round: "023", reason: "no record" },
    { root: "claude", round: "024", reason: "no record" },
  ];
  assert.equal(w.coverage().summary.requestsIncompleteUndeclared.length, 0);
});

test("a planner that failed before writing its request leaves a record that is not the stage; the stage must still follow", () => {
  const { w, record, records } = fullRun();
  finish(w);
  const failed = record("variants", null, null, null, { plannerExit: 1 });
  // The driver stopped there; the chain went on to build.
  w.stages = [records.context, records.gaps, failed];
  let receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.stagesPlannerFailed, [
    "run-rounds:variants:-",
  ]);
  assert.deepEqual(receipt.summary.plan.firstStageDifference, {
    position: 3,
    expected: "run-rounds/reconstructed/variants",
    onRecord: null,
  });
  // No record at all of that stage (the driver died without a line) is the same.
  w.stages = [records.context, records.gaps];
  assert.equal(w.coverage().complete, false);
  // Run again and heard to the end: the failed attempt stays on record.
  w.stages = [records.context, records.gaps, failed, records.variants];
  receipt = w.coverage();
  assert.equal(receipt.complete, true, JSON.stringify(receipt.summary));
  assert.deepEqual(receipt.summary.stagesPlannerFailed, [
    "run-rounds:variants:-",
  ]);
});

test("a declared stop never stands in for a planned stage", () => {
  const { w, record, records } = fullRun();
  // Round 024 failed after source a; it is declared stopped, with its reason.
  w.stages = [records.context, records.gaps, record("variants", "024", 2, 1)];
  w.stopped = [
    { root: "claude", round: "024", reason: "recognizer failed on source b" },
  ];
  let receipt = w.coverage();
  assert.deepEqual(receipt.summary.requestsIncompleteUndeclared, []);
  assert.deepEqual(receipt.summary.stagesFailedUndeclared, []);
  assert.equal(receipt.complete, false);
  assert.equal(receipt.summary.plan.firstStageDifference.position, 3);
  // Planned again under a new id and heard to the end: now the plan is met.
  w.request("025", "variants", [source("b", probe(1, 1323000))])("b");
  w.stages.push(record("variants", "025", 1, 0));
  receipt = w.coverage();
  assert.equal(receipt.complete, true, JSON.stringify(receipt.summary));
  assert.deepEqual(receipt.summary.requestsStopped, ["claude:024"]);
});

test("a pinned earlier round must stand exactly as pinned: all of round 020, and a stopped round at its partial counts", () => {
  const { w, records } = fullRun();
  finish(w);
  w.stages = [records.context, records.gaps, records.variants];
  // An interrupted round from before the stage records, pinned as it stopped.
  const old = w.request("022", "variants", [
    source("a", probe(1, 5)),
    source("b", probe(1, 5)),
  ]);
  old("a");
  w.stopped = [
    { root: "claude", round: "022", reason: "driver ended by hand" },
  ];
  const pin = (round, stage, sources, done, probes, heard) => ({
    root: "claude",
    round,
    stage,
    requestSha256: w.sha[round],
    sourcesRequested: sources,
    sourcesComplete: done,
    probesRequested: probes,
    probesHeard: heard,
  });
  w.plan.requests.push(pin("022", "variants", 2, 1, 2, 1));
  assert.equal(w.coverage().complete, true);
  const broken = {
    "fewer sources answered than pinned": () =>
      (w.plan.requests[0] = pin("020", "headings", 3, 3, 4, 4)),
    "another request under the same number": () =>
      (w.plan.requests[0] = {
        ...pin("020", "headings", 2, 2, 3, 3),
        requestSha256: "x",
      }),
    "another stage": () =>
      (w.plan.requests[0] = pin("020", "context", 2, 2, 3, 3)),
    "a stopped round that changed": () =>
      (w.plan.requests[1] = pin("022", "variants", 2, 2, 2, 2)),
    "a pinned round that is not there": () =>
      w.plan.requests.push(pin("021", "context", 1, 1, 1, 1)),
  };
  for (const [name, damage] of Object.entries(broken)) {
    const saved = structuredClone(w.plan.requests);
    damage();
    const receipt = w.coverage();
    assert.equal(receipt.complete, false, name);
    assert.equal(receipt.summary.plan.pinnedRequestMismatches.length, 1, name);
    w.plan.requests = saved;
  }
  assert.equal(w.coverage().complete, true);
});

test("a stage's record must agree with its request: stage, probes, sources, and a recorded success with every source answered", () => {
  const { w, record, records } = fullRun();
  finish(w);
  const differs = (stages) => {
    w.stages = stages;
    const receipt = w.coverage();
    assert.equal(receipt.complete, false);
    return receipt.summary.plan.stageRequestMismatches.map((m) =>
      m.differs.join(),
    );
  };
  const { context, gaps, variants } = records;
  assert.deepEqual(differs([record("context", "023", 5, 0), gaps, variants]), [
    "plannedProbes",
  ]);
  assert.deepEqual(
    differs([
      context,
      gaps,
      record("variants", "024", 2, 0, { plannedSources: 9 }),
    ]),
    ["plannedSources"],
  );
  // The record names a round whose request is of another stage.
  assert.deepEqual(differs([record("context", "024", 2, 0), gaps, variants]), [
    "stage",
  ]);
  w.stages = [
    context,
    gaps,
    record("variants", "024", 2, 0, { plannedSources: 2 }),
  ];
  assert.equal(w.coverage().complete, true);
  // A request whose own summary does not count what it holds.
  const odd = fullRun();
  finish(odd.w);
  odd.w.request("026", "terminal", [source("a", probe(1, 99))], {
    probes: 4,
    sources: 3,
  })("a");
  odd.w.plan.stages.push({
    driver: "run-rounds",
    scope: "reconstructed",
    stage: "terminal",
  });
  odd.w.stages = [
    odd.records.context,
    odd.records.gaps,
    odd.records.variants,
    odd.record("terminal", "026", 1, 0),
  ];
  assert.deepEqual(
    odd.w
      .coverage()
      .summary.plan.stageRequestMismatches.map((m) => m.differs.join()),
    ["plannerProbes,plannerSources"],
  );
  // Recorded as heard to the end while a source has no container.
  const short = fullRun();
  short.w.stages = [
    short.records.context,
    short.records.gaps,
    short.records.variants,
  ];
  const receipt = short.w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.plan.stageRequestMismatches, [
    {
      stage: "run-rounds:variants:024",
      differs: ["recorded_success_but_request_incomplete"],
    },
  ]);
});

test("a request that no stage on record planned and that was not there before is not coverage until it is declared", () => {
  const { w, records } = fullRun();
  finish(w);
  w.stages = [records.context, records.gaps, records.variants];
  // A driver that died while recognizing: the request and one container exist.
  w.request("025", "terminal", [source("a", probe(1, 7))])("a");
  let receipt = w.coverage();
  assert.equal(receipt.complete, false);
  assert.deepEqual(receipt.summary.plan.requestsWithoutStageRecordUndeclared, [
    "claude:025",
  ]);
  w.stopped = [
    {
      root: "claude",
      round: "025",
      reason: "driver died; nothing reads it as a stage",
    },
  ];
  receipt = w.coverage();
  assert.equal(receipt.complete, true, JSON.stringify(receipt.summary));
});

test("the tracked plan pins heading round 020 at 56 sources and 3,676 probes and names the seven stages that follow it", () => {
  const plan = JSON.parse(readFileSync(FULL_RUN_PLAN_PATH, "utf8"));
  const pinned = (round) =>
    plan.requests.find((r) => r.root === "claude" && r.round === round);
  assert.deepEqual(
    [
      pinned("020").stage,
      pinned("020").sourcesRequested,
      pinned("020").sourcesComplete,
    ],
    ["headings", 56, 56],
  );
  assert.deepEqual(
    [pinned("020").probesRequested, pinned("020").probesHeard],
    [3676, 3676],
  );
  // The two stopped rounds are pinned at the partial counts they were left at.
  assert.deepEqual(
    [
      pinned("022").sourcesComplete,
      pinned("022").sourcesRequested,
      pinned("022").probesHeard,
    ],
    [16, 38, 122],
  );
  assert.deepEqual(
    [
      pinned("030").sourcesComplete,
      pinned("030").sourcesRequested,
      pinned("030").probesHeard,
    ],
    [1, 47, 33],
  );
  for (const r of plan.requests)
    assert.match(r.requestSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    plan.stages
      .slice(0, 7)
      .map((s) => s.driver + " " + s.scope + " " + s.stage),
    [
      "run-rounds reconstructed context",
      "run-rounds reconstructed variants",
      "run-rounds reconstructed gaps",
      "run-rounds reconstructed variants",
      "run-rounds reconstructed terminal",
      "run-rounds reconstructed quotes+controls",
      "run-converted reconstructed quotes+controls",
    ],
  );
});
