/** Actual production output + MarkdownRenderer/NativeProblem SSR, independent DOM oracle.
 * --baseline permits known defects; default fails if any are left. Not a formatter clone.
 * Use build.mjs [checkout] to verify root's current display code without shared writes.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import katex from "katex";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { MathText } from "@/components/math/MathText";
import NativeProblem from "@/components/unified/NativeProblem";
import { GradeArithmeticExpression as PaperExpression } from "@/components/arithmetic/GradeArithmeticPaper";
import { GradeArithmeticExpression as CatalogExpression } from "@/components/arithmetic/GradeArithmeticPrompt";
import { ArithmeticExpression } from "@/components/arithmetic/ArithmeticPaper";
import type { ArithmeticV2Candidate } from "@/lib/arithmetic-v2/types";
import type { ArithmeticOutputSheet } from "@/lib/arithmeticOutput";
import type { StudioProblem } from "@/components/unified/types";
import {
  listArithmeticSkills,
  defaultArithmeticConstraints,
} from "@/lib/arithmetic/catalog";
import { arithmeticDomainPairs } from "@/lib/arithmetic/domain";
import { renderArithmeticPrompt } from "@/lib/arithmetic/render";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
  type ArithmeticSkillSelection,
  type ArithmeticSpec,
} from "@/contracts/arithmetic.contract";

type Witness = { index: number; candidate: ArithmeticV2Candidate };
type Pattern = { key: string; count: number; first: Witness; last: Witness };
declare const __AUDIT_BUILD__: {
  sourceRoot: string;
  built: string;
  sha256: Record<string, string | null>;
};
type Family = {
  id: string;
  domainSize: number;
  promptPresentation: string | null;
  prompts: Pattern[];
  instructions: Pattern[];
  answers: Pattern[];
};
const inventory = JSON.parse(
  gunzipSync(
    readFileSync(
      "scripts/qa/arithmetic-notation-numeric-audit-inventory.json.gz",
    ),
  ).toString("utf8"),
) as {
  complete: boolean;
  selectedFamilies: number;
  visitedCandidates: number;
  expectedCandidates: number;
  families: Family[];
};
const baseline = process.argv.includes("--baseline");
const preliminary = process.argv.includes("--preliminary");
const smoke = process.argv.includes("--smoke");
if (!preliminary)
  assert.ok(inventory.complete, "Run the COMPLETE finite census first");
if (smoke)
  for (const family of inventory.families) {
    family.prompts = family.prompts.slice(0, 1);
    family.answers = family.answers.slice(0, 1);
  }
type Node = DefaultTreeAdapterMap["node"];
const signal = /[0-9A-Za-z=+−×÷√%□≠≤≥²³]|(?:\d\s*[:/])/u;
const shape = (s: string) => s.replace(/\d+/g, "#");
type Inspection = {
  outside: string;
  annotations: string[];
  mathText: string[];
  errors: string[];
  mathCount: number;
};
const cache = new Map<string, Inspection>();
let markdownRenderCalls = 0,
  componentRenderCalls = 0;
function inspectHtml(html: string): Inspection {
  const result: Inspection = {
    outside: "",
    annotations: [],
    mathText: [],
    errors: [],
    mathCount: 0,
  };
  function textContent(node: Node): string {
    return "value" in node
      ? node.value
      : "childNodes" in node
        ? node.childNodes.map(textContent).join("")
        : "";
  }
  function visit(node: Node, inMath = false, hidden = false) {
    const element = "tagName" in node ? node : undefined;
    const classes =
      element?.attrs.find((a) => a.name === "class")?.value.split(/\s+/) ?? [];
    const math = inMath || classes.includes("katex");
    if (classes.includes("katex")) result.mathCount++;
    const skip =
      hidden ||
      classes.includes("katex-html") ||
      element?.tagName === "annotation";
    if (element?.tagName === "annotation")
      result.annotations.push(textContent(node));
    if (element?.tagName === "mtext") result.mathText.push(textContent(node));
    if (classes.includes("katex-error") || classes.includes("math-raw"))
      result.errors.push(textContent(node));
    if (!math && !skip && "value" in node) result.outside += node.value;
    if ("childNodes" in node)
      for (const child of node.childNodes) visit(child, math, skip);
  }
  visit(parseFragment(html));
  if (/#cc0000/i.test(html)) result.errors.push("red unknown command");
  return result;
}
function inspect(content: string): Inspection {
  let found = cache.get(content);
  if (!found) {
    markdownRenderCalls++;
    found = inspectHtml(
      renderToStaticMarkup(<MarkdownRenderer content={content} />),
    );
    cache.set(content, found);
  }
  return found;
}
function inspectNode(node: ReactNode) {
  componentRenderCalls++;
  return inspectHtml(renderToStaticMarkup(node));
}
// Independent delimiter reader: does not import the production tokenizer/preprocessor.
function boundaries(text: string) {
  const outside: string[] = [],
    math: string[] = [];
  let pos = 0,
    begin = 0;
  while (pos < text.length) {
    if (text[pos] !== "$" || text[pos - 1] === "\\") {
      pos++;
      continue;
    }
    outside.push(text.slice(begin, pos));
    const delimiter = text[pos + 1] === "$" ? "$$" : "$";
    const start = pos + delimiter.length;
    let end = start;
    while (
      end < text.length &&
      !(text.startsWith(delimiter, end) && text[end - 1] !== "\\")
    )
      end++;
    assert.ok(end < text.length, `Unclosed explicit math: ${text}`);
    math.push(text.slice(start, end));
    pos = end + delimiter.length;
    begin = pos;
  }
  outside.push(text.slice(begin));
  return { outside: outside.join(" "), math };
}
const texSeen = new Set<string>();
const texErrors: { context: string; tex: string; error: string }[] = [];
function validateTex(tex: string, context: string) {
  if (texSeen.has(tex)) return;
  texSeen.add(tex);
  try {
    katex.renderToString(tex, { throwOnError: true, strict: false });
  } catch (error) {
    texErrors.push({ context, tex, error: String(error) });
  }
}
type Finding = {
  family: string;
  path: string;
  issue: string;
  count: number;
  example: {
    index: number;
    source: string;
    explicit: string;
    outside: string;
    annotations: string[];
  };
};
const findings = new Map<string, Finding>();
const routeCounts: Record<string, number> = {};
const familyRoutes: { family: string; domainSize: number; routes: string[] }[] =
  [];
function issue(
  family: string,
  path: string,
  kind: string,
  witness: Witness,
  source: string,
  explicit: string,
  result: Inspection,
  count = 1,
) {
  const key = `${family}|${path}|${kind}|${shape(result.outside)}`;
  const previous = findings.get(key);
  if (previous) {
    previous.count += count;
    return;
  }
  findings.set(key, {
    family,
    path,
    issue: kind,
    count,
    example: {
      index: witness.index,
      source,
      explicit,
      outside: result.outside,
      annotations: result.annotations,
    },
  });
  if (!baseline && !path.includes("helper") && !path.includes("unreferenced"))
    console.log(`FINDING ${family} ${path} ${kind}: ${result.outside}`);
}
function check(
  family: string,
  path: string,
  witness: Witness,
  source: string,
  explicit: string,
  result: Inspection,
  count = 1,
) {
  if (result.errors.length)
    issue(
      family,
      path,
      "renderer-error",
      witness,
      source,
      explicit,
      result,
      count,
    );
  if (signal.test(result.outside))
    issue(
      family,
      path,
      "raw-math-after-render",
      witness,
      source,
      explicit,
      result,
      count,
    );
  const parts = boundaries(explicit);
  if (signal.test(parts.outside))
    issue(
      family,
      path,
      "not-explicit-before-heuristics",
      witness,
      source,
      explicit,
      result,
      count,
    );
  for (const tex of parts.math)
    validateTex(tex, `${family}/${path}/${witness.index}`);
}
let projections = new Map<number, StudioProblem>();
function project(_family: string, witness: Witness) {
  return projections.get(witness.index)!;
}
let checkedPatterns = 0,
  checkedWitnesses = 0;
for (const family of inventory.families) {
  const witnesses = [
    ...new Map(
      [...family.prompts, ...family.instructions, ...family.answers]
        .flatMap((p) => [p.first, p.last])
        .map((w) => [w.index, w]),
    ).values(),
  ];
  const projected = arithmeticToStudioProblems({
    payloadVersion: 2,
    seed: "numeric-notation-audit",
    rounds: [
      {
        round: 1,
        items: witnesses.map((w, i) => ({
          typeId: family.id,
          order: i + 1,
          ...w.candidate,
        })),
      },
    ],
  } as ArithmeticOutputSheet);
  projections = new Map(witnesses.map((w, i) => [w.index, projected[i]]));
  cache.clear();
  const routes = new Set<string>();
  for (const pattern of family.prompts) {
    const witnesses =
      pattern.first.index === pattern.last.index
        ? [pattern.first]
        : [pattern.first, pattern.last];
    for (const witness of witnesses) {
      const { prompt } = witness.candidate;
      const problem = project(family.id, witness);
      const source =
        prompt.layout === "math"
          ? prompt.text
          : `${prompt.left} ${prompt.operator} ${prompt.right}`;
      const route = problem.content.includes("$$")
        ? prompt.layout === "vertical"
          ? "display-array"
          : "display-formula"
        : "mixed-prose";
      routes.add(route);
      if (witness === pattern.first)
        routeCounts[route] = (routeCounts[route] ?? 0) + pattern.count;
      const weight = witness === pattern.first ? pattern.count : 0;
      if (baseline)
        check(
          family.id,
          "output-MarkdownRenderer",
          witness,
          source,
          problem.content,
          inspect(problem.content),
          weight,
        );
      // Each grammar is exercised at both finite endpoints: first in screen
      // mode and last in print mode. NativeProblem invokes real MarkdownRenderer.
      const print = witness !== pattern.first;
      check(
        family.id,
        print ? "NativeProblem-print" : "NativeProblem-screen",
        witness,
        source,
        problem.content,
        inspectNode(<NativeProblem problem={problem} print={print} />),
        weight,
      );
      for (const [path, node] of baseline || smoke
        ? ([
            [
              baseline
                ? "admin-GradeArithmeticPaper"
                : "compatibility-helper-GradeArithmeticExpression",
              <PaperExpression key="paper" prompt={prompt} />,
            ],
            [
              "unreferenced-catalog-expression",
              <CatalogExpression key="catalog" prompt={prompt} />,
            ],
          ] as const)
        : []) {
        const result = inspectNode(node);
        if (result.errors.length || signal.test(result.outside))
          issue(
            family.id,
            path,
            result.errors.length ? "renderer-error" : "raw-math-after-render",
            witness,
            source,
            "",
            result,
            pattern.count,
          );
        // Math hidden inside mtext is not explicit mathematical notation.
        if (result.mathText.some((text) => /[0-9=+×÷√%□≠]/.test(text)))
          issue(
            family.id,
            path,
            "math-in-text-mode",
            witness,
            source,
            "",
            { ...result, outside: result.mathText.join(" | ") },
            pattern.count,
          );
      }
      if (prompt.layout === "math")
        validateTex(
          prompt.latex,
          `${family.id}/authored-prompt/${witness.index}`,
        );
      checkedWitnesses++;
    }
    checkedPatterns++;
  }
  // Instruction grammar may vary independently of a prompt's grammar.
  for (const pattern of family.instructions) {
    for (const witness of [pattern.first, pattern.last]) {
      const problem = project(family.id, witness);
      check(
        family.id,
        "output-instruction",
        witness,
        witness.candidate.prompt.instruction ?? "",
        problem.content,
        inspect(problem.content),
        pattern.count,
      );
    }
    checkedPatterns++;
  }
  for (const pattern of family.answers) {
    for (const witness of [pattern.first, pattern.last]) {
      const problem = project(family.id, witness);
      validateTex(
        witness.candidate.answer.latex,
        `${family.id}/authored-answer/${witness.index}`,
      );
      check(
        family.id,
        "answer-MathText",
        witness,
        witness.candidate.answer.text,
        problem.answer,
        inspectNode(<MathText text={problem.answer} />),
        pattern.count,
      );
    }
    checkedPatterns++;
  }
  familyRoutes.push({
    family: family.id,
    domainSize: family.domainSize,
    routes: [...routes],
  });
  if (familyRoutes.length % 25 === 0)
    console.log(
      `Rendered ${familyRoutes.length}/${inventory.families.length} families; ${checkedPatterns} patterns`,
    );
}

// V1 exhausts all legal operand pairs via full constraints. Narrower ranges/dan
// selections can only select subsets. All carry/borrow partitions are included.
const v1: {
  skill: string;
  candidates: number;
  outputPromptRaw: number;
  outputAnswerRaw: number;
  legacyPromptRaw: number;
}[] = [];
for (const skill of listArithmeticSkills()) {
  const defaultConstraints = defaultArithmeticConstraints(skill.skillId);
  const variants =
    skill.skillId === "one-digit-add"
      ? ["none", "some"].map((carry) => ({ ...defaultConstraints, carry }))
      : ["two-digit-vertical-add", "two-digit-times-one"].includes(
            skill.skillId,
          )
        ? [0, 1, 2].map((carryCount) => ({ ...defaultConstraints, carryCount }))
        : skill.skillId === "two-digit-vertical-sub"
          ? [0, 1].map((borrowCount) => ({
              ...defaultConstraints,
              borrowCount,
            }))
          : skill.skillId === "times-table"
            ? [{ ...defaultConstraints, dans: [1, 2, 3, 4, 5, 6, 7, 8, 9] }]
            : [defaultConstraints];
  const stats = {
    skill: skill.skillId,
    candidates: 0,
    outputPromptRaw: 0,
    outputAnswerRaw: 0,
    legacyPromptRaw: 0,
  };
  for (const constraints of variants) {
    const pairs = arithmeticDomainPairs({
      skillId: skill.skillId,
      constraints,
    } as ArithmeticSkillSelection);
    const items = pairs.map((operands, index) => {
      const spec = {
        engineVersion: ARITHMETIC_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_CATALOG_VERSION,
        skillId: skill.skillId,
        constraints,
        operator: skill.operator,
        operands: [...operands],
        seed: "audit",
        round: 1,
        order: 1,
      } as ArithmeticSpec;
      const prompt = renderArithmeticPrompt(spec);
      const [a, b] = operands;
      const answer = String(
        skill.operator === "+"
          ? a + b
          : skill.operator === "-"
            ? a - b
            : skill.operator === "×"
              ? a * b
              : a / b,
      );
      return { order: index + 1, spec, prompt, answer };
    });
    const problems = arithmeticToStudioProblems({
      payloadVersion: 1,
      seed: "audit",
      rounds: [{ round: 1, items }],
    } as ArithmeticOutputSheet);
    for (let index = 0; index < items.length; index++) {
      const { prompt } = items[index];
      const problem = problems[index];
      stats.candidates++;
      // All V1 projections are checked; grammar render results are reused only
      // when decimal digits are their sole difference, exactly as the v2 census.
      const key = `v1|${shape(problem.content)}`;
      const result =
        cache.get(key) ??
        inspectNode(<NativeProblem problem={problem} print={false} />);
      cache.set(key, result);
      if (
        signal.test(boundaries(problem.content).outside) ||
        signal.test(result.outside)
      )
        stats.outputPromptRaw++;
      const answerKey = `v1answer|${shape(problem.answer)}`;
      const answerResult =
        cache.get(answerKey) ?? inspectNode(<MathText text={problem.answer} />);
      cache.set(answerKey, answerResult);
      if (
        signal.test(boundaries(problem.answer).outside) ||
        signal.test(answerResult.outside)
      )
        stats.outputAnswerRaw++;
      const legacyKey = `v1legacy|${skill.skillId}`;
      const legacy =
        cache.get(legacyKey) ??
        inspectNode(<ArithmeticExpression prompt={prompt} />);
      cache.set(legacyKey, legacy);
      if (signal.test(legacy.outside)) stats.legacyPromptRaw++;
    }
  }
  v1.push(stats);
}
const result = {
  build: __AUDIT_BUILD__,
  mode: smoke ? "smoke" : baseline ? "baseline" : "verification",
  compatibilityHelpersChecked: baseline || smoke,
  censusComplete: inventory.complete,
  enumeratedCandidates: inventory.visitedCandidates,
  selectedFamilies: inventory.selectedFamilies,
  checkedPatterns,
  checkedWitnesses,
  markdownRenderCalls,
  componentRenderCalls,
  strictKatexChecks: texSeen.size,
  texErrors,
  routeCounts,
  familyRoutes,
  v1,
  findings: [...findings.values()],
};
const file = `scripts/qa/arithmetic-notation-numeric-audit-${smoke ? "smoke" : baseline ? "baseline" : "verification"}.json`;
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      file,
      checkedPatterns,
      checkedWitnesses,
      findings: findings.size,
      texErrors: texErrors.length,
      v1,
    },
    null,
    2,
  ),
);
if (!baseline) {
  assert.equal(
    texErrors.length,
    0,
    "Strict KaTeX failures; see verification JSON",
  );
  assert.equal(
    [...findings.values()].filter(
      (f) => !f.path.includes("helper") && !f.path.includes("unreferenced"),
    ).length,
    0,
    "Unresolved production explicit-math findings; see verification JSON",
  );
  assert.ok(
    v1.every(
      (s) => s.outputPromptRaw + s.outputAnswerRaw + s.legacyPromptRaw === 0,
    ),
    "V1 raw-math route remains",
  );
}
