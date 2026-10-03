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
import { canonicalJson } from "@/lib/textbook/canonical";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
describe.skipIf(!run)(
  "real local Chromium / pdfjs / jsQR textbook artifacts",
  () => {
    it("prints one notice only for unlinked image choices without changing the frozen source", async () => {
      const browser = await launchExportBrowser();
      try {
        const exchange = textbookFixture(1, 2);
        const bytes = new TextEncoder().encode(
          '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="30" viewBox="0 0 80 30"><path d="M5 25 L40 5 L75 25 Z" fill="none" stroke="black"/></svg>',
        );
        exchange.assets = ["first", "second"].map((assetId) => ({
          assetId,
          packagePath: `assets/${assetId}.svg`,
          sha256: sha256(bytes),
          mimeType: "image/svg+xml",
          widthPx: 80,
          heightPx: 30,
        }));
        exchange.snapshots.forEach((snapshot, index) => {
          snapshot.payload.content =
            index === 0
              ? "삼각형의 변의 수를 고르시오.\n\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$"
              : "삼각형인 보기를 고르시오.\n\n① [그림]\n② [그림]\n③ [그림]\n④ [그림]\n⑤ [그림]";
          snapshot.payload.questionType = "객관식";
          snapshot.payload.figures = exchange.assets.map((asset) => ({
            assetId: asset.assetId,
            sha256: asset.sha256,
            choiceIndex: null,
            sourceWidthMm: 30,
            altText: asset.assetId,
          }));
          snapshot.rawSource!.figureUrls = ["/first.svg", "/second.svg"];
          snapshot.contentHash = contentHash(snapshot.payload);
          snapshot.snapshotHash = snapshotHash(snapshot);
        });
        exchange.items.forEach((item) => {
          item.layout.minWorkLines = 0;
          item.layout.preferredWorkLines = 0;
          item.layout.maxWorkLines = 0;
        });
        const before = canonicalJson(exchange);
        const result = await renderTextbookChunk({
          exchange,
          officialOrigin: SYNTHETIC_ORIGIN,
          readAsset: async () => bytes,
          sectionIndices: [0],
          firstPhysicalPageIndex: 1,
          variant: "student",
          browser,
        });
        expect(result.qrChecks).toHaveLength(2);
        expect(
          result.issues.filter((i) => i.code === "FIGURE_CHOICE_UNKNOWN"),
        ).toHaveLength(4);
        expect(canonicalJson(exchange)).toBe(before);
        expect(result.html.includes("비공개 정답")).toBe(false);
        expect(result.html.includes("비공개 해설")).toBe(false);
        expect(result.html.includes("보기 대응 정보 없음")).toBe(false);
        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.setContent(result.html, { waitUntil: "load" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((img) => img.decode()),
          );
        });
        const printed = await page.$$eval(".tb-problem", (problems) =>
          problems.map((problem) => ({
            text: problem.textContent ?? "",
            figures: Array.from(
              problem.querySelectorAll(".tb-problem-figure"),
            ).map((figure) => ({
              link: figure.getAttribute("data-choice-index"),
              alt: figure.querySelector("img")?.alt,
            })),
          })),
        );
        const notice = "보기 그림의 번호를 확인할 수 없는 문항입니다.";
        expect(printed).toHaveLength(2);
        expect(printed[0].text).not.toContain(notice);
        expect(printed[1].text.split(notice)).toHaveLength(2);
        expect(printed[1].text.indexOf(notice)).toBeLessThan(
          printed[1].text.indexOf("①"),
        );
        for (const problem of printed) {
          expect(problem.figures).toEqual([
            { link: "unknown", alt: "first" },
            { link: "unknown", alt: "second" },
          ]);
        }
        await mkdir("output/pdf", { recursive: true });
        await writeFile("output/pdf/textbook-figure-notice.pdf", result.pdf);
        await page.setViewport({ width: 1000, height: 1250 });
        const sheet = await page.$('[data-textbook-page="2"]');
        expect(sheet).not.toBeNull();
        await sheet!.screenshot({
          path: "output/pdf/textbook-figure-notice.png",
        });
        await page.close();
      } finally {
        await browser.close();
      }
    }, 180_000);

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
          studentPages: student.pages,
        });
        expect(answers.pages).toHaveLength(2);
        expect(answers.pageMap).not.toEqual(student.pageMap);
        expect(answers.html).toContain("정답 · 문제 3쪽");
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
