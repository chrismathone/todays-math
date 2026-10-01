import test from "node:test";
import assert from "node:assert/strict";
import {
  pipelinePrompt,
  parsePhoto,
  ruleGrade,
  schedule,
  summarize,
} from "./pipeline.mjs";

test("balanced adjacent A/B pairs, each photo repeated three times", () => {
  const cases = Array.from({ length: 10 }, (_, i) => ({ id: `case-${i}` }));
  const plan = schedule(cases, 3);
  assert.equal(plan.length, 60);
  assert.equal(
    plan.filter((p) => p.arm === "A" && p.position === 0).length,
    15,
  );
  for (let i = 0; i < plan.length; i += 2) {
    assert.equal(plan[i].caseId, plan[i + 1].caseId);
    assert.equal(plan[i].repeat, plan[i + 1].repeat);
    assert.notEqual(plan[i].arm, plan[i + 1].arm);
  }
  for (const c of cases)
    for (const arm of ["A", "B"])
      assert.equal(
        plan.filter((p) => p.caseId === c.id && p.arm === arm).length,
        3,
      );
});

test("private labels absent, answer key goes to A only; raw uncertain answers stay review", () => {
  const item = {
    questionNumber: 4,
    answerKey: 5,
    expected: { status: "secret-gold-sentinel" },
  };
  assert.ok(!pipelinePrompt(item, "A").includes("secret-gold-sentinel"));
  assert.ok(!pipelinePrompt(item, "B").includes("정답 번호: 5"));
  assert.ok(pipelinePrompt(item, "A").includes("정답 번호: 5"));
  assert.equal(ruleGrade({ status: "review", choice: 5 }, 5), "review");
  assert.equal(ruleGrade({ status: "answered", choice: null }, 5), "review");
  assert.throws(() =>
    parsePhoto(
      '{"status":"answered","choice":5,"writtenAnswer":"","evidence":""}',
      "A",
    ),
  );
});

test("statistics pair by case AND repeat and retain failures in denominators", () => {
  const row = (caseId, repeat, arm, totalMs) => ({
    caseId,
    repeat,
    arm,
    totalMs,
    position: arm === "A" ? 0 : 1,
    geminiMs: totalMs - 2,
    jevMs: 2,
    gradeMatch: true,
    exactReadingMatch: true,
    ruleMatch: true,
    labelUncertain: caseId === "uncertain",
  });
  const rows = [
    row("one", 1, "A", 100),
    row("one", 1, "B", 80),
    row("one", 2, "A", 200),
    { ...row("one", 2, "B", 300), error: "failure" },
    row("uncertain", 1, "A", 100),
    row("uncertain", 1, "B", 120),
  ];
  const s = summarize(rows, rows);
  assert.equal(s.paired.count, 2);
  assert.equal(s.paired.meanDeltaMs, 0);
  assert.equal(s.paired.bFaster, 1);
  assert.equal(s.byArm.B.attempted, 3);
  assert.equal(s.byArm.B.errors, 1);
  assert.equal(s.byArm.B.gradeMatches, 2);
  assert.equal(s.pairedExcludingUncertain.count, 1);
  assert.equal(s.pairedExcludingUncertain.meanDeltaMs, -20);
  assert.equal(s.paired.aggregateReductionPercent, 0);
});
