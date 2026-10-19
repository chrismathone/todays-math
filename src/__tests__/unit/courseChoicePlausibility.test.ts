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
