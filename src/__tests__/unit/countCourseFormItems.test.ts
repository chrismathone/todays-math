// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  comparisonReasons,
  countBankWindow,
  countFinalProblems,
} from "../../../scripts/qa/math-srs/count-form-items";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";
import type { CourseProblem } from "@/lib/math-srs/elementary/types";

function problem(content = "답을 구하시오.", answer = "3/4"): CourseProblem {
  return {
    id: "census-test",
    sectionId: "5-1-3-2",
    tier: "기본",
    seed: 1,
    content,
    answer,
    solution: "풀이",
    figureSpec: null,
    input: getCourseProblemInput({ answer, content }),
  };
}

describe("꼴 문항 세기의 분모와 사유", () => {
  it("4지선다 가능 수와 실제 표시 경로를 구별하고 최종 문항을 정확히 분할", () => {
    const choices = ["3/4", "1/4", "2/4", "4/4"];
    const rows: CourseProblem[] = [
      { ...problem(), answerChoices: choices },
      problem(),
      problem("기약분수로 나타내시오."),
      problem("도형을 그리시오.", "삼각형"),
      {
        ...problem(),
        answerChoices: choices,
        interactive: { kind: "fraction-parts", denominator: 4, shape: "bar" },
      },
    ];
    const counts = countFinalProblems(rows);
    expect(counts).toMatchObject({
      total: 5,
      fourChoicesAvailable: 2,
      fourChoicesShown: 1,
      directInput: 1,
      interactive: 1,
      selfCheck: 2,
      comparison: 2,
      supportedForm: { irreducible: 1, mixed: 0 },
    });
    expect(
      counts.fourChoicesShown +
        counts.directInput +
        counts.interactive +
        counts.selfCheck,
    ).toBe(counts.total);
    expect(counts.reasons["기약분수"]).toBe(1);
    expect(counts.reasons["그리기"]).toBe(1);
  });

  it.each<[string, string[]]>([
    ["기약분수로 나타내시오.", ["기약분수"]],
    ["가분수를 대분수로 고쳐 쓰시오.", ["대분수"]],
    ["대분수를 가분수로 나타내시오.", ["가분수"]],
    ["소수로 나타내시오.", ["소수"]],
    ["분수로 쓰시오.", ["분수"]],
    ["약분하여 기약분수로 쓰시오.", ["기약분수", "약분"]],
    ["통분해 보시오.", ["통분"]],
    ["그려 보시오.", ["그리기"]],
    ["이유를 설명하시오.", ["설명"]],
    ["식을 만드시오.", ["식 쓰기"]],
    ["기약분수로 나타냈을 때 분자를 구하시오.", ["기약분수"]],
    ["대분수의 합을 구하시오.", []],
    ["답을 구하시오.", []],
  ])("현행 needsComparison이 걸린 이유만 세기: %s", (content, reasons) => {
    expect(comparisonReasons(content)).toEqual(reasons);
    expect(
      getCourseProblemInput({ content, answer: "3/4" }).mode === "self-check",
    ).toBe(reasons.length > 0);
  });

  it("은행의 self-check 제외 수를 최종 출제 문항 수에 섞지 않음", () => {
    const counts = countBankWindow([
      problem("기약분수로 나타내시오."),
      problem("대분수로 나타내시오."),
      problem("통분하시오."),
      problem("답을 구하시오.", "삼각형"),
      problem(),
    ]);
    expect(counts).toMatchObject({
      loaded: 5,
      selfCheckExcluded: 4,
      numeric: 1,
      selfCheckGroups: { irreducible: 1, mixed: 1, other: 2 },
    });
    expect(counts.reasons["통분"]).toBe(1);
  });

  it("두 가지 이상 걸려도 문항 분모는 한 번만 셈", () => {
    const rows = [problem("약분하여 기약분수로 쓰시오. 이유를 설명하시오.")];
    const counts = countFinalProblems(rows);
    expect(counts.total).toBe(1);
    expect(counts.comparison).toBe(1);
    expect(counts.reasons["기약분수"]).toBe(1);
    expect(counts.reasons["약분"]).toBe(1);
    expect(counts.reasons["설명"]).toBe(1);
    expect(counts.supportedForm.irreducible).toBe(0);
  });
});
