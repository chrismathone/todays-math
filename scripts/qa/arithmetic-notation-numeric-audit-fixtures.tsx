/** Hand-authored expectations, independent of formatter/parser implementation.
 * Source examples were read from the frozen registry census before fixes.
 */
import "./init-arithmetic-packs";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { arithmeticProseNotation } from "@/lib/arithmetic-v2/presentation/notation";
import {
  arithmeticToStudioProblems,
  type ArithmeticOutputSheet,
} from "@/lib/arithmeticOutput";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { MathText } from "@/components/math/MathText";
import NativeProblem from "@/components/unified/NativeProblem";
import { gradeArithmeticPaperPages } from "@/components/arithmetic/GradeArithmeticPaper";
import type { ArithmeticV2Candidate } from "@/lib/arithmetic-v2/types";

declare const __AUDIT_BUILD__: {
  sourceRoot: string;
  built: string;
  sha256: Record<string, string | null>;
};

const { JSDOM } = createRequire("C:/Creative/testautocreator/package.json")(
  "jsdom",
) as {
  JSDOM: new () => { window: { document: Document } };
};
const dom = new JSDOM();
const body = dom.window.document.body;
function view(html: string) {
  body.innerHTML = html;
  assert.equal(body.querySelectorAll(".katex-error,.math-raw").length, 0);
  assert.ok(!html.includes("#cc0000"));
  const formulas = [...body.querySelectorAll("annotation")].map(
    (n) => n.textContent ?? "",
  );
  const tags = [...body.querySelectorAll("math *")].map((n) => n.tagName);
  for (const math of body.querySelectorAll(".katex")) math.remove();
  return { formulas, tags, prose: body.textContent ?? "" };
}
// Display style changes size, not the mathematical expression. Category labels
// are expected upright after the shared renderer's typography pass.
const normalize = (s: string) =>
  s
    .replaceAll("\\displaystyle", "")
    .replaceAll("\\dfrac", "\\frac")
    .replace(/\s+/g, "")
    .replaceAll("\\neq", "\\ne");
const fixtures = [
  {
    family: "m2-exponent-quotient-missing",
    input: "x≠0일 때 □에 알맞은 자연수를 구하시오.",
    prose: "일 때 에 알맞은 자연수를 구하시오.",
    formulas: ["x\\ne0", "\\square"],
  },
  {
    family: "m2-monomial-mixed-two-variable",
    input: "x≠0, y≠0일 때 식을 간단히 하시오.",
    prose: ", 일 때 식을 간단히 하시오.",
    formulas: ["x\\ne0", "y\\ne0"],
  },
  {
    family: "m2-monomial-divide",
    input: "식을 간단히 하시오. (단, x ≠ 0)",
    prose: "식을 간단히 하시오. (단, )",
    formulas: ["x\\ne0"],
  },
  {
    family: "m1-linear-equation-missing-coefficient",
    input: "주어진 x가 방정식의 해일 때 k를 구하시오.",
    prose: "주어진 가 방정식의 해일 때 를 구하시오.",
    formulas: ["x", "k"],
  },
  {
    family: "ec-g6-fraction-to-percent-v1",
    input: "백분율을 구하세요. % 앞의 수를 쓰세요.",
    prose: "백분율을 구하세요.  앞의 수를 쓰세요.",
    formulas: ["\\%"],
  },
  {
    family: "ec-g5-correspondence-output-v1",
    input: "입력에 2을 곱한 뒤 0을 더하는 규칙입니다. 빈칸의 수를 구하세요.",
    prose: "입력에 을 곱한 뒤 을 더하는 규칙입니다. 빈칸의 수를 구하세요.",
    formulas: ["2", "0"],
  },
  {
    family: "ec-g3-compound-kg-g-to-small-v1",
    input: "g 단위로 나타내세요.",
    prose: " 단위로 나타내세요.",
    formulas: ["\\mathrm{g}"],
  },
  {
    family: "ec-g6-chart-missing-percent-v1",
    input: "C 항목의 백분율을 구하세요. % 앞의 수를 쓰세요.",
    prose: " 항목의 백분율을 구하세요.  앞의 수를 쓰세요.",
    formulas: ["\\mathrm{C}", "\\%"],
  },
  {
    family: "natural-Korean-control",
    input:
      "전체의 얼마인지 기약분수로 나타내세요. 자연수인 값은 자연수로 쓰세요.",
    prose:
      "전체의 얼마인지 기약분수로 나타내세요. 자연수인 값은 자연수로 쓰세요.",
    formulas: [],
  },
] as const;
const failures: { name: string; error: string }[] = [];
function run(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    failures.push({ name, error: String(error) });
  }
}
for (const fixture of fixtures)
  run(fixture.family, () => {
    const formatted = arithmeticProseNotation(fixture.input);
    const result = view(
      renderToStaticMarkup(<MarkdownRenderer content={formatted} />),
    );
    assert.deepEqual(
      result.formulas.map(normalize),
      fixture.formulas.map(normalize),
      `${fixture.input} => ${formatted}`,
    );
    assert.equal(
      result.prose.replace(/\s+/g, ""),
      fixture.prose.replace(/\s+/g, ""),
    );
    assert.ok(
      !/[0-9A-Za-z%□≠√]/.test(result.prose),
      `Raw mathematical text: ${result.prose}`,
    );
    assert.equal(
      arithmeticProseNotation(formatted),
      formatted,
      "Display formatting must be idempotent",
    );
  });
