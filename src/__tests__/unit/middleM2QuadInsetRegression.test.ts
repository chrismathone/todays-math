import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { M2_QUAD } from "@/lib/middle/m2Quad";
import { generateMiddleProblem } from "@/lib/middle/generate";
// Load golden data at runtime; infer no giant union of532 historical bodies.
const baseline = JSON.parse(readFileSync("src/__tests__/fixtures/m2Quad-before-inset-20261021.json", "utf8")) as {
  old08: { seed: number; output: unknown }[];
  old15A: { seed: number; output: unknown }[];
  combinations: { values: number[]; output: unknown }[];
};

/** Compare every old field, allowing only the two declared marker policy flags. */
function withoutInset<T>(value: T): T {
  const copy = structuredClone(value) as T & { figureSpec: { angles: Record<string, Record<string, unknown>> } };
  for (const name of ["angA", "angC"]) {
    const mark = copy.figureSpec.angles[name]!;
    expect(mark.serialized_inset).toBe(true);
    delete mark.serialized_inset;
  }
  return copy;
}

describe("only newly generated15A opts in; all old mathematical output stays intact", () => {
  it("keeps every byte of32 default08 API results", () => {
    for (const row of baseline.old08)
      expect(JSON.stringify(generateMiddleProblem("2-2|평행사변형|08", row.seed, 0))).toBe(JSON.stringify(row.output));
  });
  it("keeps100 actual15A API results apart from the two explicit marker flags", () => {
    for (const row of baseline.old15A)
      expect(withoutInset(generateMiddleProblem("2-2|평행사변형|15A", row.seed, 0))).toEqual(row.output);
  });
  it("keeps all432 content/answer/solution/facts and three RNG calls in order", () => {
    const handler = M2_QUAD.find((row) => row.key === "2-2|평행사변형|15A")!.handler;
    for (const row of baseline.combinations) {
      let used = 0;
      const result = handler(() => { if (used >= 3) throw Error("unexpected RNG");return row.values[used++]!; });
      expect(used).toBe(3);
      expect(withoutInset(result)).toEqual(row.output);
    }
  });
});
