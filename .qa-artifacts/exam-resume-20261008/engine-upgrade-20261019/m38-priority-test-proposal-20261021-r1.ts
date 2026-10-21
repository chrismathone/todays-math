/**
 * M8/M9/M19/M20: read the printed conditions, never use generator facts/answers
 * as the calculation oracle. Heron's integer identity is an internal checker,
 * not an additional student solution or a curriculum approval.
 */
import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { M2_CENTER } from "@/lib/middle/m2Center";
import { M2_GEO_SIM_SUP_B } from "@/lib/middle/m2GeoSim";
import { M2_MONO } from "@/lib/middle/m2Mono";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";

const keys = {
  M8: "2-2|평행선 사이의 선분의 길이의 비|60",
  M9: "2-2|평행선 사이의 선분의 길이의 비|17",
  M19: "2-2|삼각형의 외심과 내심|75",
  M20: "2-1|단항식의 계산|04",
} as const;
const entries = [...M2_GEO_SIM_SUP_B, ...M2_CENTER, ...M2_MONO];
function entry(key: string): TypeEntry {
  const found = entries.find(e => e.key === key);
  if (!found) throw new Error(`Missing type ${key}`);
  return found;
}
function sequence(...values: number[]) {
  let used = 0;
  return () => {
    const value = values[used++];
    if (value === undefined) throw new Error("Unexpected random draw");
    return value;
  };
}
function capture(text: string, regex: RegExp): RegExpMatchArray {
  const match = text.match(regex);
  if (!match) throw new Error(`Unreadable condition ${regex}: ${text}`);
  return match;
}
function side(p: MidProblem, label: string): number {
  return Number(capture(p.content, new RegExp(String.raw`\\overline\{${label}\}=([0-9]+)\\,`))[1]);
}
function numericAnswer(p: MidProblem): number {
  return Number(capture(p.answer, /^\$([0-9]+)(?:\\,|\$)/)[1]);
}
function strictTriangle(a: number, b: number, c: number) {
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(0);
  expect(c).toBeGreaterThan(0);
  expect(a + b).toBeGreaterThan(c);
  expect(b + c).toBeGreaterThan(a);
  expect(c + a).toBeGreaterThan(b);
}
function checkM8(p: MidProblem) {
  const ad = side(p, "AD"), ab = side(p, "AB");
  const perimeter = Number(capture(p.content, /둘레의 길이가 \$([0-9]+)\\,/)[1]);
  // Explicit constructive witness, rather than checking only the target formula.
  const ae = (perimeter - ad) / 2;
  strictTriangle(ad, ae, ae);
  expect(ab).toBeGreaterThan(ad);
  expect(numericAnswer(p) * ad).toBe(perimeter * ab);
}
function checkM9(p: MidProblem) {
  const ab = side(p, "AB"), ac = side(p, "AC"), bc = side(p, "BC");
  strictTriangle(ab, ac, bc);
  expect(p.content).toContain("점의 순서는 $B$, $C$, $D$");
  // The external division equation has one positive solution iff AB > AC.
  expect(ab).toBeGreaterThan(ac);
  const cd = numericAnswer(p);
  expect(cd).toBeGreaterThan(0);
  expect(Number.isInteger(cd)).toBe(true);
  expect((ab - ac) * cd).toBe(ac * bc);
}
function checkM19(p: MidProblem) {
  const a = side(p, "BC"), b = side(p, "CA"), c = side(p, "AB");
  strictTriangle(a, b, c);
  const r = Number(capture(p.content, /반지름의 길이가 \$([0-9]+)\\,/)[1]);
  const perimeter = BigInt(a + b + c);
  const sixteenAreaSquared = perimeter * BigInt(-a + b + c) * BigInt(a - b + c) * BigInt(a + b - c);
  // Exact equality with the area forced by all THREE sides.
  expect(sixteenAreaSquared).toBe(4n * BigInt(r * r) * perimeter * perimeter);
  const areaIBC = BigInt(numericAnswer(p));
  expect(16n * areaIBC * areaIBC * perimeter * perimeter).toBe(sixteenAreaSquared * BigInt(a * a));
  expect(p.solution).not.toMatch(/헤론|제곱근|사인|코사인|로그/);
}
function checkM20(p: MidProblem) {
  if (p.content.startsWith("다음 식을 간단히")) return;
  expect(p.content).toContain("값에 관계없이 항상 성립");
  expect(p.content).toContain("$m+n+k$");
  expect(p.content).not.toMatch(/자연수 \$a\$|\r|\\\\left/);
  const equation = capture(p.content, /\$(\\left\([^$]+=[^$]+)\$/)[1]!;
  const match = capture(equation, /^\\left\((-?[23])([ax])\^\{m\}([by])(?:\^\{([12])\})?\\right\)\^\{n\}=(-?\d+)([ax])\^\{(\d+)\}([by])\^\{k\}$/);
  const [, coefficient, first, second, power = "1", rhsCoefficient, rhsFirst, rhsPower, rhsSecond] = match;
  expect([rhsFirst, rhsSecond]).toEqual([first, second]);
  expect([first, second].every(v => !["m", "n", "k"].includes(v!))).toBe(true);
  const c = BigInt(coefficient!), target = BigInt(rhsCoefficient!);
  // |c| >= 2 makes the absolute powers strictly increasing. No logarithms;
  // stop as soon as the absolute coefficient exceeds the printed target.
  const abs = (v: bigint) => v < 0n ? -v : v;
  let value = c, n = 1, found: number | undefined;
  while (abs(value) <= abs(target)) {
    if (value === target) { expect(found).toBeUndefined(); found = n; }
    value *= c;
    n += 1;
  }
  expect(found).toBeDefined();
  const degree = Number(rhsPower), exponent = found!;
  expect(degree % exponent).toBe(0);
  const m = degree / exponent, k = Number(power) * exponent;
  expect(m).toBeGreaterThan(0);
  expect(numericAnswer(p)).toBe(m + exponent + k);
  // Signed/zero base substitutions, independently computed with BigInt.
  for (const [x, y] of [[0, 0], [1, -2], [-1, 3], [2, -1], [-2, -3]]) {
    const left = (c * BigInt(x!) ** BigInt(m) * BigInt(y!) ** BigInt(Number(power))) ** BigInt(exponent);
    const right = target * BigInt(x!) ** BigInt(degree) * BigInt(y!) ** BigInt(k);
    expect(left).toBe(right);
  }
  expect(p.solution).not.toMatch(/항등식|로그|미분|음의 지수/);
}

describe("M8/M9/M19/M20 printed conditions and unique answers", () => {
  for (const finding of Object.keys(keys) as (keyof typeof keys)[]) {
    it(`${finding}: 100 actual API seeds including handoff 30 and reported failing seeds`, () => {
      const check = { M8: checkM8, M9: checkM9, M19: checkM19, M20: checkM20 }[finding];
      for (const seed of Array.from({ length: 100 }, (_, s) => 20261020 + s * 7919)) {
        check(generateMiddleProblem(keys[finding], seed, 0));
      }
    });
  }
  it("M8: every 120 perimeter/scale input combination has a triangle witness", () => {
    for (let a = 0; a < 4; a++) for (let k = 0; k < 3; k++) for (let d = 0; d < 10; d++) {
      checkM8(entry(keys.M8).handler(sequence((a + .5) / 4, (k + .5) / 3, (d + .5) / 10)));
    }
  });
  it("M9: all selectable strict triangle boundaries and positive external divisions", () => {
    for (let q = 1; q <= 4; q++) for (let delta = 1; delta <= 3; delta++) for (let unit = 2; unit <= 5; unit++) {
      const p = q + delta;
      const max = Math.min(unit + 4, Math.floor(((p + q) * unit - 1) / delta));
      expect(max).toBeGreaterThanOrEqual(unit + 1);
      for (let t = unit + 1; t <= max; t++) {
        checkM9(entry(keys.M9).handler(sequence((q - .5) / 4, (delta - .5) / 3, (unit - 1.5) / 4, (t - unit - .5) / (max - unit))));
      }
    }
  });
  it("M19: all 18 selectable side/radius inputs agree with exact side-derived area", () => {
    const inputs = new Set<string>();
    for (let i = 0; i < 18; i++) {
      const p = entry(keys.M19).handler(sequence((i + .5) / 18));
      checkM19(p);
      inputs.add(p.content);
    }
    expect(inputs.size).toBe(18);
  });
  it("M20: both base pairs and every 64 unknown-exponent branch input", () => {
    for (let pair = 0; pair < 2; pair++) for (let c = 0; c < 4; c++) for (let n = 0; n < 2; n++) for (let m = 0; m < 2; m++) for (let k = 0; k < 2; k++) {
      checkM20(entry(keys.M20).handler(sequence((pair + .5) / 2, .75, (c + .5) / 4, (n + .5) / 2, (m + .5) / 2, (k + .5) / 2)));
    }
  });
});
