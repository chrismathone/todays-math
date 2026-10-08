import { describe, expect, it } from "vitest";
import { josaFaults, lastSpokenNumber } from "@/lib/elementary/rules";

describe("fraction speech endings", () => {
  it("reads the numerator of equivalent compact and braced fractions", () => {
    for (const math of [
      String.raw`\frac12`,
      String.raw`\frac{1}2`,
      String.raw`\frac1{2}`,
      String.raw`\frac{1}{2}`,
      String.raw`\dfrac12`,
      String.raw`\tfrac 1 2`,
    ]) {
      expect(lastSpokenNumber(math)).toBe(1);
      expect(josaFaults(`$${math}$은 같은 수입니다.`)).toEqual([]);
      expect(josaFaults(`$${math}$는 같은 수입니다.`)).toEqual([`$${math}$는`]);
    }
  });

  it("uses the last fraction in a mixed number and keeps the ㄹ rule", () => {
    expect(lastSpokenNumber(String.raw`4\frac78`)).toBe(7);
    expect(josaFaults(String.raw`$4\frac78$로 바꾼다.`)).toEqual([]);
    expect(josaFaults(String.raw`$4\frac78$으로 바꾼다.`)).toEqual([
      String.raw`$4\frac78$으로`,
    ]);
  });

  it("does not mistake a later integer for the earlier fraction", () => {
    expect(lastSpokenNumber(String.raw`\frac{1}{2}+3`)).toBe(3);
    expect(josaFaults(String.raw`$\frac12+3$으로 나타낸다.`)).toEqual([]);
    expect(josaFaults(String.raw`$\frac12+3$로 나타낸다.`)).toEqual([
      String.raw`$\frac12+3$로`,
    ]);
  });

  it("does not infer the pronunciation of an unknown numerator from its denominator", () => {
    expect(josaFaults(String.raw`$\frac{x}2$을 넣는다.`)).toEqual([]);
    expect(josaFaults(String.raw`$\frac{x}2$를 넣는다.`)).toEqual([]);
  });

  it("keeps checking ordinary integers and complete braced fractions", () => {
    expect(josaFaults(String.raw`$3$로 나누고 $\frac{2}{5}$이 된다.`)).toEqual([
      "$3$로",
      String.raw`$\frac{2}{5}$이`,
    ]);
    expect(
      josaFaults(String.raw`$3$으로 나누고 $\frac{2}{5}$가 된다.`),
    ).toEqual([]);
  });
});
