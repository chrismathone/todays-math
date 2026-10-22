// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
import {
  prerequisiteCheckCandidates,
  prerequisiteStep,
} from "@/lib/math-prerequisite/policy";
import { coursePrerequisiteBudget } from "@/lib/math-prerequisite/courseIntegration";
import {
  bindExpedition,
  expeditionCourseCheckCandidates,
} from "@/lib/math-explorers/expedition";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { buildInsightSnapshot } from "@/lib/math-insight/snapshot";
import {
  buildInsightPrompt,
  insightSnapshotId,
  parseInsightSelection,
  composeInsightResult,
} from "@/lib/math-insight/inference";
import {
  at,
  DAY,
  FAIL,
  MINUTE,
  PASS,
  later,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";
import { failedTargetCourse } from "../helpers/mathPrerequisiteIntegrationFixture";
const t0 = at("2026-10-01T01:00:00.000Z"),
  now = later(t0, DAY),
  T = "5-2-2-1",
  P = "5-1-5-4";
const pool = (course: ReturnType<typeof plannedCourse>) =>
  prerequisiteCheckCandidates(
    course,
    now,
    true,
    coursePrerequisiteBudget(course, now),
  );
const view = (course: ReturnType<typeof plannedCourse>) =>
  buildInsightSnapshot(course, 1, now, null, pool(course));
beforeEach(() => vi.stubEnv("MATH_PREREQ_CHECK", "on"));
afterEach(() => vi.unstubAllEnvs());
describe("authoritative pre-supply candidate eligibility", () => {
  it("fresh pass and one failure have no personalized next checks", () => {
    for (const answers of [PASS, FAIL]) {
      const s = view(practise(plannedCourse(T, t0), T, "learn", t0, answers));
      expect(s.freshness).toBe("current");
      expect(s.nextChecks.every((c) => !c.eligible)).toBe(true);
    }
  });
  it("two independent failures cite both sessions, while section summary cites only its selected latest source", () => {
    const c = failedTargetCourse(now, 20),
      s = view(c);
    expect(s.nextChecks.every((c) => c.eligible)).toBe(true);
    expect(s.nextChecks[0].evidenceIds).toHaveLength(2);
    expect(s.sections[0].evidenceIds).toHaveLength(1);
    expect(s.evidence[0].purposes).toEqual(["candidate-trigger"]);
    expect(s.evidence[1].purposes).toEqual([
      "section-current",
      "candidate-trigger",
    ]);
    expect(s.evidence.filter((e) => e.included)).toHaveLength(2);
    const prompt = buildInsightPrompt(s, "다음 확인은?");
    expect(prompt).not.toContain(c.learner.session!.id);
    const selection = parseInsightSelection(
      JSON.stringify({
        snapshotId: insightSnapshotId(s),
        intent: "next-checks",
        evidenceIds: ["e0", "e1"],
        candidateIds: ["c0"],
      }),
      s,
    );
    expect(
      composeInsightResult(s, selection, {
        provider: "gemini",
        model: "test",
        role: "selection-only",
      }).status,
    ).toBe("supported");
  });
  it("keeps active, feature-off, budget, same-day, cooldown and return-precedence guards", () => {
    const c = failedTargetCourse(now, 20);
    expect(
      prerequisiteCheckCandidates(c, now, false, { goal: 20, answered: 0 }),
    ).toBeNull();
    expect(
      prerequisiteCheckCandidates(c, now, true, { goal: 20, answered: 16 }),
    ).toBeNull();
    const active = practise(c, T, "review", later(now, -MINUTE), ["wrong"], {
      finishRetry: false,
    });
    expect(pool(active)).toBeNull();
    const checked = practise(c, P, "review", later(now, -30 * MINUTE), FAIL);
    expect(pool(checked)).toBeNull();
    expect(
      prerequisiteStep(checked, now, true, { goal: 20, answered: 0 })?.kind,
    ).toBe("return");
    const cooldown = structuredClone(c);
    cooldown.memories[P] = {
      ...c.memories[T],
      sectionId: P,
      lastReviewedAt: later(now, -DAY).toISOString(),
    };
    expect(pool(cooldown)?.sectionIds).toEqual(["5-1-5-3"]);
    const today = structuredClone(c);
    today.memories[P] = {
      ...c.memories[T],
      sectionId: P,
      lastReviewedAt: now.toISOString(),
    };
    expect(pool(today)).toBeNull();
  });
  it("uses frozen elementary mission budget and scope over mutable course quota", () => {
    const course = failedTargetCourse(now, 20),
      state = { ...emptySrsState(), course };
    const bound = bindExpedition(
      state,
      state,
      {
        kind: "elementary",
        route: "bank",
        unitId: "g5-fractions",
        title: "분수",
        subtitle: "fixture",
        goal: 5,
      },
      now,
      randomUUID(),
      randomUUID(),
    );
    bound.expedition!.mission!.answered = 1;
    expect(expeditionCourseCheckCandidates(bound, now)).toBeNull();
    bound.expedition!.mission!.answered = 0;
    expect(
      expeditionCourseCheckCandidates(bound, now)?.sectionIds,
    ).toHaveLength(2);
    bound.expedition!.mission!.unitId = "g5-decimals";
    expect(expeditionCourseCheckCandidates(bound, now)).toBeNull();
    bound.expedition!.mission!.kind = "middle";
    expect(expeditionCourseCheckCandidates(bound, now)).toBeNull();
  });
});
