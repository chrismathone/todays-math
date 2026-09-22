// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRng } from "../../lib/elementary/rng";
import { M1_BOOK1 } from "../../lib/middle/m1Book1";
import { M1_EXPR, M1_EXPR_SUP_B } from "../../lib/middle/m1Expr";
import { M1_LINEAR_APPLY } from "../../lib/middle/m1LinearApply";
import { tidySolution } from "../../lib/middle/solutionText";
import { wrapDanClause } from "../../lib/problemText";
import {
  checkAnswer,
  CONCEPTS,
  ENGINE_CATALOG,
  ENGINE_CONCEPT_COUNTS,
  ENGINE_EXCLUSIONS,
  generateProblem,
  TEMPLATE_COUNT,
} from "../../lib/math-srs/generator";
import {
  parseSubmittedNumber,
  readEngineAnswer,
} from "../../lib/math-srs/sharedAnswers";
import { CONCEPT_IDS, type Difficulty } from "../../lib/math-srs/types";
import { evalTex, fr } from "../helpers/highIneq";

const originals = [
  ...M1_EXPR,
  ...M1_EXPR_SUP_B,
  ...M1_BOOK1,
  ...M1_LINEAR_APPLY,
];
const byKey = new Map(originals.map((entry) => [entry.key, entry]));

