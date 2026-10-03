import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createRng } from "../../lib/elementary/rng";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { parseProblemContent } from "../../lib/problem/parseProblemContent";

/** Read only the expression actually printed to the student. */
function value(tex: string): [number, number] {
  const fraction = tex.match(/^\\d?frac\{(\d+)\}\{(\d+)\}$/);
  if (fraction) return [Number(fraction[1]), Number(fraction[2])];
  const recurring = tex.match(/^(\d+)\.(\d*)\\overline\{(\d+)\}$/);
  if (recurring) {
    const [, whole, prefix, cycle] = recurring as [
      string,
      string,
      string,
      string,
    ];
    const scale = 10 ** prefix.length;
    const period = 10 ** cycle.length - 1;
    return [
      Number(whole) * scale * period + Number(prefix) * period + Number(cycle),
      scale * period,
    ];
  }
  const finite = tex.match(/^(\d+)\.(\d+)$/);
  if (!finite) throw new Error(`Unparsed choice: ${tex}`);
  const scale = 10 ** finite[2]!.length;
  return [Number(finite[1]) * scale + Number(finite[2]), scale];
}

const inputs: [number, number][] = [[20260905, 2]];
for (let seed = 0; seed < 300; seed++)
  for (let variant = 0; variant < 3; variant++) inputs.push([seed, variant]);

describe("순환소수 17: distinct choices with exactly the printed correct pair", () => {
  it("seed 20260905/v2 and 300 seeds × 3 variants have five different comparisons", () => {
    let checked = 0;
    for (const [seed, variant] of inputs) {
      const p = generateMiddleProblem(
        "2-1|유리수와 순환소수|17",
        seed,
        variant,
      );
      const choices = parseProblemContent(p.content).choices;
      expect(choices).toHaveLength(5);
      expect(new Set(choices).size, `${seed}/${variant}: ${p.content}`).toBe(5);
      const correct: string[] = [];
      choices.forEach((choice, index) => {
        const m = choice.match(/^\$(.+)([<>])(.+)\$$/)!;
        expect(m, choice).not.toBeNull();
        const [a, b] = value(m[1]!);
        const [c, d] = value(m[3]!);
        const difference = a * d - c * b;
        expect(difference, choice).not.toBe(0);
        if (m[2] === "<" ? difference < 0 : difference > 0)
          correct.push("①②③④⑤"[index]!);
      });
      expect(correct).toHaveLength(2);
      expect(p.answer).toBe(correct.join(", "));
      checked++;
    }
    expect(checked).toBe(901);
  });

  it("preserves all 888 formerly distinct outputs and all 901 RNG draw counts", () => {
    const key = "2-1|유리수와 순환소수|17";
    const entry = registeredTypes().find((e) => e.key === key)!;
    const oldDuplicates = new Set([
      "20260905/2",
      "111/1",
      "117/0",
      "119/2",
      "140/0",
      "198/1",
      "227/1",
      "243/0",
      "243/2",
      "260/0",
      "263/1",
      "292/2",
      "299/2",
    ]);
    let salt = 0;
    for (const c of key) salt = (Math.imul(salt, 31) + c.charCodeAt(0)) | 0;
    const hash = createHash("sha256");
    const drawsHash = createHash("sha256");
    let preserved = 0;
    for (const [seed, variant] of inputs) {
      let draws = 0;
      const rng = createRng(seed + (salt >>> 0) + variant * 0x9e37);
      entry.handler(() => {
        draws++;
        return rng();
      });
      drawsHash.update(`${seed}|${variant}|${draws}\n`);
      if (oldDuplicates.has(`${seed}/${variant}`)) continue;
      const p = generateMiddleProblem(key, seed, variant);
      hash.update(
        `${seed}|${variant}|${p.content}|${p.answer}|${p.solution}\n`,
      );
      preserved++;
    }
    expect(preserved).toBe(888);
    expect(inputs).toHaveLength(901);
    expect(hash.digest("hex")).toBe(
      "d8a8cb99e8b8ab1f8dd1680375f98cc4bae1399dd32d29d4c6d811397eac2878",
    );
    expect(drawsHash.digest("hex")).toBe(
      "af533a68fd9ea9d770ef3a43c43de50803ec89a0f61ed8a4309c5e66f3873472",
    );
  });

  it("all registered middle types: direct choices are distinct, seeds 0..99", () => {
    const entries = registeredTypes();
    const duplicates: Record<string, number[]> = {};
    const errors: string[] = [];
    const choiceKeys = new Set<string>();
    let generated = 0;
    let choiceSets = 0;
    for (const entry of entries)
      for (let seed = 0; seed < 100; seed++) {
        try {
          const p = generateMiddleProblem(entry.key, seed);
          generated++;
          const choices = parseProblemContent(p.content).choices;
          if (choices.length === 0) continue;
          choiceKeys.add(entry.key);
          choiceSets++;
          if (
            choices.length !== 5 ||
            new Set(choices).size !== choices.length
          ) {
            (duplicates[entry.key] ??= []).push(seed);
          }
        } catch (error) {
          errors.push(`${entry.key}/${seed}: ${String(error)}`);
        }
      }
    expect(entries.length).toBeGreaterThan(1000);
    expect(generated).toBe(entries.length * 100);
    expect(choiceSets).toBeGreaterThan(1000);
    expect(choiceKeys.size).toBeGreaterThan(10);
    expect(errors).toEqual([]);
    expect(duplicates).toEqual({});
  }, 120000);
});
