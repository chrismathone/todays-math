import type { PDFDocumentProxy } from "pdfjs-dist";
import { studioRotateCanvas } from "./studioAiHelpers";
import { analyzeStudioPage, measurePageInk } from "./studioPageAnalysis";
import type { StudioAutoOut } from "./studioPageOrder";

export interface StudioPagePreview {
  url: string;
  rotation?: number;
  error?: string;
  autoOut?: StudioAutoOut;
  inkRatio?: number;
}

// Each thumbnail load/render gets 10s; a stalled page must not hold the serial queue.
const PDF_PREVIEW_WAIT_MS = 10_000;

/** Bound waits locally: getPage cannot be cancelled without destroying the shared PDF. */
function waitForPdfPreview<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  cancel?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    };
    const fail = (error: unknown, cancelRender = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (cancelRender) {
        try {
          cancel?.();
        } catch {
          // Cancellation is best-effort; even a broken cancel must not hold this wait.
        }
      }
      reject(error);
    };
    const abort = () => fail(new DOMException("작업 취소", "AbortError"), true);
    const timer = setTimeout(
      () =>
        fail(
          new DOMException(
            "쪽 그림을 불러오는 시간이 초과되었습니다. 다시 시도해 주세요.",
            "TimeoutError",
          ),
          true,
        ),
      PDF_PREVIEW_WAIT_MS,
    );
    signal.addEventListener("abort", abort, { once: true });
    // Consume late resolution/rejection after abort/timeout without resuming rendering.
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => fail(error),
    );
    if (signal.aborted) abort();
  });
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
  if (source.pdf) {
    const pdfPage = await waitForPdfPreview(source.pdf.getPage(page), signal);
    check();
    const base = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({
      scale: 728 / Math.max(base.width, (base.height * 728) / 1031),
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const task = pdfPage.render({ canvas, canvasContext: context, viewport });
    await waitForPdfPreview(task.promise, signal, () => task.cancel());
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
      inkRatio === undefined ? undefined : analyzeStudioPage({ inkRatio }),
  };
}
