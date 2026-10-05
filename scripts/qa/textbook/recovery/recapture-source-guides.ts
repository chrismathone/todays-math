/** Focused read-only extraction from saved answer HTML; never a fresh render or whole-book claim. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import { captureDomWitness } from "./dom-witness";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

async function main() {
  const [directory, selectedCsv, output] = process.argv.slice(2);
  assert(directory && selectedCsv && output);
  const outputExists = await access(output).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      assert.equal(error.code, "ENOENT");
      return false;
    },
  );
  assert(!outputExists, "Focused extraction must preserve existing evidence");
  const selected = new Set(selectedCsv.split(",").map(Number));
  assert([...selected].every((n) => Number.isInteger(n) && n > 0));
  const folder = path.resolve(directory);
  const prefix = "new-u01-semantic-answers";
  const prior = JSON.parse(
    await readFile(path.join(folder, `${prefix}-witness.json`), "utf8"),
  );
  const pdfSha256 = createHash("sha256")
    .update(await readFile(path.join(folder, `${prefix}.pdf`)))
    .digest("hex");
  assert.equal(prior.pdfSha256, pdfSha256);
  const physical = new Map<number, number>(
    prior.pages
      .filter((p: { pdfPageIndex: number }) => selected.has(p.pdfPageIndex))
      .map((p: { physicalPageIndex: number; pdfPageIndex: number }) => [
        p.physicalPageIndex,
        p.pdfPageIndex,
      ]),
  );
  assert.equal(physical.size, selected.size);
  const browser = await launchExportBrowser();
  const pages = [];
  try {
    for (const filename of (await readdir(path.join(folder, prefix)))
      .filter((f) => /^chunk-\d+-placements\.json$/.test(f))
      .sort()) {
      const saved = JSON.parse(
        await readFile(path.join(folder, prefix, filename), "utf8"),
      ) as { pages: TextbookPage[] };
      if (!saved.pages.some((p) => physical.has(p.physicalPageIndex))) continue;
      const page = await browser.newPage();
      try {
        await loadFinalDom(
          page,
          await readFinalHtml(
            path.join(
              folder,
              prefix,
              filename.replace("-placements.json", ".html"),
            ),
          ),
          path.join(path.dirname(output), `${filename}-guide-resources.json`),
        );
        pages.push(
          ...(await captureDomWitness(page, prior.projectedModel, saved.pages))
            .filter((p) => physical.has(p.physicalPageIndex))
            .map((p) => ({
              ...p,
              pdfPageIndex: physical.get(p.physicalPageIndex)!,
            })),
        );
      } finally {
        await page.close();
      }
    }
    assert.equal(pages.length, selected.size);
    await writeFile(
      output,
      JSON.stringify(
        {
          variant: "answers",
          pdfSha256,
          pages: pages.sort((a, b) => a.pdfPageIndex - b.pdfPageIndex),
          extraction:
            "Focused actual saved-HTML DOM, PDF hash and placements; no whole-source coverage declaration.",
        },
        null,
        2,
      ),
      { flag: "wx", encoding: "utf8" },
    );
    console.info(JSON.stringify({ pages: pages.length, pdfSha256, output }));
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
