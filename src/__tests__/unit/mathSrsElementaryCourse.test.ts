// @vitest-environment node
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
  getCourseSection,
  getNextCourseSection,
} from "@/lib/math-srs/elementary/catalog";
import {
  getCourseProblemInput,
  gradeCourseAnswer,
  validateCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import type { CourseProblem } from "@/lib/math-srs/elementary/types";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

const NOW = new Date("2026-09-23T00:00:00.000Z");
function question(answer: string, content = "답을 구하시오."): CourseProblem {
  return {
    id: "test",
    sectionId: "3-1-1-1",
    tier: "기본",
    seed: 1,
    content,
    answer,
    solution: "풀이",
    figureSpec: null,
    input: getCourseProblemInput({ answer, content }),
  };
}

describe("elementary course curriculum and generation", () => {
  it("covers every existing grade 3–6 section exactly once in curriculum order", () => {
    const source = CURRICULUM_UNITS.filter((unit) =>
      /^초[3-6]$/.test(unit.grade),
    );
    expect(COURSE_SECTIONS).toHaveLength(230);
    expect(COURSE_CHAPTERS).toHaveLength(48);
    expect(COURSE_SECTIONS.map((section) => section.unit)).toEqual(source);
    expect(new Set(COURSE_SECTIONS.map((section) => section.id)).size).toBe(
      230,
    );
    expect(COURSE_CHAPTERS.flatMap((chapter) => chapter.sections)).toEqual(
      COURSE_SECTIONS,
    );
    for (const grade of [3, 4, 5, 6]) {
      for (const semester of [1, 2]) {
        expect(
          COURSE_CHAPTERS.filter(
            (chapter) =>
              chapter.grade === grade && chapter.semester === semester,
          ),
        ).toHaveLength(6);
      }
    }
    for (const [index, section] of COURSE_SECTIONS.entries()) {
      expect(getCourseSection(section.id)).toBe(section);
      expect(getNextCourseSection(section.id)).toBe(COURSE_SECTIONS[index + 1]);
      expect(section.id).toBe(
        `${section.grade}-${section.unit.section.split(" ")[0]}`,
      );
    }
    expect(getCourseSection("missing")).toBeUndefined();
    expect(getNextCourseSection("missing")).toBeUndefined();
  });

  it.each([1, 123, 20260923, 4294967295])(
    "generates all 230 sections at seed %s with supported tiers and original content/figures",
    (seed) => {
      for (const section of COURSE_SECTIONS) {
        const session = generateCourseSession(section.id, seed, NOW);
        expect(session.problems).toHaveLength(5);
        expect(
          new Set(session.problems.map((problem) => problem.id)).size,
        ).toBe(5);
        expect(session.attempts).toEqual([]);
        for (const problem of session.problems) {
          expect(supportedTiers(section.unit)).toContain(problem.tier);
          expect(["연산", "기본", "응용"]).toContain(problem.tier);
          const defaultProblem = generateElementaryProblem(
            section.unit,
            problem.seed,
            problem.tier,
          );
          const original =
            defaultProblem.content === problem.content
              ? defaultProblem
              : generateCourseEngineRedraw(
                  section.unit,
                  problem.seed,
                  problem.tier,
                );
          expect(original).toBeDefined();
          expect(problem.content).toBe(original.content);
          expect(problem.answer).toBe(original.answer);
          expect(problem.solution).toBe(original.solution);
          expect(problem.figureSpec).toEqual(original.figureSpec);
          expect(problem.content.trim()).not.toBe("");
          expect(problem.answer.trim()).not.toBe("");
          expect(problem.solution.trim()).not.toBe("");
          const automatic = problem.input.mode !== "self-check";
          expect(gradeCourseAnswer(problem, original.answer)).toBe(
            automatic ? true : null,
          );
          expect(validateCourseAnswer(problem, original.answer)).toBeNull();
        }
      }
    },
  );

  it("is deterministic, varies practice seeds, and preserves learn/review mode", () => {
    const first = generateCourseSession("3-1-1-1", 123, NOW);
    expect(generateCourseSession("3-1-1-1", 123, NOW)).toEqual(first);
    const next = generateCourseSession("3-1-1-1", 456, NOW, "review");
    expect(next.mode).toBe("review");
    expect(next.problems.map((problem) => problem.content)).not.toEqual(
      first.problems.map((problem) => problem.content),
    );
    expect(first.mode).toBe("learn");
    expect(first.startedAt).toBe(NOW.toISOString());
    expect(first.completedAt).toBeNull();
    expect(() => generateCourseSession("missing", 1, NOW)).toThrow();
    expect(() => generateCourseSession("3-1-1-1", NaN, NOW)).toThrow();
    expect(() => generateCourseSession("3-1-1-1", 1.1, NOW)).toThrow();
  });
});

describe("conservative elementary answer grading", () => {
  it.each([
    ["$12$", "12"],
    ["$10000$", "10,000"],
    ["$0.5$", "1/2"],
    ["$\\frac{3}{4}$", "0.75"],
    ["$\\frac{3}{4}$", "6/8"],
    ["$1\\frac{1}{2}$", "1 1/2"],
    ["$1\\frac{1}{2}$", "3/2"],
    ["$1\\frac{1}{2}$", "1.5"],
    ["$-1\\frac{1}{2}$", "-1.5"],
    ["$\\frac{1}{2}$", "-\\frac{-2}{4}"],
    ["$12\\,\\mathrm{cm}$", "12"],
    ["$12\\,\\mathrm{cm}$", "120 mm"],
    ["$12\\,\\mathrm{cm}$", "0.12m"],
    ["$1\\,\\mathrm{m}^{2}$", "10000cm²"],
    ["$1\\,\\mathrm{m}^{3}$", "1000000cm³"],
    ["$1\\,\\mathrm{kg}$", "1000g"],
    ["$2\\,\\mathrm{L}$", "2000mL"],
    ["$90^\\circ$", "90°"],
    ["$12$개", "12개"],
    ["약 $16000$원", "16000"],
  ])("accepts equivalent value %s ← %s", (answer, input) => {
    const problem = question(answer);
    expect(problem.input.mode).toBe("number");
    expect(validateCourseAnswer(problem, input)).toBeNull();
    expect(gradeCourseAnswer(problem, input)).toBe(true);
  });

  it.each([
    "",
    "1/0",
    "1 1/0",
    "1 3/2",
    "NaN",
    "Infinity",
    "1,2",
    "1, 000",
    "12 and 13",
    "12cm extra",
    "$1$2",
  ])("rejects malformed input %s", (input) => {
    const problem = question("$12$");
    expect(validateCourseAnswer(problem, input)).not.toBeNull();
    expect(gradeCourseAnswer(problem, input)).toBe(false);
  });

  it("uses exact arithmetic for large integers and non-terminating fractions", () => {
    expect(
      gradeCourseAnswer(question("$2000800000000$"), "2000800000001"),
    ).toBe(false);
    expect(
      gradeCourseAnswer(question("$2000800000000$"), "2000800000000"),
    ).toBe(true);
    expect(gradeCourseAnswer(question("$\\frac{1}{3}$"), "0.3333333333")).toBe(
      false,
    );
    expect(gradeCourseAnswer(question("$\\frac{1}{3}$"), "2/6")).toBe(true);
  });

  it("does not discard mismatched units or accept unitless answers with arbitrary suffixes", () => {
    expect(gradeCourseAnswer(question("$12\\,\\mathrm{cm}$"), "12mm")).toBe(
      false,
    );
    expect(
      validateCourseAnswer(question("$12\\,\\mathrm{cm}$"), "12kg"),
    ).not.toBeNull();
    expect(validateCourseAnswer(question("$12$"), "12cm")).not.toBeNull();
    expect(gradeCourseAnswer(question("$12$개"), "12명")).toBe(false);
  });

  it.each([
    "삼각기둥",
    "가",
    "$<$",
    "$3:2$",
    "$1,\\ 2$",
    "몫 $5$, 나머지 $2$",
    "$3\\,\\mathrm{cm}\\ 6\\,\\mathrm{mm}$",
    "$5$분 $48$초",
    "$\\triangle=\\square\\times3$",
    "$1+2=3$",
    "$\\frac{1}{2}\\times\\frac{6}{5}$",
  ])(
    "requires explicit solution comparison for non-scalar answer %s",
    (answer) => {
      const problem = question(answer);
      expect(problem.input.mode).toBe("self-check");
      expect(gradeCourseAnswer(problem, answer)).toBeNull();
      expect(gradeCourseAnswer(problem, "anything")).toBeNull();
      expect(validateCourseAnswer(problem, "")).toBeNull();
    },
  );

  it.each([
    "가분수를 대분수로 고치시오.",
    "대분수를 가분수로 고쳐 쓰시오.",
    "기약분수로 나타내시오.",
    "분수로 쓰시오.",
    "소수로 나타내시오.",
    "다음 분수를 약분하시오.",
    "답을 구하고 이유를 설명하시오.",
    "도형을 그리시오.",
  ])(
    "requires solution comparison when numeric equivalence cannot assess the requested form: %s",
    (content) => {
      expect(
        gradeCourseAnswer(question("$\\frac{1}{2}$", content), "0.5"),
      ).toBeNull();
    },
  );
});
