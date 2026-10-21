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
import { publicCourseSession } from "@/lib/math-srs/courseAutomation";
import {
  gradeCourseAnswer,
  validateCourseAnswer,
  parseCourseAnswerQuantity,
} from "@/lib/math-srs/elementary/answers";

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

describe("range choices stay in the supplied set (L-08)", () => {
  it.each([
    [
      "$41,\\ 49,\\ 40,\\ 57,\\ 56$ 중에서 $41$ 이상인 수 중 가장 큰 수를 구하시오.",
      "$57$",
      [41, 49, 40, 57, 56],
    ],
    [
      "$64,\\ 67,\\ 47,\\ 60,\\ 50$ 중에서 $50$ 이상인 수 중 가장 큰 수를 구하시오.",
      "$67$",
      [64, 67, 47, 60, 50],
    ],
    [
      "$41$, $49$, $40$, $57$, $56$ 중에서 $49$ 미만인 수 중 가장 작은 수를 구하시오.",
      "$40$",
      [41, 49, 40, 57, 56],
    ],
  ] as const)("%s", (content, answer, numbers) => {
    const p = {
      ...generateCourseSession("5-2-1-1", 11, now).problems[1],
      content,
      answer,
      input: {
        mode: "number" as const,
        label: "답",
        placeholder: "",
        help: "",
      },
    };
    const result = makeCourseAnswerChoices(p, ["$74$", "$44$", "$58$"]);
    expect(result.answerChoices).toHaveLength(4);
    expect(new Set(result.answerChoices).size).toBe(4);
    expect(result.answerChoices).toContain(answer);
    expect(
      result.answerChoices!.every((choice) =>
        numbers.includes(valueOf(choice) as never),
      ),
    ).toBe(true);
    expect(makeCourseAnswerChoices(p, ["$900$"])).toEqual(result);
  });
});

it("keeps stored old choices while new exact range predicates round-trip through public values", () => {
  for (const [predicate, direction, expected] of [
    ["이상", "큰", 37],
    ["이상", "작은", 22],
    ["이하", "큰", 22],
    ["이하", "작은", 18],
    ["초과", "큰", 37],
    ["초과", "작은", 33],
    ["미만", "큰", 18],
    ["미만", "작은", 18],
  ] as const) {
    const session = generateCourseSession("5-2-1-1", 11, now);
    const p = session.problems[1];
    Object.assign(p, {
      content: `$33, 34, 37, 18, 22$ 중에서 $22$ ${predicate}인 수 중 가장 ${direction} 수를 구하시오.`,
      answer: `$${expected}$`,
      input: { ...p.input, mode: "number" },
    });
    Object.assign(p, makeCourseAnswerChoices(p, []));
    const shown = publicCourseSession(session).problems[1];
    expect(shown.answerChoices).toEqual(p.answerChoices);
    expect(
      shown.answerChoices!.every((c) =>
        [18, 22, 33, 34, 37].includes(valueOf(c)!),
      ),
    ).toBe(true);
    expect(shown.answerChoices!.filter((c) => gradeCourseAnswer(p, c))).toEqual(
      [p.answer],
    );
    for (const value of shown.answerChoices!)
      expect(validateCourseAnswer(p, value)).toBeNull();
    p.answerChoices = [p.answer, "$74$", "$44$", "$58$"];
    expect(publicCourseSession(session).problems[1].answerChoices).toEqual(
      p.answerChoices,
    );
  }
});

it("does not apply the special range choices when the saved answer disagrees or numbers repeat", () => {
  const p = generateCourseSession("5-2-1-1", 11, now).problems[1];
  Object.assign(p, {
    content: "$33,34,37,18,22$ 중에서 $22$ 이상인 수 중 가장 큰 수를 구하시오.",
    answer: "$34$",
    input: { ...p.input, mode: "number" },
  });
  const generic = makeCourseAnswerChoices({ ...p, content: "구하시오." }, []);
  expect(makeCourseAnswerChoices(p, [])).toEqual(generic);
  p.content =
    "$33,34,37,22,22$ 중에서 $22$ 이상인 수 중 가장 큰 수를 구하시오.";
  p.answer = "$37$";
  expect(makeCourseAnswerChoices(p, [])).toEqual(
    makeCourseAnswerChoices({ ...p, content: "구하시오." }, []),
  );
});
