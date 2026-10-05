/** Preserve focused PDFs and prior witnesses while correcting extraction selectors. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import {
  captureDomWitness,
  computedCoverage,
  expectedRenderedRows,
  normalizeRowPages,
} from "./dom-witness";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
async function main() {
  const [directory, sourceGeometryFile, label = "final"] =
    process.argv.slice(2);
  assert(directory);
  assert(/^[a-z0-9-]+$/.test(label));
  const folder = path.join(directory, "focused-u01-semantic-student");
  const recorded = JSON.parse(
    await readFile(
      path.join(directory, "focused-u01-semantic-student-export.json"),
      "utf8",
    ),
  );
  assert.equal(recorded.scope, "focused-diagnostic-only");
  assert(recorded.exports.length > 0);
  const sourceBytes = await readFile(
    sourceGeometryFile ?? path.join(directory, "source-computed-geometry.json"),
  );
  const source = JSON.parse(sourceBytes.toString("utf8"));
  const browser = await launchExportBrowser();
  try {
    for (const [index, exported] of recorded.exports.entries()) {
      const prefix = path.join(folder, `chunk-${index}`);
      const prior = JSON.parse(
        await readFile(`${prefix}-witness.json`, "utf8"),
      );
      assert.equal(sha(await readFile(`${prefix}.pdf`)), prior.pdfSha256);
      assert.equal(prior.pdfSha256, exported.pdfSha256);
      assert.equal(
        sha(await readFile(path.join(directory, "exchange-semantic.json"))),
        prior.fixtureSha256,
      );
      const placements = JSON.parse(
        await readFile(`${prefix}-placements.json`, "utf8"),
      ).pages;
      const page = await browser.newPage();
      try {
        await loadFinalDom(
          page,
          await readFinalHtml(`${prefix}.html`),
          `${prefix}-${label}-recapture-resources.json`,
        );
        const pages = await captureDomWitness(
          page,
          prior.projectedModel,
          placements,
          source,
        );
        normalizeRowPages(pages);
        const expectedRows = expectedRenderedRows(prior.projectedModel);
        const witness = {
          ...prior,
          sourceComparisonRequired: true,
          pages: pages.map((page, i) => ({ ...page, pdfPageIndex: i + 1 })),
          sourceGeometrySha256: sha(sourceBytes),
          expectedRows,
          coverage: computedCoverage(pages, placements, expectedRows, true),
        };
        await writeFile(
          `${prefix}-${label}-witness.json`,
          JSON.stringify(witness, null, 2),
        );
        console.info(
          JSON.stringify({
            index,
            pdfSha256: prior.pdfSha256,
            coverage: witness.coverage,
          }),
        );
      } finally {
        await page.close();
      }
    }
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
