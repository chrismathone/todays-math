// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  emptyCourseState,
  courseSummary,
  setCoursePlan,
  startRecommendedCourse,
  storedCourseSchema,
  submitCourseAttempt,
} from "@/lib/math-srs/courseAutomation";
import { buildInsightV2Snapshot } from "@/lib/math-insight/v2Snapshot";
import { buildInsightSnapshot } from "@/lib/math-insight/snapshot";
import { validateInsightV2Snapshot } from "@/lib/math-insight/v2Validation";
import {
  buildInsightV2Prompt,
  parseInsightV2Selection,
  composeInsightV2Result,
} from "@/lib/math-insight/v2Inference";
import { sessionOutcome } from "@/lib/math-prerequisite/evidence";
import { prerequisiteCheckCandidates } from "@/lib/math-prerequisite/policy";
import { coursePlanSchema } from "@/contracts/mathSrsCourse.contract";
import {
  at,
  DAY,
  FAIL,
  PASS,
  later,
  plannedCourse,
  practise,
  uuid,
} from "../helpers/mathPrerequisiteCourse";
const t0 = at("2026-10-01T01:00:00.000Z");
const now = later(t0, DAY);
const T = "5-2-2-1";
const provenance = {
  provider: "gemini" as const,
  model: "synthetic",
  role: "selection-only" as const,
};
function actualRightCourse(id: string) {
  let c = startRecommendedCourse(
    plannedCourse(id, t0),
    { sectionId: id, mode: "learn", reason: "fixture" },
    t0,
    3729,
    uuid,
    [],
  );
  const session = c.learner.session!;
  for (let i = 0; i < session.problems.length; i++) {
    const p = session.problems[i];
    c = submitCourseAttempt(
      c,
      {
        sessionId: session.id,
        problemId: p.id,
        submittedAnswer: p.input.mode === "self-check" ? "" : p.answer,
        ...(p.input.mode === "self-check" ? { selfCorrect: true } : {}),
      },
      later(t0, (i + 1) * 60000),
    );
  }
  return storedCourseSchema.parse(c);
}
const snapshot = () =>
  buildInsightV2Snapshot(
    practise(plannedCourse(T, t0), T, "learn", t0, FAIL),
    7,
    now,
  );
const promptData = (s: ReturnType<typeof snapshot>) =>
  JSON.parse(
    buildInsightV2Prompt(s, "보존된 풀이를 보여 주세요").split("\n").at(-1)!,
  );
