import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  freezeInputFiles,
  assertResultMatches,
  inventoryIds,
  acquireModelRun,
  validateSemanticRuns,
} from "./scan-artifacts.mjs";
import { hash, callClaude, MODELS } from "./scan-cli.mjs";

test("semantic completion cannot hide a missing trial behind a duplicate, or count omitted answers as correct", () => {
  const plan = {
    models: ["model"],
    efforts: ["low"],
    rounds: 2,
    fingerprint: "fixed",
    cases: [{ id: "s1", expected: "correct" }],
  };
  const first = {
    model: "model",
    effort: "low",
    round: 1,
    planFingerprint: "fixed",
    data: { grades: [{ id: "s1", label: "correct" }] },
    errors: [],
  };
  const second = { ...first, round: 2 };
  assert.doesNotThrow(() => validateSemanticRuns([first, second], plan));
  assert.throws(() => validateSemanticRuns([first, first], plan), /Duplicate/);
  assert.throws(() => validateSemanticRuns([first], plan), /incomplete/);
  const omitted = { ...second, data: { grades: [] } };
  assert.throws(
    () => validateSemanticRuns([first, omitted], plan),
    /remain errors/,
  );
  assert.doesNotThrow(() =>
    validateSemanticRuns(
      [first, { ...omitted, errors: [plan.cases[0]] }],
      plan,
    ),
  );
});

test("a completed call log replays without another model request and rejects changed prompts", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "cb-call-cache-test-"));
  try {
    const logFile = path.join(root, "call.json"),
      model = MODELS[0],
      effort = "low",
      prompt = "synthetic";
    const record = {
      inputHash: hash({ model, effort, prompt, images: [] }),
      code: 0,
      stdout: JSON.stringify({ type: "result", is_error: false }),
      actualModels: [model],
      text: "{}",
      ms: 1234,
    };
    writeFileSync(logFile, JSON.stringify(record));
    assert.equal(
      (await callClaude({ model, effort, prompt, cwd: root, logFile })).ms,
      1234,
    );
    await assert.rejects(
      () =>
        callClaude({ model, effort, prompt: "changed", cwd: root, logFile }),
      /different input/,
    );
    assert.deepEqual(JSON.parse(readFileSync(logFile)), record);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("two benchmark drivers cannot multiply the three-call limit", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "cb-lock-test-"));
  try {
    const release = acquireModelRun(root);
    assert.throws(() => acquireModelRun(root), /maximum 3/);
    release();
    const next = acquireModelRun(root);
    next();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a changed image cannot be silently resumed", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "cb-synthetic-test-"));
  try {
    const file = path.join(root, "masked.jpg");
    writeFileSync(file, "synthetic image v1");
    const pages = [
      { variants: { a: { file, sha256: hash(readFileSync(file)) } } },
    ];
    freezeInputFiles(root, pages, []);
    writeFileSync(file, "synthetic image v2");
    assert.throws(() => freezeInputFiles(root, pages, []), /bytes changed/);
    const updated = [
      { variants: { a: { file, sha256: hash(readFileSync(file)) } } },
    ];
    assert.throws(() => freezeInputFiles(root, updated, []), /bytes changed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("copied result or unknown plan cannot skip a different trial", () => {
  const task = {
    model: "m",
    effort: "low",
    arm: "whole",
    variant: "raw-high",
    round: 1,
    page: { id: "p" },
  };
  const record = { ...task, pageId: "p", planFingerprint: "known" };
  assertResultMatches(record, task, { fingerprint: "known" });
  assert.throws(() =>
    assertResultMatches({ ...record, pageId: "other" }, task, {
      fingerprint: "known",
    }),
  );
  assert.throws(() =>
    assertResultMatches(record, task, { fingerprint: "other" }),
  );
});
test("independent printed inventory covers all 85 fields and 70 questions", () => {
  const inv = JSON.parse(
    readFileSync(new URL("./scan-inventory.json", import.meta.url)),
  );
  assert.equal(
    inv.pages.reduce((n, p) => n + inventoryIds(p).length, 0),
    85,
  );
  assert.equal(
    inv.pages.reduce((n, p) => n + p.blanksPerQuestion.length + p.apply, 0),
    70,
  );
  for (const p of inv.pages)
    assert.equal(new Set(inventoryIds(p)).size, inventoryIds(p).length);
});
test("current bank synthetic cases are separate from legacy and cover all four grades", () => {
  const data = JSON.parse(
    readFileSync(new URL("./semantic-cases.json", import.meta.url)),
  );
  assert.equal(data.cases.length, 12);
  const variants = data.currentBankSuite.groups.flatMap((g) => {
    const bank = JSON.parse(
      readFileSync(
        new URL(
          `../../../src/lib/concept-blank/bank/assessments/${g.grade}.json`,
          import.meta.url,
        ),
      ),
    );
    assert.ok(bank[g.bankId].bQuestion.requiredIdeas.length > 0);
    return g.variants;
  });
  assert.equal(variants.length, 36);
  assert.deepEqual([...new Set(variants.map((x) => x[2]))].sort(), [
    "correct",
    "incorrect",
    "partial",
    "review",
  ]);
  assert.equal(variants.filter((x) => x[0].includes("injection")).length, 6);
});
