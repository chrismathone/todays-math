import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderStudioPagePreview } from "@/components/unified/studioPagePreview";

function raster(value = 255) {
  return new Uint8ClampedArray([value, value, value, 255]);
}

let pixels: Uint8ClampedArray;
beforeEach(() => {
  pixels = raster(0);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getImageData: () => ({ data: pixels }),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,cGFnZQ==",
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function pdfFixture(textLines: readonly string[] = []) {
  const task = { promise: Promise.resolve(), cancel: vi.fn() };
  const pdfPage = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 200 * scale,
      height: 300 * scale,
    }),
    getTextContent: vi.fn(async () => ({
      items: textLines.map((str) => ({ str, hasEOL: true })),
    })),
    getOperatorList: vi.fn(
      async (): Promise<{ fnArray: number[]; argsArray: unknown[] }> => ({
        fnArray: [],
        argsArray: [],
      }),
    ),
    render: vi.fn(() => task),
  };
  const pdf = { getPage: vi.fn(async () => pdfPage), destroy: vi.fn() };
  return {
    source: { pdf: pdf as unknown as PDFDocumentProxy },
    pdf,
    pdfPage,
    task,
  };
}

const candidates = [
  { name: "cover", textLines: ["문제지", "2학년", "유의 사항"] },
  { name: "answer key", textLines: ["빠른 정답", "01 ③", "02 ⑤"] },
];

describe("raster-only automatic exclusion", () => {
  it.each(candidates)("retains a nonblank $name", async ({ textLines }) => {
    const { source, pdfPage } = pdfFixture(textLines);
    const result = await renderStudioPagePreview(
      source,
      1,
      new AbortController().signal,
    );
    expect(result.autoOut).toBeUndefined();
    expect(result.url).toMatch(/^data:image/);
    expect(pdfPage.getTextContent).not.toHaveBeenCalled();
    expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
  });

  it.each(candidates)(
    "retains a $name with stroke-only vector questions",
    async ({ textLines }) => {
      const { source, pdfPage } = pdfFixture(textLines);
      // Reviewed PDF.js constructPath shape: showText then stroke/closeStroke.
      // Extracted headings omit the questions; the rendered raster contains ink.
      pdfPage.getOperatorList.mockResolvedValue({
        fnArray: [44, 91, 91],
        argsArray: [[], [20, [null], null], [21, [null], null]],
      });
      pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
      const result = await renderStudioPagePreview(
        source,
        1,
        new AbortController().signal,
      );
      expect(result.inkRatio).toBe(0.5);
      expect(result.autoOut).toBeUndefined();
      expect(pdfPage.getTextContent).not.toHaveBeenCalled();
      expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
    },
  );

  it("excludes rendered white pixels regardless of extractable metadata", async () => {
    const { source, pdfPage } = pdfFixture(candidates[0].textLines);
    pixels = raster();
    const result = await renderStudioPagePreview(
      source,
      1,
      new AbortController().signal,
    );
    expect(result.inkRatio).toBe(0);
    expect(result.autoOut).toBe("빈 쪽");
    expect(pdfPage.getTextContent).not.toHaveBeenCalled();
    expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
  });

  it("retains faint rendered ink", async () => {
    pixels = raster(254);
    const { source } = pdfFixture();
    const result = await renderStudioPagePreview(
      source,
      1,
      new AbortController().signal,
    );
    expect(result.inkRatio).toBe(1);
    expect(result.autoOut).toBeUndefined();
  });

  it.each(["text", "operators", "both"])(
    "completes promptly without calling never-settling %s APIs",
    async (pending) => {
      vi.useFakeTimers();
      const { source, pdfPage } = pdfFixture();
      if (pending !== "operators")
        pdfPage.getTextContent.mockReturnValue(new Promise(() => {}));
      if (pending !== "text")
        pdfPage.getOperatorList.mockReturnValue(new Promise(() => {}));
      const settled = vi.fn();
      const preview = renderStudioPagePreview(
        source,
        1,
        new AbortController().signal,
      );
      void preview.then(settled, settled);
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toHaveBeenCalledOnce();
      expect((await preview).url).toMatch(/^data:image/);
      expect(pdfPage.getTextContent).not.toHaveBeenCalled();
      expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("keeps a page if its pixels cannot be read", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getImageData: () => {
        throw new Error("raster unavailable");
      },
    } as unknown as CanvasRenderingContext2D);
    const { source } = pdfFixture();
    const result = await renderStudioPagePreview(
      source,
      1,
      new AbortController().signal,
    );
    expect(result.autoOut).toBeUndefined();
    expect(result.inkRatio).toBeUndefined();
    expect(result.url).toMatch(/^data:image/);
  });

  it.each([0, 254, 255])(
    "uses the same raster rule for an image with channel %i",
    async (value) => {
      pixels = raster(value);
      const image = document.createElement("canvas");
      image.width = 200;
      image.height = 300;
      const result = await renderStudioPagePreview(
        { image },
        1,
        new AbortController().signal,
      );
      expect(result.autoOut).toBe(value === 255 ? "빈 쪽" : undefined);
    },
  );
});

