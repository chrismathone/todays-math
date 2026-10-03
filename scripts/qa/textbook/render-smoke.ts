/** Run with: node --conditions=react-server --import tsx scripts/qa/textbook/render-smoke.ts [--large] */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { launchExportBrowser } from "../../../src/lib/export/pdfServer";
import {
  renderTextbookChunk,
  mergeTextbookPdfs,
  createTextbookSpreadPdf,
  planTextbookChunks,
} from "../../../src/lib/textbook/render/server";
import {
  textbookFixture,
  SYNTHETIC_ORIGIN,
} from "../../../src/__tests__/helpers/textbookFixture";

async function main() {
  const browser = await launchExportBrowser(),
    started = performance.now();
  console.info("Trusted local export browser launched");
  try {
    const large = process.argv.includes("--large"),
      exchange = textbookFixture(large ? 101 : 1),
      chunks = [];
    let next = 1,
      peakNodeRssBytes = process.memoryUsage().rss;
    for (const sectionIndices of planTextbookChunks(exchange)) {
      const chunk = await renderTextbookChunk({
        exchange,
        officialOrigin: SYNTHETIC_ORIGIN,
        readAsset: async () => {
          throw new Error("No fixture assets expected");
        },
        sectionIndices,
        firstPhysicalPageIndex: next,
        variant: "student",
        browser,
        onProgress: (phase) => console.info(`Render ${phase}`),
      });
      next = chunk.nextPhysicalPageIndex;
      chunks.push(chunk);
      peakNodeRssBytes = Math.max(peakNodeRssBytes, process.memoryUsage().rss);
      assert(!chunk.html.includes("비공개 정답"));
      assert(!chunk.html.includes("비공개 해설"));
      console.info(
        `Chunk ${chunks.length}: pages ${chunk.pages[0].physicalPageIndex}-${next - 1}; verified ${chunk.qrChecks.length} QR pixels`,
      );
    }
    const merged = await mergeTextbookPdfs(chunks, undefined, browser);
    assert.equal(merged.pageCount, large ? 203 : 3);
    assert.equal(merged.qrChecks.length, large ? 404 : 4);
    await mkdir("output/pdf", { recursive: true });
    const prefix = large
      ? "textbook-synthetic-203-pages"
      : "textbook-synthetic-student";
    await writeFile(`output/pdf/${prefix}.pdf`, merged.pdf);
    const additional: Record<string, unknown> = {};
    if (!large) {
      const spread = await createTextbookSpreadPdf(merged, 1, browser);
      assert.equal(spread.qrChecks.length, 4);
      assert.equal(spread.pageCount, 2);
      exchange.pageMap = chunks.flatMap((c) => c.pageMap);
      const answers = await renderTextbookChunk({
        exchange,
        officialOrigin: SYNTHETIC_ORIGIN,
        readAsset: async () => {
          throw new Error("No assets");
        },
        sectionIndices: [0],
        firstPhysicalPageIndex: 1,
        variant: "answers",
        browser,
      });
      assert(answers.html.includes("비공개 정답"));
      assert.equal(answers.qrChecks.length, 4);
      await Promise.all([
        writeFile("output/pdf/textbook-synthetic-spread.pdf", spread.pdf),
        writeFile("output/pdf/textbook-synthetic-answers.pdf", answers.pdf),
        writeFile("output/pdf/textbook-synthetic-offline.html", chunks[0].html),
      ]);
      const offline = await browser.newPage(),
        network: string[] = [];
      await offline.setJavaScriptEnabled(false);
      await offline.setRequestInterception(true);
      offline.on("request", (r) => {
        if (r.url().startsWith("data:")) void r.continue();
        else {
          network.push(r.url());
          void r.abort();
        }
      });
      await offline.setViewport({
        width: 1100,
        height: 1300,
        deviceScaleFactor: 1,
      });
      await offline.setContent(chunks[0].html, { waitUntil: "load" });
      await offline.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map((i) => i.decode()));
      });
      assert.deepEqual(network, []);
      await offline.screenshot({
        path: "output/pdf/textbook-synthetic-student.png",
        fullPage: true,
      });
      await offline.close();
      Object.assign(additional, {
        spreadQr: spread.qrChecks.length,
        answersQr: answers.qrChecks.length,
        offlineExternalRequests: network,
      });
    }
    const report = {
      synthetic: true,
      originalV15Present: false,
      pages: merged.pageCount,
      chunks: chunks.length,
      qrCount: merged.qrChecks.length,
      allQrMatch: true,
      elapsedMs: performance.now() - started,
      peakNodeRssBytes,
      pdfBytes: merged.pdf.length,
      artifactHash: merged.artifactHash,
      chunkMetrics: chunks.map((c) => c.metrics),
      ...additional,
      physicalScan: "pending",
    };
    await writeFile(
      `output/pdf/${prefix}.json`,
      JSON.stringify(report, null, 2),
    );
    console.info(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
