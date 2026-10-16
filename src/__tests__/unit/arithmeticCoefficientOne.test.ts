import { describe, expect, it } from "vitest";
import {
  getArithmeticV2Definition,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";

/** Owner found «y=1x» in 연산대장 (2026-10-16). A coefficient of ±1 before a
 * variable is never printed as a digit. Mixed numbers like 1\frac{1}{2} are
 * fine — the regex only matches a digit 1 directly before a letter.
 */
// No whitespace between the 1 and the letter: «1 t» and «1 m» are units.
const DIGIT_ONE_COEFFICIENT =
  /(^|[^\d.])[-−]?1\\?[a-z](?![a-z])|(^|[^\d.])[-−]?1\\(?:frac|sqrt)\{[^}]*\}\s*[a-z]/;

describe("no ±1 printed as a coefficient", () => {
  it("across every type's domain (strided), prompt and answer", () => {
    const hits: string[] = [];
    for (const type of listArithmeticV2Types()) {
      const definition = getArithmeticV2Definition(type.id);
      const step = Math.max(1, Math.floor(definition.domainSize / 3000));
      for (let i = 0; i < definition.domainSize; i += step) {
        const { prompt, answer } = definition.problemAt(i);
        const texts =
          prompt.layout === "math"
            ? [prompt.text, prompt.latex, answer.text, answer.latex]
            : [answer.text, answer.latex];
        const bad = texts.find(
          (text) =>
            DIGIT_ONE_COEFFICIENT.test(text) &&
            !/1\\frac\{\d+\}\{\d+\}(?!\s*[a-z])/.test(text),
        );
        if (bad) {
          hits.push(`${type.id} #${i}: ${bad}`);
          break;
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
