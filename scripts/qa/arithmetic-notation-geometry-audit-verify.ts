import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { MarkdownRenderer } from "../../src/components/math/MarkdownRenderer";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { tokenizeMath } from "../../src/lib/math/segments";
import { UI_KATEX_OPTIONS } from "../../src/lib/math/katexRender";
import { preprocessMarkdown } from "../../src/lib/math/markdownPreprocess";
import inventory from "./arithmetic-notation-geometry-audit-inventory.json";
import {
  assertContrasts,
  assertGeneralNotation,
  assertSemanticObjects,
  contrastFixtures,
  exactAnswerValue,
  mathmlAnswerValue,
  namedObjects,
  patternOf,
  semanticFixtureCount,
} from "./arithmetic-notation-geometry-audit-semantics";

type Failure = {
  field: string;
  family: string;
  check: string;
  count: number;
  first: string;
  source: string;
  display: string;
  message: string;
};
const hashText = (value: string) =>
  createHash("sha256").update(value).digest("hex");
async function main() {
  const rootAt = process.argv.indexOf("--formatter-root");
  const formatterRoot = resolve(rootAt >= 0 ? process.argv[rootAt + 1] : ".");
  const formatterPath = resolve(
    formatterRoot,
    "src/lib/arithmetic-v2/presentation/notation.ts",
  );
  const formatterSha256 = hashText(readFileSync(formatterPath, "utf8"));
  const notationModule = await import(pathToFileURL(formatterPath).href);
  const format = (notationModule.arithmeticGeometryNotation ??
    notationModule.default?.arithmeticGeometryNotation) as (
    text: string,
  ) => string;
  assert.equal(
    typeof format,
    "function",
    "actual arithmeticGeometryNotation export",
  );
  const failures = new Map<string, Failure>();
  const patterns = new Map(
    inventory.patterns.map((p) => [
      `${p.fields[0]}:${patternOf(p.example)}`,
      p,
    ]),
  );
  const observedPatterns = new Map<string, number>();
  const fieldsChecked = new Map<
    string,
    { display: string; errors: { check: string; message: string }[] }
  >();
  const renderedPatterns = new Set<string>();
  const dom = new (createRequire(import.meta.url)("jsdom").JSDOM)("") as {
    window: { document: Document; close(): void };
  };
  const container = dom.window.document.createElement("div");
  if (process.argv.includes("--probe")) {
    const display = format("AB=AC=22 cm, BC=34 cm, AD⊥BC, 호 TP, 직선 EF");
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: display, inline: true }),
    );
    container.innerHTML = html;
    console.log(
      JSON.stringify(
        {
          display,
          html: html.slice(0, 9000),
          classes: [
            ...new Set(
              [...container.querySelectorAll("[class]")].map((n) =>
                n.getAttribute("class"),
              ),
            ),
          ],
        },
        null,
        2,
      ),
    );
    dom.window.close();
    return;
  }
  const katexChecked = new Set<string>();
  const answerValues = new Map<string, number>();
  const sourceLatexChecked = new Set<string>();
  const sourceHash = createHash("sha256");
  const figures = new Set<string>();
  const rows: {
    id: string;
    candidates: number;
    figures: number;
    textOnly: number;
    patterns: number;
  }[] = [];
  const incidentIDs: string[] = [];
  let candidates = 0,
    fields = 0,
    katexOccurrences = 0,
    rendererChecks = 0,
    semanticChecks = 0,
    answerValueChecks = 0;
  const quick = process.argv.includes("--quick");
  const check = (action: () => void) => {
    try {
      action();
      return undefined;
    } catch (error) {
      return String((error as Error).message);
    }
  };
  function fail(
    family: string,
    id: string,
    field: string,
    source: string,
    display: string,
    kind: string,
    message: string,
  ) {
    const key = `${family}/${field}/${kind}`;
    const failure = failures.get(key) ?? {
      field,
      family,
      check: kind,
      count: 0,
      first: id,
      source,
      display,
      message,
    };
    failure.count++;
    failures.set(key, failure);
  }
  function strictKatex(display: string) {
    for (const part of tokenizeMath(display)) {
      if (part.type === "text") continue;
      katexOccurrences++;
      const key = `${part.type}:${part.value}`;
      if (katexChecked.has(key)) continue;
      const html = katex.renderToString(part.value, {
        ...UI_KATEX_OPTIONS,
        throwOnError: true,
        output: "htmlAndMathml",
        displayMode: part.type === "display",
      });
      assert.doesNotMatch(html, /katex-error|math-raw|#cc0000|<merror/i);
      katexChecked.add(key);
    }
  }
  function rendererCheck(display: string) {
    const pre = preprocessMarkdown(display);
    strictKatex(pre);
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: display, inline: true }),
    );
    assert.doesNotMatch(
      html,
      /katex-error|math-raw|#cc0000|<merror/i,
      "real MarkdownRenderer fallback",
    );
    const expected = namedObjects(display);
    container.innerHTML = html;
    const overlines = container.querySelectorAll(
      ".katex-html .katex-overline",
    ).length;
    const arcs = container.querySelectorAll(
      ".katex-html .geom-arc-wrap",
    ).length;
    assert.equal(
      overlines,
      expected.filter((s) => s.startsWith("segment:")).length,
      "real renderer segment bars",
    );
    assert.equal(
      arcs,
      expected.filter((s) => s.startsWith("arc:")).length,
      "real renderer arc marks",
    );
    for (const [role, arrow] of [
      ["line", "↔"],
      ["ray", "→"],
    ]) {
      const count = [...container.querySelectorAll("mover")].filter(
        (node) => node.lastElementChild?.textContent === arrow,
      ).length;
      assert.equal(
        count,
        expected.filter((s) => s.startsWith(`${role}:`)).length,
        `real renderer ${role} arrows`,
      );
    }
    for (const node of container.querySelectorAll(".katex")) node.remove();
    assert.doesNotMatch(
      container.textContent ?? "",
      /\$|\\(?:frac|overline|mathrm|angle)|[∠∥⊥π√°]/,
      "raw math after real renderer",
    );
    rendererChecks++;
  }
  for (const d of arithmeticV2Definitions().filter(
    (d) => d.strand === "도형",
  )) {
    const familyPatterns = new Set<string>();
    let figureCount = 0;
    for (let index = 0; index < d.domainSize; index++) {
      const c = d.problemAt(index);
      assert.equal(c.prompt.layout, "math");
      if (c.prompt.layout !== "math") continue;
      candidates++;
      const id = `${d.id}:${index}${c.prompt.figureId ? ` (${c.prompt.figureId})` : ""}`;
      sourceHash.update(JSON.stringify([d.id, index, c]));
      if (c.prompt.figureId) {
        figures.add(c.prompt.figureId);
        figureCount++;
      }
      if (c.prompt.text.includes("AB=AC=22 cm, BC=34 cm")) incidentIDs.push(id);
      const sourceFields = {
        text: c.prompt.text,
        instruction: c.prompt.instruction ?? "",
        latex: c.prompt.latex,
        answerText: c.answer.text,
        answerLatex: c.answer.latex,
        answerUnit: c.prompt.answerUnit ?? "<legacy>",
      };
      const answerMessage = check(() => {
        if (!answerValues.has(c.answer.latex)) {
          container.innerHTML = katex.renderToString(c.answer.latex, {
            ...UI_KATEX_OPTIONS,
            throwOnError: true,
            output: "mathml",
          });
          answerValues.set(
            c.answer.latex,
            mathmlAnswerValue(container.querySelector("math")!),
          );
        }
        const expectedValue = exactAnswerValue(c.answer),
          actualValue = answerValues.get(c.answer.latex)!;
        assert.ok(
          Math.abs(expectedValue - actualValue) <
            1e-10 * Math.max(1, Math.abs(expectedValue)),
          `answer MathML ${actualValue} != exact ${expectedValue}`,
        );
      });
      answerValueChecks++;
      if (answerMessage)
        fail(
          d.id,
          id,
          "answerLatex",
          c.answer.latex,
          c.answer.latex,
          "answer-value",
          answerMessage,
        );
      for (const [field, source] of Object.entries(sourceFields)) {
        const patternKey = `${field}:${patternOf(source)}`;
        assert.ok(
          patterns.has(patternKey),
          `unreviewed source pattern: ${id}/${field}/${source}`,
        );
        observedPatterns.set(
          patternKey,
          (observedPatterns.get(patternKey) ?? 0) + 1,
        );
        familyPatterns.add(patternKey);
        // prompt.latex is frozen alternate metadata for geometry; the UI displays
        // text + instruction. answerText is the plain alternative to answerLatex.
        if (field === "latex") {
          if (!sourceLatexChecked.has(source)) {
            const message = check(() => {
              katex.renderToString(source, {
                ...UI_KATEX_OPTIONS,
                throwOnError: true,
                output: "mathml",
              });
            });
            if (message)
              fail(d.id, id, field, source, source, "canonical-latex", message);
            sourceLatexChecked.add(source);
          }
          continue;
        }
        if (field === "answerText" || field === "answerUnit") continue;
        fields++;
        const input = field === "answerLatex" ? `$${source}$` : source;
        const cacheKey = `${field}:${input}`;
        let evaluated = fieldsChecked.get(cacheKey);
        if (!evaluated) {
          const display = format(input);
          const errors: { check: string; message: string }[] = [];
          const checks: [string, () => void][] = [
            ["semantic", () => assertSemanticObjects(field, source, display)],
            ["general", () => assertGeneralNotation(input, display)],
            ["idempotence", () => assert.equal(format(display), display)],
            ["katex", () => strictKatex(display)],
          ];
          for (const [kind, action] of checks) {
            const message = check(action);
            if (message) errors.push({ check: kind, message });
          }
          evaluated = { display, errors };
          fieldsChecked.set(cacheKey, evaluated);
        }
        semanticChecks++;
        for (const error of evaluated.errors)
          fail(
            d.id,
            id,
            field,
            source,
            evaluated.display,
            error.check,
            error.message,
          );
        if (!quick && !renderedPatterns.has(patternKey)) {
          const message = check(() => rendererCheck(evaluated.display));
          if (message)
            fail(
              d.id,
              id,
              field,
              source,
              evaluated.display,
              "MarkdownRenderer",
              message,
            );
          renderedPatterns.add(patternKey);
        }
      }
    }
    rows.push({
      id: d.id,
      candidates: d.domainSize,
      figures: figureCount,
      textOnly: d.domainSize - figureCount,
      patterns: familyPatterns.size,
    });
  }
  assert.equal(
    sourceHash.digest("hex"),
    inventory.canonicalSha256,
    "canonical source changed since independent census",
  );
  assert.equal(candidates, inventory.candidates);
  assert.equal(rows.length, inventory.families);
  assert.equal(observedPatterns.size, patterns.size);
  for (const [key, pattern] of patterns)
    assert.equal(observedPatterns.get(key), pattern.count, key);
  const contrastError = check(() => assertContrasts(format));
  if (contrastError)
    fail(
      "synthetic",
      "contrasts",
      "text",
      "see contrastFixtures",
      "",
      "contrasts",
      contrastError,
    );
  if (!quick)
    for (const fixture of contrastFixtures) {
      const display = format(fixture.source),
        message = check(() => rendererCheck(display));
      if (message)
        fail(
          "synthetic",
          fixture.source,
          "text",
          fixture.source,
          display,
          "MarkdownRenderer",
          message,
        );
    }
  assert.equal(
    hashText(readFileSync(formatterPath, "utf8")),
    formatterSha256,
    "formatter changed during audit; rerun against stable source",
  );
  dom.window.close();
  const result = {
    status: failures.size ? "FAIL" : quick ? "PROVISIONAL" : "PASS",
    quick,
    formatterPath,
    formatterSha256,
    canonicalSha256: inventory.canonicalSha256,
    families: rows.length,
    candidates,
    figureCandidates: rows.reduce((n, r) => n + r.figures, 0),
    uniqueFigureIDs: figures.size,
    textOnlyCandidates: rows.reduce((n, r) => n + r.textOnly, 0),
    sourceFieldsInventoried: candidates * 6,
    sourcePatterns: patterns.size,
    semanticFixturePatterns: semanticFixtureCount,
    fieldsChecked: fields,
    uniqueFieldsChecked: fieldsChecked.size,
    semanticChecks,
    answerValueChecks,
    uniqueAnswerMathML: answerValues.size,
    canonicalPromptLatexSyntaxChecks: sourceLatexChecked.size,
    uniqueKatexExpressions: katexChecked.size,
    katexOccurrences,
    rendererChecks,
    rendererPatternAttempts: renderedPatterns.size,
    syntheticChecks: contrastError ? 0 : 12,
    incidentIDs,
    failures: [...failures.values()],
    rows,
  };
  writeFileSync(
    "scripts/qa/arithmetic-notation-geometry-audit-result.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        ...result,
        rows: rows.length,
        failures: result.failures.length,
        failureOccurrences: result.failures.reduce((n, f) => n + f.count, 0),
      },
      null,
      2,
    ),
  );
  if (failures.size) {
    console.log(JSON.stringify(result.failures.slice(0, 12), null, 2));
    process.exitCode = 1;
  }
}
void main();
