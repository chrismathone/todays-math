/** Actual product renderer contracts in a pure Node run. Chromium A4 inspection belongs to root. */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { ProblemBody } from "@/components/print/templates/ProblemBody";
import { PrintAnswerKeyPage } from "@/components/print/PrintAnswerKeyPage";
import { A4Page } from "@/components/print/A4Page";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "@/lib/engine/nativeDescriptive20261018";
import type { TestPrintProblem } from "@/components/print/types";

const defs = nativeDescriptiveDefinitions();
// The installed jsdom has no declaration package; keep this test's DOM boundary explicitly typed.
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => {
    window: { document: Document; close(): void };
  };
};
function assertClean(html: string) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  expect(
    doc.querySelectorAll(".katex-error,merror,[mathcolor='red']").length,
  ).toBe(0);
  expect(html).not.toMatch(/(?:color\s*:\s*(?:#cc0000|red)|mathcolor="red")/i);
  // TeX annotations are expected. Outside rendered math, no dollar delimiters or commands may leak.
  doc.querySelectorAll(".katex,math").forEach((el) => el.remove());
  expect(doc.body.textContent).not.toMatch(
    /\$|\\(?:frac|times|mathrm|circ|div|angle|triangle)/,
  );
  dom.window.close();
}

describe("native final-seed actual render paths and teacher-only criteria", () => {
  for (const d of defs)
    it(`${d.definitionId}: 3 stems on both render paths, final variants 0/1 keep all teacher data private`, () => {
      for (let variant = 0; variant < 3; variant++) {
        const p = generateNativeDescriptive(d.definitionId, 20261018, variant);
        for (const text of [p.content, p.answer, p.solution]) {
          assertClean(
            renderToStaticMarkup(<MarkdownRenderer content={text} />),
          );
          assertClean(renderMathHtml(text));
        }
        if (variant > 1) continue; // Third stem is a rendering probe, not a thirteenth candidate.
        const marker = "교사용루브릭비공개검수표식";
        const problem: TestPrintProblem = {
          id: p.externalId,
          orderIndex: variant,
          content: p.content,
          answer: p.answer,
          solution: p.solution + `\n${marker}`,
          questionType: p.questionType,
          figureSvg: null,
          figureUrls: [],
        };
        // Full candidate, including answer/solution, is deliberately passed to the student component.
        const student = renderToStaticMarkup(
          <A4Page kind="questions" pageNumber={1}>
            <ProblemBody problem={problem} />
          </A4Page>,
        );
        const teacher = renderToStaticMarkup(
          <PrintAnswerKeyPage
            allProblems={[problem]}
            pageProblems={[problem]}
            page={1}
            startingNumber={1}
            testTitle="본래 서술형 검수"
            totalPages={1}
          />,
        );
        assertClean(student);
        assertClean(teacher);
        expect(student).not.toContain(marker);
        expect(student).not.toContain("채점 기준");
        expect(student).not.toContain("허용 다른 풀이");
        expect(teacher).toContain(marker);
        expect(teacher).toContain("채점 기준");
        expect(teacher).toContain("흔한 오류");
      }
    });
});
