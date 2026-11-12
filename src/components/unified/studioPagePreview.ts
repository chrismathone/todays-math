import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { studioRotateCanvas } from "./studioAiHelpers";
import { analyzeStudioPage, measurePageInk } from "./studioPageAnalysis";
import type { StudioAutoOut } from "./studioPageOrder";

export interface StudioPagePreview {
  url: string;
  rotation?: number;
  /** A thumbnail may survive failed blank verification; errors are retryable, not cacheable. */
  error?: string;
  autoOut?: StudioAutoOut;
  inkRatio?: number;
}

const PREVIEW_DEADLINE_MS = 3000;
// Measured faint scan: scale 2 leaves one pixel; 2.5 leaves 295. Any ink keeps it.
const PDF_CONFIRMATION_SCALE = 2.5;
// Refuse excessive allocations as an unknown result, never as a smaller white raster.
const MAX_RASTER_PIXELS = 32_000_000;

function abortError() {
  return new DOMException("작업 취소", "AbortError");
}

function timeoutError() {
  return new DOMException(
    "쪽 그림을 불러오는 시간이 초과되었습니다. 다시 시도해 주세요.",
    "TimeoutError",
  );
}

/** One clock for the entire operation, including synchronous raster reads and encoding. */
function previewOperation(signal: AbortSignal) {
  const deadline = performance.now() + PREVIEW_DEADLINE_MS;
  let stopped: DOMException | undefined;
  let stopWait: (() => void) | undefined;
  const stop = (error: DOMException) => {
    stopped ??= error;
    stopWait?.();
  };
  const abort = () => stop(abortError());
  const timer = setTimeout(() => stop(timeoutError()), PREVIEW_DEADLINE_MS);
  signal.addEventListener("abort", abort, { once: true });
  const check = () => {
    if (signal.aborted) throw abortError();
    if (!stopped && performance.now() >= deadline) stop(timeoutError());
    if (stopped) throw stopped;
  };
  return {
    check,
    wait<T>(promise: Promise<T>, cancel?: () => void): Promise<T> {
      return new Promise((resolve, reject) => {
        let settled = false;
        const fail = () => {
          if (settled) return;
          settled = true;
          stopWait = undefined;
          try {
            cancel?.();
          } catch {
            // A broken render cancellation must not hold the serial preview queue.
          }
          reject(signal.aborted ? abortError() : stopped);
        };
        stopWait = fail;
        // Always consume late results, including rejection after abort or deadline.
        promise.then(
          (value) => {
            if (settled) return;
            try {
              check();
            } catch {
              fail();
              return;
            }
            settled = true;
            stopWait = undefined;
            resolve(value);
          },
          (error: unknown) => {
            if (settled) return;
            settled = true;
            stopWait = undefined;
            reject(error);
          },
        );
        try {
          check();
        } catch {
          fail();
        }
      });
    },
    dispose() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    },
  };
}

/** Text is only a conservative keep veto, never a cover/key classifier. */
function hasActualText(content: unknown): boolean {
  if (!content || typeof content !== "object" || !("items" in content))
    throw new Error("쪽 글자를 확인하지 못했습니다.");
  const { items } = content;
  if (!Array.isArray(items)) throw new Error("쪽 글자를 확인하지 못했습니다.");
  let actualText = false;
  for (const item of items) {
    if (!item || typeof item !== "object")
      throw new Error("쪽 글자를 확인하지 못했습니다.");
    if ("str" in item) {
      if (typeof item.str !== "string")
        throw new Error("쪽 글자를 확인하지 못했습니다.");
      actualText ||= /\S/u.test(item.str);
    } else if (
      item.type !== "beginMarkedContent" &&
      item.type !== "beginMarkedContentProps" &&
      item.type !== "endMarkedContent"
    ) {
      throw new Error("쪽 글자를 확인하지 못했습니다.");
    }
  }
  return actualText;
}