const authored = [
  "자료 $-\\frac{3}{4}$와 $\\sqrt{2}$의 값을 구하세요.",
  "일차함수의 식을 $y=ax+b$ 꼴로 나타내세요.",
  "계산하세요. $$x^{3}\\div x^{2}=x^{\\square}$$",
];
for (const input of authored)
  run(`authored:${input}`, () =>
    assert.equal(arithmeticProseNotation(input), input),
  );
const semanticFixtures = [
  {
    family: "m3-radical-add",
    prompt: ["-3\\sqrt{2}"],
    answer: "-6\\sqrt{2}",
    tag: "msqrt",
  },
  {
    family: "ec-g6-ratio-value-v1",
    prompt: ["1:2"],
    answer: "\\frac{1}{2}",
    tag: "mfrac",
  },
  {
    family: "m2-exponent-quotient-missing",
    prompt: ["x\\ne0", "x^{3}\\divx^{2}=x^{\\square}"],
    answer: "1",
    tag: "msup",
  },
  {
    family: "ec-g3-compound-kg-g-to-small-v1",
    prompt: ["\\mathrm{kg}", "\\mathrm{g}"],
    answer: "1050",
    tag: "mn",
  },
  {
    family: "m2-fd-two-points-equation",
    prompt: ["(-3,-4)", "(-2,-9)", "y=ax+b"],
    answer: "y=-5x-19",
    tag: "mi",
  },
] as const;
for (const fixture of semanticFixtures)
  run(`output:${fixture.family}`, () => {
    const candidate = getArithmeticV2Definition(fixture.family).problemAt(0);
    const problem = arithmeticToStudioProblems({
      payloadVersion: 2,
      seed: "fixture",
      rounds: [
        {
          round: 1,
          items: [{ typeId: fixture.family, order: 1, ...candidate }],
        },
      ],
    } as ArithmeticOutputSheet)[0];
    const result = view(
      renderToStaticMarkup(<NativeProblem problem={problem} print={false} />),
    );
    for (const expected of fixture.prompt)
      assert.ok(
        result.formulas.some((f) => normalize(f).includes(normalize(expected))),
        `Missing contiguous formula ${expected}: ${JSON.stringify(result)}`,
      );
    const answer = view(
      renderToStaticMarkup(<MathText text={problem.answer} />),
    );
    assert.ok(
      answer.formulas.some((f) => normalize(f) === normalize(fixture.answer)),
      `Expected ${fixture.answer}: ${JSON.stringify(answer)}`,
    );
    assert.ok([...result.tags, ...answer.tags].includes(fixture.tag));
    assert.ok(!/[0-9A-Za-z%□≠√]/.test(result.prose + answer.prose));
    const pages = gradeArithmeticPaperPages({
      rounds: [
        {
          round: 1,
          items: [
            { number: 1, prompt: candidate.prompt, answer: candidate.answer },
          ],
        },
      ],
      title: "독립 수식 표시 검사",
      mode: "both",
      density: 12,
      problems: [problem],
    });
    const question = view(renderToStaticMarkup(pages[0].node));
    for (const expected of fixture.prompt)
      assert.ok(
        question.formulas.some((f) =>
          normalize(f).includes(normalize(expected)),
        ),
        `Admin saved-sheet projection omitted ${expected}`,
      );
    const answerPage = view(renderToStaticMarkup(pages[1].node));
    assert.ok(
      answerPage.formulas.some(
        (f) => normalize(f) === normalize(fixture.answer),
      ),
      "Admin answer page differs from saved answer",
    );
  });
// A singleton grammar has only a first witness in the full run; explicitly
// exercise those exact same 379 prompts in print mode as well.
const inventory = JSON.parse(
  gunzipSync(
    readFileSync(
      "scripts/qa/arithmetic-notation-numeric-audit-inventory.json.gz",
    ),
  ).toString("utf8"),
) as {
  families: {
    id: string;
    prompts: {
      first: { index: number; candidate: ArithmeticV2Candidate };
      last: { index: number };
    }[];
  }[];
};
const singletons = inventory.families.flatMap((family) =>
  family.prompts
    .filter((p) => p.first.index === p.last.index)
    .map((p) => ({ typeId: family.id, ...p.first.candidate })),
);
const singletonProblems = arithmeticToStudioProblems({
  payloadVersion: 2,
  seed: "singleton",
  rounds: [
    {
      round: 1,
      items: singletons.map((item, i) => ({ order: i + 1, ...item })),
    },
  ],
} as ArithmeticOutputSheet);
for (const [index, problem] of singletonProblems.entries())
  run(`singleton-print:${singletons[index].typeId}:${index}`, () => {
    const result = view(
      renderToStaticMarkup(<NativeProblem problem={problem} print />),
    );
    assert.ok(!/[0-9A-Za-z%□≠√]/.test(result.prose));
  });
const result = {
  build: __AUDIT_BUILD__,
  fixtures: fixtures.length + authored.length + semanticFixtures.length,
  singletonPrintChecks: singletonProblems.length,
  failures,
};
writeFileSync(
  "scripts/qa/arithmetic-notation-numeric-audit-fixtures-result.json",
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
assert.equal(failures.length, 0);