function selection(s: ReturnType<typeof snapshot>, kind = "observation") {
  const p = promptData(s),
    f = p.facts.find((f: { kind: string }) => f.kind === kind);
  return {
    snapshotId: p.snapshotId,
    intent: kind === "observation" ? "evidence" : "context",
    factIds: [f.id],
    evidenceIds: f.evidenceIds,
    candidateIds: [],
  };
}
describe("generic retained first-attempt observations", () => {
  it.each(["3-1-1-1", "4-1-1-1", T, "6-1-1-1"])(
    "uses actual session transitions in grade %s without widening outcomes",
    (id) => {
      const course = actualRightCourse(id);
      const before = JSON.stringify(course),
        s = buildInsightV2Snapshot(course, 2, now);
      const raw = sessionOutcome(course, course.learner.session!);
      expect(s.observations[0]).toMatchObject({
        sectionId: id,
        included: true,
        grade: Number(id[0]),
        independentCorrect: raw.independentCorrect,
        independentIncorrect: raw.independentIncorrect,
      });
      expect(s.observations[0]).not.toHaveProperty("outcome");
      expect(s.observations[0]).not.toHaveProperty("status");
      expect(s.pilot.sections).toHaveLength(4);
      expect(JSON.stringify(course)).toBe(before);
      expect(s.planContext.courseDailyGoal).toBe(
        courseSummary(course, now).todayGoal,
      );
      expect(s.planContext.dailyMission).toBe("not-evaluated");
      expect(s.pilot).toEqual(buildInsightSnapshot(course, 2, now));
      const sel = selection(s);
      expect(
        composeInsightV2Result(s, sel as never, provenance).facts[0],
      ).toEqual(
        s.facts.find(
          (f) =>
            f.id ===
            composeInsightV2Result(s, sel as never, provenance).facts[0].id,
        ),
      );
    },
  );
  it("distinguishes no stored plan/no source from zero achievement or default plan", () => {
    const s = buildInsightV2Snapshot(emptyCourseState(), 0, now);
    expect(s.planContext).toMatchObject({
      status: "absent",
      storedPlan: null,
      courseGoal: null,
      courseDailyGoal: null,
      defaultPlan: "not-evaluated",
      dailyMission: "not-evaluated",
    });
    expect(s.retention).toMatchObject({
      sourcePresence: "none-retained",
      retentionCoverage: "unknown",
    });
    expect(s.observations).toEqual([]);
    const result = composeInsightV2Result(
      s,
      selection(s, "plan-context") as never,
      provenance,
    );
    expect(result.status).toBe("supported");
    expect(result.facts[0].text).toContain("저장된 코스 계획이 없습니다");
    expect(s.facts.some((f) => f.text.includes("성취 0을 뜻하지"))).toBe(true);
  });
  it("paused plan still allows factual summary, future plan has explicit exclusion", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const paused = { ...c, plan: { ...c.plan!, enabled: false } };
    const s = buildInsightV2Snapshot(paused, 2, now);
    expect(s.planContext.status).toBe("paused");
    expect(s.observations[0].included).toBe(true);
    expect(
      composeInsightV2Result(s, selection(s) as never, provenance).status,
    ).toBe("supported");
    const future = buildInsightV2Snapshot(
      {
        ...c,
        plan: { ...c.plan!, configuredAt: later(now, DAY).toISOString() },
      },
      2,
      now,
    );
    expect(future.planContext.status).toBe("future");
    expect(future.observations[0].exclusions).toContain("future-plan");
  });
  it("preserves raw old/prior-plan/future counts without current credit", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL),
      raw = sessionOutcome(c, c.learner.session!);
    const old = buildInsightV2Snapshot(c, 0, later(now, 30 * DAY));
    expect(old.observations[0]).toMatchObject({
      included: false,
      independentIncorrect: raw.independentIncorrect,
    });
    expect(old.observations[0].exclusions).toContain("outside-window");
    const prior = setCoursePlan(c, { ...c.plan!, expectedRevision: 0 }, now);
    expect(
      buildInsightV2Snapshot(prior, 0, now).observations[0].exclusions,
    ).toContain("before-plan");
    const future = buildInsightV2Snapshot(c, 0, t0);
    expect(future.observations[0].exclusions).toContain("future");
    const noPlan = buildInsightV2Snapshot({ ...c, plan: null }, 0, now);
    expect(noPlan.observations[0].exclusions).toContain("no-plan");
  });
  it("unfinished counts are unavailable even with first attempts", () => {
    const c = startRecommendedCourse(
      plannedCourse(T, t0),
      { sectionId: T, mode: "learn", reason: "fixture" },
      t0,
      123,
      uuid,
      [],
    );
    const s = buildInsightV2Snapshot(c, 0, now);
    expect(s.observations[0]).toMatchObject({
      included: false,
      completedAt: null,
      independentCorrect: 0,
    });
    expect(s.observations[0].exclusions).toContain("unfinished");
    expect(
      s.facts.find((f) => f.evidenceIds[0] === s.observations[0].id)?.kind,
    ).toBe("availability");
  });
  it("newer unfinished source does not erase earlier generic observations or copy pilot superseded", () => {
    let c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    c = startRecommendedCourse(
      c,
      { sectionId: T, mode: "review", reason: "fixture" },
      later(t0, DAY),
      789,
      uuid,
      [],
    );
    const s = buildInsightV2Snapshot(c, 0, later(t0, 2 * DAY));
    expect(s.observations.filter((e) => e.included)).toHaveLength(1);
    expect(s.pilot.freshness).toBe("insufficient");
    expect(
      s.observations.every(
        (e) => !e.exclusions.includes("superseded" as never),
      ),
    ).toBe(true);
  });
  it("source presence and retention coverage are orthogonal, summary-only never reconstructs counts", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    c.learner.session = null;
    c.history = [];
    const missing = buildInsightV2Snapshot(c, 0, now);
    expect(missing.retention).toMatchObject({
      sourcePresence: "summary-only",
      retentionCoverage: "possibly-truncated",
    });
    expect(missing.observations[0]).toMatchObject({
      source: "summary-without-session",
      included: false,
      independentCorrect: 0,
    });
    expect(missing.observations[0].exclusions).toContain("source-missing");
    const withSource = practise(c, T, "review", now, PASS);
    expect(
      buildInsightV2Snapshot(withSource, 0, later(now, DAY)).retention
        .sourcePresence,
    ).toBe("present");
  });
  it("excludes hints, self-check, give-up and retry; repeats are only retained-content comparisons", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, [
      "giveup",
      "wrong",
      "right",
      "right",
      "right",
    ]);
    const a = c.learner.session!;
    a.attempts[2].usedHint = true;
    a.attempts[3].selfAssessed = true;
    a.problems[4].content = a.problems[1].content;
    const s = buildInsightV2Snapshot(c, 0, now),
      raw = sessionOutcome(c, a);
    expect(s.observations[0]).toMatchObject({
      independentCorrect: raw.independentCorrect,
      independentIncorrect: raw.independentIncorrect,
      excludedFirstAttempts: 4,
    });
    expect(s.observations[0].retryAttempts).toBeGreaterThan(0);
    expect(s.observations[0].exclusions).toEqual(
      expect.arrayContaining([
        "retry-not-first-attempt",
        "hint-self-check-give-up-or-repeated",
      ]),
    );
    expect(s.observations[0].independentIncorrect).toBe(1);
  });
  it("never leaks problems/answers/session IDs to the bounded prompt", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL),
      s = buildInsightV2Snapshot(c, 0, now);
    const p = buildInsightV2Prompt(s, "보존된 풀이"),
      session = c.learner.session!;
    expect(p).not.toContain(session.id);
    expect(p).not.toContain(session.problems[0].content);
    expect(p).not.toContain("submittedAnswer");
    expect(p).not.toContain("solution");
    expect(p).not.toContain(s.stateDigest);
    expect(p).toContain('"factualSummary":true');
    expect(p).toContain('"nextCheckProposal":false');
  });
  it("repeated sessions all remain generic records but do not double-count known content", () => {
    let c = practise(plannedCourse(T, t0), T, "learn", t0, PASS, {
      seed: 9123,
    });
    c = practise(c, T, "review", now, PASS, { seed: 9123 });
    const s = buildInsightV2Snapshot(c, 0, later(now, DAY));
    expect(s.observations).toHaveLength(2);
    expect(s.observations.every((e) => e.included)).toBe(true);
    expect(s.observations[1].independentCorrect).toBe(0);
    expect(s.observations[1].exclusions).toContain(
      "hint-self-check-give-up-or-repeated",
    );
  });
  it("course goal uses stored progress and course quota can differ from stored plan", () => {
    const c = practise(
      plannedCourse("3-1-1-1", t0),
      "3-1-1-1",
      "learn",
      t0,
      PASS,
    );
    c.dailyGoalSnapshot = { date: c.activity[0].date, goal: 5 };
    const s = buildInsightV2Snapshot(c, 0, later(t0, 60 * 60 * 1000));
    expect(s.planContext.courseDailyGoal).toBe(5);
    expect(s.planContext.storedPlan?.dailyQuestionCount).toBe(20);
    expect(s.planContext.courseGoal?.sectionId).not.toBe("3-1-1-1");
    expect(s.planContext.dailyMission).toBe("not-evaluated");
    expect(coursePlanSchema.parse(s.planContext.storedPlan)).toEqual(c.plan);
  });
  it("flags unsupported stored sources without inferring a grade-wide mapping", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    c.learner.session!.sectionId = "unsupported";
    const s = buildInsightV2Snapshot(c, 0, now);
    expect(s.observations[0]).toMatchObject({
      grade: null,
      included: false,
      independentCorrect: 0,
    });
    expect(s.observations[0].exclusions).toContain("unsupported-section");
  });
});
describe("strict closed selection and shared references", () => {
  it("returns only canonical code-owned facts and references", () => {
    const s = snapshot(),
      sel = selection(s),
      checked = parseInsightV2Selection(JSON.stringify(sel), s);
    const result = composeInsightV2Result(s, checked, provenance);
    for (const fact of result.facts)
      expect(s.facts.find((f) => f.id === fact.id)).toEqual(fact);
  });
  it.each([
    { factIds: ["invented"] },
    { evidenceIds: ["invented"] },
    { candidateIds: ["c0"] },
    { factIds: ["f0", "f0"] },
    { evidenceIds: ["e0", "e0"] },
    { candidateIds: ["c0", "c0"] },
    { snapshotId: "0".repeat(64) },
    { text: "made up" },
    { intent: "diagnosis" },
    { factIds: [] },
    { evidenceIds: [] },
  ])("rejects malformed/forged/duplicate/missing references %j", (extra) => {
    const s = snapshot();
    expect(() =>
      parseInsightV2Selection(JSON.stringify({ ...selection(s), ...extra }), s),
    ).toThrow();
  });
  it("rejects invalid cross references before prompt generation", () => {
    const s = snapshot();
    s.facts[0].evidenceIds = ["absent"];
    expect(() => buildInsightV2Prompt(s, "요약")).toThrow(
      "invalid-fact-reference",
    );
  });
  it("rejects duplicated and false-included snapshot records", () => {
    const s = snapshot();
    s.observations.push({ ...s.observations[0] });
    expect(() => validateInsightV2Snapshot(s)).toThrow();
    const old = buildInsightV2Snapshot(
      practise(plannedCourse(T, t0), T, "learn", t0, FAIL),
      0,
      later(now, 30 * DAY),
    );
    old.observations[0].included = true;
    expect(() => validateInsightV2Snapshot(old)).toThrow();
  });
  it("offers code-owned scope limitation for unsupported questions", () => {
    const s = snapshot(),
      p = promptData(s),
      f = p.facts.find((f: { text: string }) =>
        f.text.includes("이 요청의 날짜"),
      );
    const sel = {
      snapshotId: p.snapshotId,
      intent: "insufficient",
      factIds: [f.id],
      evidenceIds: [],
      candidateIds: [],
    };
    expect(composeInsightV2Result(s, sel as never, provenance).status).toBe(
      "insufficient",
    );
  });
  it("candidate choice requires existing eligibility and every cited source plus canonical candidate fact", () => {
    let c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    c = practise(c, T, "review", now, FAIL);
    const time = later(now, DAY),
      candidates = prerequisiteCheckCandidates(c, time, true, {
        answered: 0,
        goal: 20,
      });
    expect(candidates).not.toBeNull();
    const s = buildInsightV2Snapshot(c, 0, time, null, candidates),
      p = promptData(s);
    const candidate = p.candidates.find(
      (x: { eligible: boolean }) => x.eligible,
    );
    expect(candidate).toBeDefined();
    const fact = p.facts.find((f: { candidateIds: string[] }) =>
      f.candidateIds.includes(candidate.id),
    );
    const sel = {
      snapshotId: p.snapshotId,
      intent: "next-checks",
      factIds: [fact.id],
      evidenceIds: fact.evidenceIds,
      candidateIds: [candidate.id],
    };
    expect(
      composeInsightV2Result(s, sel as never, provenance).facts[0].candidateIds,
    ).toHaveLength(1);
    expect(() =>
      parseInsightV2Selection(JSON.stringify({ ...sel, evidenceIds: [] }), s),
    ).toThrow();
  });
});

