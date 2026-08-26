/**
 * 초4 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
} from "@/lib/elementary/generate";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337, 555, 42];

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u).toBeTruthy();
  return u!;
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

describe("초4 1-1-1 1000이 10개인 수", () => {
  const unit = unitOf("1-1-1");

  it("05 만이라고 읽는 수는 10000", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.content).toMatch(/만이라고 읽는 수/);
      expect(answerInt(p.answer)).toBe(10000);
      expect(p.content).toContain("$10000$");
    }
  });

  it("06 10000에서 1000을 k번 뺀다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$10000\$에서 \$1000\$을 \$(\d+)\$번 빼면/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(10000 - 1000 * Number(m![1]));
    }
  });

  it("07 총량을 1000으로 나누면 묶음 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$(\d+)\$(?:개|장) 있습니다\. \$1000\$/);
      expect(m, p.content).toBeTruthy();
      const bundles = Number(m![1]) / 1000;
      expect(p.answer).toBe(`$${bundles}$묶음`);
    }
  });

  it("08 10000원에서 가진 돈을 뺀다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /\$1000\$원짜리 지폐 \$(\d+)\$장과 \$100\$원짜리 동전 \$(\d+)\$개/,
      );
      expect(m, p.content).toBeTruthy();
      const have = 1000 * Number(m![1]) + 100 * Number(m![2]);
      expect(p.answer).toBe(`$${10000 - have}$원`);
    }
  });

  it("09 천 묶음과 백 묶음 중 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$1000\$이 \$(\d+)\$개인 수와 \$100\$이 \$(\d+)\$개인 수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Math.max(1000 * Number(m![1]), 100 * Number(m![2])),
      );
    }
  });

  it("10 10000보다 k 작은 수는 1000이 몇 개", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$10000\$보다 \$(\d+)\$ 작은 수는 \$1000\$이/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe((10000 - Number(m![1])) / 1000);
    }
  });
});
