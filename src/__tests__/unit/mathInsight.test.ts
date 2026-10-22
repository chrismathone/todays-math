// @vitest-environment node
import { describe, expect, it } from "vitest";
import { emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { buildInsightSnapshot } from "@/lib/math-insight/snapshot";
import {
  buildInsightPrompt,
  parseInsightSelection,
  composeInsightResult,
  insightSnapshotId,
} from "@/lib/math-insight/inference";
import {
  at,
  DAY,
  FAIL,
  later,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";
const t0 = at("2026-10-01T01:00:00.000Z");
const T = "5-2-2-1";
const provenance = {
  provider: "gemini" as const,
  model: "test",
  role: "selection-only" as const,
};
const snapshot = () =>
  buildInsightSnapshot(
    practise(plannedCourse(T, t0), T, "learn", t0, FAIL),
    7,
    later(t0, DAY),
  );
describe("teacher insight snapshot", () => {
  it("returns partial static links without asserting student success or eligibility", () => {
    const s = buildInsightSnapshot(emptyCourseState(), 0, t0);
    expect(s.freshness).toBe("insufficient");
    expect(s.eligibility).toBe("insufficient");
    expect(s.goal).toBeNull();
    expect(s.sections).toHaveLength(4);
    expect(s.nextChecks).toHaveLength(2);
    expect(
      s.nextChecks.every((c) => !c.eligible && c.relation === "covers-part"),
    ).toBe(true);
  });
  it("cites retained sessions and exact reused independent counts, with no source content", () => {
    const s = snapshot();
    expect(s.freshness).toBe("current");
    expect(s.revision).toBe(7);
    expect(s.sections[0]).toMatchObject({
      outcome: "failed",
      independentIncorrect: 2,
    });
    expect(s.sections[0].evidenceIds).toEqual([s.evidence[0].id]);
    expect(s.evidence[0]).toMatchObject({
      included: true,
      independentIncorrect: 2,
    });
    expect(s.evidence[0].exclusions).toContain("retry-not-first-attempt");
    expect(JSON.stringify(s)).not.toContain("submittedAnswer");
  });
  it("empty, stale, future and outside-pilot plans are insufficient", () => {
    const c = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    expect(buildInsightSnapshot(c, 0, later(t0, 30 * DAY)).freshness).toBe(
      "insufficient",
    );
    expect(buildInsightSnapshot(c, 0, t0).freshness).toBe("insufficient");
    const outside = buildInsightSnapshot(plannedCourse("3-1-1-1", t0), 0, t0);
    expect(outside.eligibility).toBe("out-of-scope");
    expect(outside.nextChecks.every((c) => !c.eligible)).toBe(true);
    const noPlan = { ...c, plan: null };
    expect(buildInsightSnapshot(noPlan, 0, later(t0, DAY)).freshness).toBe(
      "insufficient",
    );
  });
  it("does not mutate state and hashes reproducibly", () => {
    const c = plannedCourse(T, t0),
      before = JSON.stringify(c);
    const a = buildInsightSnapshot(c, 1, t0),
      b = buildInsightSnapshot(c, 1, t0);
    expect(a).toEqual(b);
    expect(JSON.stringify(c)).toBe(before);
  });
});
describe("bounded model selection", () => {
  it("uses aliases rather than raw record identifiers in prompts and validates selections", () => {
    const s = snapshot(),
      prompt = buildInsightPrompt(s, "다음 확인은?");
    expect(prompt).not.toContain(s.evidence[0].sessionId);
    expect(prompt).not.toContain(s.stateDigest);
    const selection = parseInsightSelection(
      JSON.stringify({
        snapshotId: insightSnapshotId(s),
        intent: "evidence",
        evidenceIds: ["e0"],
        candidateIds: [],
      }),
      s,
    );
    const result = composeInsightResult(s, selection, provenance);
    expect(result.status).toBe("supported");
    expect(result.facts[0].evidenceIds).toEqual([s.evidence[0].id]);
    expect(result.facts[0].text).toContain("2");
  });
  it.each([
    { intent: "diagnosis", evidenceIds: [], candidateIds: [] },
    { intent: "evidence", evidenceIds: ["invented"], candidateIds: [] },
    { intent: "evidence", evidenceIds: ["e0", "e0"], candidateIds: [] },
    { intent: "insufficient", evidenceIds: ["e0"], candidateIds: [] },
    { intent: "evidence", evidenceIds: [], candidateIds: [] },
    {
      intent: "evidence",
      evidenceIds: ["e0"],
      candidateIds: [],
      diagnosis: "weak",
    },
  ])("rejects malformed/contradictory/unknown output %j", (value) => {
    const s = snapshot();
    expect(() =>
      parseInsightSelection(
        JSON.stringify({ ...value, snapshotId: insightSnapshotId(s) }),
        s,
      ),
    ).toThrow();
  });
  it("refuses excluded source IDs and ineligible candidates", () => {
    const s = buildInsightSnapshot(emptyCourseState(), 0, t0);
    expect(() =>
      parseInsightSelection(
        JSON.stringify({
          snapshotId: insightSnapshotId(s),
          intent: "next-checks",
          evidenceIds: [],
          candidateIds: ["c0"],
        }),
        s,
      ),
    ).toThrow();
    expect(() => parseInsightSelection("```json\n{}\n```", s)).toThrow();
  });
});

describe("snapshot source integrity", () => {
  it("blocks old positive credit when newer unfinished/future retained source exists", () => {
    const course = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const base = structuredClone(course.learner.session!);
    course.history.push({
      session: base,
      archivedAt: later(t0, DAY).toISOString(),
    } as never);
    course.learner.session = {
      ...base,
      id: "future-session",
      startedAt: later(t0, DAY).toISOString(),
      completedAt: null,
      attempts: [],
    };
    const s = buildInsightSnapshot(course, 0, later(t0, 2 * DAY));
    expect(s.sections[0].outcome).toBe("unknown");
    expect(s.sections[0].evidenceIds).toEqual([]);
    expect(s.freshness).toBe("insufficient");
  });
  it("freezes authored mapping source hash to actual local bytes", async () => {
    const { readFileSync } = await import("node:fs"),
      { createHash } = await import("node:crypto");
    const s = buildInsightSnapshot(emptyCourseState(), 0, t0);
    expect(s.scope.mappingSource.hash).toBe(
      createHash("sha256")
        .update(readFileSync(s.scope.mappingSource.path))
        .digest("hex"),
    );
  });
  it("rejects selected IDs bound to a different snapshot", () => {
    const s = snapshot();
    expect(() =>
      parseInsightSelection(
        JSON.stringify({
          snapshotId: "0".repeat(64),
          intent: "evidence",
          evidenceIds: ["e0"],
          candidateIds: [],
        }),
        s,
      ),
    ).toThrow("snapshot-mismatch");
  });
});
