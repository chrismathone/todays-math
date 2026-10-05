/** Exact old/new production natural block CSS and original direct children for R14. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { textbookExchangeSchema } from "../../../../src/contracts/textbookExchange.contract";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import { measurementHtml } from "../../../../src/lib/textbook/render/html";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

async function main() {
  const [originalHtml, oldDirectory, newDirectory, output] =
    process.argv.slice(2);
  assert(originalHtml && oldDirectory && newDirectory && output);
  const baseHtml = await readFinalHtml(
    path.join(oldDirectory, "new-u01-semantic-student/chunk-1.html"),
  );
  const browser = await launchExportBrowser();
  const results = [];
  try {
    for (const [label, directory] of [
      ["old-production", oldDirectory],
      ["native-grid-order-production", newDirectory],
      ["original", ""],
    ]) {
      let html: string;
      if (label === "original") html = await readFinalHtml(originalHtml);
      else {
        const exchange = textbookExchangeSchema.parse(
          JSON.parse(
            await readFile(
              path.join(directory, "exchange-semantic.json"),
              "utf8",
            ),
          ),
        );
        const whole = createTextbookRenderModel(exchange, "student");
        const model = {
          ...whole,
          sections: whole.sections.filter(
            (section) => section.sectionKey === "reference-p014",
          ),
        };
        assert.equal(model.sections.length, 1);
        const measuredHtml = measurementHtml(model, {
          assetUrl: () => {
            throw new Error("Unexpected R14 measurement asset");
          },
          qrDataUrl: () => {
            throw new Error("Unexpected R14 measurement QR");
          },
        });
        html = baseHtml.replace(
          /<body[^>]*>[\s\S]*<\/body>/,
          `<body class="tb-recovery">${measuredHtml}</body>`,
        );
      }
      const page = await browser.newPage();
      try {
        await loadFinalDom(page, html, `${output}.${label}.resources.json`);
        await page.evaluate("globalThis.__name = (fn) => fn");
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
        });
        const result = await page.evaluate((label) => {
          const props = [
            "display",
            "position",
            "width",
            "height",
            "min-height",
            "max-height",
            "padding-top",
            "padding-bottom",
            "margin-top",
            "margin-bottom",
            "gap",
            "row-gap",
            "grid-template-columns",
            "font-family",
            "font-size",
            "line-height",
            "border-top-width",
            "border-bottom-width",
          ];
          const describe = (element: Element) => {
            const box = element.getBoundingClientRect();
            const css = getComputedStyle(element);
            return {
              tag: element.tagName,
              className: element.className,
              blockId: (element as HTMLElement).dataset.measureId,
              heightMm: (box.height * 25.4) / 96,
              boxMm: [box.x, box.y, box.right, box.bottom].map(
                (value) => (value * 25.4) / 96,
              ),
              css: Object.fromEntries(
                props.map((property) => [
                  property,
                  css.getPropertyValue(property),
                ]),
              ),
              writing: Array.from(
                element.querySelectorAll(".tb-work-area,.work"),
              ).map((work) => ({
                cssHeight: getComputedStyle(work).height,
                minHeight: getComputedStyle(work).minHeight,
                vectorLines: work.querySelectorAll(".tb-work-line,.rule")
                  .length,
              })),
            };
          };
          const roots = Array.from(
            document.querySelectorAll(
              label === "original" ? ".content" : "[data-measure-id]",
            ),
          );
          return {
            label,
            blocks: roots.map((element) => ({
              ...describe(element),
              children: Array.from(element.children).map((child) => ({
                ...describe(child),
                children: Array.from(child.children).map(describe),
              })),
            })),
          };
        }, label);
        results.push(result);
      } finally {
        await page.close();
      }
    }
    await writeFile(output, JSON.stringify(results, null, 2));
    console.info(
      JSON.stringify(
        results.map((result) => ({
          label: result.label,
          blocks: result.blocks.map((block) => ({
            blockId: block.blockId,
            heightMm: block.heightMm,
          })),
        })),
      ),
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
