import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "puppeteer-core";
import { RESOURCE_ORIGIN } from "./bundle.server";

export interface QrPlacement {
  qrTargetId: string;
  url: string;
  pdfPageNumber: number;
  physicalPageIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}
export interface QrPixelCheck extends QrPlacement {
  decodedUrl: string;
  passed: true;
}

/** Decodes every expected placement from final PDF raster pixels, never from generated QR image bytes. */
export async function verifyPdfQrPixels(
  browser: Browser,
  bytes: Uint8Array,
  expected: readonly QrPlacement[],
  expectedPageCount: number,
  proof: {
    rasterPages?: number[];
    onRaster?: (pageNumber: number, png: Uint8Array) => Promise<void>;
    signal?: AbortSignal;
  } = {},
): Promise<QrPixelCheck[]> {
  const rasterPages = [...new Set(proof.rasterPages ?? [])];
  if (
    rasterPages.length > 6 ||
    rasterPages.some(
      (p) => !Number.isSafeInteger(p) || p < 1 || p > expectedPageCount,
    )
  )
    throw new Error("Invalid proof raster pages");
  const files = new Map<string, { bytes: Uint8Array; contentType: string }>();
  for (const name of ["pdf.mjs", "pdf.worker.mjs"])
    files.set(`${RESOURCE_ORIGIN}/pdfjs/${name}`, {
      bytes: new Uint8Array(
        await readFile(
          path.join(process.cwd(), "node_modules/pdfjs-dist/build", name),
        ),
      ),
      contentType: "text/javascript",
    });
  files.set(`${RESOURCE_ORIGIN}/jsqr.js`, {
    bytes: new Uint8Array(
      await readFile(
        path.join(process.cwd(), "node_modules/jsqr/dist/jsQR.js"),
      ),
    ),
    contentType: "text/javascript",
  });
  files.set(`${RESOURCE_ORIGIN}/artifact.pdf`, {
    bytes,
    contentType: "application/pdf",
  });
  const page = await browser.newPage();
  const abort = () => {
    void page.close().catch(() => undefined);
  };
  proof.signal?.addEventListener("abort", abort, { once: true });
  const requestErrors: string[] = [];
  try {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const file = files.get(request.url());
      if (file)
        void request
          .respond({
            status: 200,
            contentType: file.contentType,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: file.bytes,
          })
          .catch((e: unknown) => requestErrors.push(String(e)));
      else
        void request
          .abort()
          .catch((e: unknown) => requestErrors.push(String(e)));
    });
    await page.setContent(
      '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>',
    );
    await page.addScriptTag({ url: `${RESOURCE_ORIGIN}/jsqr.js` });
    // Keep these browser module imports out of server bundler transforms. The
    // script and both URLs are fixed application code, never submitted HTML.
    await page.addScriptTag({
      content: `globalThis.textbookPdfjsReady = Promise.all([import("${RESOURCE_ORIGIN}/pdfjs/pdf.mjs"), import("${RESOURCE_ORIGIN}/pdfjs/pdf.worker.mjs")]).then(([pdfjs, worker]) => { globalThis.pdfjsWorker = worker; return pdfjs; });`,
    });
    const result: {
      checks: { index: number; decoded: string | null }[];
      rasters: { pageNumber: number; data: string }[];
    } = { checks: [], rasters: [] };
    // Each protocol operation is bounded independently; long final books must not
    // turn a successful set of chunks into one uninterruptible browser evaluation.
    for (let startPage = 1; startPage <= expectedPageCount; startPage += 16) {
      if (proof.signal?.aborted) throw new Error("PDF QR validation aborted");
      const batch = await page.evaluate(
        async ({ targets, count, origin, rasterPages, startPage, endPage }) => {
          const pdfjs = await (
            globalThis as unknown as {
              textbookPdfjsReady: Promise<typeof import("pdfjs-dist")>;
            }
          ).textbookPdfjsReady;
          const data = new Uint8Array(
            await (await fetch(`${origin}/artifact.pdf`)).arrayBuffer(),
          );
          const document = await pdfjs.getDocument({
            data,
            useWorkerFetch: false,
            useSystemFonts: false,
          }).promise;
          if (document.numPages !== count)
            throw new Error(
              `Final PDF page count mismatch: ${document.numPages}/${count}`,
            );
          const decode = (
            globalThis as unknown as {
              jsQR: (
                pixels: Uint8ClampedArray,
                width: number,
                height: number,
                options: { inversionAttempts: string },
              ) => { data: string } | null;
            }
          ).jsQR;
          const checks: { index: number; decoded: string | null }[] = [];
          const rasters: { pageNumber: number; data: string }[] = [];
          try {
            for (let number = startPage; number <= endPage; number++) {
              const pageTargets = targets
                .map((target, index) => ({ target, index }))
                .filter(({ target }) => target.pdfPageNumber === number);
              if (!pageTargets.length && !rasterPages.includes(number))
                continue;
              const pdfPage = await document.getPage(number);
              const viewport = pdfPage.getViewport({ scale: 3 }); // 216dpi raster of actual PDF artwork.
              const canvas = globalThis.document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext("2d", {
                willReadFrequently: true,
              })!;
              await pdfPage.render({
                canvasContext: context,
                viewport,
                canvas,
                background: "rgb(255,255,255)",
              }).promise;
              // PDF points are 1/72 inch; this also handles 420mm spread pages.
              const pixelsPerMm = (72 / 25.4) * 3;
              for (const { target, index } of pageTargets) {
                const pad = 1.2;
                const x = Math.max(
                  0,
                  Math.floor((target.xMm - pad) * pixelsPerMm),
                );
                const y = Math.max(
                  0,
                  Math.floor((target.yMm - pad) * pixelsPerMm),
                );
                const width = Math.min(
                  canvas.width - x,
                  Math.ceil((target.widthMm + 2 * pad) * pixelsPerMm),
                );
                const height = Math.min(
                  canvas.height - y,
                  Math.ceil((target.heightMm + 2 * pad) * pixelsPerMm),
                );
                if (width < 1 || height < 1)
                  throw new Error("QR raster bounds invalid");
                const pixels = context.getImageData(x, y, width, height);
                checks.push({
                  index,
                  decoded:
                    decode(pixels.data, width, height, {
                      inversionAttempts: "attemptBoth",
                    })?.data ?? null,
                });
              }
              if (rasterPages.includes(number))
                rasters.push({
                  pageNumber: number,
                  data: canvas.toDataURL("image/png").split(",")[1],
                });
              canvas.width = canvas.height = 0;
              pdfPage.cleanup();
            }
          } finally {
            await document.loadingTask.destroy();
          }
          return { checks, rasters };
        },
        {
          targets: [...expected],
          count: expectedPageCount,
          origin: RESOURCE_ORIGIN,
          rasterPages,
          startPage,
          endPage: Math.min(startPage + 15, expectedPageCount),
        },
      );
      result.checks.push(...batch.checks);
      result.rasters.push(...batch.rasters);
    }
    if (requestErrors.length)
      throw new Error(
        `QR verifier resource failure: ${requestErrors.join("; ")}`,
      );
    if (result.checks.length !== expected.length)
      throw new Error("Not every PDF QR was raster-verified");
    for (const raster of result.rasters)
      await proof.onRaster?.(
        raster.pageNumber,
        new Uint8Array(Buffer.from(raster.data, "base64")),
      );
    return result.checks.map(({ index, decoded }) => {
      const target = expected[index];
      if (decoded !== target.url)
        throw new Error(
          `PDF QR mismatch on physical page ${target.physicalPageIndex}: ${target.qrTargetId} decoded ${decoded ?? "nothing"}`,
        );
      return { ...target, decodedUrl: decoded, passed: true as const };
    });
  } finally {
    proof.signal?.removeEventListener("abort", abort);
    await page.close().catch(() => undefined);
  }
}
