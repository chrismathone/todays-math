/**
 * 초6 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
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
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `소단원 없음 ${code}`).toBeTruthy();
  return u!;
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

function parseFrac(text: string): { n: number; d: number } | null {
  const mixed = /(\d+)\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (mixed) {
    const w = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    return { n: w * d + n, d };
  }
  const f = /\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (f) return { n: Number(f[1]), d: Number(f[2]) };
  const whole = /\$(\d+)\$/.exec(text);
  if (whole) return { n: Number(whole[1]), d: 1 };
  return null;
}

function expectFracEq(answer: string, num: number, den: number, label: string) {
  const got = parseFrac(answer);
  expect(got, `${label}: ${answer}`).toBeTruthy();
  expect(got!.n * den, label).toBe(got!.d * num);
}

describe("초6 1-1-1 (자연수)÷(자연수) — 묻는 대상이 답이다", () => {
  const unit = unitOf("1-1-1");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 나누어지는 수 / 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expectFracEq(p.answer, Number(m![1]), Number(m![2]), p.content);
    }
  });

  it("02 한 사람 몫은 양 / 인원", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "02");
      const m = p.content.match(
        /\$(\d+)\\,\\mathrm\{[A-Za-z]+\}\$.*?\$(\d+)\$명/,
      );
      expect(m, p.content).toBeTruthy();
      expectFracEq(p.answer, Number(m![1]), Number(m![2]), p.content);
    }
  });

  it("03 둘레÷변 또는 (전체-사용)÷인원", () => {
    const sidesOf: Record<string, number> = {
      삼: 3,
      사: 4,
      오: 5,
      육: 6,
      팔: 8,
    };
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const poly = p.content.match(
        /둘레가 \$(\d+)\\,\\mathrm\{m\}\$ 인 정(삼|사|오|육|팔)각형/,
      );
      if (poly) {
        expectFracEq(p.answer, Number(poly[1]), sidesOf[poly[2]!]!, p.content);
        continue;
      }
      const cut = p.content.match(
        /\$(\d+)\\,\\mathrm\{m\}\$ 중에서 \$(\d+)\\,\\mathrm\{m\}\$.*?\$(\d+)\$명/,
      );
      expect(cut, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(cut![1]) - Number(cut![2]),
        Number(cut![3]),
        p.content,
      );
    }
  });

  it("04 잘못 곱한 어떤 수÷k 또는 가장 큰÷가장 작은", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const wrong = p.content.match(/어떤 수를 \$(\d+)\$/);
      const cards = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) =>
        Number(x[1]),
      );
      if (p.content.includes("수 카드")) {
        const nums = cards;
        expectFracEq(p.answer, Math.max(...nums), Math.min(...nums), p.content);
        continue;
      }
      expect(wrong, p.content).toBeTruthy();
      const k = Number(wrong![1]);
      const result = p.content.match(/곱했더니 \$(\d+)\$/);
      expect(result, p.content).toBeTruthy();
      const some = Number(result![1]) / k;
      expectFracEq(p.answer, some, k, p.content);
    }
  });

  it("05 분모는 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분모/);
      expect(answerInt(p.answer)).toBe(Number(m![2]));
    }
  });

  it("06 분자는 나누어지는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /나누어지는 수가 \$(\d+)\$, 나누는 수가 \$(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분자/);
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("07 역수 표기는 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      const m = p.content.match(/\$(\d+)\\div(\d+)=\\frac\{(\d+)\}\{(\d+)\}\$/);
      expect(m, p.content).toBeTruthy();
      expect(Number(m![1])).toBe(Number(m![4]));
      expect(Number(m![2])).toBe(Number(m![3]));
    }
  });

  it("08 같은 분모 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$.*?\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(m![2]).toBe(m![4]);
      expectFracEq(
        p.answer,
        Number(m![1]) + Number(m![3]),
        Number(m![2]),
        p.content,
      );
    }
  });

  it("09 한 사람 몫의 절반", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$(\d+)\\,\\mathrm\{[A-Za-z]+\}\$.*?\$(\d+)\$명/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/절반/);
      expectFracEq(p.answer, Number(m![1]), Number(m![2]) * 2, p.content);
    }
  });

  it("10 더 큰 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = [...p.content.matchAll(/\$(\d+)\\div(\d+)\$/g)];
      expect(m.length, p.content).toBe(2);
      const a = Number(m[0]![1]);
      const b = Number(m[0]![2]);
      const c = Number(m[1]![1]);
      const d = Number(m[1]![2]);
      const left = a * d - c * b;
      if (left > 0) expectFracEq(p.answer, a, b, p.content);
      else expectFracEq(p.answer, c, d, p.content);
    }
  });
});
