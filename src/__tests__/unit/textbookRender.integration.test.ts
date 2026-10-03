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
  renderTextbookOfflineHtml,
} from "@/lib/textbook/render/server";
import { verifyPdfQrPixels } from "@/lib/textbook/render/qrVerify.server";
import { exchangeFromInertHtml } from "@/lib/textbook/archive/package.server";
import { sha256, contentHash, snapshotHash } from "@/lib/textbook/hash.server";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
describe.skipIf(!run)(
  "real local Chromium / pdfjs / jsQR textbook artifacts",
  () => {
    it("loads fixed figures and fails corrupt images or mathematical width overflow", async () => {
      const browser = await launchExportBrowser();
      try {
        const exchange = textbookFixture(1, 1),
          s = exchange.snapshots[0];
        let bytes = new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><path d="M10 70 L60 10 L110 70 Z" fill="none" stroke="black"/><text x="55" y="78" font-size="10">6</text></svg>',
        );
        exchange.assets.push({
          assetId: "triangle",
          packagePath: "assets/triangle.svg",
          sha256: sha256(bytes),
          mimeType: "image/svg+xml",
          widthPx: 120,
          heightPx: 80,
        });
        s.payload.figures = [
          {
            assetId: "triangle",
            sha256: sha256(bytes),
            choiceIndex: 0,
            sourceWidthMm: 40,
            altText: "fixed triangle",
          },
        ];
        const rehash = () => {
          s.contentHash = contentHash(s.payload);
          s.snapshotHash = snapshotHash(s);
        };
        rehash();
        const input = {
          exchange,
          officialOrigin: SYNTHETIC_ORIGIN,
          readAsset: async () => bytes,
          sectionIndices: [0],
          firstPhysicalPageIndex: 1,
          variant: "student" as const,
          browser,
        };
        const result = await renderTextbookChunk(input);
        expect(result.qrChecks).toHaveLength(1);
        expect(result.html).toContain("fixed triangle");
        s.payload.content = `$\\underbrace{${"x+".repeat(200)}x}_{1}$`;
        rehash();
        await expect(renderTextbookChunk(input)).rejects.toThrow(
          /width overflow/,
        );
        s.payload.content = "그림을 보시오.";
        bytes = new Uint8Array(33);
        bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
        exchange.assets[0] = {
          ...exchange.assets[0],
          packagePath: "assets/broken.png",
          mimeType: "image/png",
          sha256: sha256(bytes),
        };
        s.payload.figures[0].sha256 = sha256(bytes);
        rehash();
        await expect(renderTextbookChunk(input)).rejects.toThrow(
          /decode|encoding|image/i,
        );
      } finally {
        await browser.close();
      }
    }, 180_000);
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
          frozenPages: student.pages,
        });
        expect(answers.pageMap).toEqual(student.pageMap);
        expect(answers.html).toContain("비공개 정답");
        expect(answers.qrChecks).toHaveLength(4);
        await expect(
          verifyPdfQrPixels(
            browser,
            merged.pdf,
            merged.qrPlacements.map((p, i) =>
              i ? p : { ...p, url: `${p.url}_wrong` },
            ),
            merged.pageCount,
          ),
        ).rejects.toThrow(/PDF QR mismatch/);
        await expect(
          mergeTextbookPdfs([student, student], undefined, browser),
        ).rejects.toThrow(/physical order/);
        const teacherHtml = await renderTextbookOfflineHtml({
          ...input,
          pages: answers.pages,
          variant: "answers",
          includeTeacherArchiveData: true,
        });
        expect(exchangeFromInertHtml(teacherHtml)).toEqual(exchange);
        await expect(
          renderTextbookOfflineHtml({
            ...input,
            pages: student.pages,
            variant: "student",
            includeTeacherArchiveData: true,
          }),
        ).rejects.toThrow(/Student HTML/);
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
