/** 외부 검토 EL-03~09·A1: 해설의 전제를 빌리지 않고 발문이 허용한 해를 센다. */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import type { ElemTier } from "@/lib/elementary/difficulty";

function unit(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(`${code} `),
  );
  if (!u) throw new Error(`${grade} ${code}: 소단원 없음`);
  return u;
}

function samples(grade: string, code: string, id: string, tier: ElemTier) {
  const u = unit(grade, code);
  return Array.from({ length: 300 }, (_, seed) => [
    generateElementaryForm(u, seed, id),
    generateElementaryProblem(u, seed, tier),
  ]).flat();
}

const scalar = (s: string) => Number(s.replace(/\$/g, ""));
const numbers = (s: string) => [...s.matchAll(/\d+/g)].map((m) => Number(m[0]));
const frac = (s: string) => {
  const m = /(\d+)?\\frac\{(\d+)\}\{(\d+)\}/.exec(s);
  if (!m) throw new Error(`분수를 못 읽음: ${s}`);
  return {
    n: Number(m[1] ?? 0) * Number(m[3]) + Number(m[2]),
    d: Number(m[3]),
  };
};

describe("bank-fix 초등 — 발문이 정하는 수학적 해", () => {
  it("EL-03: 빼는 대분수의 분모까지 읽어 최소 분자가 만드는 차 하나를 센다", () => {
    const ps = samples("초4", "2-1-4", "11", "심화중");
    expect(ps).toHaveLength(600);
    for (const p of ps) {
      const top = frac(p.content);
      const wholes = [...p.content.matchAll(/자연수 부분이 \$(\d+)\$/g)].map(
        (m) => Number(m[1]),
      );
      expect(wholes).toHaveLength(2);
      const den = /분모가 \$(\d+)\$/.exec(p.content);
      const dens = den
        ? [Number(den[1])]
        : /분모가 같/.test(p.content)
          ? [top.d]
          : Array.from({ length: 99 }, (_, i) => i + 2);
      const candidates: { numerator: number; n: number; d: number }[] = [];
      for (const d of dens) {
        for (let n = 1; n < d; n += 1) {
          const difference = top.n * d - (wholes[0]! * d + n) * top.d;
          if (Math.floor(difference / (top.d * d)) === wholes[1])
            candidates.push({ numerator: n, n: difference, d: top.d * d });
        }
      }
      expect(candidates.length, p.content).toBeGreaterThan(0);
      const min = Math.min(...candidates.map((c) => c.numerator));
      const hits = candidates.filter((c) => c.numerator === min);
      expect(hits, p.content).toHaveLength(1);
      const answer = frac(p.answer);
      expect(hits[0]!.n * answer.d, p.content).toBe(answer.n * hits[0]!.d);
    }
  });

  it.each([
    ["04", "심화하"],
    ["12", "심화상"],
  ] as const)(
    "EL-04: 문형 %s의 나머지 조건을 몫 0부터 전수 대입한다",
    (id, tier) => {
      const ps = samples("초5", "1-2-6", id, tier);
      expect(ps).toHaveLength(600);
      let seen = 0;
      for (const p of ps) {
        if (!p.content.includes("나머지가")) continue;
        seen += 1;
        const [a, b, r] = numbers(p.content);
        const multiple = /\$(\d+)\$의 배수/.exec(p.content);
        const lower = /어떤 수는 \$(\d+)\$보다 큽니다/.exec(p.content);
        const min = lower
          ? Number(lower[1])
          : /어떤 수는 나누는 두 수보다 큽니다/.test(p.content)
            ? Math.max(a!, b!)
            : -1;
        const hits: number[] = [];
        for (let x = 0; x <= scalar(p.answer); x += 1) {
          if (x <= min) continue;
          if (
            x % a! === r &&
            x % b! === r &&
            (!multiple || x % Number(multiple[1]) === 0)
          )
            hits.push(x);
        }
        expect(hits[0], p.content).toBe(scalar(p.answer));
        expect(hits.filter((x) => x === hits[0])).toHaveLength(1);
      }
      expect(seen).toBeGreaterThanOrEqual(id === "12" ? 600 : 200);
    },
  );

  it.each(["2-2-1", "2-2-2", "2-2-4"])(
    "EL-05: %s의 곱하는 수 1도 허용 여부대로 세고 해설의 짝을 대조한다",
    (code) => {
      const ps = samples("초5", code, "11", "심화중");
      expect(ps).toHaveLength(600);
      for (const p of ps) {
        const b = Number(/분모가 \$(\d+)\$/.exec(p.content)![1]);
        const product = frac(p.content);
        const P = (product.n * b) / product.d;
        expect(Number.isInteger(P)).toBe(true);
        const minK = /\$1\$보다 큰 (?:어떤 )?한 자리 자연수/.test(p.content) ? 2 : 1;
        const all: [number, number][] = [];
        for (let k = minK; k <= 9; k += 1)
          if (P % k === 0) all.push([P / k, k]);
        const hits = all.filter(([n]) =>
          code === "2-2-4" ? n > b && n % b !== 0 : n < b,
        );
        expect(hits, p.content).toHaveLength(1);
        expect(hits[0]![code === "2-2-2" ? 1 : 0], p.content).toBe(
          scalar(p.answer),
        );
        const printed = [
          ...p.solution.matchAll(/\$\((\d+),\\\s+(\d+)\)\$/g),
        ].map((m) => [Number(m[1]), Number(m[2])]);
        expect(printed, p.solution).toEqual(all.sort(([a], [b]) => a - b));
      }
    },
  );

  it("EL-06: 두 밑변의 순서까지 발문대로 세면 아랫변이 하나다", () => {
    const ps = samples("초5", "1-6-5", "12", "심화상");
    expect(ps).toHaveLength(600);
    for (const p of ps) {
      const [h, area, product] = numbers(p.content);
      const lowerLonger = /아랫변이 윗변보다 (?:길|긴|깁)/.test(p.content);
      const hits: number[] = [];
      for (let upper = 1; upper <= product!; upper += 1)
        for (let lower = 1; lower <= product!; lower += 1) {
          if (lowerLonger && lower <= upper) continue;
          if (upper * lower === product && (upper + lower) * h! === 2 * area!)
            hits.push(lower);
        }
      expect(hits, p.content).toEqual([scalar(p.answer)]);
    }
  });

  it("EL-07: 비율과 자연수 조건으로 허용된 전체 길이를 세면 답이 하나다", () => {
    const ps = samples("초6", "1-5-2", "11", "심화중");
    expect(ps).toHaveLength(600);
    for (const p of ps) {
      const [pct, lo, hi] = numbers(p.content);
      const totalNatural = /전체 길이와 .*길이가 모두 자연수/.test(p.content);
      const hits: number[] = [];
      // 부분 길이 m은 자연수. 전체 길이는 100m/p 이므로 모든 유리수 후보를 빠짐없이 센다.
      for (let m = 1; m * 100 < hi! * pct!; m += 1) {
        if (m * 100 <= lo! * pct!) continue;
        if (totalNatural && (m * 100) % pct! !== 0) continue;
        hits.push(m);
      }
      expect(hits, p.content).toEqual([scalar(p.answer)]);
    }
  });

  it("EL-08: 각기둥·각뿔 범위가 명시되어 면·꼭짓점 조건의 해가 하나다", () => {
    const ps = samples("초6", "1-2-4", "12", "심화상");
    expect(ps).toHaveLength(600);
    for (const p of ps) {
      const [faces, cap] = numbers(p.content);
      const limited = /각기둥이나 각뿔 가운데 하나/.test(p.content);
      const solids: { f: number; v: number; e: number }[] = [];
      for (let n = 3; n <= 20; n += 1) {
        solids.push({ f: n + 2, v: 2 * n, e: 3 * n });
        solids.push({ f: n + 1, v: n + 1, e: 2 * n });
      }
      if (!limited) {
        // 사각뿔의 삼각 옆면에 사면체를 한 번 붙일 때마다 F+2,V+1,E+3.
        // 꼭짓점을 면 가까이에 놓으면 볼록성을 유지할 수 있다.
        for (let stacks = 1; stacks <= 5; stacks += 1)
          solids.push({ f: 5 + 2 * stacks, v: 5 + stacks, e: 8 + 3 * stacks });
      }
      const hits = [
        ...new Set(
          solids.filter((s) => s.f === faces && s.v < cap!).map((s) => s.e),
        ),
      ];
      expect(hits, p.content).toEqual([scalar(p.answer)]);
    }
    // 사각뿔 F5,V5,E8에서 삼각 옆면 두 개에 사면체를 붙이면 F9,V7,E14, cap10을 만족한다.
    const counterexample = {
      faces: 5 + 2 * 2,
      vertices: 5 + 2,
      edges: 8 + 3 * 2,
    };
    expect(counterexample).toEqual({ faces: 9, vertices: 7, edges: 14 });
    expect(
      counterexample.vertices - counterexample.edges + counterexample.faces,
    ).toBe(2);
  });

  it("EL-09: 작은 그림 교환 규칙 아래 모든 그림 수 배치를 세어 최솟값을 구한다", () => {
    const ps = samples("초3", "2-6-2", "11", "심화중");
    expect(ps).toHaveLength(600);
    for (const p of ps) {
      const total = Number(/(?:모두|합해) \$(\d+)\$개/.exec(p.content)![1]);
      const exchange = /작은 그림 열 개.*큰 그림 한 개로 바/.test(p.content);
      const vals: number[] = [];
      for (let big = 0; big <= total; big += 1) {
        const small = total - big;
        if (exchange && small >= 10) continue;
        vals.push(10 * big + small);
      }
      expect(vals.length).toBeGreaterThan(0);
      expect(Math.min(...vals), p.content).toBe(scalar(p.answer));
    }
  });

  it("EL-A1: 평균의 두 배정을 대입해 전체 평균과 일치하는 합 하나를 구한다", () => {
    const ps = samples("초5", "2-6-1", "11", "심화중");
    expect(ps).toHaveLength(600);
    const counts: Record<string, number> = {
      세: 3,
      네: 4,
      다섯: 5,
      여섯: 6,
      일곱: 7,
      여덟: 8,
      아홉: 9,
    };
    for (const p of ps) {
      const [low, high, total] = numbers(p.content);
      const ga = counts[/가 모둠은 (\S+) 명/.exec(p.content)![1]!]!;
      const na = counts[/나 모둠은 (\S+) 명/.exec(p.content)![1]!]!;
      const unordered = /한 모둠의.*다른 모둠의/.test(p.content);
      const assignments = unordered
        ? [
            [low!, high!],
            [high!, low!],
          ]
        : [[low!, high!]];
      const hits = assignments
        .filter(([a, b]) => a! * ga + b! * na === total! * (ga + na))
        .map(([, b]) => b! * na);
      expect(hits, p.content).toEqual([scalar(p.answer)]);
    }
  });
});
