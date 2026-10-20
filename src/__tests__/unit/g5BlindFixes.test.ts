// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  elementaryUnits,
  generateElementaryForm,
} from "@/lib/elementary/generate";
import {
  getCourseProblemInput,
  gradeCourseAnswer,
} from "@/lib/math-srs/elementary/answers";
import { extraAverageFrames } from "@/lib/math-srs/elementary/averageFrames";

const unit = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(`${code} `),
  )!;
const form = (code: string, id: string, seed = 1578854) =>
  generateElementaryForm(unit(code), seed, id);

describe("초5 블라인드 풀이: 답의 해석을 하나로 정한다", () => {
  it("1: 두 곱셈식에 나타난 약수만 묻는다", () => {
    for (const id of ["03", "10"]) {
      const p = Array.from({ length: 30 }, (_, i) =>
        form("1-2-2", id, 7919 * (i + 1)),
      ).find(
        (p) =>
          p.content.includes("곱셈식") || p.content.includes("에서 알 수 있는"),
      )!;
      expect(p.content).toContain("두 곱셈식");
      expect(p.content).toContain("나타난 수 중");
      expect(p.content).toContain("1\\times");
    }
  });
  it("2: 받아내림 전의 자연수부 차임을 밝힌다", () => {
    expect(form("1-5-4", "05").content).toContain("받아내림을 하기 전");
  });
  it("3: 분수부를 계산에서 제외했음을 밝힌다", () => {
    expect(form("2-2-4", "06").content).toContain("분수 부분을 빼고");
  });
});

describe("초5 블라인드 풀이: 개념과 학년 범위", () => {
  it("4: 최대공약수를 실제로 구해 나눈 몫을 묻는다", () => {
    const p = form("1-2-4", "06");
    expect(p.content).toContain("몫은");
    expect(p.answer).not.toBe("$0$");
  });
  it("5: 최대공약수로 나눈 두 몫의 곱을 묻는다", () => {
    expect(form("1-2-4", "10").content).toContain("두 몫을 곱하면");
  });
  it("6: 단위분수의 크기를 비교한다", () => {
    expect(form("1-4-4", "10").content).toContain("더 큰 분수의 분모");
  });
  it("7: 점대칭 성질로 여섯 변의 길이를 합한다", () => {
    expect(form("2-3-4", "10").content).toContain("둘레");
  });
  it("8: 분수 나눗셈 대신 곱셈으로 해결한다", () => {
    const p = form("2-2-3", "08");
    expect(p.content).not.toContain("□");
    expect(p.solution).not.toContain("나눈 수");
  });
});

describe("초5 블라인드 풀이: 표현과 소단원", () => {
  it("9: 분수부 합은 가분수와 대분수 모두 값으로 채점한다", () => {
    const p = form("1-5-2", "06");
    const problem = {
      ...p,
      id: "probe",
      sectionId: "5-1-5-2",
      tier: "기본" as const,
      seed: 1578854,
      input: getCourseProblemInput(p),
    };
    expect(p.answer).toBe("$1\\frac{1}{8}$");
    expect(gradeCourseAnswer(problem, "9/8")).toBe(true);
    expect(gradeCourseAnswer(problem, "1 1/8")).toBe(true);
    expect(gradeCourseAnswer(problem, "8/9")).toBe(false);
  });
  it("11: 무게 중을 띄어 쓴다", () => {
    expect(form("2-1-3", "07").content).toContain("무게 중");
  });
  it("12: 약수에서 제외한다는 뜻을 분명히 한다", () => {
    expect(form("1-2-1", "09").content).toContain("제외한");
  });
  it("13: 짝수 공배수 조건을 한 번만 말한다", () => {
    expect(form("1-2-5", "07").content).toContain("공배수 중 가장 작은 수");
    expect(form("1-2-5", "07").content).not.toContain("짝수인 수 중");
  });
  it("14: 올림한 수와 처음 수의 차를 묻는다", () => {
    expect(form("2-1-4", "06").content).toContain("처음 수의 차");
  });
  it("15: 대칭축 하나인 삼각형의 조건을 명시한다", () => {
    const p = Array.from({ length: 40 }, (_, i) =>
      form("2-3-3", "01", (i + 1) * 7919),
    ).find((p) => p.content.startsWith("이등변삼각형"))!;
    expect(p.content).toContain("정삼각형이 아닌");
  });
  it("16: 떨어진 칸은 선대칭인 무늬로 부른다", () => {
    expect(form("2-3-3", "03").content).toContain("선대칭인 무늬");
  });
  it("17: 평균 활용의 기본 문형은 합에서 빠진 값을 찾는다", () => {
    const p = extraAverageFrames(unit("2-6-2"), 636293, "기본")[0];
    expect(p.content).toContain("나머지 한 경기");
    expect(p.content).not.toContain("각 자료에 똑같이");
  });
});