/** Local thumbnail; only white candidates get text/native-or-higher confirmation. */
export async function renderStudioPagePreview(
  source: {
    pdf?: PDFDocumentProxy;
    image?: HTMLImageElement | HTMLCanvasElement;
    pageRotations?: Record<number, number>;
  },
  page: number,
  signal: AbortSignal,
  options?: {
    /** A ready thumbnail, before optional blank verification; never carries autoOut. */
    onPreview?: (preview: StudioPagePreview) => void;
  },
): Promise<StudioPagePreview> {
  const operation = previewOperation(signal);
  const canvases: HTMLCanvasElement[] = [];
  let pdfPage: PDFPageProxy | undefined;
  let finished = false;
  let preview: StudioPagePreview | undefined;
  const raster = (width: number, height: number) => {
    operation.check();
    width = Math.ceil(width);
    height = Math.ceil(height);
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width * height > MAX_RASTER_PIXELS
    )
      throw new Error("쪽 그림의 원본 크기를 확인하지 못했습니다.");
    const canvas = document.createElement("canvas");
    canvases.push(canvas);
    canvas.width = width;
    canvas.height = height;
    if (canvas.width !== width || canvas.height !== height)
      throw new Error("쪽 그림의 원본 크기를 확인하지 못했습니다.");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("쪽 그림을 불러오지 못했습니다.");
    // An unpainted/transparent page is measured on white for both source kinds.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    return { canvas, context };
  };
  const ink = ({ canvas, context }: ReturnType<typeof raster>) => {
    operation.check();
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    if (data.length !== canvas.width * canvas.height * 4)
      throw new Error("쪽 그림의 픽셀을 확인하지 못했습니다.");
    const ratio = measurePageInk(data);
    if (!Number.isFinite(ratio))
      throw new Error("쪽 그림의 픽셀을 확인하지 못했습니다.");
    operation.check();
    return ratio;
  };
  const renderPdf = async (pdfPage: PDFPageProxy, scale: number) => {
    operation.check();
    const viewport = pdfPage.getViewport({ scale });
    const output = raster(viewport.width, viewport.height);
    const task = pdfPage.render({
      canvas: output.canvas,
      canvasContext: output.context,
      viewport,
    });
    await operation.wait(task.promise, () => task.cancel());
    return output;
  };
  try {
    operation.check();
    let thumbnailScale = 1;
    let imageWidth = 0;
    let imageHeight = 0;
    let thumbnail: ReturnType<typeof raster>;
    if (source.pdf) {
      pdfPage = await operation.wait<PDFPageProxy>(
        source.pdf.getPage(page).then((loadedPage) => {
          pdfPage = loadedPage;
          // getPage is not cancellable: release even a page arriving after we stop.
          if (finished) loadedPage.cleanup();
          return loadedPage;
        }),
      );
      operation.check();
      const base = pdfPage.getViewport({ scale: 1 });
      thumbnailScale = Math.min(728 / base.width, 1031 / base.height);
      thumbnail = await renderPdf(pdfPage, thumbnailScale);
    } else if (source.image) {
      const image = source.image;
      imageWidth =
        image instanceof HTMLImageElement ? image.naturalWidth : image.width;
      imageHeight =
        image instanceof HTMLImageElement ? image.naturalHeight : image.height;
      const scale = Math.min(1, 728 / imageWidth, 1031 / imageHeight);
      thumbnail = raster(imageWidth * scale, imageHeight * scale);
      thumbnail.context.drawImage(
        image,
        0,
        0,
        thumbnail.canvas.width,
        thumbnail.canvas.height,
      );
    } else throw new Error("쪽 그림을 불러오지 못했습니다.");
    operation.check();
    const rotated = studioRotateCanvas(
      thumbnail.canvas,
      source.pageRotations?.[page] ?? 0,
    );
    if (rotated !== thumbnail.canvas) canvases.push(rotated);
    const url = rotated.toDataURL("image/png");
    if (!url.startsWith("data:image/"))
      throw new Error("쪽 그림을 불러오지 못했습니다.");
    preview = { url };
    operation.check();
    preview.inkRatio = ink(thumbnail);
    // Publish a snapshot: final verification must not mutate the early result.
    options?.onPreview?.({ ...preview });
    operation.check();
    if (preview.inkRatio !== 0) return preview;

    // The thumbnail can erase tiny type or faint scan pixels: it is only a candidate.
    if (pdfPage) {
      operation.check();
      const content = await operation.wait(pdfPage.getTextContent());
      const actualText = hasActualText(content);
      operation.check();
      if (actualText) return preview;
    }
    let confirmation: ReturnType<typeof raster>;
    if (pdfPage) {
      confirmation = await renderPdf(
        pdfPage,
        Math.max(PDF_CONFIRMATION_SCALE, thumbnailScale),
      );
    } else {
      confirmation = raster(imageWidth, imageHeight);
      confirmation.context.drawImage(
        source.image!,
        0,
        0,
        imageWidth,
        imageHeight,
      );
    }
    const confirmedInkRatio = ink(confirmation);
    operation.check();
    return {
      ...preview,
      autoOut: analyzeStudioPage({
        inkRatio: preview.inkRatio,
        confirmedInkRatio,
      }),
    };
  } catch (error) {
    // The caller discards stale work on cancellation, even with a ready thumbnail.
    if (signal.aborted) throw abortError();
    const name =
      error && typeof error === "object" && "name" in error
        ? error.name
        : undefined;
    if (name === "AbortError") throw error;
    if (!preview) throw error;
    return {
      ...preview,
      error:
        name === "TimeoutError"
          ? timeoutError().message
          : "빈 쪽 여부를 확인하지 못했습니다. 다시 시도해 주세요.",
    };
  } finally {
    finished = true;
    operation.dispose();
    for (const canvas of canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
    // Page cleanup preserves the shared document for later region/crop renders.
    // If another renderer is active, PDF.js defers cleanup until it completes.
    pdfPage?.cleanup();
  }
}
