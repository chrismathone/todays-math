/** Exact stored final DOM versus native original source question CSS; never rerenders a book. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

async function main() {
  const [directory, nativeDirectory, output, scope = "whole"] =
    process.argv.slice(2);
  assert(directory && nativeDirectory && output);
  const focused = scope === "focused";
  const focusedSelection = scope.startsWith("focused:");
  const focusedExports =
    focused || focusedSelection
      ? (JSON.parse(
          await readFile(
            path.join(directory, "focused-u01-semantic-student-export.json"),
            "utf8",
          ),
        ).exports as { sourceSectionKeys: string[] }[])
      : undefined;
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
                `chunk-${
                  focusedExports
                    ? (() => {
                        const index = focusedExports.findIndex((exported) =>
                          exported.sourceSectionKeys.includes(
                            `reference-p${String(sourcePage).padStart(3, "0")}`,
                          ),
                        );
                        assert(index >= 0);
                        return index;
                      })()
                    : Math.floor((sourcePage - 8) / 4)
                }.html`,
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
                      ".repair-example",
                      ".repair-example *",
                      ".page-head",
                      ".progress",
                      ".q",
                      ".qhead",
                      ".qhead > *",
                      ".qid",
                      ".prompt",
                      ".prompt > *",
                      ".prompt .math",
                      ".prompt .katex",
                      ".prompt .katex-html",
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
                      ".solution .math",
                      ".solution .katex",
                      ".solution .katex-html",
                      ".answer",
                      ".paired-worked",
                      ".twins",
                      ".guide",
                      ".oral-task",
                      ".follow-question",
                      ".section-label",
                      ".section-label > i",
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
                      ".repair-example",
                      ".repair-example *",
                      ".tb-stage-head",
                      ".tb-progress",
                      ".tb-source-problem",
                      ".tb-problem-head",
                      ".tb-problem-head > *",
                      ".tb-problem-head > strong",
                      ".tb-problem-question > .tb-prose",
                      ".tb-problem-question > .tb-prose > *",
                      ".tb-problem-question .katex",
                      ".tb-problem-question .katex-html",
                      ".tb-work-area:not([data-empty-work])",
                      ".tb-work-line",
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
                      ".tb-source-solution .katex",
                      ".tb-source-solution .katex-html",
                      ".tb-source-answer",
                      ".tb-worked",
                      ".tb-worked > h4",
                      ".tb-worked p",
                      ".tb-worked .katex",
                      ".tb-worked .katex-html",
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
                      ".section-label > em",
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
              selectors.push(
                ".mini-concepts",
                ".mini-concepts > *",
                ".mini-concepts *",
                ".chapter-right-body",
                ".chapter-route-head",
                ".chapter-route-head > *",
                ".chapter-goals",
                ".chapter-goals > *",
                ".chapter-roadmap",
                ".chapter-topics",
                ".chapter-topics > div",
                ".chapter-topics > div > *",
                ".chapter-connections",
                ".connection-columns",
                ".connection-columns > div",
                ".connection-columns > div > *",
                ".chapter-readiness",
                ".chapter-readiness > *",
                ".chapter-date",
                ".running",
                ".running > *",
                ".tb-running",
                ".tb-header",
                ".tb-header > *",
                ".foot",
                ".foot > *",
                ".foot .name",
                ".foot .name > i",
                ".tb-footer",
                ".tb-footer > *",
                ".tb-footer-brand",
                ".tb-footer-brand > i",
              );
              const properties = [
                "display",
                "font-family",
                "font-size",
                "font-weight",
                "font-style",
                "color",
                "background-color",
                "border-radius",
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
                "justify-content",
                "flex-direction",
                "order",
                "transform",
                "text-align",
                "box-sizing",
                "overflow",
                "overflow-wrap",
                "word-break",
                "white-space",
                "padding-top",
                "padding-bottom",
                "padding-left",
                "padding-right",
                "margin-top",
                "margin-bottom",
                "margin-left",
                "margin-right",
                "border-top-width",
                "border-bottom-width",
                "border-top-color",
                "border-bottom-color",
                "border-top-style",
                "border-bottom-style",
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
                        tag: element.tagName,
                        parentTag: element.parentElement?.tagName,
                        parentClassName: element.parentElement?.className,
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
                        pseudoCss: element.matches(".foot,.tb-footer")
                          ? Object.fromEntries(
                              ["::before", "::after"].map((pseudo) => {
                                const computed = getComputedStyle(
                                  element,
                                  pseudo,
                                );
                                return [
                                  pseudo,
                                  Object.fromEntries(
                                    ["content", ...properties].map(
                                      (property) => [
                                        property,
                                        computed.getPropertyValue(property),
                                      ],
                                    ),
                                  ),
                                ];
                              }),
                            )
                          : undefined,
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
