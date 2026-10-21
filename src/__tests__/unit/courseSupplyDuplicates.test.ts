// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  storedCourseSchema,
  submitCourseAttempt,
} from "@/lib/math-srs/courseAutomation";
import { generateElementaryProblem } from "@/lib/elementary/generate";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import * as frames from "@/lib/math-srs/elementary/engineFrames";
import {
  courseProblemIdentity,
  COURSE_CONTENT_REDRAWS,
  generateCourseSession,
} from "@/lib/math-srs/elementary/generator";
import type { BankCourseCandidate } from "@/lib/math-srs/courseBank";

const now = new Date("2026-10-22T01:00:00.000Z");
const plan = () =>
  setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
const recommendation = {
  sectionId: "5-2-1-1",
  mode: "learn" as const,
  reason: "오늘의 학습",
};

describe("new course supply avoids accidental identical questions (L-09)", () => {
  it("deduplicates equivalent bank rows, while allowing different questions with the same answer", () => {
    const duplicate: BankCourseCandidate = {
      tier: "기본",
      content:
        "$33,\\ 34,\\ 37,\\ 18,\\ 22$ 중에서 $22$ 이상인 수 중 가장 큰 수를 구하시오.",
      answer: "$37$",
      solution: "22 이상인 수 중 가장 큰 수는 37입니다.",
    };
    const different = {
      ...duplicate,
      content: "$40$보다 $3$ 작은 수를 구하시오.",
      solution: "40-3=37",
    };
    const bank = [duplicate, { ...duplicate }, { ...duplicate }, different];
    for (let seed = 0; seed < 12; seed++) {
      const session = generateCourseSession(
        "5-2-1-1",
        seed,
        now,
        "learn",
        bank,
      );
      const stems = session.problems
        .filter((p) => p.tier === "기본")
        .map((p) => p.content);
      expect(new Set(stems).size).toBe(2);
      expect(stems).toContain(duplicate.content);
      expect(stems).toContain(different.content);
    }
  });

  it.each(["learn", "review"] as const)(
    "keeps the %s recommendation but changes accidental same-day supply",
    (mode) => {
      let state = startRecommendedCourse(
        plan(),
        recommendation,
        now,
        7,
        randomUUID,
      );
      const first = state.learner.session!;
      for (const p of first.problems)
        state = submitCourseAttempt(
          state,
          {
            sessionId: first.id,
            problemId: p.id,
            submittedAnswer: p.input.mode === "self-check" ? "" : p.answer,
            ...(p.input.mode === "self-check" ? { selfCorrect: true } : {}),
          },
          now,
          { followUps: true },
        );
      const before = structuredClone(state);
      const next = startRecommendedCourse(
        state,
        { ...recommendation, mode },
        now,
        7,
        randomUUID,
      );
      const run = next.learner.session!;
      expect(run.mode).toBe(mode);
      expect(run.problems).toHaveLength(5);
      expect(
        run.problems.filter((p) =>
          first.problems.some((old) => old.content === p.content),
        ),
      ).toEqual([]);
      expect(next.history.at(-1)!.session).toEqual(before.learner.session);
      expect(state).toEqual(before);
      expect(next.memories).toEqual(state.memories);
      expect(next.activity).toEqual(state.activity);
      expect(storedCourseSchema.safeParse(next).success).toBe(true);
      // A later scheduled review may revisit the same questions.
      const tomorrow = startRecommendedCourse(
        state,
        { ...recommendation, mode: "review" },
        new Date(now.getTime() + 86400000),
        7,
        randomUUID,
      );
      expect(tomorrow.learner.session!.problems.map((p) => p.content)).toEqual(
        first.problems.map((p) => p.content),
      );
    },
  );
});

it("retains bounded engine fallback when every redraw was already asked", () => {
  const prior = generateCourseSession("5-2-1-1", 7, now);
  const tiers = ["연산", "기본", "기본", "응용", "응용"] as const;
  const initial = tiers.map((tier, index) =>
    generateElementaryProblem(
      getCourseSection("5-2-1-1")!.unit,
      (7 + Math.imul(index + 1, 104729)) >>> 0,
      tier,
    ),
  );
  const excluded = [
    ...prior.problems,
    ...initial.map((p, index) => ({
      ...prior.problems[index],
      ...p,
      input: getCourseProblemInput(p),
    })),
  ];
  const redraw = vi
    .spyOn(frames, "generateCourseEngineRedraw")
    .mockImplementation(
      (_unit, _seed, tier) =>
        initial[tiers.findIndex((candidate) => candidate === tier)]!,
    );
  try {
    const next = generateCourseSession(
      "5-2-1-1",
      7,
      now,
      "review",
      [],
      excluded,
    );
    expect(next.problems).toHaveLength(5);
    expect(next.problems.map((p) => p.content)).toEqual(
      initial.map((p) => p.content),
    );
    expect(redraw).toHaveBeenCalledTimes(5 * COURSE_CONTENT_REDRAWS);
  } finally {
    redraw.mockRestore();
  }
});

it("keys the full question, answer, mode and figure rather than the numeric answer", () => {
  const p = generateCourseSession("5-2-1-1", 7, now).problems[0];
  const key = courseProblemIdentity(p);
  expect(courseProblemIdentity({ ...p })).toBe(key);
  expect(
    courseProblemIdentity({ ...p, content: p.content + " 다른 물음" }),
  ).not.toBe(key);
  expect(courseProblemIdentity({ ...p, answer: "1234567" })).not.toBe(key);
  expect(
    courseProblemIdentity({ ...p, input: { ...p.input, mode: "self-check" } }),
  ).not.toBe(key);
  expect(
    courseProblemIdentity({
      ...p,
      figureSpec: { type: "local-fixture", length: 3 },
    }),
  ).not.toBe(key);
});
