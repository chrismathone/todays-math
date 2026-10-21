import fs from "node:fs";
import { it, expect } from "vitest";
import { M2_QUAD } from "@/lib/middle/m2Quad";
import { generateMiddleProblem } from "@/lib/middle/generate";

it("captures the current generator before the opt-in marker policy changes", () => {
  const old08 = Array.from({ length: 32 }, (_, i) => {
    const seed = 20261021 + i * 7919;
    return { seed, output: generateMiddleProblem("2-2|평행사변형|08", seed, 0) };
  });
  const old15A = Array.from({ length: 100 }, (_, i) => {
    const seed = i === 0 ? 20403562 : 20261021 + i * 7919;
    return { seed, output: generateMiddleProblem("2-2|평행사변형|15A", seed, 0) };
  });
  const handler = M2_QUAD.find((row) => row.key === "2-2|평행사변형|15A")!.handler;
  const combinations = [];
  for (let x = 4; x <= 15; x++) for (let p = 2; p <= 4; p++) for (let q = 1; q <= 12; q++) {
    const values = [(x - 4 + 0.5) / 12, (p - 2 + 0.5) / 3, (q - 1 + 0.5) / 12];
    let used = 0;
    const output = handler(() => { if (used >= values.length) throw Error("unexpected RNG");return values[used++]!; });
    expect(used).toBe(3);
    combinations.push({ x, p, q, values, output });
  }
  fs.writeFileSync("src/__tests__/fixtures/m2Quad-before-inset-20261021.json", JSON.stringify({
    beforeCommit: "b432105893bcd91288cc3afa2453a220be15d765", technicalOnly: true, newAuthoredQuestions: 0,
    old08, old15A, combinations,
  }, null, 2) + "\n", { flag: "wx" });
});
