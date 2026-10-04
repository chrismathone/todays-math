// @vitest-environment node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Browser } from "puppeteer-core";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { canonicalJson } from "@/lib/textbook/canonical";
import { contentHash, sha256, snapshotHash } from "@/lib/textbook/hash.server";
import { codexRenderer } from "@/lib/textbook/publish/codexRenderer";
import { RESOURCE_ORIGIN } from "@/lib/textbook/render/bundle.server";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  verifyPdfQrPixels,
  type QrPlacement,
} from "@/lib/textbook/render/qrVerify.server";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

/** Read every final PDF page using only the same bundled pdfjs modules as QR validation. */
async function pdfText(browser: Browser, bytes: Uint8Array): Promise<string> {
  const resources = new Map<string, { bytes: Uint8Array; contentType: string }>(
    [
      [
        `${RESOURCE_ORIGIN}/proof.pdf`,
        { bytes, contentType: "application/pdf" },
      ],
    ],
  );
  for (const name of ["pdf.mjs", "pdf.worker.mjs"])
    resources.set(`${RESOURCE_ORIGIN}/${name}`, {
      bytes: await readFile(`node_modules/pdfjs-dist/build/${name}`),
      contentType: "text/javascript",
    });
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resource = resources.get(request.url());
      if (resource)
        void request.respond({
          status: 200,
          body: resource.bytes,
          contentType: resource.contentType,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      else void request.abort();
    });
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({
      content: `globalThis.proofPdfjs = Promise.all([import("${RESOURCE_ORIGIN}/pdf.mjs"), import("${RESOURCE_ORIGIN}/pdf.worker.mjs")]).then(([pdfjs, worker]) => { globalThis.pdfjsWorker = worker; return pdfjs; });`,
    });
    return await page.evaluate(async (origin) => {
      const pdfjs = await (
        globalThis as unknown as {
          proofPdfjs: Promise<typeof import("pdfjs-dist")>;
        }
      ).proofPdfjs;
      const data = new Uint8Array(
        await (await fetch(`${origin}/proof.pdf`)).arrayBuffer(),
      );
      const document = await pdfjs.getDocument({
        data,
        useWorkerFetch: false,
        useSystemFonts: false,
      }).promise;
      const rows: string[] = [];
      try {
        for (let n = 1; n <= document.numPages; n++) {
          const content = await (await document.getPage(n)).getTextContent();
          rows.push(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
        }
        return rows.join("\n");
      } finally {
        await document.destroy();
      }
    }, RESOURCE_ORIGIN);
  } finally {
    await page.close();
  }
}