describe("bounded PDF preview waits", () => {
  it("rejects an already-aborted request without requesting a page", async () => {
    const { source, pdf, pdfPage } = pdfFixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      renderStudioPagePreview(source, 1, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(pdf.getPage).not.toHaveBeenCalled();
    expect(pdfPage.render).not.toHaveBeenCalled();
    expect(pdf.destroy).not.toHaveBeenCalled();
  });

  for (const stage of ["getPage", "render"] as const) {
    for (const stop of ["abort", "timeout"] as const) {
      it.each(["resolve", "reject"] as const)(
        `${stop}s a never-settling ${stage} without destroying the shared PDF, ignoring late %s`,
        async (late) => {
          vi.useFakeTimers();
          const { source, pdf, pdfPage, task } = pdfFixture();
          const pageWait = deferred<typeof pdfPage>();
          const renderWait = deferred<void>();
          if (stage === "getPage")
            pdf.getPage.mockReturnValue(pageWait.promise);
          else task.promise = renderWait.promise;
          const controller = new AbortController();
          const add = vi.spyOn(controller.signal, "addEventListener");
          const remove = vi.spyOn(controller.signal, "removeEventListener");
          const settled = vi.fn();
          const preview = renderStudioPagePreview(source, 1, controller.signal);
          void preview.then(settled, settled);
          await vi.advanceTimersByTimeAsync(0);
          if (stop === "abort") controller.abort();
          else {
            await vi.advanceTimersByTimeAsync(9999);
            expect(settled).not.toHaveBeenCalled();
          }
          await vi.advanceTimersByTimeAsync(stop === "abort" ? 0 : 1);
          expect(settled).toHaveBeenCalledOnce();
          await expect(preview).rejects.toMatchObject({
            name: stop === "abort" ? "AbortError" : "TimeoutError",
          });
          expect(task.cancel).toHaveBeenCalledTimes(stage === "render" ? 1 : 0);
          expect(pdf.destroy).not.toHaveBeenCalled();
          expect(vi.getTimerCount()).toBe(0);
          for (const [type, listener] of add.mock.calls)
            expect(remove).toHaveBeenCalledWith(type, listener);
          if (late === "resolve") {
            pageWait.resolve(pdfPage);
            renderWait.resolve();
          } else if (stage === "getPage")
            pageWait.reject(new Error("late page failure"));
          else renderWait.reject(new Error("late render failure"));
          controller.abort();
          await vi.advanceTimersByTimeAsync(20_000);
          expect(settled).toHaveBeenCalledOnce();
          if (stage === "getPage")
            expect(pdfPage.render).not.toHaveBeenCalled();
          expect(vi.getTimerCount()).toBe(0);
        },
      );
    }

    it(`cleans up after a ${stage} failure and preserves the original error`, async () => {
      vi.useFakeTimers();
      const { source, pdf, task } = pdfFixture();
      const failure = new Error(`${stage} failed`);
      if (stage === "getPage") pdf.getPage.mockRejectedValue(failure);
      else task.promise = Promise.reject(failure);
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      await expect(
        renderStudioPagePreview(source, 1, controller.signal),
      ).rejects.toBe(failure);
      expect(vi.getTimerCount()).toBe(0);
      for (const [type, listener] of add.mock.calls)
        expect(remove).toHaveBeenCalledWith(type, listener);
      expect(pdf.destroy).not.toHaveBeenCalled();
    });
  }

  it("cleans timers/listeners after a normal preview without cancelling the shared PDF", async () => {
    vi.useFakeTimers();
    const { source, pdf, pdfPage, task } = pdfFixture();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = await renderStudioPagePreview(source, 2, controller.signal);
    expect(result.url).toMatch(/^data:image/);
    expect(pdf.getPage).toHaveBeenCalledWith(2);
    expect(pdfPage.render).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    for (const [type, listener] of add.mock.calls)
      expect(remove).toHaveBeenCalledWith(type, listener);
    controller.abort();
    expect(task.cancel).not.toHaveBeenCalled();
    expect(pdf.destroy).not.toHaveBeenCalled();
  });
});
