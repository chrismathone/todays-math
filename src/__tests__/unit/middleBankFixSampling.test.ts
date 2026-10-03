import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";

const cases = [
  {
    key: "1-2|기본 도형|08",
    failures: ["17/1", "284/0", "1502/0", "1672/1", "1755/0"],
    hash: "a9ef4792477e09402230e260000e5f84589a0660cb9275cf455fce8e1c366f09",
  },
  {
    key: "2-2|평행선 사이의 선분의 길이의 비|09",
    failures: ["399/0"],
    hash: "3bcd3e0dcc9e76e5b9aa1180c44c1e5c4838c50e1b2512e555cb1792dd174d12",
  },
];

describe("MID-003/004: exhausted rejection samples have a finite fallback", () => {
  for (const sample of cases) {
    it(`${sample.key}: 2000 seeds × 3 variants, unchanged successful output`, () => {
      const failures: string[] = [];
      const hash = createHash("sha256");
      let checked = 0;
      let preserved = 0;
      for (let seed = 0; seed < 2000; seed++)
        for (let variant = 0; variant < 3; variant++) {
          let p;
          try {
            p = generateMiddleProblem(sample.key, seed, variant);
          } catch {
            failures.push(`${seed}/${variant}`);
            continue;
          }
          if (sample.key.startsWith("1-2")) {
            const k = Number(
              p.content.match(/\\angle COD=(\d+)\\angle BOC/)![1],
            );
            const total = Number(
              p.content.match(/\\angle AOD=(\d+)\^\\circ/)![1],
            );
            const answer = Number(p.answer.match(/\$(\d+)/)![1]);
            // Solve from the printed conditions, then count positive integer answers.
            const possible = Array.from(
              { length: total - 1 },
              (_, i) => i + 1,
            ).filter((angle) => (2 * angle) / k + angle === total);
            expect(possible, p.content).toEqual([answer]);
          } else {
            const lengths = [
              ...p.content.matchAll(/\\overline\{(AD|BC|AE|EB)\}=(\d+)/g),
            ];
            expect(lengths).toHaveLength(4);
            const given = Object.fromEntries(
              lengths.map((m) => [m[1]!, Number(m[2])]),
            );
            const answer = Number(p.answer.match(/\$(\d+)/)![1]);
            // The increase in the parallel segment is proportional to distance from AD.
            expect((answer - given.AD!) * (given.AE! + given.EB!)).toBe(
              (given.BC! - given.AD!) * given.AE!,
            );
            expect(answer).toBeGreaterThan(given.AD!);
            expect(answer).toBeLessThan(given.BC!);
            expect(Number.isInteger(answer)).toBe(true);
          }
          if (!sample.failures.includes(`${seed}/${variant}`)) {
            hash.update(
              `${seed}|${variant}|${p.content}|${p.answer}|${p.solution}\n`,
            );
            preserved++;
          }
          checked++;
        }
      expect(failures).toEqual([]);
      expect(checked).toBe(6000);
      expect(preserved).toBe(6000 - sample.failures.length);
      expect(hash.digest("hex")).toBe(sample.hash);
    });
  }

  it("08: even 200 invalid pairs use exactly the original 400 RNG draws", () => {
    const entry = registeredTypes().find((e) => e.key === cases[0]!.key)!;
    let draws = 0;
    const p = entry.handler(() => {
      draws++;
      return 0;
    });
    expect(draws).toBe(400);
    expect((2 + p.facts.k!) * p.facts.p!).toBe(p.facts.total);
    expect([90, 180]).toContain(p.facts.total);
  });

  it("09: 120 invalid base lengths do not consume an extra random number", () => {
    const entry = registeredTypes().find((e) => e.key === cases[1]!.key)!;
    let draws = 0;
    const p = entry.handler(() => {
      draws++;
      return draws === 2 ? 0.999 : 0;
    });
    expect(draws).toBe(123);
    expect(p.facts.m).toBe(2);
    expect(p.facts.n).toBe(9);
    expect(p.facts.p).toBe(4);
    expect(p.facts.q).toBe(15);
    expect(Number.isInteger(p.facts.x)).toBe(true);
  });
});
