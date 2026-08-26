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

function degNums(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) => Number(m[1]));
}

function answerDeg(answer: string): number {
  const m = /^\$(\d+)\^\\circ\$/.exec(answer);
  expect(m, `각도 답이 아님: ${answer}`).toBeTruthy();
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

describe("초4 1-1-4 억", () => {
  const unit = unitOf("1-1-4");

  it("05 억은 만이 a×10000개", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$억은 만이 몇 개인 수인가/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * 10000);
    }
  });

  it("06 1000만씩 묶음은 a×10", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$억을 \$1000\$만씩 묶으면/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${Number(m![1]) * 10}$묶음`);
    }
  });

  it("07 만이 n개인 수는 n/10000억", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/만이 \$(\d+)\$개인 수는 몇 억인가/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${Number(m![1]) / 10000}$억`);
    }
  });

  it("08 억과 만을 수로 바꿔 비교", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$억과 \$(\d+)\$만 중 더 큰 수/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Math.max(Number(m![1]) * 100000000, Number(m![2]) * 10000),
      );
    }
  });

  it("09 억에서 만을 뺀다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$억에서 \$(\d+)\$만을 빼면/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * 100000000 - Number(m![2]) * 10000,
      );
    }
  });

  it("10 억보다 만만큼 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$(\d+)\$억보다 \$(\d+)\$만 큰 수/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * 100000000 + Number(m![2]) * 10000,
      );
    }
  });
});

