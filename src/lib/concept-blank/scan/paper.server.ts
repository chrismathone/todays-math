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
import { scanPaperCss } from "./paperCss.server";
import { measureScanPaper } from "./paperMeasure";
import { scanPaperDocument } from "./paperDocument";
export { scanPaperDocument } from "./paperDocument";

// Keeps our renderer to one Chromium per process. No database lock spans rendering.
let rendering = false;
async function withPage<T>(
  artifact: ScanPaperArtifact,
  run: (page: Page) => Promise<T>,
) {
  if (rendering)
    throw new Error(
      "다른 지면을 발행하고 있습니다. 잠시 뒤 다시 발행해 주세요.",
    );
  rendering = true;
  let browser: Awaited<ReturnType<typeof launchExportBrowser>> | undefined;
  try {
    browser = await launchExportBrowser();
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      void (/^(data:|about:blank)/.test(request.url())
        ? request.continue()
        : request.abort());
    });
    await page.emulateMediaType("print");
    await page.setContent(scanPaperDocument(artifact), { waitUntil: "load" });
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
  } finally {
    await browser?.close();
    rendering = false;
  }
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
    const qr = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
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
    pages,
  });
  const measured = await withPage(artifact, (page) =>
    page.evaluate(measureScanPaper, snapshot),
  );
  // Subpixel rounding up to one CSS pixel is a measurement tolerance, never a clipped text allowance.
  if (measured.overflow.some((px) => px > 1))
    throw new Error("발행 지면의 본문이 넘쳐 QR 없이 인쇄합니다.");
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