describe("기존 중1 문제 엔진 재사용", () => {
  it("accounts for every imported type exactly once as supported or explicitly excluded", () => {
    const allKeys = [...ENGINE_CATALOG, ...ENGINE_EXCLUSIONS].map(
      (entry) => entry.key,
    );
    expect(new Set(allKeys).size).toBe(originals.length);
    expect(new Set(allKeys)).toEqual(
      new Set(originals.map((entry) => entry.key)),
    );
    expect(TEMPLATE_COUNT).toBe(87);
    expect(CONCEPTS.map((concept) => concept.id)).toEqual(CONCEPT_IDS);
    expect(
      Object.values(ENGINE_CONCEPT_COUNTS).reduce((a, b) => a + b, 0),
    ).toBe(TEMPLATE_COUNT);
    expect(
      Object.values(ENGINE_CONCEPT_COUNTS).every((count) => count > 0),
    ).toBe(true);
    for (const excluded of ENGINE_EXCLUSIONS)
      expect(excluded.reason.length).toBeGreaterThan(15);
    for (const entry of ENGINE_CATALOG) {
      expect(byKey.get(entry.key)?.grade).toBe("중1");
      expect(byKey.get(entry.key)?.rpmMinor).toMatch(
        /^일차방정식의 (풀이|활용)$/,
      );
    }
  });

  it("preserves original prompts, exact answers and solutions across 4,350 corpus samples", () => {
    for (const entry of ENGINE_CATALOG)
      for (let seed = 0; seed < 50; seed++) {
        const original = byKey.get(entry.key)!.handler(createRng(seed));
        const problem = generateProblem({
          conceptId: entry.conceptId,
          difficulty: entry.difficulty,
          seed,
          typeKey: entry.key,
        });
        expect(problem.prompt, entry.key).toBe(wrapDanClause(original.content));
        expect(problem.solution.join("\n"), entry.key).toBe(
          tidySolution(original.solution),
        );
        expect(problem.answerText).toBe(original.answer);
        // Existing M1 handlers emit integer answers; read only that printed quantity independently.
        const printed = original.answer.match(
          /^(?:초속\s+)?\$(?:x=)?(-?\d+)(?:\$|\\)/,
        );
        expect(printed, entry.key).not.toBeNull();
        expect(problem.answer, entry.key).toBe(Number(printed![1]));
        expect(problem.source).toEqual({
          engine: "middle",
          typeKey: entry.key,
          title: entry.title,
          tier: entry.tier,
          seed,
          requestedDifficulty: entry.difficulty,
        });
        expect(problem.difficulty).toBe(entry.difficulty);
        expect(problem.equation).toBe("");
        expect(problem.conceptWeights[0]).toEqual({
          conceptId: entry.conceptId,
          weight: 1,
        });
        expect(checkAnswer(String(problem.answer), problem.answer)).toBe(true);
        if (problem.answerUnit)
          expect(
            checkAnswer(
              `${problem.answer}${problem.answerUnit}`,
              problem.answer,
            ),
          ).toBe(false);
      }
  });

  it("reuses the independent corpus LaTeX evaluator to verify displayed equation solutions", () => {
    let checked = 0;
    for (const entry of ENGINE_CATALOG)
      for (let seed = 0; seed < 50; seed++) {
        const problem = generateProblem({
          conceptId: entry.conceptId,
          difficulty: entry.difficulty,
          seed,
          typeKey: entry.key,
        });
        if (!/^\$x=-?\d+\$$/.test(problem.answerText)) continue;
        const equation = [...problem.prompt.matchAll(/\$([^$]*=[^$]*)\$/g)]
          .map((match) => match[1])
          .sort((a, b) => b.length - a.length)[0];
        expect(equation, entry.key).toBeDefined();
        const [left, right] = equation.split("=");
        const value = (expression: string) => {
          // The shared evaluator reads ordinary grouping braces, while these M1 pages size them.
          expression = expression.replace(/\\([{}])/g, "$1");
          const ratio = expression.split(":");
          if (ratio.length === 1)
            return evalTex(expression, { x: fr(problem.answer) });
          const numerator = evalTex(ratio[0], { x: fr(problem.answer) });
          const denominator = evalTex(ratio[1], { x: fr(problem.answer) });
          return fr(numerator.n * denominator.d, numerator.d * denominator.n);
        };
        expect(value(left), `${entry.key}, seed ${seed}`).toEqual(value(right));
        checked++;
      }
    expect(checked).toBeGreaterThanOrEqual(400);
  });

  it("selects all supported types deterministically at their actual nearest source tiers", () => {
    const reached = new Set<string>();
    const answers = new Set<number>();
    for (const conceptId of CONCEPT_IDS)
      for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[])
        for (let seed = 0; seed < 500; seed++) {
          const problem = generateProblem({ conceptId, difficulty, seed });
          reached.add(problem.templateId);
          answers.add(problem.answer);
          const available = ENGINE_CATALOG.filter(
            (entry) => entry.conceptId === conceptId,
          );
          const distance = Math.min(
            ...available.map((entry) =>
              Math.abs(entry.difficulty - difficulty),
            ),
          );
          expect(Math.abs(problem.difficulty - difficulty)).toBe(distance);
          expect(problem.expectedSeconds).toBe(
            18 +
              problem.difficulty * 9 +
              (["word", "fractions"].includes(conceptId) ? 18 : 0),
          );
        }
    expect(reached.size).toBe(TEMPLATE_COUNT);
    expect(answers.has(0)).toBe(true);
    expect([...answers].some((answer) => answer < 0)).toBe(true);
    const args = {
      conceptId: "word" as const,
      difficulty: 5 as const,
      seed: 4242,
    };
    expect(generateProblem(args)).toEqual(generateProblem(args));
    expect(generateProblem(args).source.seed).toBe(args.seed);
  });

  it("rejects incompatible keys rather than quietly drawing a replacement", () => {
    for (const key of [
      "1-1|일차방정식의 풀이|02",
      "1-1|일차방정식의 풀이|17",
      "unknown",
    ]) {
      expect(() =>
        generateProblem({
          conceptId: "balance",
          difficulty: 2,
          seed: 0,
          typeKey: key,
        }),
      ).toThrow();
    }
    expect(() =>
      generateProblem({ conceptId: "balance", difficulty: 2, seed: NaN }),
    ).toThrow();
    expect(() =>
      generateProblem({
        conceptId: "balance",
        difficulty: 0 as Difficulty,
        seed: 0,
      }),
    ).toThrow();
  });

  it("keeps all-grade registries and generators out of lightweight concept imports", () => {
    const concepts = readFileSync(
      new URL("../../lib/math-srs/concepts.ts", import.meta.url),
      "utf8",
    );
    expect(concepts).not.toMatch(
      /from ["'][^"']*(?:middle|engineCatalog|generator)/,
    );
    const catalog = readFileSync(
      new URL("../../lib/math-srs/engineCatalog.ts", import.meta.url),
      "utf8",
    );
    expect(catalog).not.toMatch(/from ["'][^"']*middle\/generate/);
  });
});

describe("공유 숫자 답안 경계", () => {
  it.each([
    ["a = -3", -3],
    ["k=6/2", 3],
    ["$x=3$", 3],
    ["$-\\dfrac{1}{3}$", -1 / 3],
    ["\\frac{2}{6}", 1 / 3],
    ["-.5 / -0.5", 1],
    ["−3", -3],
    [".5", 0.5],
    ["3.", 3],
  ])("accepts one complete numeric response %s", (input, expected) => {
    expect(parseSubmittedNumber(input)).toBeCloseTo(expected, 12);
    expect(checkAnswer(input, expected)).toBe(true);
  });

  it.each([
    "3개",
    "3m",
    "3 원",
    "$3$개",
    "0x10",
    "1e2",
    "3abc",
    "3,4",
    "$3$, $4$",
    "NaN",
    "Infinity",
    "1/0",
    "1/2/3",
    "a=b=3",
    "x=3=3",
    "3\n4",
    "\\frac{1}{0}",
    "1+2",
  ])(
    "rejects extra material, malformed numbers and zero denominators: %s",
    (input) => {
      expect(parseSubmittedNumber(input)).toBeNull();
      expect(checkAnswer(input, 3)).toBe(false);
    },
  );

  it.each([
    ["$3$개", 3, "개"],
    ["$2$년 후", 2, "년 후"],
    ["$3\\,\\mathrm{cm}$", 3, "cm"],
    ["$4\\,\\mathrm{cm}^{2}$", 4, "cm²"],
    ["초속 $50\\,\\mathrm{m}$", 50, "m/s"],
  ])(
    "extracts only explicit known units from trusted source %s",
    (source, value, unit) => {
      expect(readEngineAnswer(source)).toEqual({ value, unit });
    },
  );

  it.each([
    "$3$unknown",
    "$3$개, $4$개",
    "$3x+1$",
    "$1$, $2$",
    "①",
    "$1/0$",
    "$3$<b>개</b>",
  ])("fails closed on unsupported source answers %s", (source) =>
    expect(() => readEngineAnswer(source)).toThrow(),
  );
});
