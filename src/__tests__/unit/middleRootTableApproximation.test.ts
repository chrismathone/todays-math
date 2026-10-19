import { describe, expect, it } from "vitest";
import { M3_ROOT } from "@/lib/middle/m3Root";
import { generateMiddleProblem } from "@/lib/middle/generate";
import { legacyStudyFamilies } from "@/lib/examStudy/adapters";
import { asMultipleChoice } from "@/lib/engine/deriveFormats";
import { createRng } from "@/lib/elementary/rng";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import katex from "katex";

const key = "3-1|무리수와 실수|09";
const entry = M3_ROOT.find((f) => f.key === key)!;
function actual(a2: number, mult: 10 | 100) {
  const draws = [(a2 - 100 + 0.5) / 900, mult === 10 ? 0.25 : 0.75];
  return entry.handler(() => {
    const value = draws.shift();
    if (value === undefined) throw new Error("Unexpected extra sampling");
    return value;
  });
}
function printed(content: string) {
  const given = /\\sqrt\{(\d+\.\d{2})\}\\approx(\d+\.\d{3})/.exec(content);
  // No answer/facts are read as input.
  const asked = /\\sqrt\{(\d+)\}\$의 근삿값/.exec(content);
  if (!given || !asked) throw new Error("Missing approximate table or target");
  return {
    radicandHundredths: Number(given[1].replace(".", "")),
    rootThousandths: Number(given[2].replace(".", "")),
    target: Number(asked[1]),
  };
}
const formatThousandths = (n: number) => String(n / 1000);
describe("printed root-table approximations are never exact radical equalities", () => {
  it("exhausts900 radicands and both scale factors using integer squared rounding bounds", () => {
    let nonExact = 0,
      checked = 0;
    for (let n = 100; n <= 999; n++)
      for (const mult of [10, 100] as const) {
        const item = actual(n, mult),
          p = printed(item.content);
        expect(p.radicandHundredths).toBe(n);
        const k = BigInt(p.rootThousandths),
          N = BigInt(n) * BigInt(40000);
        // Squaring positive half-thousandth endpoints gives an exact interval, including rounding ties.
        expect((BigInt(2) * k - BigInt(1)) ** BigInt(2) <= N).toBe(true);
        expect(N < (BigInt(2) * k + BigInt(1)) ** BigInt(2)).toBe(true);
        const scale = (p.target * 100) / p.radicandHundredths;
        expect(scale).toBe(mult * mult);
        expect(item.answer).toBe(
          `$${formatThousandths(p.rootThousandths * mult)}$`,
        );
        expect(item.content).toContain("표의 근삿값을 그대로 이용하여");
        expect(item.solution).toContain(
          `\\sqrt{${p.target}}\\approx${mult}\\times`,
        );
        expect(item.content).not.toMatch(/\\sqrt\{[\d.]+\}=\d/);
        expect(item.solution).not.toMatch(/\\sqrt\{[\d.]+\}=\d+(?:\.\d+)?\$/);
        for (const text of [item.content, item.answer, item.solution])
          for (const m of text.matchAll(/\$([^$]+)\$/g))
            expect(() =>
              katex.renderToString(m[1], {
                throwOnError: true,
                strict: "ignore",
              }),
            ).not.toThrow();
        if (k * k !== BigInt(n) * BigInt(10000)) nonExact++;
        checked++;
      }
    expect(checked).toBe(1800);
    expect(nonExact).toBe(1756);
  });
  it("keeps the table-prescribed value in five choices and through seeded generation", () => {
    for (const n of [100, 101, 200, 225, 512, 998, 999])
      for (const mult of [10, 100] as const) {
        const item = actual(n, mult),
          mc = asMultipleChoice(
            { ...item, familyKey: key, problemType: "계산" },
            createRng(n),
          );
        const choices = parseProblemContent(mc.content).choices;
        expect(choices).toHaveLength(5);
        expect(new Set(choices).size).toBe(5);
        expect(choices["①②③④⑤".indexOf(mc.answer)]).toBe(item.answer);
        expect(printed(mc.content)).toEqual(printed(item.content));
      }
    for (let seed = 1; seed <= 32; seed++) {
      const a = generateMiddleProblem(key, seed, 3);
      expect(a).toEqual(generateMiddleProblem(key, seed, 3));
      expect(a.grade).toBe("중3");
      expect(a.unitSection).toBe("무리수와 실수");
      printed(a.content);
    }
  });
  it("preserves identities and changes only the corrected recipe version without inventing evidence", () => {
    const families = legacyStudyFamilies(),
      family = families.find((f) => f.id === `legacy:mid:${key}`)!;
    expect(family.version).toBe("20261019-root-table-approx-r1");
    expect(family.evidence).toBeUndefined();
    expect(
      families.find((f) => f.id === "legacy:mid:3-1|무리수와 실수|08")?.version,
    ).toBe("9cfbb8683-r1");
  }, 40_000);
});
