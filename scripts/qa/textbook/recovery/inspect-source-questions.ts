/** Exact stored final DOM versus native original source question CSS; never rerenders a book. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

async function main() {
  const [directory, nativeDirectory, output, scope = "whole"] =
    process.argv.slice(2);
  assert(directory && nativeDirectory && output);
  const focused = scope === "focused";
  const focusedSelection = scope.startsWith("focused:");
  const pages = focused
    ? [14, 17, 23]
    : focusedSelection
      ? scope.slice("focused:".length).split(",").map(Number)
      : scope === "whole"
        ? [14, 15, 16, 17, 23, 24, 25]
        : scope.split(",").map(Number);
  assert(
    pages.length > 0 &&
      pages.every(
        (value) => Number.isInteger(value) && value >= 8 && value <= 43,
      ),
  );
  const browser = await launchExportBrowser();
  const evidence = [];
  try {
    for (const sourcePage of pages) {
      for (const label of ["original", "stored-final-production"] as const) {
        const file =
          label === "original"
            ? path.join(
                nativeDirectory,
                `source-dom-r${String(sourcePage).padStart(3, "0")}.html`,
              )
            : path.join(
                directory,
                focused || focusedSelection
                  ? "focused-u01-semantic-student"
                  : "new-u01-semantic-student",
                `chunk-${focused || focusedSelection ? pages.indexOf(sourcePage) : Math.floor((sourcePage - 8) / 4)}.html`,
              );
        const html = await readFinalHtml(file);
        const page = await browser.newPage();
        try {
          await loadFinalDom(
            page,
            html,
            `${output}.r${sourcePage}.${label}.resources.json`,
          );
          await page.evaluate("globalThis.__name = (fn) => fn");
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(
              Array.from(document.images).map((image) => image.decode()),
            );
          });
          const result = await page.evaluate(
            ({ sourcePage, label }) => {
              const selectors =
                label === "original"
                  ? [
                      ".content",
                      ".content > *",
                      ".page-head",
                      ".progress",
                      ".q",
                      ".qhead",
                      ".qid",
                      ".prompt",
                      ".work",
                      ".work > span",
                      ".question-grid",
                      ".drill-grid",
                      ".checkbar",
                      ".daily-banner",
                      ".return-strip",
                      ".paired-cols",
                      ".paired-cols > .worked",
                      ".worked-explanation",
                      ".worked-answer",
                      ".solution",
                      ".solution > b",
                      ".solution p",
                      ".answer",
                      ".paired-worked",
                      ".twins",
                      ".guide",
                      ".oral-task",
                      ".follow-question",
                      ".section-label",
                      ".recall-grid",
                      ".recall-row",
                      ".recall-area",
                      ".recall-rules",
                      ".recall-rules > span",
                      ".note",
                      ".two",
                      ".drill-labels",
                      ".mindmap",
                      ".edge-tab",
                      "table",
                      "tr",
                      "td",
                      "img",
                    ]
                  : [
                      ".tb-reference-content",
                      ".tb-reference-content > [data-block-id]",
                      ".tb-source-fragments > *",
                      ".tb-stage-head",
                      ".tb-progress",
                      ".tb-source-problem",
                      ".tb-problem-head",
                      ".tb-problem-head > strong",
                      ".tb-problem-question > .tb-prose",
                      ".tb-work-area:not([data-empty-work])",
                      ".checkbar",
                      ".tb-source-problem .qid > span",
                      ".tb-source-fragments .daily-banner",
                      ".tb-source-fragments .return-strip",
                      ".tb-problem-grid",
                      ".tb-recall-checkbar",
                      ".tb-recall-phases",
                      ".tb-recall-row",
                      ".paired-cols",
                      ".tb-paired-worked",
                      ".tb-source-solution",
                      ".tb-source-answer",
                      ".tb-worked",
                      ".tb-worked > h4",
                      ".tb-worked p",
                      ".tb-worked-answer",
                      ".tb-problem-row",
                      ".paired-worked",
                      ".twins",
                      ".guide",
                      ".oral-task",
                      ".follow-question",
                      ".work",
                      ".work > span",
                      ".section-label",
                      ".recall-grid",
                      ".recall-row",
                      ".recall-area",
                      ".recall-rules",
                      ".recall-rules > span",
                      ".note",
                      ".two",
                      ".drill-labels",
                      ".mindmap",
                      ".tb-stage-tab",
                      ".edge-tab",
                      "table",
                      "tr",
                      "td",
                      "img",
                    ];
              const properties = [
                "display",
                "font-family",
                "font-size",
                "font-weight",
                "line-height",
                "letter-spacing",
                "width",
                "height",
                "min-height",
                "max-height",
                "position",
                "top",
                "left",
                "align-items",
                "box-sizing",
                "overflow",
                "padding-top",
                "padding-bottom",
                "padding-left",
                "padding-right",
                "margin-top",
                "margin-bottom",
                "border-top-width",
                "border-bottom-width",
                "gap",
                "row-gap",
                "column-gap",
                "grid-template-columns",
              ];
              return Array.from(
                document.querySelectorAll<HTMLElement>(
                  label === "original"
                    ? ".sheet"
                    : `.tb-paper[data-section-key='reference-p${String(sourcePage).padStart(3, "0")}']`,
                ),
              ).map((paper) => {
                const pr = paper.getBoundingClientRect();
                return {
                  physicalPageIndex:
                    paper.dataset.page ?? paper.dataset.textbookPage,
                  anchors: selectors.flatMap((selector) =>
                    Array.from(
                      paper.querySelectorAll<HTMLElement>(selector),
                    ).map((element, ordinal) => {
                      const rect = element.getBoundingClientRect(),
                        css = getComputedStyle(element);
                      return {
                        selector,
                        ordinal,
                        className: element.className,
                        text: element.textContent?.trim(),
                        directChildCount: element.children.length,
                        declaredLines: element.dataset.lines,
                        writingLineCount: element.matches(".work")
                          ? element.querySelectorAll(":scope > span").length
                          : element.matches(".tb-work-area")
                            ? element.querySelectorAll(".tb-work-line").length
                            : undefined,
                        questionId: element
                          .closest("[data-qid]")
                          ?.getAttribute("data-qid"),
                        blockId: element
                          .closest("[data-block-id]")
                          ?.getAttribute("data-block-id"),
                        boxMm: [
                          rect.x - pr.x,
                          rect.y - pr.y,
                          rect.right - pr.x,
                          rect.bottom - pr.y,
                        ].map((value) => (value * 25.4) / 96),
                        heightMm: (rect.height * 25.4) / 96,
                        css: Object.fromEntries(
                          properties.map((property) => [
                            property,
                            css.getPropertyValue(property),
                          ]),
                        ),
                      };
                    }),
                  ),
                };
              });
            },
            { sourcePage, label },
          );
          evidence.push({
            sourcePage,
            label,
            file,
            htmlSha256: createHash("sha256").update(html).digest("hex"),
            pages: result,
          });
        } finally {
          await page.close();
        }
      }
    }
    await writeFile(output, JSON.stringify(evidence, null, 2));
    console.info(
      JSON.stringify({
        output,
        sourcePages: pages,
        observations: evidence.length,
      }),
    );
  } finally {
    await browser.close().catch(async () => {
      browser.process()?.kill();
      await browser.disconnect();
    });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
