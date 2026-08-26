/**
 * 초3 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337, 555, 42];

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `소단원 없음 ${code}`).toBeTruthy();
  return u!;
}

function katexInts(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

describe("초3 1-1-1 세 자리 덧셈 — 묻는 대상이 답이다", () => {
  const unit = unitOf("1-1-1");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01·02 두 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(nums.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const wn = katexInts(w.content);
      expect(answerInt(w.answer)).toBe(wn[0]! + wn[1]!);
    }
  });

  it("03 세 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const nums = katexInts(p.content);
      expect(nums).toHaveLength(3);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]! + nums[2]!);
    }
  });

  it("04 역산 — 상자 셋이거나 잘못 더한 식", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const nums = katexInts(p.content);
      if (p.content.includes("상자")) {
        expect(nums).toHaveLength(3);
        expect(answerInt(p.answer)).toBe(nums[0]! - nums[1]! - nums[2]!);
      } else {
        expect(nums).toHaveLength(3);
        const right = nums[0]!;
        const wrong = nums[1]!;
        const wrongSum = nums[2]!;
        expect(answerInt(p.answer)).toBe(wrongSum - wrong + right);
      }
    }
  });

  it("05 합의 백의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.floor((a! + b!) / 100));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("06 빈칸 가수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const left = p.content.match(/\$\\square\+(\d+)=(\d+)\$/);
      const right = p.content.match(/\$(\d+)\+\\square=(\d+)\$/);
      if (left) {
        expect(answerInt(p.answer)).toBe(Number(left[2]) - Number(left[1]));
      } else {
        expect(right, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(Number(right![2]) - Number(right![1]));
      }
    }
  });

  it("07 일의 자리 숫자끼리의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe((a! % 10) + (b! % 10));
    }
  });

  it("08 합이 어떤 수보다 얼마 큰가", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! + b! - c!);
    }
  });

  it("09 합보다 100 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const nums = katexInts(p.content);
      expect(nums[2]).toBe(100);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]! + 100);
    }
  });

  it("10 합이 짝수·홀수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      expect(p.answer).toBe((a! + b!) % 2 === 0 ? "짝수" : "홀수");
    }
  });
});
