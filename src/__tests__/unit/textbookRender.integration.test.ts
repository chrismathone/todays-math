// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import {
  renderTextbookChunk,
  mergeTextbookPdfs,
  createTextbookSpreadPdf,
  planTextbookChunks,
} from "@/lib/textbook/render/server";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
describe.skipIf(!run)(
  "real local Chromium / pdfjs / jsQR textbook artifacts",
  () => {
    it("renders student, answers, spreads and verifies all final QR pixels", async () => {
      const browser = await launchExportBrowser();
      try {
        const exchange = textbookFixture();
        const input = {
          exchange,
          officialOrigin: SYNTHETIC_ORIGIN,
          readAsset: async () => {
            throw new Error("No assets expected");
          },
          sectionIndices: [0],
          firstPhysicalPageIndex: 1,
          browser,
        };
        const student = await renderTextbookChunk({
          ...input,
          variant: "student",
        });
        expect(student.pages).toHaveLength(3);
        expect(student.qrChecks).toHaveLength(4);
        expect(student.html).not.toContain("비공개 정답");
        expect(student.html).not.toContain("비공개 해설");
        const merged = await mergeTextbookPdfs([student], undefined, browser);
        const spread = await createTextbookSpreadPdf(merged, 1, browser);
        expect(spread.pageCount).toBe(2);
        expect(spread.qrChecks).toHaveLength(4);
        exchange.pageMap = student.pageMap;
        const answers = await renderTextbookChunk({
          ...input,
          variant: "answers",
        });
        expect(answers.html).toContain("비공개 정답");
        expect(answers.qrChecks).toHaveLength(4);
        await mkdir("output/pdf", { recursive: true });
        await Promise.all([
          writeFile("output/pdf/textbook-synthetic-student.pdf", merged.pdf),
          writeFile("output/pdf/textbook-synthetic-spread.pdf", spread.pdf),
          writeFile("output/pdf/textbook-synthetic-answers.pdf", answers.pdf),
          writeFile("output/pdf/textbook-synthetic-offline.html", student.html),
        ]);
        const offline = await browser.newPage();
        await offline.setJavaScriptEnabled(false);
        await offline.setRequestInterception(true);
        const network: string[] = [];
        offline.on("request", (r) => {
          if (r.url().startsWith("data:")) void r.continue();
          else {
            network.push(r.url());
            void r.abort();
          }
        });
        await offline.setContent(student.html, { waitUntil: "load" });
        await offline.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map((i) => i.decode()));
        });
        expect(network).toEqual([]);
        await offline.setViewport({
          width: 1100,
          height: 1300,
          deviceScaleFactor: 1,
        });
        await offline.screenshot({
          path: "output/pdf/textbook-synthetic-student.png",
          fullPage: true,
        });
        await offline.close();
        await writeFile(
          "output/pdf/textbook-smoke.json",
          JSON.stringify(
            {
              synthetic: true,
              originalV15Present: false,
              student: student.metrics,
              studentPages: student.pages.length,
              studentQr: student.qrChecks.length,
              finalMergedQr: merged.qrChecks.length,
              spreadQr: spread.qrChecks.length,
              answersQr: answers.qrChecks.length,
              offlineExternalRequests: network,
              physicalScan: "pending",
            },
            null,
            2,
          ),
        );
      } finally {
        await browser.close();
      }
    }, 240_000);

    it.skipIf(process.env.TEXTBOOK_LARGE_PDF_TEST !== "1")(
      "renders and rechecks every QR in a 203 page synthetic manuscript",
      async () => {
        const browser = await launchExportBrowser(),
          started = performance.now();
        try {
          const exchange = textbookFixture(101),
            chunks = [],
            peak = { rss: process.memoryUsage().rss };
          let next = 1;
          for (const sectionIndices of planTextbookChunks(exchange)) {
            const chunk = await renderTextbookChunk({
              exchange,
              officialOrigin: SYNTHETIC_ORIGIN,
              readAsset: async () => {
                throw new Error("No assets expected");
              },
              sectionIndices,
              firstPhysicalPageIndex: next,
              variant: "student",
              browser,
            });
            next = chunk.nextPhysicalPageIndex;
            chunks.push(chunk);
            peak.rss = Math.max(peak.rss, process.memoryUsage().rss);
            console.info(
              `TEXTBOOK_CHUNK ${chunks.length}: physical pages ${chunk.pages[0].physicalPageIndex}-${next - 1}, verified QR ${chunk.qrChecks.length}`,
            );
          }
          const merged = await mergeTextbookPdfs(chunks, undefined, browser);
          expect(merged.pageCount).toBe(203);
          expect(merged.qrChecks).toHaveLength(404);
          expect(new Set(merged.qrChecks.map((q) => q.qrTargetId)).size).toBe(
            404,
          );
          await mkdir("output/pdf", { recursive: true });
          await writeFile(
            "output/pdf/textbook-synthetic-203-pages.pdf",
            merged.pdf,
          );
          await writeFile(
            "output/pdf/textbook-large.json",
            JSON.stringify(
              {
                synthetic: true,
                originalV15Present: false,
                pageCount: merged.pageCount,
                chunks: chunks.length,
                qrCount: merged.qrChecks.length,
                allQrMatch: true,
                elapsedMs: performance.now() - started,
                peakNodeRssBytes: peak.rss,
                pdfBytes: merged.pdf.length,
                artifactHash: merged.artifactHash,
                chunkMetrics: chunks.map((c) => c.metrics),
                physicalScan: "pending",
              },
              null,
              2,
            ),
          );
        } finally {
          await browser.close();
        }
      },
      900_000,
    );
  },
);
