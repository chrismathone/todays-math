import { describe, expect, it } from "vitest";
import { generateHighProblem } from "../../lib/high/generate";
import { FACTOR_KEY } from "../helpers/bankDecideEngineEvidence";
import { readValues } from "../helpers/highAnswer";
import { mathSpans } from "../helpers/highPage";

type Triple = [number, number, number];
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Read the displayed polynomial, not generator facts or its polynomial helpers. */
function coefficients(tex: string): number[] {
  const monomials = ["x^{2}", "xy", "y^{2}", "x", "y", ""];
  const out = monomials.map(() => 0);
  const terms = tex.match(/[+-]?[^+-]+/g) ?? [];
  expect(terms.join("")).toBe(tex);
  for (const term of terms) {
    const match = /^([+-]?)(\d*)(x\^\{2\}|xy|y\^\{2\}|x|y)?$/.exec(term);
    if (!match) throw new Error(`발문의 항을 읽을 수 없음: ${term}`);
    const [, sign, number, monomial = ""] = match;
    if (number === "" && monomial === "") throw new Error(`빈 항: ${term}`);
    out[monomials.indexOf(monomial)] +=
      (sign === "-" ? -1 : 1) * Number(number || 1);
  }
  return out;
}

function expand([a, b, c]: Triple, g: number, h: number): number[] {
  return [a * b, a * c + b, c, a * h + b * g, h + c * g, g * h];
}

function allSolutions(poly: number[], g: number, h: number): Triple[] {
  const [xx, xy, yy] = poly;
  // b = xy - ay²의 계수·a를 ab=x²의 계수에 넣어 실수근을 전부 구한다.
  const discriminant = xy * xy - 4 * yy * xx;
  expect(discriminant).toBeGreaterThanOrEqual(0);
  const roots = [
    (xy + Math.sqrt(discriminant)) / (2 * yy),
    (xy - Math.sqrt(discriminant)) / (2 * yy),
  ];
  return roots
    .filter((a, i) => roots.findIndex((other) => near(a, other)) === i)
    .map((a): Triple => [a, xy - yy * a, yy])
    .filter((triple) =>
      expand(triple, g, h).every((value, i) => near(value, poly[i])),
    );
}

function real(tex: string): number {
  const values = readValues(tex);
  expect(values).toHaveLength(1);
  expect(values[0].im).toBeCloseTo(0, 12);
  return values[0].re;
}

function shownTriples(solution: string): Triple[] {
  return [
    ...solution.matchAll(/\$a=([^$]+)\$,\s*\$b=([^$]+)\$,\s*\$c=([^$]+)\$/g),
  ].map((m): Triple => [real(m[1]), real(m[2]), real(m[3])]);
}

describe("B4: 인수분해 04 계수 해의 완전성", () => {
  it("씨앗 86은 같은 다항식을 주는 두 계수 벌과 공통 목표값 4를 모두 설명한다", () => {
    const p = generateHighProblem(FACTOR_KEY, 86);
    expect(shownTriples(p.solution)).toEqual([
      [2, 1, 1],
      [1, 2, 1],
    ]);
    expect(p.solution).toMatch(/어느 경우에나\s*\$a\+b\+c=4\$/);
  });

  it("씨앗 0~299의 발문에서 모든 실수 계수 해를 풀어 해설의 벌과 대조한다", () => {
    const failures: { seed: number; actual: Triple[]; expected: Triple[] }[] =
      [];
    let checked = 0;
    let twoSolutions = 0;
    let fractionalAlternatives = 0;
    for (let seed = 0; seed < 300; seed++) {
      const p = generateHighProblem(FACTOR_KEY, seed);
      const spans = mathSpans(p.content);
      const form = spans.find((span) => span.startsWith("(ax+y"));
      if (!form) continue;
      checked++;
      const constants = /^\(ax\+y([+-]\d+)\)\(bx\+cy([+-]\d+)\)$/.exec(form);
      expect(constants, p.content).not.toBeNull();
      const g = Number(constants![1]);
      const h = Number(constants![2]);
      const poly = coefficients(spans[0]);
      const expected = allSolutions(poly, g, h);
      expect(expected.length).toBeGreaterThan(0);
      const actual = shownTriples(p.solution);
      if (
        actual.length !== expected.length ||
        expected.some(
          (triple) =>
            !actual.some((candidate) =>
              candidate.every((v, i) => near(v, triple[i])),
            ),
        )
      )
        failures.push({ seed, actual, expected });
      for (const triple of actual)
        expand(triple, g, h).forEach((value, i) =>
          expect(value, `seed ${seed} 항 ${i}`).toBeCloseTo(poly[i], 10),
        );
      const asked = spans.at(-1)!;
      const target = (t: Triple) =>
        asked === "abc"
          ? t[0] * t[1] * t[2]
          : t[0] + t[1] + (asked === "a+b-c" ? -t[2] : t[2]);
      const answer = real(mathSpans(p.answer)[0]);
      for (const triple of expected)
        expect(target(triple), `seed ${seed} 목표값`).toBeCloseTo(answer, 10);
      const finalEquality = mathSpans(p.solution).at(-1)!.split("=");
      expect(finalEquality[0]).toBe(asked);
      expect(real(finalEquality[1])).toBe(answer);
      if (expected.length === 2) {
        twoSolutions++;
        if (
          expected.some((triple) => triple.some((v) => !Number.isInteger(v)))
        ) {
          fractionalAlternatives++;
          if (actual.length === 2) expect(p.solution).toMatch(/\\d?frac\{/);
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(twoSolutions).toBeGreaterThan(0);
    expect(fractionalAlternatives).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