describe("초4 1-1-5 조", () => {
  const unit = unitOf("1-1-5");

  it("05 조는 억이 a×10000개", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$조는 억이 몇 개인 수인가/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * 10000);
    }
  });

  it("06 1000억씩 묶음은 a×10", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$조를 \$1000\$억씩 묶으면/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${Number(m![1]) * 10}$묶음`);
    }
  });

  it("07 억이 n개인 수는 n/10000조", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/억이 \$(\d+)\$개인 수는 몇 조인가/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`$${Number(m![1]) / 10000}$조`);
    }
  });

  it("08 조와 억을 수로 바꿔 비교", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$조와 \$(\d+)\$억 중 더 큰 수/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Math.max(Number(m![1]) * 1000000000000, Number(m![2]) * 100000000),
      );
    }
  });

  it("09 조에서 억을 뺀다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$조에서 \$(\d+)\$억을 빼면/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * 1000000000000 - Number(m![2]) * 100000000,
      );
    }
  });

  it("10 조보다 1000억 d개 작은 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /\$(\d+)\$조보다 \$1000\$억이 \$(\d+)\$개 작은 수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * 1000000000000 - Number(m![2]) * 100000000000,
      );
    }
  });
});

describe("초4 1-1-6 뛰어 세기", () => {
  const unit = unitOf("1-1-6");

  it("05 앞으로 뛰어 센 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /\$(\d+)\$부터 \$(\d+)\$씩 \$(\d+)\$번 뛰어 센 수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) + Number(m![2]) * Number(m![3]),
      );
    }
  });

  it("06 거꾸로 뛰어 센 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\$(\d+)\$에서 \$(\d+)\$씩 거꾸로 \$(\d+)\$번 뛰어 센 수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) - Number(m![2]) * Number(m![3]),
      );
    }
  });

  it("07 다음 수는 공차만큼 더한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) =>
        Number(x[1]),
      );
      expect(nums.length).toBeGreaterThanOrEqual(3);
      const step = nums[1]! - nums[0]!;
      expect(answerInt(p.answer)).toBe(nums[2]! + step);
    }
  });

  it("08 횟수는 차를 걸음으로 나눈다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /\$(\d+)\$에서 \$(\d+)\$씩 뛰어 세어 \$(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        (Number(m![3]) - Number(m![1])) / Number(m![2]),
      );
    }
  });

  it("09 빈칸은 이웃과의 걸음", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const listed = p.content.match(/쓰면 (.+?)입니다/);
      expect(listed, p.content).toBeTruthy();
      const vals = listed![1]!.split(", ").map((s) => {
        const m = /\$(\d+)\$/.exec(s);
        return m ? Number(m[1]) : null;
      });
      const knownAt = vals
        .map((v, i) => (v === null ? -1 : i))
        .filter((i) => i >= 0);
      const step =
        (vals[knownAt[1]!]! - vals[knownAt[0]!]!) / (knownAt[1]! - knownAt[0]!);
      const miss = vals.findIndex((v) => v === null);
      expect(answerInt(p.answer)).toBe(
        vals[knownAt[0]!]! + step * (miss - knownAt[0]!),
      );
    }
  });

  it("10 두 뛰어 세기 중 마지막이 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /같은 수 \$(\d+)\$에서 \$(\d+)\$씩 \$(\d+)\$번 뛰어 센 수와 \$(\d+)\$씩 \$(\d+)\$번/,
      );
      expect(m, p.content).toBeTruthy();
      const start = Number(m![1]);
      const t = Number(m![3]);
      expect(Number(m![5])).toBe(t);
      expect(answerInt(p.answer)).toBe(
        Math.max(start + Number(m![2]) * t, start + Number(m![4]) * t),
      );
    }
  });
});

describe("초4 1-1-7 수의 크기 비교", () => {
  const unit = unitOf("1-1-7");

  it("05 두 다섯 자리 중 큰/작은 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /\$(\d+)\$(?:과|와) \$(\d+)\$는 모두 다섯 자리 수입니다\. 더 (큰|작은) 수/,
      );
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      expect(answerInt(p.answer)).toBe(
        m![3] === "큰" ? Math.max(a, b) : Math.min(a, b),
      );
    }
  });

  it("06 부등호는 두 수의 크기", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$ □ \$(\d+)\$ 에서/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      expect(p.answer).toBe(a > b ? ">" : a < b ? "<" : "=");
    }
  });

  it("07 작은 수부터 나열", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) =>
        Number(x[1]),
      );
      const sorted = [...nums].sort((a, b) => a - b);
      expect(p.answer).toBe(sorted.map((v) => `$${v}$`).join(", "));
    }
  });

  it("08 차는 큰 수에서 작은 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$(?:과|와) \$(\d+)\$의 차는/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Math.abs(Number(m![1]) - Number(m![2])));
    }
  });

  it("09 더 큰 수의 만의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$(\d+)\$(?:과|와) \$(\d+)\$ 중 더 큰 수의 만의 자리/,
      );
      expect(m, p.content).toBeTruthy();
      const big = Math.max(Number(m![1]), Number(m![2]));
      expect(answerInt(p.answer)).toBe(Number(String(big)[0]));
    }
  });

  it("10 가장 큰 수와 가장 작은 수의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) =>
        Number(x[1]),
      );
      expect(answerInt(p.answer)).toBe(Math.max(...nums) - Math.min(...nums));
    }
  });
});

describe("초4 1-2-1 각의 크기 비교", () => {
  const unit = unitOf("1-2-1");

  it("05 두 각 중 더 큰 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ds = degNums(p.content);
      expect(ds.length).toBeGreaterThanOrEqual(2);
      expect(answerDeg(p.answer)).toBe(Math.max(ds[0]!, ds[1]!));
    }
  });

  it("06 두 각의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const [y, x] = degNums(p.content);
      expect(y && x).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(Math.abs(y! - x!));
    }
  });

  it("07 네 각 중 가장 큰 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(answerDeg(p.answer)).toBe(Math.max(...degNums(p.content)));
    }
  });

  it("08 두 쌍의 합 중 더 큰 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, b, c, d] = degNums(p.content);
      expect(a && b && c && d).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(Math.max(a! + b!, c! + d!));
    }
  });

  it("09 가 각에서 더하고 뺀 나 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [x, d] = degNums(p.content);
      expect(x && d).toBeTruthy();
      const y = p.content.includes("더 큽니다") ? x! + d! : x! - d!;
      expect(answerDeg(p.answer)).toBe(y);
    }
  });

  it("10 큰 각부터 나열", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const ds = degNums(p.content);
      const desc = [...ds].sort((a, b) => b - a);
      expect(p.answer).toBe(desc.map((v) => `$${v}^\\circ$`).join(", "));
    }
  });
});

describe("초4 1-2-2 각의 크기 재기", () => {
  const unit = unitOf("1-2-2");

  it("05 각도기 그림의 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.figureSpec).toMatchObject({ kind: "protractor" });
      const d = (p.figureSpec as { deg: number }).deg;
      expect(answerDeg(p.answer)).toBe(d);
    }
  });

  it("06 d도는 1도가 d개", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const d = degNums(p.content)[0];
      expect(d).toBeTruthy();
      expect(answerInt(p.answer)).toBe(d);
    }
  });

  it("07 눈금 칸 수가 곧 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/눈금이 \$(\d+)\$칸인 각/);
      expect(m, p.content).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(Number(m![1]));
    }
  });

  it("08 재 둔 두 각의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [x, y] = degNums(p.content);
      expect(x && y).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(x! + y!);
    }
  });

  it("09 직각보다 d만큼 큰 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const d = degNums(p.content)[0];
      expect(d).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(90 + d!);
    }
  });

  it("10 직선이 이루는 각보다 d만큼 작은 각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const d = degNums(p.content)[0];
      expect(d).toBeTruthy();
      expect(answerDeg(p.answer)).toBe(180 - d!);
    }
  });
});

describe("초4 1-2-3 각의 분류", () => {
  const unit = unitOf("1-2-3");

  it("05 그림 각의 분류는 치수로", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.figureSpec).toMatchObject({ kind: "protractor" });
      const d = (p.figureSpec as { deg: number }).deg;
      const want = d < 90 ? "예각" : d === 90 ? "직각" : "둔각";
      expect(p.answer).toBe(want);
    }
  });

  it("06 세 각 중 둔각 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(answerInt(p.answer)).toBe(
        degNums(p.content).filter((v) => v > 90).length,
      );
    }
  });

  it("07 직각인 각은 90도", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(degNums(p.content)).toContain(90);
      expect(answerDeg(p.answer)).toBe(90);
    }
  });

  it("08 둔각을 나타난 차례로 나열", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const obtuse = degNums(p.content).filter((v) => v > 90);
      expect(p.answer).toBe(obtuse.map((v) => `$${v}^\\circ$`).join(", "));
    }
  });

  it("09 예각 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      expect(answerInt(p.answer)).toBe(
        degNums(p.content).filter((v) => v < 90).length,
      );
    }
  });

  it("10 가장 큰 예각", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const acute = degNums(p.content).filter((v) => v < 90);
      expect(answerDeg(p.answer)).toBe(Math.max(...acute));
    }
  });
});
