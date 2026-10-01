// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  getCourseProblemInput,
  gradeCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import {
  gradeValueAndForm,
  requiredForm,
  type AnswerForm,
  type RequiredForm,
} from "@/lib/math-srs/elementary/answerForms";
import type { CourseProblem } from "@/lib/math-srs/elementary/types";

const IRREDUCIBLE = "기약분수로 나타내시오.";
const MIXED = "가분수를 대분수로 고쳐 쓰시오.";
function problem(answer: string, content = IRREDUCIBLE): CourseProblem {
  return {
    id: "form-test",
    sectionId: "5-1-3-2",
    tier: "기본",
    seed: 1,
    answer,
    content,
    solution: "",
    figureSpec: null,
    input: getCourseProblemInput({ answer, content }),
  };
}

describe("발문이 직접 요구하는 두 꼴만 인식", () => {
  it.each<[string, RequiredForm]>([
    [IRREDUCIBLE, "irreducible"],
    ["다음 분수를 기약분수 꼴로 쓰시오.", "irreducible"],
    ["약분하여 기약분수로 나타내시오.\n\n$6/8$", "irreducible"],
    [MIXED, "mixed"],
    ["자연수와 분수를 더한 수를 대분수로 나타내시오.", "mixed"],
    ["자연수 부분이 1이고 분수 부분이 1/2인 대분수를 쓰시오.", "mixed"],
  ])("%s → %s", (content, form) => {
    expect(requiredForm(problem("3/4", content))).toBe(form);
  });

  it.each([
    "답을 구하시오.",
    "대분수를 가분수로 고쳐 쓰시오.",
    "소수로 나타내시오.",
    "분수로 쓰시오.",
    "통분하시오.",
    "다음 분수를 2로 약분하시오.",
    "약분하여 만들 수 있는 분수는 모두 몇 개입니까?",
    "기약분수로 나타냈을 때 분자를 구하시오.",
    "기약분수로 나타낼 때 분모는 얼마입니까?",
    "대분수로 고쳤을 때 자연수 부분이 더 큰 것을 쓰시오.",
    "대분수로 나타내면 1과 빈칸/2입니다. 빈칸을 구하시오.",
    "기약분수로 나타내지 말고 소수로 쓰시오.",
    "기약분수로 나타내시오. 이유를 설명하시오.",
    "대분수로 나타내시오. 도형을 그리시오.",
    "기약분수로 나타내시오. 대분수로도 나타내시오.",
    "기약분수와 대분수의 뜻을 설명하시오.",
    "기약분수로 나타내시오라는 말의 뜻을 쓰시오.",
  ])("꼴 언급·중간 과정·다른 요구를 자동 판정하지 않음: %s", (content) => {
    expect(requiredForm(problem("3/4", content))).toBeNull();
    expect(gradeValueAndForm(problem("3/4", content), "6/8")).toEqual({
      value: true,
      form: "not-applicable",
    });
  });
});

describe("기약분수 — 학생이 적은 분자와 분모를 검사", () => {
  it.each<[string, string, boolean, AnswerForm]>([
    ["3/4", "3/4", true, "ok"],
    ["3/4", "6/8", true, "not-irreducible"],
    ["3/4", "4/8", false, "not-irreducible"],
    ["3/4", "2/3", false, "ok"],
    ["3/4", " $\\dfrac{6}{8}$ ", true, "not-irreducible"],
    ["3/4", " 3 / 4 ", true, "ok"],
    ["3/4", "03/04", true, "ok"],
    ["3/4", "+3/+4", true, "ok"],
    ["3/4", "-3/-4", true, "ok"],
    ["-3/4", "−3/4", true, "ok"],
    ["-3/4", "3/-4", true, "ok"],
    ["-3/4", "-6/8", true, "not-irreducible"],
    ["3/4", "-\\frac{-3}{4}", true, "ok"],
    ["3/4", "-\\frac{-6}{8}", true, "not-irreducible"],
    ["3/2", "1 1/2", true, "ok"],
    ["3/2", "1  1/2", true, "ok"],
    ["3/2", "1 2/4", true, "not-irreducible"],
    ["-3/2", "$-1\\tfrac{1}{2}$", true, "ok"],
    ["2", "2", true, "ok"],
    ["2", "2/1", true, "ok"],
    ["2", "4/2", true, "not-irreducible"],
    ["0", "0", true, "ok"],
    ["0", "0/1", true, "ok"],
    ["0", "0/4", true, "not-irreducible"],
    ["-2", "-2", true, "ok"],
    ["1000", "1,000", true, "ok"],
    ["3/4 cm", "3/4 cm", true, "ok"],
    ["3/4 cm", "$\\frac{3}{4}\\,\\mathrm{cm}$", true, "ok"],
    ["3/4 cm", "6/8cm", true, "not-irreducible"],
    ["3/4 cm", "3/4", true, "ok"],
    ["3/4 cm", "15/2mm", true, "ok"],
    ["3/4 cm", "30/4mm", true, "not-irreducible"],
  ])("%s ← %s", (answer, input, value, form) => {
    expect(gradeValueAndForm(problem(answer), input)).toEqual({ value, form });
  });
});

