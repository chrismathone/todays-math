/**
 * 시험 쪽 정답 읽개(`helpers/highAnswer.ts`)의 시험 — 읽개가 틀리면 고등 유형 시험 전부가
 * 같이 눈이 먼다. 기대값은 손으로 셈한 수다.
 */
import { describe, expect, it } from "vitest";

import {
  readAnswerValues,
  readValues,
  sameValues,
} from "../helpers/highAnswer";

const r = (re: number, im = 0) => ({ re, im });

describe("고등 정답 읽개", () => {
  it.each([
    ["3", [r(3)]],
    ["-7", [r(-7)]],
    ["-\\dfrac{3}{2}", [r(-1.5)]],
    ["\\frac{7}{3}", [r(7 / 3)]],
    ["2\\sqrt{3}", [r(2 * Math.sqrt(3))]],
    ["1-\\sqrt{5}", [r(1 - Math.sqrt(5))]],
    ["-\\dfrac{\\sqrt{5}}{2}", [r(-Math.sqrt(5) / 2)]],
    ["\\dfrac{1+2\\sqrt{3}}{2}", [r((1 + 2 * Math.sqrt(3)) / 2)]],
    ["i", [r(0, 1)]],
    ["-i", [r(0, -1)]],
    ["3-2i", [r(3, -2)]],
    ["\\sqrt{3}i", [r(0, Math.sqrt(3))]],
    ["\\dfrac{1}{2}+\\dfrac{3}{2}i", [r(0.5, 1.5)]],
    ["(2+i)(2-i)", [r(5)]],
    ["1\\pm\\sqrt{2}", [r(1 + Math.SQRT2), r(1 - Math.SQRT2)]],
    ["\\pm\\dfrac{\\sqrt{3}}{3}", [r(Math.sqrt(3) / 3), r(-Math.sqrt(3) / 3)]],
    [
      "\\dfrac{-1\\pm\\sqrt{3}i}{2}",
      [r(-0.5, Math.sqrt(3) / 2), r(-0.5, -Math.sqrt(3) / 2)],
    ],
  ])("%s", (tex, want) => {
    expect(sameValues(readValues(tex), want)).toBe(true);
  });

  it("못 읽는 꼴은 던진다 — 조용히 통과시키지 않는다", () => {
    for (const bad of [
      "x+1",
      "\\sqrt{-3}",
      "2\\times3",
      "\\dfrac{1}{0}",
      "3+",
      "(1+2",
    ]) {
      expect(() => readValues(bad), bad).toThrow();
    }
  });

  it("정답은 수식 한 덩어리여야 한다", () => {
    expect(sameValues(readAnswerValues("$-\\dfrac{1}{2}$"), [r(-0.5)])).toBe(
      true,
    );
    expect(() => readAnswerValues("$1$, $2$")).toThrow();
    expect(() => readAnswerValues("3")).toThrow();
  });

  it("값 묶음 비교는 순서를 안 보고 개수는 본다", () => {
    expect(sameValues([r(1), r(2)], [r(2), r(1)])).toBe(true);
    expect(sameValues([r(1)], [r(1), r(1)])).toBe(false);
    expect(sameValues([r(1, 1)], [r(1, -1)])).toBe(false);
  });
});
