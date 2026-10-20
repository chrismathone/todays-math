// @vitest-environment node
/**
 * Wrong choices must be values a student could reach, not another question's answer.
 * On 2026-10-19 66% of 초5 choice sets carried a far value (answer 4 with 210 · 37 · 42),
 * so a student could pick the only plausible number without solving.
 */
import { describe, expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { makeCourseAnswerChoices } from "@/lib/math-srs/elementary/choiceAnswers";
import { parseCourseAnswerQuantity } from "@/lib/math-srs/elementary/answers";

const now = new Date("2026-10-19T10:00:00.000Z");
const valueOf = (raw: string) => {
  const q = parseCourseAnswerQuantity(raw);
  return q
    ? (Number(q.value.numerator) / Number(q.value.denominator)) *
        (q.unit?.multiplier ?? 1)
    : null;
};
/** Independent of the implementation's window: off by more than the answer itself (and three steps). */
function far(answer: string, other: string) {
  const a = valueOf(answer);
  const v = valueOf(other);
  if (a === null || v === null) return false;
  const decimals = /\.(\d+)/.exec(answer)?.[1].length ?? 0;
  return Math.abs(v - a) > Math.max(3 * 10 ** -decimals, Math.abs(a));
}

describe("plausible wrong choices", () => {
  it("fills a new 70-degree base-angle frame with nearby angles before 90-degree offsets", () => {
    const problem = {
      ...generateCourseSession("5-2-3-2", 3, now).problems[0],
      seed: 531567,
      content: "밑각의 크기를 구하시오.",
      answer: "$70^\\circ$",
      input: {
        mode: "number" as const,
        label: "답",
        placeholder: "",
        help: "",
      },
    };
    const { answerChoices } = makeCourseAnswerChoices(problem, [
      "$46$",
      "$69^\\circ$",
    ]);
    expect(answerChoices).toHaveLength(4);
    expect(answerChoices!.every((choice) => choice.includes("\\circ"))).toBe(
      true,
    );
    expect(answerChoices!.some((choice) => far(problem.answer, choice))).toBe(
      false,
    );
  });
  it("does not borrow far answers from other questions of the section", () => {
    const problem = generateCourseSession("5-2-1-1", 11, now).problems[1];
    problem.content =
      "$39$, $50$, $59$, $55$, $42$ 중에서 $55$ 이하인 수는 모두 몇 개입니까?";
    problem.answer = "$4$";
    problem.input = { ...problem.input, mode: "number" };
    const { answerChoices } = makeCourseAnswerChoices(problem, [
      "$67$",
      "$71$",
      "$58$",
      "$5$",
      "$17$",
    ]);
    expect(answerChoices).toHaveLength(4);
    expect(answerChoices).toContain("$4$");
    expect(answerChoices).toContain("$5$");
    for (const wrong of ["$67$", "$71$", "$58$", "$17$"])
      expect(answerChoices).not.toContain(wrong);
  });

  it("keeps every 초5 engine choice set free of far values", () => {
    const offenders: string[] = [];
    let sets = 0;
    for (const section of COURSE_SECTIONS.filter((s) => s.grade === 5))
      for (const seed of [3, 41, 977]) {
        for (const problem of generateCourseSession(section.id, seed, now)
          .problems) {
          if (!problem.answerChoices) continue;
          sets++;
          const format = (raw: string) => ({
            unit: parseCourseAnswerQuantity(raw)?.unit?.name ?? "",
            notation: /\\(?:dfrac|tfrac|frac)\{|\d\s*\/\s*\d/.test(raw)
              ? "fraction"
              : /\d\.\d/.test(raw)
                ? "decimal"
                : "integer",
          });
          for (const choice of problem.answerChoices)
            expect(
              format(choice),
              `${section.id}: ${problem.answer} → ${choice}`,
            ).toEqual(format(problem.answer));
          const bad = problem.answerChoices.filter((choice) =>
            far(problem.answer, choice),
          );
          if (bad.length)
            offenders.push(
              `${section.id} ${problem.answer} → ${problem.answerChoices.join(" · ")}`,
            );
        }
      }
    expect(sets).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });
});
