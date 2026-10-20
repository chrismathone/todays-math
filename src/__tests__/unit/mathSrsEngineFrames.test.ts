// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import baseline from "../fixtures/grade5EngineBeforeFrames.json";
import {
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";
import {
  courseProblemFrame,
  generateCourseSession,
} from "@/lib/math-srs/elementary/generator";
import {
  getCourseProblemInput,
  gradeCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import { makeCourseAnswerChoices } from "@/lib/math-srs/elementary/choiceAnswers";

const sections = COURSE_SECTIONS.filter((s) => s.grade === 5);
const enabled = sections.filter(
  (s) => s.semester === 2 || ["5-1-1", "5-1-2", "5-1-3"].includes(s.chapterId),
);

describe("SRS-only grade-five engine frames", () => {
  it("preserves every default tier and untiered output across the captured seeds", () => {
    for (const s of sections) {
      const h = createHash("sha256");
      for (const tier of [undefined, ...supportedTiers(s.unit)])
        for (let seed = 1; seed <= 20; seed++)
          h.update(
            JSON.stringify(
              generateElementaryProblem(s.unit, seed * 7919, tier),
            ),
          );
      expect(h.digest("hex"), s.id).toBe(
        baseline[s.id as keyof typeof baseline],
      );
    }
  });

  it.each(enabled.map((s) => [s.id, s] as const))(
    "%s supplies at least three automatic frames per tier",
    (_, s) => {
      for (const tier of ["기본", "응용"] as const) {
        const frames = new Set<string>();
        for (let i = 1; i <= 100; i++) {
          const p = generateCourseEngineRedraw(s.unit, i * 7919, tier);
          expect(getCourseProblemInput(p).mode, p.content).not.toBe(
            "self-check",
          );
          frames.add(courseProblemFrame(p.content));
          const problem = {
            ...p,
            id: "probe",
            sectionId: s.id,
            tier,
            seed: i * 7919,
            input: getCourseProblemInput(p),
          };
          const choices =
            i <= 8 ? makeCourseAnswerChoices(problem, []).answerChoices : null;
          if (problem.input.mode === "number" && i <= 8) {
            expect(choices, p.content).toHaveLength(4);
            expect(
              choices!.filter((c) => gradeCourseAnswer(problem, c)),
            ).toHaveLength(1);
            expect(new Set(choices).size).toBe(4);
          }
        }
        expect(frames.size, `${s.id}:${tier}`).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("uses additional frames only on redraws and leaves bank choices intact", () => {
    const session = generateCourseSession("5-2-1-1", 104729);
    const frames = session.problems.map((p) => courseProblemFrame(p.content));
    expect(new Set(frames).size).toBe(5);
    const first = session.problems[1];
    const s = sections.find((s) => s.id === first.sectionId)!;
    expect(first.content).toBe(
      generateElementaryProblem(s.unit, first.seed, first.tier).content,
    );
  });
});
