import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";

const pdfjs = vi.hoisted(() => ({
  getDocument: vi.fn(),
  version: "6.2.108",
  GlobalWorkerOptions: { workerSrc: "" },
}));
vi.mock("pdfjs-dist", () => pdfjs);
vi.mock("@/components/unified/studioSessionStore", () => ({
  StudioSessionStore: class {
    load = async () => null;
    save = async () => {};
    clear = async () => {};
    retain() {}
    release() {}
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ enabled: false, providers: [] })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function importPdf() {
  const file = new File(["synthetic"], "synthetic.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new ArrayBuffer(8),
  });
  return render(
    <DevAiProvider>
      <StudioView
        onAdd={() => {}}
        onExport={() => {}}
        importRequest={{ id: 1, files: [file] }}
      />
    </DevAiProvider>,
  );
}

describe("Studio PDF.js loading-task cleanup", () => {
  it("releases a loaded PDF on unmount even when the document has no destroy method", async () => {
    const destroy = vi.fn(async () => {});
    const getPage = vi.fn(() => new Promise(() => {}));
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage,
        loadingTask: { destroy },
      }),
      destroy,
    });
    const view = importPdf();
    await waitFor(() => expect(getPage).toHaveBeenCalled());
    view.unmount();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("releases a document that resolves after its import was disposed", async () => {
    const destroy = vi.fn(async () => {});
    const getPage = vi.fn();
    let finish!: (document: unknown) => void;
    pdfjs.getDocument.mockReturnValue({
      promise: new Promise((resolve) => {
        finish = resolve;
      }),
      destroy,
    });
    const view = importPdf();
    await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledOnce());
    view.unmount();
    expect(destroy).toHaveBeenCalledOnce();
    await act(async () =>
      finish({ numPages: 1, getPage, loadingTask: { destroy } }),
    );
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(getPage).not.toHaveBeenCalled();
  });
});