describe.skipIf(process.env.TEXTBOOK_PDF_TEST !== "1")(
  "independent teacher pagination through the real publish adapter",
  () => {
    it("prints long answers with zero student worklines, preserves unknown figures, and decodes every QR from each final PDF", async () => {
      const exchange = textbookFixture(1, 4);
      for (const item of exchange.items)
        item.layout = {
          ...item.layout,
          minWorkLines: 0,
          preferredWorkLines: 0,
          maxWorkLines: 0,
        };
      exchange.snapshots.forEach((snapshot, i) => {
        snapshot.payload.answer = `ANSWER_START_${i}\n\nANSWER_END_${i}`;
        snapshot.payload.solution = Array.from(
          // Each legacy answer must fit a page on its own while the answer book grows.
          { length: 10 },
          (_, line) => `SOLUTION_${i}_LINE_${line} 정답의 근거를 확인합니다.`,
        ).join("\n\n");
      });
      const bytes = new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><path d="M10 70 L60 10 L110 70 Z" fill="none" stroke="black"/></svg>',
      );
      exchange.assets = [
        {
          assetId: "scan",
          sha256: sha256(bytes),
          packagePath: "assets/scan.svg",
          mimeType: "image/svg+xml",
          widthPx: 120,
          heightPx: 80,
        },
      ];
      exchange.snapshots[0].payload.figures = [
        {
          assetId: "scan",
          sha256: sha256(bytes),
          choiceIndex: null,
          sourceWidthMm: 30,
          altText: "original scan",
        },
      ];
      exchange.snapshots[0].rawSource!.figureUrls = ["/figures-svg/scan.svg"];
      exchange.snapshots.forEach((snapshot) => {
        snapshot.contentHash = contentHash(snapshot.payload);
        snapshot.snapshotHash = snapshotHash(snapshot);
      });
      const before = canonicalJson(exchange);
      const input = {
        exchange,
        officialOrigin: SYNTHETIC_ORIGIN,
        readAsset: async () => bytes,
        sectionIndices: [0],
        firstPhysicalPageIndex: 1,
      };
      const student = await codexRenderer.renderChunk({
        ...input,
        variant: "student",
      });
      const answers = await codexRenderer.renderChunk({
        ...input,
        variant: "answers",
        studentCarry: student.carry,
      });
      expect(student.pageCount).toBe(2);
      expect(answers.pageCount).toBeGreaterThan(student.pageCount);
      expect(answers.pageMap).not.toEqual(student.pageMap);
      expect(student.pageMap.map((p) => p.physicalPageIndex)).toEqual([
        2, 2, 2, 2,
      ]);
      expect(answers.pageMap.map((p) => p.itemId)).toEqual(
        exchange.items.map((item) => item.itemId),
      );
      for (const artifact of [student, answers]) {
        expect(artifact.nextPhysicalPageIndex).toBe(1 + artifact.pageCount);
        expect(artifact.issues).toContainEqual(
          expect.objectContaining({
            code: "FIGURE_CHOICE_UNKNOWN",
            severity: "warning",
          }),
        );
        expect(
          artifact.issues.some((issue) => issue.severity === "error"),
        ).toBe(false);
      }
      const finalStudent = await codexRenderer.mergeChunks(
        [student],
        64 * 1024 * 1024,
      );
      const finalAnswers = await codexRenderer.mergeChunks(
        [answers],
        64 * 1024 * 1024,
      );
      const browser = await launchExportBrowser();
      try {
        const studentText = await pdfText(browser, finalStudent.pdf);
        const answerText = await pdfText(browser, finalAnswers.pdf);
        expect(studentText).not.toMatch(/ANSWER_|SOLUTION_/);
        expect(
          JSON.stringify(createTextbookRenderModel(exchange, "student")),
        ).not.toMatch(/ANSWER_|SOLUTION_/);
        const compact = answerText.replace(/\s/g, "");
        for (let i = 0; i < 4; i++) {
          expect(compact).toContain(`ANSWER_START_${i}`);
          expect(compact).toContain(`ANSWER_END_${i}`);
          for (let line = 0; line < 10; line++)
            expect(compact).toContain(`SOLUTION_${i}_LINE_${line}`);
        }
        expect(compact.match(/정답·문제2쪽/g)).toHaveLength(4);
        // This fixture is a short-answer question, so an unpaired figure keeps its source
        // order and validator warning without adding a multiple-choice notice to the prose.
        expect(studentText.replace(/\s/g, "")).not.toContain(
          "보기대응정보없음·원본순서로표시",
        );
        expect(studentText.replace(/\s/g, "")).not.toContain(
          "보기그림의번호를확인할수없는문항입니다.",
        );
        await mkdir("output/pdf", { recursive: true });
        for (const [name, artifact] of [
          ["student", finalStudent],
          ["answers", finalAnswers],
        ] as const) {
          const placements = (artifact.carry as { qrPlacements: QrPlacement[] })
            .qrPlacements;
          const checks = await verifyPdfQrPixels(
            browser,
            artifact.pdf,
            placements,
            artifact.pageCount,
            {
              rasterPages: [
                2,
                ...(artifact.pageCount > 2 ? [artifact.pageCount] : []),
              ],
              onRaster: async (page, png) => {
                await writeFile(
                  `output/pdf/textbook-independent-${name}-${page}.png`,
                  png,
                );
              },
            },
          );
          expect(checks).toHaveLength(4);
          expect(checks.every((check) => check.decodedUrl === check.url)).toBe(
            true,
          );
          expect(checks.map((check) => check.physicalPageIndex)).toEqual(
            (name === "student" ? student : answers).pageMap.map(
              (p) => p.physicalPageIndex,
            ),
          );
          await writeFile(
            `output/pdf/textbook-independent-${name}.pdf`,
            artifact.pdf,
          );
        }
        await writeFile(
          "output/pdf/textbook-independent-proof.json",
          JSON.stringify(
            {
              synthetic: true,
              originalV15Present: false,
              studentPages: student.pageCount,
              answerPages: answers.pageCount,
              workLines: 0,
              studentPageMap: student.pageMap,
              answerPageMap: answers.pageMap,
              allFinalQrVerified: 8,
              allAnswerAndSolutionMarkersPresent: true,
              studentAnswerLeak: false,
              unknownScanMapping: null,
              physicalScan: "pending",
            },
            null,
            2,
          ),
        );
      } finally {
        await browser.close();
      }
      expect(canonicalJson(exchange)).toBe(before);
    }, 240_000);
  },
);
