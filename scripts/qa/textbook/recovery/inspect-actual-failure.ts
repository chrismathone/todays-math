/** Read-only official natural measurement of stored actual-bank failure sections. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { textbookExchangeSchema } from "../../../../src/contracts/textbookExchange.contract";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import { measurementHtml } from "../../../../src/lib/textbook/render/html";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

const sha = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function main() {
  const [directory, cssHtmlPath, sectionKey, output] = process.argv.slice(2);
  assert(directory && cssHtmlPath && sectionKey && output);
  const exchangeBytes = await readFile(
    path.join(directory, "exchange.private.json"),
  );
  const exchange = textbookExchangeSchema.parse(
    JSON.parse(exchangeBytes.toString("utf8")),
  );
  const cssHtml = await readFinalHtml(cssHtmlPath);
  const assetUrls = new Map<string, string>();
  for (const asset of exchange.assets) {
    const bytes = await readFile(
      path.join(directory, "assets", path.basename(asset.packagePath)),
    );
    assert.equal(sha(bytes), asset.sha256);
    assetUrls.set(
      asset.assetId,
      `data:${asset.mimeType};base64,${bytes.toString("base64")}`,
    );
  }
  const browser = await launchExportBrowser();
  const results = [];
  try {
    for (const variant of ["student", "answers"] as const) {
      const whole = createTextbookRenderModel(exchange, variant);
      const model = {
        ...whole,
        sections: whole.sections.filter(
          (section) => section.sectionKey === sectionKey,
        ),
      };
      assert.equal(model.sections.length, 1);
      const measured = measurementHtml(model, {
        assetUrl: (id) => {
          const url = assetUrls.get(id);
          assert(url, `Missing actual asset ${id}`);
          return url;
        },
        qrDataUrl: () =>
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
      });
      const html = cssHtml.replace(
        /<body[^>]*>[\s\S]*<\/body>/,
        `<body class="tb-recovery">${measured}</body>`,
      );
      const page = await browser.newPage();
      try {
        await loadFinalDom(page, html, `${output}.${variant}.resources.json`);
        await page.evaluate("globalThis.__name = (fn) => fn");
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
        });
        const blocks = await page.evaluate(() => {
          const describe = (element: Element) => {
            const box = element.getBoundingClientRect(),
              css = getComputedStyle(element);
            const fields = [
              "font-size",
              "line-height",
              "width",
              "height",
              "min-height",
              "max-height",
              "padding-top",
              "padding-bottom",
              "margin-top",
              "margin-bottom",
              "display",
              "gap",
              "grid-template-columns",
            ];
            return {
              tag: element.tagName,
              className: element.getAttribute("class"),
              blockId: element.getAttribute("data-measure-id"),
              heightMm: (box.height * 25.4) / 96,
              boxMm: [box.x, box.y, box.right, box.bottom].map(
                (value) => (value * 25.4) / 96,
              ),
              textCharacters: element.textContent?.length ?? 0,
              css: Object.fromEntries(
                fields.map((field) => [field, css.getPropertyValue(field)]),
              ),
            };
          };
          return Array.from(document.querySelectorAll("[data-measure-id]")).map(
            (element) => ({
              ...describe(element),
              children: Array.from(element.children).map((child) => ({
                ...describe(child),
                descendants: Array.from(
                  child.querySelectorAll(
                    ".tb-problem,.tb-prompt,.tb-answer,.tb-solution,.tb-work-area,img,.tb-math",
                  ),
                ).map(describe),
              })),
            }),
          );
        });
        results.push({
          variant,
          modelBlocks: model.sections[0].blocks.map((block) => ({
            id: block.id,
            kind: block.kind,
          })),
          blocks,
        });
      } finally {
        await page.close();
      }
    }
    const evidence = {
      rendererGitCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      historicalCssHtmlPath: cssHtmlPath,
      historicalCssHtmlSha256: sha(cssHtml),
      exchangeSha256: sha(exchangeBytes),
      sectionKey,
      method:
        "Current official model/measurementHtml, stored failed-run CSS, SHA-verified actual bank assets; no pagination proof or substituted bank content. QR image placeholder affects only measurement resource and is not an export.",
      results,
    };
    await writeFile(output, JSON.stringify(evidence, null, 2));
    console.info(
      JSON.stringify(
        results.map((result) => ({
          variant: result.variant,
          blocks: result.blocks.map((block) => ({
            id: block.blockId,
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
