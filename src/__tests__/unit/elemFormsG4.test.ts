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

const PLACE_POS: Record<string, number> = {
  만: 0,
  천: 1,
  백: 2,
  십: 3,
  일: 4,
};

describe("초4 1-1-2 다섯 자리 수", () => {
  const unit = unitOf("1-1-2");

  it("05 자리 숫자는 그 자리의 숫자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /\$(\d+)\$에서 (만|천|백|십|일)의 자리 숫자를 쓰시오/,
      );
      expect(m, p.content).toBeTruthy();
      const digits = m![1]!.split("").map(Number);
      expect(answerInt(p.answer)).toBe(digits[PLACE_POS[m![2]!]!]!);
    }
  });

  it("06 자리 값은 숫자×자릿값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\$(\d+)\$에서 (만|천|백|십|일)의 자리 숫자가 나타내는 값/,
      );
      expect(m, p.content).toBeTruthy();
      const digits = m![1]!.split("").map(Number);
      const at = PLACE_POS[m![2]!]!;
      expect(answerInt(p.answer)).toBe(digits[at]! * 10 ** (4 - at));
    }
  });

  it("07 다섯 자리 수만 고른다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) => x[1]!);
      const fives = nums.filter((s) => s.length === 5);
      expect(fives).toHaveLength(1);
      expect(answerInt(p.answer)).toBe(Number(fives[0]));
    }
  });

  it("08 각 자리 숫자의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$의 각 자리 숫자의 합/);
      expect(m, p.content).toBeTruthy();
      const sum = m![1]!.split("").reduce((s, d) => s + Number(d), 0);
      expect(answerInt(p.answer)).toBe(sum);
    }
  });

  it("09 홀수인 가장 큰 수는 카드로 다시 짠다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const cards = [...p.content.matchAll(/\$(\d)\$/g)].map((x) =>
        Number(x[1]),
      );
      expect(cards.length).toBeGreaterThanOrEqual(5);
      const used = cards.slice(0, 5);
      const ans = answerInt(p.answer);
      expect(ans % 2).toBe(1);
      expect(String(ans).split("").map(Number).sort().join()).toBe(
        [...used].sort().join(),
      );
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("10 0이 아닌 자리 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$(\d+)\$에서 \$0\$이 아닌 자리 숫자/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        m![1]!.split("").filter((d) => d !== "0").length,
      );
    }
  });
});

describe("초4 1-1-3 10000이 몇십·몇백·몇천", () => {
  const unit = unitOf("1-1-3");

  it("05 10000이 n개인 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$10000\$이 \$(\d+)\$개인 수를 쓰시오/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(10000 * Number(m![1]));
    }
  });

  it("06 값은 몇 만인가", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$은 몇 만인가/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${Number(m![1]) / 10000}$만`);
    }
  });

  it("07 10000이 n개인 수는 n만", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$10000\$이 \$(\d+)\$개인 수는 몇 만인가/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${m![1]}$만`);
    }
  });

  it("08 만원권과 천원권의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /\$10000\$원짜리 지폐 \$(\d+)\$장과 \$1000\$원짜리 지폐 \$(\d+)\$장/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(
        `$${10000 * Number(m![1]) + 1000 * Number(m![2])}$원`,
      );
    }
  });

  it("09 10으로 나눈 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$(?:을|를) \$10\$으로 나누면/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) / 10);
    }
  });

  it("10 10000 묶음을 더한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /\$10000\$이 \$(\d+)\$개인 수보다 \$10000\$이 \$(\d+)\$개 더 큰 수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(10000 * (Number(m![1]) + Number(m![2])));
    }
  });
});
