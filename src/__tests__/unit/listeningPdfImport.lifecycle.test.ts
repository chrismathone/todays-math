// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readListeningPdfText,
  readListeningQuestionPdf,
} from "@/components/english/bank/listeningPdfImport";

const pdfjs = vi.hoisted(() => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));
vi.mock("pdfjs-dist", () => pdfjs);

const file = () => new File(["synthetic PDF"], "listening.pdf");
const destroy = vi.fn<() => Promise<void>>();
const getPage = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  destroy.mockResolvedValue(undefined);
  // PDF.js 6 documents have no destroy method; the loading task owns cleanup.
  pdfjs.getDocument.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage,
      loadingTask: { destroy },
    }),
  });
});

describe("listening PDF loading-task lifecycle", () => {
  it("returns extracted text and releases the worker after success", async () => {
    getPage.mockResolvedValue({
      getTextContent: async () => ({
        items: [
          { str: "1." },
          { type: "beginMarkedContent" },
          { str: "Hello" },
        ],
      }),
    });
    await expect(readListeningPdfText(file())).resolves.toBe("1. Hello");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("preserves extraction errors while releasing the worker", async () => {
    getPage.mockRejectedValue(new Error("Unreadable page"));
    await expect(readListeningPdfText(file())).rejects.toThrow(
      "Unreadable page",
    );
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("releases oversized documents and preserves the page-limit message", async () => {
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 31, loadingTask: { destroy } }),
    });
    await expect(readListeningPdfText(file())).rejects.toThrow("30쪽 이하");
    expect(destroy).toHaveBeenCalledOnce();
    expect(getPage).not.toHaveBeenCalled();
  });

  it("preserves cancellation before rendering and releases the worker", async () => {
    const controller = new AbortController();
    controller.abort(new Error("Import cancelled"));
    await expect(
      readListeningQuestionPdf(file(), 20, controller.signal),
    ).rejects.toThrow("Import cancelled");
    expect(destroy).toHaveBeenCalledOnce();
    expect(getPage).not.toHaveBeenCalled();
  });
});