it("explains an ineligible candidate as context without endorsing or selecting it", () => {
  const s = buildInsightV2Snapshot(emptyCourseState(), 0, now),
    p = promptData(s);
  const f = p.facts.find((f: { text: string }) =>
    f.text.includes("현재 조건에서 다음 확인 후보로 제안하지"),
  );
  expect(f).toBeDefined();
  const sel = {
    snapshotId: p.snapshotId,
    intent: "context",
    factIds: [f.id],
    evidenceIds: f.evidenceIds,
    candidateIds: [],
  };
  const result = composeInsightV2Result(s, sel as never, provenance);
  expect(result.status).toBe("supported");
  expect(result.facts[0].candidateIds).toEqual([]);
});

it("compares current-plan instants numerically across accepted offsets and precision", () => {
  const course = practise(
    plannedCourse("3-1-1-1", t0),
    "3-1-1-1",
    "learn",
    t0,
    PASS,
  );
  const positive = structuredClone(course);
  positive.plan!.configuredAt = "2026-10-01T10:00:00.000+09:00";
  expect(
    buildInsightV2Snapshot(positive, 0, now).observations[0].included,
  ).toBe(true);
  const precise = structuredClone(course);
  precise.learner.session!.startedAt = "2026-10-01T01:00:00.000000Z";
  expect(buildInsightV2Snapshot(precise, 0, now).observations[0].included).toBe(
    true,
  );
  const negative = structuredClone(course),
    completed = Date.parse(negative.learner.session!.completedAt!);
  negative.learner.session!.completedAt = new Date(
    completed - 9 * 60 * 60 * 1000,
  )
    .toISOString()
    .replace("Z", "-09:00");
  const boundary = new Date(completed + 14 * DAY);
  expect(
    buildInsightV2Snapshot(negative, 0, boundary).observations[0].included,
  ).toBe(true);
  expect(
    buildInsightV2Snapshot(negative, 0, new Date(boundary.getTime() + 1))
      .observations[0].exclusions,
  ).toContain("outside-window");
});

