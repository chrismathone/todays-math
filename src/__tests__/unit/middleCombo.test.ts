/**
 * 중등 결합형(combo) 파일럿 — 원장님 승인 2026-08-24 (후보 B).
 *
 * ⚠️ 검산은 **생성기가 쓴 관계와 다른 관계**로 한다. 생성기는 $p, q$ 에서 계수를
 * «만들어» 내려가고, 여기서는 **지면에 찍힌 계수**를 읽어 이차식을 세우고 근을 구한다.
 * 같은 식을 다시 쓰면 동어반복이라 아무것도 못 잡는다.
 */
import { bareNumbers } from "@/lib/elementary/rules";
import { describe, expect, it } from "vitest";

import {
  generateMiddleComboProblem,
  generateMiddleComboSet,
  isMiddleComboId,
  middleComboDefinitions,
} from "@/lib/middle/combo";
import { registeredTypes } from "@/lib/middle/generate";

const ID = "중3|원주각::중3|이차방정식의 풀이";
const SEEDS = [1, 7, 20260824, 99991, 424242];

/** 지면의 `(...)^\circ` 두 개에서 계수를 읽는다. */
function readAngles(content: string): { ins: number[]; cen: number[] } {
  const found = [...content.matchAll(/\$\(([^()]+)\)\^\\circ\$/g)].map(
    (m) => m[1]!,
  );
  expect(found).toHaveLength(2);
  const parse = (s: string): number[] => {
    const a = /(-?\d*)x\^2/.exec(s);
    const b = /([+-]\d*)x(?!\^)/.exec(s);
    const c = /([+-]\d+)(?!x)(?!\^)\s*$/.exec(s);
    const num = (t: string | undefined, dflt: number): number => {
      if (t === undefined) return dflt;
      if (t === "" || t === "+") return 1;
      if (t === "-") return -1;
      return Number(t);
    };
    return [num(a?.[1], 0), num(b?.[1], 0), num(c?.[1], 0)];
  };
  return { ins: parse(found[0]!), cen: parse(found[1]!) };
}

describe("중등 결합형 — 등록부", () => {
  it("승인된 것만 있다 — 조합기가 아니다", () => {
    const defs = middleComboDefinitions();
    expect(defs.map((d) => d.id)).toEqual([ID]);
    expect(isMiddleComboId(ID)).toBe(true);
    expect(isMiddleComboId("아무거나")).toBe(false);
  });

  it("승인되지 않은 id 는 던진다 — 조용히 만들어 주지 않는다", () => {
    expect(() =>
      generateMiddleComboProblem("중1|아무거나::중2|아무거나", 1),
    ).toThrow(/승인되지 않은 결합형/);
  });

  it("원천 유형 키가 **실재하는 등록 유형**이다", () => {
    const known = new Set(registeredTypes().map((t) => t.key));
    for (const d of middleComboDefinitions()) {
      for (const k of d.conceptKeys) {
        expect(known.has(k), `${d.id} 의 원천 키 ${k}`).toBe(true);
      }
    }
  });

  it("승인 근거 세 가지가 비어 있지 않다 — 왜 중등 범위인지 적어야 한다", () => {
    for (const d of middleComboDefinitions()) {
      expect(d.curriculumBasis.trim()).not.toBe("");
      expect(d.laterConceptReview.trim()).not.toBe("");
      expect(d.gradeBoundary.trim()).not.toBe("");
    }
  });
});

describe("중등 결합형 — 원주각 × 인수분해 이차방정식", () => {
  it("지면의 두 각으로 세운 이차방정식의 양수 해가 정답이다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      const { ins, cen } = readAngles(p.content);

      // 「중심각 = 원주각 × 2」 → (cen − 2·ins) = 0
      const A = cen[0]! - 2 * ins[0]!;
      const B = cen[1]! - 2 * ins[1]!;
      const C = cen[2]! - 2 * ins[2]!;
      const disc = B * B - 4 * A * C;
      expect(disc).toBeGreaterThan(0);
      const root = Math.sqrt(disc);
      expect(Number.isInteger(root)).toBe(true); // 인수분해로 풀려야 한다
      const roots = [(-B + root) / (2 * A), (-B - root) / (2 * A)];

      const positive = roots.filter((r) => r > 0);
      expect(positive).toHaveLength(1); // 「양수 $x$」가 하나로 정해져야 한다
      expect(Number(/\$(\d+)\$/.exec(p.answer)?.[1])).toBe(positive[0]);
      expect(roots.some((r) => r < 0)).toBe(true); // 버릴 근이 실제로 있다
    }
  });

  it("나온 각이 실제로 각이다 — 원주각 < 180°, 중심각 = 2 × 원주각", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      const x = Number(/\$(\d+)\$/.exec(p.answer)?.[1]);
      const { ins, cen } = readAngles(p.content);
      const at = (k: number[]): number => k[0]! * x * x + k[1]! * x + k[2]!;
      expect(at(ins)).toBeGreaterThan(0);
      expect(at(ins)).toBeLessThan(180);
      expect(at(cen)).toBe(2 * at(ins));
      expect(at(cen)).toBeLessThanOrEqual(360);
    }
  });

  it("두 개념이 다 필요하다 — 지면에 원주각·중심각과 인수분해가 같이 있다", () => {
    const p = generateMiddleComboProblem(ID, 20260824);
    expect(p.content).toContain("원주각");
    expect(p.content).toContain("중심각");
    expect(p.solution).toContain("인수분해");
    expect(p.conceptKeys).toContain("3-2|원주각|02");
    expect(p.conceptKeys).toContain("3-1|이차방정식의 풀이|06");
  });

  it("숫자는 전부 수식 안에 있다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      expect(bareNumbers(p.content)).toEqual([]);
      expect(bareNumbers(p.answer)).toEqual([]);
      expect(bareNumbers(p.solution)).toEqual([]);
    }
  });

  it("좌표평면을 쓰지 않는다 (D-100 ⑶)", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      expect(`${p.content} ${p.solution}`).not.toContain("좌표");
    }
  });

  it("같은 씨앗은 같은 세트, 발문이 겹치지 않는다", () => {
    const a = generateMiddleComboSet(ID, 20260824, 5);
    const b = generateMiddleComboSet(ID, 20260824, 5);
    expect(a.map((p) => p.content)).toEqual(b.map((p) => p.content));
    expect(new Set(a.map((p) => p.content)).size).toBe(5);
  });
});
