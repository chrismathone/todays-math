// @vitest-environment node
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import * as rngModule from "@/lib/elementary/rng";
import { asMultipleChoice } from "@/lib/engine/deriveFormats";
import { generateHighProblem } from "@/lib/high/generate";
import { surd, surdPmTex } from "@/lib/high/numbers";
import { preprocessMarkdown } from "@/lib/math/markdownPreprocess";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { tokenizeMath } from "@/lib/math/segments";
import { generateMiddleProblem } from "@/lib/middle/generate";

// Captured from 2ae266866 before the delimiter-only fix. All fields except the
// solution stay byte-identical; the solution hash ignores spaces only directly
// after these two commands. RNG traces include the initial seed and every draw.
const TARGETS = [
  {
    key: "3-1|다항식의 곱셈|02",
    generate: generateMiddleProblem,
    before: {
      stableHash:
        "851538f7b54b8fd1d70e37968a21f1ee720654f3b6e127ab0f7d447868113c85",
      solutionHash:
        "a52b9517b134c485b7371db854f13c5442e26a7f645b197fcf7370fa0d375b85",
      rngHash:
        "033d78671095e424545c043b35d3102e4effff12867d81677af0a03006833413",
      mcqHash:
        "23da1bacda92c2f1797a09b474008b167f1a4a3cda64583a6686bcf7558fcfaf",
    },
  },
  {
    key: "2-1|연립일차방정식|90",
    generate: generateMiddleProblem,
    before: {
      stableHash:
        "e487fe153054f2d6f8c02643ee52c637b650cdfd40353ff67a49b4c4e05adcb8",
      solutionHash:
        "0d0b509f77dd48da0e4bd5cd3f23daf8ab96d00773ec266dc98d4ad57e31b808",
      rngHash:
        "5f7bf8528cb88f4237aeca29656b64c8828680c4fc867bc38da3558cda8afe7e",
      mcqHash:
        "2e258d0776b3e35caae758745afbd1059f8fb198ae1b042680513b2133da6216",
    },
  },
  {
    key: "공통수학1|여러 가지 방정식|03",
    generate: generateHighProblem,
    before: {
      stableHash:
        "c17d5a2fa22f756fcc6655c3e5e5862b05f6a72fc5f530a7e5840cc253b793f1",
      solutionHash:
        "0d1c057435a3ce4ee4cc35571e995ab2463b4078e7c1c691e688c34b496a83ba",
      rngHash:
        "164acdf1a846f7a0b9f1de25a47b719f600d5882d83c28395b3474e3828c3e83",
      mcqHash:
        "3070e76c5bafed8e926e5e9afffb1d6f7ef8bb4fbf1056db50a256a3d3dbbb22",
    },
  },
] as const;

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function checkRender(text: string, where: string) {
  const formulas = tokenizeMath(preprocessMarkdown(text)).filter(
    (segment) => segment.type !== "text",
  ).length;
  expect(formulas, where).toBeGreaterThan(0);
  for (const html of [
    renderToStaticMarkup(<MarkdownRenderer content={text} />),
    renderMathHtml(text),
  ]) {
    // Unknown commands can be red without a katex-error class.
    expect(html, where).not.toMatch(/math-raw|katex-error|#cc0000|<merror\b/i);
    expect((html.match(/class="katex"/g) ?? []).length, where).toBe(formulas);
  }
}

describe("ENG-P1-01~03: generated TeX command boundaries", () => {
  it.each(TARGETS)(
    "$key: seed 0~99 × variant 0~2",
    ({ key, generate, before }) => {
      const stable: unknown[] = [];
      const solutions: unknown[] = [];
      const traces: unknown[] = [];
      const choices: unknown[] = [];
      const realCreateRng = rngModule.createRng;
      let streams: { seed: number; draws: number[] }[] = [];
      const spy = vi
        .spyOn(rngModule, "createRng")
        .mockImplementation((seed) => {
          const rng = realCreateRng(seed);
          const stream = { seed, draws: [] as number[] };
          streams.push(stream);
          return () => {
            const value = rng();
            stream.draws.push(value);
            return value;
          };
        });

      try {
        for (let seed = 0; seed < 100; seed += 1) {
          for (let variant = 0; variant < 3; variant += 1) {
            streams = [];
            const problem = generate(key, seed, variant);
            const { solution, ...rest } = problem;
            stable.push({ seed, variant, problem: rest });
            solutions.push({
              seed,
              variant,
              solution: solution.replace(/\\(times|pm) +/g, "\\$1"),
            });
            traces.push({ seed, variant, streams });
            const mcq = asMultipleChoice(
              { ...problem, familyKey: key, problemType: key },
              realCreateRng(seed * 3 + variant),
            );
            const { solution: mcqSolution, ...mcqRest } = mcq;
            expect(mcqSolution).toBe(solution);
            choices.push({ seed, variant, mcq: mcqRest });

            for (const [index, text] of [
              problem.content,
              problem.answer,
              solution,
              ...(problem.distractors ?? []),
            ].entries()) {
              checkRender(text, `${key} / ${seed}/${variant} / field ${index}`);
            }
          }
        }
        expect({
          stableHash: hash(stable),
          solutionHash: hash(solutions),
          rngHash: hash(traces),
          mcqHash: hash(choices),
        }).toEqual(before);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it.each([
    [0, 1, "\\pm i"],
    [0, 2, "\\pm\\dfrac{i}{2}"],
    [2, 1, "2\\pm i"],
    [2, 3, "\\dfrac{2\\pm i}{3}"],
  ] as const)("±i with real part %i and denominator %i", (a, d, expected) => {
    const tex = surdPmTex(surd(a, 1, -1, d));
    expect(tex).toBe(expected);
    checkRender(`$${tex}$`, `${a} ± i / ${d}`);
  });
});
