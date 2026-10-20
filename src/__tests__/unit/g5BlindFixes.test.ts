// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

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