describe("대분수 — 정수·진분수에는 억지로 자연수 부분을 붙이지 않음", () => {
  it.each<[string, string, boolean, AnswerForm]>([
    ["3/2", "3/2", true, "not-mixed"],
    ["3/2", "$\\frac{6}{4}$", true, "not-mixed"],
    ["3/2", "5/2", false, "not-mixed"],
    ["3/2", "1 1/2", true, "ok"],
    ["3/2", "1  1/2", true, "ok"],
    ["3/2", "1\t1 / 2", true, "ok"],
    ["3/2", "$1\\frac{1}{2}$", true, "ok"],
    ["3/2", "1 2/4", true, "ok"],
    ["-3/2", "-1 1/2", true, "ok"],
    ["-3/2", "−1  1/2", true, "ok"],
    ["-3/2", "-3/2", true, "not-mixed"],
    ["-3/2", "3/-2", true, "not-mixed"],
    ["3/4", "3/4", true, "ok"],
    ["3/4", "6/8", true, "ok"],
    ["3/4", "0 3/4", true, "ok"],
    ["-3/4", "-3/4", true, "ok"],
    ["2", "2", true, "ok"],
    ["2", "4/2", true, "ok"],
    ["0", "0", true, "ok"],
    ["-2", "-2", true, "ok"],
    ["3/2m", "1 1/2m", true, "ok"],
    ["3/2m", "150cm", true, "ok"],
    ["3/2m", "3/2m", true, "not-mixed"],
  ])("%s ← %s", (answer, input, value, form) => {
    expect(gradeValueAndForm(problem(answer, MIXED), input)).toEqual({
      value,
      form,
    });
  });
});

describe("확신 없는 표기는 기존의 값 판정만 사용", () => {
  it.each([IRREDUCIBLE, MIXED])("%s", (content) => {
    for (const [answer, input, value] of [
      ["3/4", "0.75", true],
      ["3/2", "1.5", true],
      ["3/4", "1.5/2", true],
      ["3/4cm", "0.75cm", true],
      ["3/4", "0.7", false],
      ["1/3", "0.3333333333", false],
      ["3/4", "", false],
      ["3/4", "1/0", false],
      ["3/4", "1 3/2", false],
      ["3/4", "NaN", false],
      ["3/4", "3/4알", false],
      ["3/4", "3/4cm", false],
      ["3/4cm", "3/4kg", false],
      ["삼각형", "3/4", false],
    ] as const) {
      expect(gradeValueAndForm(problem(answer, content), input)).toEqual({
        value,
        form: "not-applicable",
      });
    }
  });

  it("큰 정수와 순환소수도 기존의 정확한 유리수 교차 곱으로 판정", () => {
    expect(
      gradeValueAndForm(problem("9007199254740992"), "9007199254740993").value,
    ).toBe(false);
    expect(gradeValueAndForm(problem("1/3"), "2/6")).toEqual({
      value: true,
      form: "not-irreducible",
    });
    expect(gradeValueAndForm(problem("1/3"), "0.3333333333333333").value).toBe(
      false,
    );
  });

  it.each([IRREDUCIBLE, MIXED, "소수로 나타내시오.", "통분하시오."])(
    "기존 self-check·판정 결과를 바꾸지 않음: %s",
    (content) => {
      const item = problem("3/2", content);
      expect(item.input.mode).toBe("self-check");
      expect(gradeCourseAnswer(item, "3/2")).toBeNull();
      gradeValueAndForm(item, "3/2");
      expect(gradeCourseAnswer(item, "1 1/2")).toBeNull();
      expect(getCourseProblemInput(item)).toEqual(item.input);
    },
  );
});
