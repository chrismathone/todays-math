import type { PDFDocumentProxy } from "pdfjs-dist";
import { studioRotateCanvas } from "./studioAiHelpers";
import { analyzeStudioPage, measurePageInk } from "./studioPageAnalysis";
import type { StudioOrderedPage } from "./studioPageOrder";

export interface StudioPagePreview {
  url: string;
  rotation?: number;
  error?: string;
  autoOut?: StudioOrderedPage["autoOut"];
  inkRatio?: number;
}

/** getOperatorList has no AbortSignal API in PDF.js; bound our wait without destroying it. */
function inspectPageOperators<T>(
  inspect: () => Promise<T>,
  signal: AbortSignal,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value?: T, aborted = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (aborted) reject(new DOMException("작업 취소", "AbortError"));
      else resolve(value);
    };
    const abort = () => finish(undefined, true);
    const timer = setTimeout(() => finish(), 3000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      // Both handlers stay attached after timeout/abort, consuming late rejection
      // without changing the settled result or creating another timer/listener.
      inspect().then(
        (value) => finish(value),
        () => finish(),
      );
    } catch {
      finish();
    }
  });
}

/** PDF.js may split a single line into several text items. Keep its line starts. */
export function studioPdfTextLines(
  items: readonly {
    str?: string;
    transform?: number[];
    width?: number;
    hasEOL?: boolean;
  }[],
): string[] {
  const lines: string[] = [];
  let line = "";
  let baseline: number | undefined;
  let endX: number | undefined;
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
    endX = undefined;
  };
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform?.[5];
    if (y !== undefined && baseline !== undefined && Math.abs(y - baseline) > 2)
      flush();
    const x = item.transform?.[4];
    const touching =
      x !== undefined && endX !== undefined && Math.abs(x - endX) < 1;
    line += `${line && !touching ? " " : ""}${item.str}`;
    endX =
      x !== undefined && item.width !== undefined ? x + item.width : undefined;
    baseline = y;
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

/** Local-only thumbnail, also large enough for H3-B's 340px preview. No OCR or network. */
export async function renderStudioPagePreview(
  source: {
    pdf?: PDFDocumentProxy;
    image?: HTMLImageElement | HTMLCanvasElement;
    pageRotations?: Record<number, number>;
  },
  page: number,
  signal: AbortSignal,
): Promise<StudioPagePreview> {
  const check = () => {
    if (signal.aborted) throw new DOMException("작업 취소", "AbortError");
  };
  check();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("쪽 그림을 불러오지 못했습니다.");
  let textLines: string[] = [];
  let hasImagePaint: boolean | undefined;
  let hasFillPaint: boolean | undefined;
  let canAnalyze = true;
  if (source.pdf) {
    const pdfPage = await source.pdf.getPage(page);
    check();
    const base = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({
      scale: 728 / Math.max(base.width, (base.height * 728) / 1031),
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const task = pdfPage.render({ canvas, canvasContext: context, viewport });
    const abort = () => task.cancel();
    signal.addEventListener("abort", abort, { once: true });
    try {
      await task.promise;
    } finally {
      signal.removeEventListener("abort", abort);
    }
    check();
    try {
      textLines = studioPdfTextLines(
        (await pdfPage.getTextContent()).items.filter((item) => "str" in item),
      );
    } catch {
      /* A scan may not have usable text. */
    }
    check();
    const inspection = await inspectPageOperators(
      () => Promise.all([pdfPage.getOperatorList(), import("pdfjs-dist")]),
      signal,
    );
    check();
    canAnalyze = inspection !== undefined;
    if (inspection) {
      const [operators, { OPS }] = inspection;
      // Include inline, grouped, repeated and mask paints, even inside form XObjects.
      const imagePaints = new Set(
        Object.entries(OPS)
          .filter(([name]) => /^paint.*Image/.test(name))
          .map(([, operation]) => operation),
      );
      hasImagePaint = operators.fnArray.some((operation) =>
        imagePaints.has(operation),
      );
      const fills = new Set<number>([
        OPS.fill,
        OPS.eoFill,
        OPS.fillStroke,
        OPS.eoFillStroke,
        OPS.closeFillStroke,
        OPS.closeEOFillStroke,
        OPS.shadingFill,
        OPS.rawFillPath,
      ]);
      let unknownFillPaint = false;
      hasFillPaint = operators.fnArray.some((operation, index) => {
        if (fills.has(operation)) return true;
        if (operation === OPS.showText) {
          const glyphs: unknown = operators.argsArray[index]?.[0];
          // Type3 glyphs execute font.charProcOperatorList outside page.fnArray.
          // Without inspecting that separate program, absence of fills is unknown.
          if (
            Array.isArray(glyphs) &&
            glyphs.some(
              (glyph: unknown) =>
                glyph !== null &&
                typeof glyph === "object" &&
                "operatorListId" in glyph &&
                glyph.operatorListId != null,
            )
          )
            unknownFillPaint = true;
        }
        if (operation !== OPS.constructPath) return false;
        // PDF.js 6 folds a path's paint into args[0], including vector glyph fills.
        const paint: unknown = operators.argsArray[index]?.[0];
        if (typeof paint === "number" && fills.has(paint)) return true;
        if (
          paint !== OPS.stroke &&
          paint !== OPS.closeStroke &&
          paint !== OPS.endPath
        )
          unknownFillPaint = true;
        return false;
      });
      if (!hasFillPaint && unknownFillPaint) {
        hasFillPaint = undefined;
        canAnalyze = false;
      }
    }
  } else if (source.image) {
    const image = source.image;
    const width =
      image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const height =
      image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    const scale = Math.min(1, 728 / width, 1031 / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } else throw new Error("쪽 그림을 불러오지 못했습니다.");
  check();
  // A failed pixel read must never masquerade as a blank page.
  let inkRatio: number | undefined;
  try {
    inkRatio = measurePageInk(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
    );
  } catch {
    /* Keep the page. */
  }
  const rotated = studioRotateCanvas(canvas, source.pageRotations?.[page] ?? 0);
  return {
    url: rotated.toDataURL("image/png"),
    inkRatio,
    autoOut:
      inkRatio === undefined || !canAnalyze
        ? undefined
        : analyzeStudioPage({
            inkRatio,
            textLines,
            hasImagePaint,
            hasFillPaint,
          }),
  };
}
