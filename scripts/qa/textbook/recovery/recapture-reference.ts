/** Re-extract final student DOM using original saved production placements and PDF. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import type { TextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import {
  captureDomWitness,
  computedCoverage,
  expectedRenderedRows,
  normalizeRowPages,
  type SourceGeometry,
} from "./dom-witness";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

const sha = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

async function main() {
  const [directory, sourceGeometryPath, extractionLabel = "final"] =
    process.argv.slice(2);
  assert(directory);
  assert(/^[a-z0-9-]+$/.test(extractionLabel));
  const folder = path.resolve(directory);
  const prefix = "new-u01-semantic-student";
  const prior = JSON.parse(
    await readFile(path.join(folder, `${prefix}-witness.json`), "utf8"),
  );
  const chunks = JSON.parse(
    await readFile(path.join(folder, `${prefix}-chunks.json`), "utf8"),
  ) as {
    pdfSha256: string;
    fixtureSha256: string;
    chunkSize: number;
    chunks: [number, TextbookPage[]][];
  };
  const pdfSha256 = sha(await readFile(path.join(folder, `${prefix}.pdf`)));
  assert.equal(pdfSha256, prior.pdfSha256);
  assert.equal(pdfSha256, chunks.pdfSha256);
  assert.equal(
    chunks.fixtureSha256,
    sha(await readFile(path.join(folder, "exchange-semantic.json"))),
  );
  const model = prior.projectedModel as TextbookRenderModel;
  const sourceBytes = await readFile(
    sourceGeometryPath ?? path.join(folder, "source-computed-geometry.json"),
  );
  const source: SourceGeometry = JSON.parse(sourceBytes.toString("utf8"));
  const browser = await launchExportBrowser();
  const pages: Awaited<ReturnType<typeof captureDomWitness>> = [];
  try {
    for (const [offset, placements] of chunks.chunks) {
      const index = offset / chunks.chunkSize;
      const page = await browser.newPage();
      try {
        await loadFinalDom(
          page,
          await readFinalHtml(path.join(folder, prefix, `chunk-${index}.html`)),
          path.join(
            folder,
            prefix,
            `recapture-chunk-${index}-dom-resources.json`,
          ),
        );
        pages.push(
          ...(await captureDomWitness(page, model, placements, source)),
        );
      } finally {
        await page.close();
      }
    }
    normalizeRowPages(pages);
    const placements = chunks.chunks.flatMap(([, values]) => values);
    const expectedRows = expectedRenderedRows(model);
    const coverage = computedCoverage(pages, placements, expectedRows, true);
    const output = path.join(
      folder,
      `${prefix}-${extractionLabel}-witness.json`,
    );
    await writeFile(
      output,
      JSON.stringify(
        {
          ...prior,
          sourceGeometrySha256: sha(sourceBytes),
          sourceComparisonRequired: true,
          pages: pages.map((page, index) => ({
            ...page,
            pdfPageIndex: index + 1,
          })),
          coverage,
          expectedRows,
          coverageEvidence: {
            pdfSha256,
            expectedPages: placements.length,
            observedPages: pages.length,
            expectedPlacedBlocks: placements.reduce(
              (sum, page) => sum + page.blocks.length,
              0,
            ),
            observedBlocks: pages.reduce(
              (sum, page) => sum + page.accounting.actualBlocks,
              0,
            ),
          },
          extraction:
            "Complete final DOM recaptured from original stored HTML and verified saved production placements; original PDF/witness preserved.",
        },
        null,
        2,
      ),
    );
    console.info(
      JSON.stringify({ output, pdfSha256, pages: pages.length, coverage }),
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
