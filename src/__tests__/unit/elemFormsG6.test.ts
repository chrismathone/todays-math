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

describe("초6 1-1-2 (분수)÷(자연수) — 분모에 곱한다", () => {
  const unit = unitOf("1-1-2");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 분자 / (분모×나누는 수)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/);
      expect(m, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(m![1]),
        Number(m![2]) * Number(m![3]),
        p.content,
      );
    }
  });

  it("05 분모에 곱하는 수는 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![3]));
    }
  });

  it("06 그대로 두는 분자는 원래 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분자/);
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("07 분자에 곱한 식은 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      expect(p.content).toMatch(/\\times/);
    }
  });

  it("08 같은 분모·같은 나누는 수 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = [...p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/g)];
      expect(m.length, p.content).toBe(2);
      expect(m[0]![2]).toBe(m[1]![2]);
      expect(m[0]![3]).toBe(m[1]![3]);
      const d = Number(m[0]![2]) * Number(m[0]![3]);
      expectFracEq(p.answer, Number(m[0]![1]) + Number(m[1]![1]), d, p.content);
    }
  });

  it("09 한 도막 × 이어 붙인 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const frac = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const cuts = p.content.match(/똑같이 \$(\d+)\$도막/);
      const join = p.content.match(/그중 \$(\d+)\$도막/);
      expect(frac && cuts && join, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(frac![1]) * Number(join![1]),
        Number(frac![2]) * Number(cuts![1]),
        p.content,
      );
    }
  });

  it("10 같은 분수를 다른 수로 나눈 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const frac = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const ks = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) => Number(x[1]));
      expect(frac, p.content).toBeTruthy();
      expect(ks.length).toBeGreaterThanOrEqual(2);
      const top = Number(frac![1]);
      const d = Number(frac![2]);
      const k = ks[0]!;
      const m = ks[1]!;
      expectFracEq(p.answer, top * (m - k), d * k * m, p.content);
    }
  });
});

function parseMixed(text: string): { w: number; t: number; d: number } | null {
  const m = /(\d+)\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (!m) return null;
  return { w: Number(m[1]), t: Number(m[2]), d: Number(m[3]) };
}

function impOf(m: { w: number; t: number; d: number }): number {
  return m.w * m.d + m.t;
}

describe("초6 1-1-3 (대분수)÷(자연수) — 가분수로 고친 다음 나눈다", () => {
  const unit = unitOf("1-1-3");
  const sidesOf: Record<string, number> = {
    삼: 3,
    사: 4,
    오: 5,
    육: 6,
    팔: 8,
  };

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 가분수 분자 / (분모×나누는 수)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const mix = parseMixed(p.content);
      const k = p.content.match(/\\div(\d+)/);
      expect(mix && k, p.content).toBeTruthy();
      expectFracEq(p.answer, impOf(mix!), mix!.d * Number(k![1]), p.content);
    }
  });

  it("05 가분수 분자는 자연수×분모+분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const mix = parseMixed(p.content);
      expect(mix, p.content).toBeTruthy();
      expect(p.content).toMatch(/가분수/);
      expect(answerInt(p.answer)).toBe(impOf(mix!));
    }
  });

  it("06 자연수 부분", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const mix = parseMixed(p.content);
      expect(mix, p.content).toBeTruthy();
      expect(p.content).toMatch(/자연수 부분/);
      expect(answerInt(p.answer)).toBe(mix!.w);
    }
  });

  it("07 분수 부분만 나눈 식은 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      expect(p.content).toMatch(/\\times/);
    }
  });

  it("08 두 대분수÷같은 수 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const mixes = [
        ...p.content.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/g),
      ];
      expect(mixes.length, p.content).toBe(2);
      expect(mixes[0]![4]).toBe(mixes[1]![4]);
      const k = Number(mixes[0]![4]);
      const a = {
        w: Number(mixes[0]![1]),
        t: Number(mixes[0]![2]),
        d: Number(mixes[0]![3]),
      };
      const b = {
        w: Number(mixes[1]![1]),
        t: Number(mixes[1]![2]),
        d: Number(mixes[1]![3]),
      };
      const d1 = a.d * k;
      const d2 = b.d * k;
      expectFracEq(p.answer, impOf(a) * d2 + impOf(b) * d1, d1 * d2, p.content);
    }
  });

  it("09 한 변×변의 수가 둘레", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const mix = parseMixed(p.content);
      const k = p.content.match(/똑같이 \$(\d+)\$도막/);
      const poly = p.content.match(/정(삼|사|오|육|팔)각형/);
      expect(mix && k && poly, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        impOf(mix!) * sidesOf[poly![1]!]!,
        mix!.d * Number(k![1]),
        p.content,
      );
    }
  });

  it("10 같은 대분수를 다른 수로 나눈 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const mix = parseMixed(p.content);
      const ks = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) => Number(x[1]));
      expect(mix, p.content).toBeTruthy();
      expect(ks.length).toBeGreaterThanOrEqual(2);
      const k = ks[0]!;
      const n2 = ks[1]!;
      expectFracEq(
        p.answer,
        impOf(mix!) * (n2 - k),
        mix!.d * k * n2,
        p.content,
      );
    }
  });
});
