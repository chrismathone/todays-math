/** Inspect a page from stored production chunk HTML; never declare PDF/human acceptance. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

async function main() {
  const [htmlFile, outputPng, physicalPage = "8"] = process.argv.slice(2);
  assert(htmlFile && outputPng && /^\d+$/.test(physicalPage));
  const browser = await launchExportBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 900,
      height: 1250,
      deviceScaleFactor: 1.5,
    });
    await loadFinalDom(
      page,
      await readFinalHtml(htmlFile),
      `${outputPng}.dom-resources.json`,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) => image.decode()),
      );
    });
    const element = await page.$(`[data-textbook-page="${physicalPage}"]`);
    assert(element);
    await writeFile(outputPng, await element.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