it("allows a source-backed contextual explanation without proposing a candidate", () => {
  const s = snapshot(),
    sel = { ...selection(s), intent: "context" };
  const result = composeInsightV2Result(s, sel as never, provenance);
  expect(result.facts[0].evidenceIds.length).toBeGreaterThan(0);
  expect(result.facts[0].candidateIds).toEqual([]);
});

// These are now known model regressions, not unseen heldouts. Canonical selections
// below exercise reference validity only; an independent model audit owns relevance.
it.each(["newer-summary", "cooldown", "active-after-trigger"] as const)(
  "accepts cited withholding context for known %s without endorsing candidates",
  (state) => {
    let c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL, {
      seed: 11003,
    });
    c = practise(c, T, "review", now, FAIL, { seed: 22301 });
    const today = later(now, DAY),
      time = later(today, 2 * 60 * 60 * 1000);
    if (state === "newer-summary") {
      // Schema-valid uncertain summary: its matching completed source is absent.
      c.memories[T].lastReviewedAt = later(time, DAY).toISOString();
      c.memories[T].nextReviewAt = later(time, 2 * DAY).toISOString();
    } else if (state === "cooldown") {
      c = practise(c, "5-1-5-4", "review", today, FAIL, { seed: 11801 });
    } else {
      c = practise(c, T, "review", today, ["wrong"], {
        finishRetry: false,
        seed: 11802,
      });
    }
    const s = buildInsightV2Snapshot(storedCourseSchema.parse(c), 0, time),
      p = promptData(s);
    expect(p.capabilities.nextCheckProposal).toBe(false);
    const source = s.observations.find((e) =>
      state === "newer-summary"
        ? e.source === "summary-without-session"
        : e.exclusions.includes("unfinished"),
    );
    const canonical = s.facts.find((f) =>
      state === "cooldown"
        ? f.id === "fact:candidate:check:5-1-5-4"
        : f.evidenceIds.includes(source!.id),
    )!;
    expect(canonical.kind).toBe("availability");
    expect(canonical.candidateIds).toEqual([]);
    const context = p.facts.find(
      (f: { text: string }) => f.text === canonical.text,
    );
    const observation = p.facts.find(
      (f: { kind: string; evidenceIds: string[] }) =>
        f.kind === "observation" && f.evidenceIds.length,
    );
    const sel = {
      snapshotId: p.snapshotId,
      intent: "context",
      factIds: [context.id, observation.id],
      evidenceIds: [
        ...new Set([...context.evidenceIds, ...observation.evidenceIds]),
      ],
      candidateIds: [],
    };
    const checked = parseInsightV2Selection(JSON.stringify(sel), s),
      result = composeInsightV2Result(s, checked, provenance);
    expect(result.status).toBe("supported");
    expect(result.facts[0]).toEqual(canonical);
    expect(result.facts[1].kind).toBe("observation");
    expect(result.facts.every((f) => !f.candidateIds.length)).toBe(true);
    expect(() =>
      parseInsightV2Selection(
        JSON.stringify({
          ...sel,
          evidenceIds: context.evidenceIds.length
            ? sel.evidenceIds.filter((id) => !context.evidenceIds.includes(id))
            : [],
        }),
        s,
      ),
    ).toThrow("missing-fact-reference");
    expect(() =>
      parseInsightV2Selection(
        JSON.stringify({ ...sel, candidateIds: ["c0"] }),
        s,
      ),
    ).toThrow("unsupported-selection");
  },
);
