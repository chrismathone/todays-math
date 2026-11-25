import "server-only";
import { createHash } from "node:crypto";
import QRCode from "qrcode";
import type { Page } from "puppeteer-core";
import type {
  ConceptBlankBank,
  ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import {
  scanPaperArtifactSchema,
  type ScanPaperArtifact,
} from "@/contracts/conceptBlankScanIssued.contract";
import { issuedPaperPages } from "@/components/concept-blank/IssuedPaper";
import {
  planSheet,
  sheetHasContent,
} from "@/components/concept-blank/paper/paginate";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { composeSheets } from "../compose";
import { createScanSnapshot } from "./snapshot";
import { matchScanLayout, scanQrUrl } from "./layout";
import { scanFontCss, scanFontFingerprint } from "./fonts.server";
import { createScanRenderQueue, ScanPaperError } from "./renderQueue";
import { scanPaperCss } from "./paperCss.server";
import { measureScanPaper } from "./paperMeasure";
import { scanPaperDocument } from "./paperDocument";
export { scanPaperDocument } from "./paperDocument";

// Keeps our renderer to one Chromium per process. No database lock spans rendering.
const renderQueue = createScanRenderQueue();
async function withPage<T>(
  artifact: ScanPaperArtifact,
  run: (page: Page) => Promise<T>,
) {
  if (
    artifact.fontFingerprint &&
    artifact.fontFingerprint !== scanFontFingerprint()
  )
    throw new ScanPaperError("저장된 지면의 글꼴 판을 확인해야 합니다.");
  return renderQueue(async (signal) => {
    let browser: Awaited<ReturnType<typeof launchExportBrowser>> | undefined;
    try {
      browser = await launchExportBrowser();
      signal.throwIfAborted();
      signal.addEventListener(
        "abort",
        () => {
          void browser?.close().catch(() => undefined);
        },
        { once: true },
      );
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        void (/^(data:|about:blank)/.test(request.url())
          ? request.continue()
          : request.abort());
      });
      await page.emulateMediaType("print");
      await page.setContent(
        scanPaperDocument(
          artifact.fontFingerprint
            ? { ...artifact, css: scanFontCss("embedded") + artifact.css }
            : artifact,
        ),
        { waitUntil: "load" },
      );
      await page.evaluate(async () => {
        await Promise.all(
          ["Noto Serif KR", "Pretendard"].flatMap((family) =>
            [400, 700, 800].map(async (weight) => {
              if (
                !(
                  await document.fonts.load(
                    `${weight} 16px "${family}"`,
                    "가힣국문수학9A",
                  )
                ).length
              )
                throw new Error("발행 글꼴을 읽지 못했습니다.");
            }),
          ),
        );
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode()));
      });
      return await run(page);
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw error;
    } finally {
      await browser?.close();
    }
  });
}

/** Reuse only identical frozen content/layout/font editions, including the QR origin. */
export function scanPublicationEdition(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank,
  origin: string,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "scan-paper-v3",
        createScanSnapshot(selection, bank),
        scanPaperCss(),
        scanFontFingerprint(),
        origin,
      ]),
    )
    .digest("hex");
}

export async function renderScanPaper(input: {
  id: string;
  selection: ConceptBlankSelection;
  bank: ConceptBlankBank;
  origin: string;
}) {
  const snapshot = createScanSnapshot(input.selection, input.bank);
  const sheets = composeSheets(input.selection, input.bank).filter(
    sheetHasContent,
  );
  const { renderToStaticMarkup } = await import("react-dom/server");
  const pages: ScanPaperArtifact["pages"] = [];
  for (const part of ["student", "key"] as const) {
    const count = sheets.reduce(
      (sum, sheet) => sum + planSheet(sheet)[part].length,
      0,
    );
    // 채점표에는 QR을 싣지 않는다(원장님 2026-11-25 — 촬영 대상이 아니다).
    const qr = await Promise.all(
      Array.from({ length: part === "student" ? count : 0 }, async (_, i) => {
        const url = scanQrUrl(input.origin, {
          printedSheetId: input.id,
          page: i + 1,
          part,
        });
        return {
          url,
          dataUrl: await QRCode.toDataURL(url, {
            errorCorrectionLevel: "M",
            margin: 4,
            scale: 6,
          }),
        };
      }),
    );
    const nodes = issuedPaperPages({
      sheets,
      part,
      code: snapshot.sheetCode ?? undefined,
      qr,
    });
    pages.push(
      ...nodes.map((node, i) => ({
        part,
        number: i + 1,
        html: renderToStaticMarkup(node),
      })),
    );
  }
  const artifact = scanPaperArtifactSchema.parse({
    version: 1,
    css: scanPaperCss(),
    fontFingerprint: scanFontFingerprint(),
    pages,
  });
  const measured = await withPage(artifact, (page) =>
    page.evaluate(measureScanPaper, snapshot),
  );
  // Subpixel rounding up to one CSS pixel is a measurement tolerance, never a clipped text allowance.
  if (measured.overflow.some((px) => px > 1))
    throw new ScanPaperError(
      `발행 지면의 본문이 넘칩니다(최대 ${Math.max(...measured.overflow).toFixed(1)}px). 문항 수를 줄여 다시 발행해 주세요.`,
    );
  const layout = matchScanLayout(snapshot, measured.layout);
  const artifactSha256 = createHash("sha256")
    .update(JSON.stringify(artifact))
    .digest("hex");
  return {
    snapshot,
    layout,
    artifact,
    artifactSha256,
    overflow: measured.overflow,
  };
}

/** QA/authorized PDF export of the already frozen artifact; no paid model and no network assets. */
export async function scanPaperPdf(artifact: ScanPaperArtifact) {
  return withPage(artifact, (page) =>
    page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    }),
  );
}
