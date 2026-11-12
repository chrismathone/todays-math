import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  renderStudioPagePreview,
  type StudioPagePreview,
} from "@/components/unified/studioPagePreview";

type ReadRaster = (
  x: number,
  y: number,
  width: number,
  height: number,
) => { data: Uint8ClampedArray };

interface CanvasRead {
  canvas: HTMLCanvasElement;
  read: ReturnType<typeof vi.fn<ReadRaster>>;
  draw: ReturnType<typeof vi.fn>;
  value: number;
}
let canvases: CanvasRead[];
let values: number[];

beforeEach(() => {
  canvases = [];
  values = [0, 255];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const state: CanvasRead = {
        canvas: this,
        value: values[canvases.length] ?? 255,
        read: vi.fn<ReadRaster>(),
        draw: vi.fn(),
      };
      state.read.mockImplementation((_x, _y, width: number, height: number) => {
        const data = new Uint8ClampedArray(width * height * 4).fill(255);
        data.set([state.value, state.value, state.value, 255]);
        return { data };
      });
      canvases.push(state);
      return {
        getImageData: state.read,
        fillRect: vi.fn(),
        drawImage: state.draw,
        translate: vi.fn(),
        rotate: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    },
  );
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
  const thumbnail = { promise: Promise.resolve(), cancel: vi.fn() };
  const confirmation = { promise: Promise.resolve(), cancel: vi.fn() };
  const pdfPage = {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: 595 * scale,
      height: 842 * scale,
    })),
    getTextContent: vi.fn(async (): Promise<unknown> => ({
      items: textLines.map((str) => ({ str, hasEOL: true })),
    })),
    getOperatorList: vi.fn(() => new Promise(() => {})),
    cleanup: vi.fn(() => true),
    render: vi
      .fn()
      .mockReturnValueOnce(thumbnail)
      .mockReturnValue(confirmation),
  };
  const pdf = {
    getPage: vi.fn<(page: number) => Promise<typeof pdfPage>>(
      async () => pdfPage,
    ),
    destroy: vi.fn(),
  };
  return {
    source: { pdf: pdf as unknown as PDFDocumentProxy },
    pdf,
    pdfPage,
    thumbnail,
    confirmation,
  };
}
const signal = () => new AbortController().signal;

function expectRetryable(
  result: Awaited<ReturnType<typeof renderStudioPagePreview>>,
) {
  expect(result.url).toMatch(/^data:image/);
  expect(result.error).toEqual(expect.any(String));
  expect(result.error?.length).toBeGreaterThan(0);
  expect(result.autoOut).toBeUndefined();
}

function expectReleased() {
  for (const { canvas } of canvases) {
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  }
}

describe("incremental thumbnails and page resource ownership", () => {
  it("publishes URL and ink before text verification finishes, with final classification only in the return", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdfPage, pdf } = pdfFixture();
    const text = deferred<unknown>();
    pdfPage.getTextContent.mockReturnValue(text.promise);
    const onPreview = vi.fn<(preview: StudioPagePreview) => void>();
    const settled = vi.fn();
    const pending = renderStudioPagePreview(source, 1, signal(), { onPreview });
    void pending.then(settled, settled);
    await vi.advanceTimersByTimeAsync(0);
    expect(onPreview).toHaveBeenCalledOnce();
    const early = onPreview.mock.calls[0][0];
    expect(early).toEqual({
      url: "data:image/png;base64,cGFnZQ==",
      inkRatio: 0,
    });
    expect(onPreview.mock.invocationCallOrder[0]).toBeLessThan(
      pdfPage.getTextContent.mock.invocationCallOrder[0],
    );
    expect(settled).not.toHaveBeenCalled();
    expect(pdfPage.cleanup).not.toHaveBeenCalled();
    text.resolve({ items: [] });
    expect((await pending).autoOut).toBe("빈 쪽");
    expect(early.autoOut).toBeUndefined();
    expect(onPreview).toHaveBeenCalledOnce();
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    expect(pdf.destroy).not.toHaveBeenCalled();
    expectReleased();
  });

  it.each(["pdf", "image"] as const)(
    "publishes a completed noncandidate %s thumbnail too",
    async (kind) => {
      const { source, pdfPage } = pdfFixture();
      const image = document.createElement("canvas");
      image.width = 300;
      image.height = 200;
      const onPreview = vi.fn<(preview: StudioPagePreview) => void>();
      const final = await renderStudioPagePreview(
        kind === "pdf" ? source : { image },
        1,
        signal(),
        { onPreview },
      );
      expect(onPreview).toHaveBeenCalledExactlyOnceWith(final);
      expect(final.inkRatio).toBeGreaterThan(0);
      expect(final.autoOut).toBeUndefined();
      expect(pdfPage.cleanup).toHaveBeenCalledTimes(kind === "pdf" ? 1 : 0);
    },
  );

  it("aborts directly from the callback before starting candidate verification", async () => {
    values = [255, 255];
    const { source, pdfPage, pdf } = pdfFixture();
    const controller = new AbortController();
    const onPreview = vi.fn(() => controller.abort());
    await expect(
      renderStudioPagePreview(source, 1, controller.signal, { onPreview }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(onPreview).toHaveBeenCalledOnce();
    expect(pdfPage.getTextContent).not.toHaveBeenCalled();
    expect(pdfPage.render).toHaveBeenCalledOnce();
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    expect(pdf.destroy).not.toHaveBeenCalled();
    expectReleased();
  });

  it("aborts after publication while the high render is pending and discards its late white result", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdfPage, confirmation, pdf } = pdfFixture();
    const high = deferred<void>();
    confirmation.promise = high.promise;
    // PDF.js may defer cleanup until its active renderer finishes.
    pdfPage.cleanup.mockReturnValue(false);
    const controller = new AbortController();
    const onPreview = vi.fn<(preview: StudioPagePreview) => void>();
    const pending = renderStudioPagePreview(source, 1, controller.signal, {
      onPreview,
    });
    const outcome = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(onPreview).toHaveBeenCalledOnce();
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    expect(pdfPage.cleanup).not.toHaveBeenCalled();
    controller.abort();
    expect(await outcome).toMatchObject({ name: "AbortError" });
    expect(confirmation.cancel).toHaveBeenCalledOnce();
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    high.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(onPreview.mock.calls[0][0].autoOut).toBeUndefined();
    expect(onPreview).toHaveBeenCalledOnce();
    expect(pdf.destroy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expectReleased();
  });

  it("keeps the original deadline after early publication rather than granting another 3 seconds", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, thumbnail, pdfPage } = pdfFixture();
    const first = deferred<void>();
    thumbnail.promise = first.promise;
    pdfPage.getTextContent.mockReturnValue(new Promise(() => {}));
    const onPreview = vi.fn<(preview: StudioPagePreview) => void>();
    const pending = renderStudioPagePreview(source, 1, signal(), { onPreview });
    const settled = vi.fn();
    void pending.then(settled, settled);
    await vi.advanceTimersByTimeAsync(2500);
    first.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(onPreview).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(499);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expectRetryable(await pending);
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans the page after a text veto and allows the shared document to supply it again", async () => {
    values = [255, 255];
    const { source, pdfPage, pdf } = pdfFixture(["tiny text"]);
    const first = await renderStudioPagePreview(source, 1, signal());
    expect(first.autoOut).toBeUndefined();
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    expect(await pdf.getPage(1)).toBe(pdfPage);
    const next = await renderStudioPagePreview(source, 1, signal());
    expect(next.error).toBeUndefined();
    expect(pdfPage.cleanup).toHaveBeenCalledTimes(2);
    expect(pdf.destroy).not.toHaveBeenCalled();
  });
});

describe("blank-candidate confirmation", () => {
  it.each(["문제지 2학년 유의 사항", "빠른 정답 01 ③ 02 ⑤", "1. 2 + 3 = ?"])(
    "keeps noncandidate ink without text, classifiers, operators or confirmation: %s",
    async (text) => {
      const { source, pdfPage } = pdfFixture([text]);
      const result = await renderStudioPagePreview(source, 1, signal());
      expect(result.autoOut).toBeUndefined();
      expect(result.error).toBeUndefined();
      expect(result.inkRatio).toBeGreaterThan(0);
      expect(pdfPage.getTextContent).not.toHaveBeenCalled();
      expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
      expect(pdfPage.render).toHaveBeenCalledOnce();
    },
  );

  it("A: keeps a white thumbnail with extracted 0.1pt Helvetica text", async () => {
    values = [255];
    const { source, pdfPage } = pdfFixture(["1. 2 + 3 = ?"]);
    const result = await renderStudioPagePreview(source, 1, signal());
    expect(result.inkRatio).toBe(0);
    expect(result.autoOut).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(pdfPage.getTextContent).toHaveBeenCalledOnce();
    expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
    expect(pdfPage.render).toHaveBeenCalledOnce();
  });

  it.each(["문제지", "빠른 정답", "?", "\u200b"])(
    "keeps any actual extracted character without classifying it: %s",
    async (text) => {
      values = [255];
      const { source, pdfPage } = pdfFixture([text]);
      const result = await renderStudioPagePreview(source, 1, signal());
      expect(result.autoOut).toBeUndefined();
      expect(pdfPage.render).toHaveBeenCalledOnce();
    },
  );

  it("B: keeps a white thumbnail when high-resolution raster has one #fefefe pixel", async () => {
    values = [255, 254];
    const { source, pdfPage } = pdfFixture();
    const result = await renderStudioPagePreview(source, 1, signal());
    expect(result.inkRatio).toBe(0);
    expect(result.autoOut).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(pdfPage.getTextContent).toHaveBeenCalledOnce();
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    const viewport = pdfPage.render.mock.calls[1][0].viewport;
    expect(viewport.width).toBe(595 * 2.5);
    expect(viewport.height).toBe(842 * 2.5);
    expect(pdfPage.getOperatorList).not.toHaveBeenCalled();
    expectReleased();
  });

  it("never confirms a small PDF at a lower scale than its thumbnail", async () => {
    values = [255, 255];
    const { source, pdfPage } = pdfFixture();
    pdfPage.getViewport.mockImplementation(({ scale }) => ({
      width: 10 * scale,
      height: 10 * scale,
    }));
    expect((await renderStudioPagePreview(source, 1, signal())).autoOut).toBe(
      "빈 쪽",
    );
    expect(pdfPage.render.mock.calls[1][0].viewport).toEqual(
      pdfPage.render.mock.calls[0][0].viewport,
    );
  });

  it("preserves the rotated thumbnail while checking the unrotated original pixels", async () => {
    values = [255, 255, 254];
    const { source, pdfPage } = pdfFixture();
    const result = await renderStudioPagePreview(
      { ...source, pageRotations: { 1: 90 } },
      1,
      signal(),
    );
    expect(result.autoOut).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(canvases[1].draw).toHaveBeenCalled();
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledOnce();
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    expectReleased();
  });

  it("retains oversized PDF confirmation without downscaling its evidence", async () => {
    values = [255, 255];
    const { source, pdfPage } = pdfFixture();
    pdfPage.getViewport.mockImplementation(({ scale }) => ({
      width: 100_000 * scale,
      height: 100_000 * scale,
    }));
    expectRetryable(await renderStudioPagePreview(source, 1, signal()));
    expect(pdfPage.render).toHaveBeenCalledOnce();
    expectReleased();
  });

  it("excludes true white only after empty text and a successful high raster", async () => {
    values = [255, 255];
    const { source, pdfPage } = pdfFixture(["", " \n\t"]);
    const result = await renderStudioPagePreview(source, 1, signal());
    expect(result.autoOut).toBe("빈 쪽");
    expect(result.error).toBeUndefined();
    expect(pdfPage.getTextContent).toHaveBeenCalledOnce();
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    expect(pdfPage.getTextContent.mock.invocationCallOrder[0]).toBeGreaterThan(
      pdfPage.render.mock.invocationCallOrder[0],
    );
    expect(pdfPage.render.mock.invocationCallOrder[1]).toBeGreaterThan(
      pdfPage.getTextContent.mock.invocationCallOrder[0],
    );
    expectReleased();
  });

  it("allows valid marked-content items without treating them as characters", async () => {
    values = [255, 255];
    const { source, pdfPage } = pdfFixture();
    pdfPage.getTextContent.mockResolvedValue({
      items: [
        { type: "beginMarkedContent" },
        { type: "beginMarkedContentProps", id: "x" },
        { str: " " },
        { type: "endMarkedContent" },
      ],
    });
    expect((await renderStudioPagePreview(source, 1, signal())).autoOut).toBe(
      "빈 쪽",
    );
  });

  it.each([
    null,
    {},
    { items: null },
    { items: [null] },
    { items: [{}] },
    { items: [{ str: 3 }] },
  ])(
    "keeps malformed text and exposes retryable verification failure: %j",
    async (content) => {
      values = [255];
      const { source, pdfPage } = pdfFixture();
      pdfPage.getTextContent.mockResolvedValue(content);
      expectRetryable(await renderStudioPagePreview(source, 1, signal()));
      expect(pdfPage.render).toHaveBeenCalledOnce();
    },
  );

  it.each(["thumbnail", "confirmation"])(
    "keeps unreadable %s pixels and exposes retryable failure",
    async (stage) => {
      values = [255, 255];
      const { source, pdfPage, thumbnail, confirmation } = pdfFixture();
      pdfPage.render.mockReset().mockImplementation(() => {
        const index = canvases.length - 1;
        if (index === (stage === "thumbnail" ? 0 : 1))
          canvases[index].read.mockImplementation(() => {
            throw new Error("unreadable");
          });
        return index === 0 ? thumbnail : confirmation;
      });
      expectRetryable(await renderStudioPagePreview(source, 1, signal()));
      expectReleased();
    },
  );

  it.each([
    new Uint8ClampedArray(),
    new Uint8ClampedArray([255]),
    new Uint8ClampedArray([255, 255, 255, 255]),
  ])(
    "never confirms blank with incomplete/mismatched raster data: %j",
    async (data) => {
      values = [255, 255];
      const { source, pdfPage, confirmation } = pdfFixture();
      pdfPage.render
        .mockReset()
        .mockImplementationOnce(() => ({
          promise: Promise.resolve(),
          cancel: vi.fn(),
        }))
        .mockImplementation(() => {
          canvases[1].read.mockReturnValue({ data });
          return confirmation;
        });
      expectRetryable(await renderStudioPagePreview(source, 1, signal()));
    },
  );
});

describe("native standalone image confirmation", () => {
  it.each([254, 255])(
    "uses at least the original 2480x3508 dimensions, channel %i",
    async (value) => {
      values = [255, value];
      const image = document.createElement("canvas");
      image.width = 2480;
      image.height = 3508;
      const result = await renderStudioPagePreview({ image }, 1, signal());
      expect(result.autoOut).toBe(value === 255 ? "빈 쪽" : undefined);
      expect(result.error).toBeUndefined();
      expect(canvases[1].draw).toHaveBeenCalledWith(image, 0, 0, 2480, 3508);
      expect(image.width).toBe(2480);
      expect(image.height).toBe(3508);
      expectReleased();
    },
  );

  it("uses natural image dimensions, rather than its display dimensions", async () => {
    values = [255, 254];
    const image = new Image();
    image.width = 100;
    image.height = 100;
    Object.defineProperties(image, {
      naturalWidth: { value: 2480 },
      naturalHeight: { value: 3508 },
    });
    const result = await renderStudioPagePreview({ image }, 1, signal());
    expect(result.autoOut).toBeUndefined();
    expect(canvases[1].draw).toHaveBeenCalledWith(image, 0, 0, 2480, 3508);
  });

  it("does not shrink oversized native confirmation then call it blank", async () => {
    values = [255, 255];
    const image = new Image();
    Object.defineProperties(image, {
      naturalWidth: { value: 100_000 },
      naturalHeight: { value: 100_000 },
    });
    const result = await renderStudioPagePreview({ image }, 1, signal());
    expectRetryable(result);
    expect(canvases.flatMap((state) => state.draw.mock.calls).slice(1)).toEqual(
      [],
    );
    expectReleased();
  });

  it("skips confirmation when a standalone thumbnail already has ink", async () => {
    const image = document.createElement("canvas");
    image.width = 300;
    image.height = 200;
    const result = await renderStudioPagePreview({ image }, 1, signal());
    expect(result.autoOut).toBeUndefined();
    expect(canvases).toHaveLength(1);
  });
});

describe("one 3000ms preview deadline and cancellation", () => {
  it("rejects an already-aborted request without requesting a page", async () => {
    const { source, pdf } = pdfFixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      renderStudioPagePreview(source, 1, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(pdf.getPage).not.toHaveBeenCalled();
  });

  for (const stage of [
    "getPage",
    "thumbnail",
    "text",
    "confirmation",
  ] as const) {
    for (const stop of ["abort", "timeout"] as const) {
      it.each(["resolve", "reject"] as const)(
        `${stop} during ${stage} ignores late %s and releases owned resources`,
        async (late) => {
          vi.useFakeTimers();
          values = [255, 255];
          const { source, pdf, pdfPage, thumbnail, confirmation } =
            pdfFixture();
          const wait = deferred<unknown>();
          if (stage === "getPage")
            pdf.getPage.mockReturnValue(
              wait.promise as Promise<typeof pdfPage>,
            );
          if (stage === "thumbnail")
            thumbnail.promise = wait.promise as Promise<void>;
          if (stage === "text")
            pdfPage.getTextContent.mockReturnValue(wait.promise);
          if (stage === "confirmation")
            confirmation.promise = wait.promise as Promise<void>;
          const controller = new AbortController();
          const add = vi.spyOn(controller.signal, "addEventListener");
          const remove = vi.spyOn(controller.signal, "removeEventListener");
          const settled = vi.fn();
          const preview = renderStudioPagePreview(source, 1, controller.signal);
          void preview.then(settled, settled);
          await vi.advanceTimersByTimeAsync(0);
          if (stop === "abort") controller.abort();
          else {
            await vi.advanceTimersByTimeAsync(2999);
            expect(settled).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1);
          }
          await vi.advanceTimersByTimeAsync(0);
          expect(settled).toHaveBeenCalledOnce();
          if (
            stop === "abort" ||
            stage === "getPage" ||
            stage === "thumbnail"
          ) {
            await expect(preview).rejects.toMatchObject({
              name: stop === "abort" ? "AbortError" : "TimeoutError",
            });
          } else expectRetryable(await preview);
          expect(thumbnail.cancel).toHaveBeenCalledTimes(
            stage === "thumbnail" ? 1 : 0,
          );
          expect(confirmation.cancel).toHaveBeenCalledTimes(
            stage === "confirmation" ? 1 : 0,
          );
          expect(pdf.destroy).not.toHaveBeenCalled();
          expect(pdfPage.cleanup).toHaveBeenCalledTimes(
            stage === "getPage" ? 0 : 1,
          );
          expect(vi.getTimerCount()).toBe(0);
          for (const [type, listener] of add.mock.calls)
            expect(remove).toHaveBeenCalledWith(type, listener);
          const renderCalls = pdfPage.render.mock.calls.length;
          if (late === "reject") wait.reject(new Error("late failure"));
          else
            wait.resolve(
              stage === "getPage"
                ? pdfPage
                : stage === "text"
                  ? { items: [] }
                  : undefined,
            );
          controller.abort();
          await vi.advanceTimersByTimeAsync(10_000);
          expect(settled).toHaveBeenCalledOnce();
          expect(pdfPage.render).toHaveBeenCalledTimes(renderCalls);
          expect(pdfPage.cleanup).toHaveBeenCalledTimes(
            stage === "getPage" && late === "reject" ? 0 : 1,
          );
          expect(vi.getTimerCount()).toBe(0);
          expectReleased();
        },
      );
    }
  }

  it("shares the remaining deadline across getPage, thumbnail, text and high render", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdf, pdfPage, thumbnail, confirmation } = pdfFixture();
    const pageWait = deferred<typeof pdfPage>();
    const thumbnailWait = deferred<void>();
    const textWait = deferred<unknown>();
    pdf.getPage.mockReturnValue(pageWait.promise);
    thumbnail.promise = thumbnailWait.promise;
    pdfPage.getTextContent.mockReturnValue(textWait.promise);
    confirmation.promise = new Promise(() => {});
    const settled = vi.fn();
    const preview = renderStudioPagePreview(source, 1, signal());
    void preview.then(settled, settled);
    await vi.advanceTimersByTimeAsync(2000);
    pageWait.resolve(pdfPage);
    await vi.advanceTimersByTimeAsync(400);
    thumbnailWait.resolve();
    await vi.advanceTimersByTimeAsync(400);
    textWait.resolve({ items: [] });
    await vi.advanceTimersByTimeAsync(199);
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expectRetryable(await preview);
    expect(confirmation.cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("counts synchronous thumbnail serialization against the same deadline", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdfPage } = pdfFixture();
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
      () => {
        vi.advanceTimersByTime(3001);
        return "data:image/png;base64,cGFnZQ==";
      },
    );
    expectRetryable(await renderStudioPagePreview(source, 1, signal()));
    expect(pdfPage.getTextContent).not.toHaveBeenCalled();
    expect(pdfPage.render).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("checks elapsed time even when the timeout callback has not run yet", async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const { source, pdf, pdfPage } = pdfFixture();
    const wait = deferred<typeof pdfPage>();
    pdf.getPage.mockReturnValue(wait.promise);
    const preview = renderStudioPagePreview(source, 1, signal());
    const settled = vi.fn();
    void preview.then(settled, settled);
    elapsed = 3001;
    wait.resolve(pdfPage);
    await expect(preview).rejects.toMatchObject({ name: "TimeoutError" });
    expect(pdfPage.render).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not exclude a white high raster whose synchronous read exceeded the deadline", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdfPage, thumbnail, confirmation } = pdfFixture();
    pdfPage.render
      .mockReset()
      .mockImplementationOnce(() => thumbnail)
      .mockImplementation(() => {
        const read = canvases[1].read.getMockImplementation()!;
        canvases[1].read.mockImplementation((...args) => {
          const data = read(...args);
          vi.advanceTimersByTime(3001);
          return data;
        });
        return confirmation;
      });
    expectRetryable(await renderStudioPagePreview(source, 1, signal()));
    expect(vi.getTimerCount()).toBe(0);
    expectReleased();
  });

  it("cannot be held by a throwing render cancellation", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, confirmation } = pdfFixture();
    confirmation.promise = new Promise(() => {});
    confirmation.cancel.mockImplementation(() => {
      throw new Error("cancel failed");
    });
    const preview = renderStudioPagePreview(source, 1, signal());
    await vi.advanceTimersByTimeAsync(3000);
    expectRetryable(await preview);
    expect(confirmation.cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expectReleased();
  });

  it("propagates a render AbortError rather than accepting a stale thumbnail", async () => {
    values = [255, 255];
    const { source, confirmation } = pdfFixture();
    const error = new DOMException("cancelled", "AbortError");
    confirmation.promise = Promise.reject(error);
    void confirmation.promise.catch(() => {});
    await expect(renderStudioPagePreview(source, 1, signal())).rejects.toBe(
      error,
    );
    expectReleased();
  });

  it.each(["getPage", "thumbnail", "text", "confirmation"] as const)(
    "cleans up %s failures; only post-thumbnail failures preserve a URL",
    async (stage) => {
      vi.useFakeTimers();
      values = [255, 255];
      const { source, pdf, pdfPage, thumbnail, confirmation } = pdfFixture();
      const failure = new Error(`${stage} failed`);
      if (stage === "getPage") pdf.getPage.mockRejectedValue(failure);
      if (stage === "thumbnail") thumbnail.promise = Promise.reject(failure);
      if (stage === "text") pdfPage.getTextContent.mockRejectedValue(failure);
      if (stage === "confirmation")
        confirmation.promise = Promise.reject(failure);
      // Consume precreated task rejection before the async pipeline reaches it.
      void thumbnail.promise.catch(() => {});
      void confirmation.promise.catch(() => {});
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const preview = renderStudioPagePreview(source, 1, controller.signal);
      if (stage === "getPage" || stage === "thumbnail")
        await expect(preview).rejects.toBe(failure);
      else expectRetryable(await preview);
      expect(vi.getTimerCount()).toBe(0);
      for (const [type, listener] of add.mock.calls)
        expect(remove).toHaveBeenCalledWith(type, listener);
      expect(pdf.destroy).not.toHaveBeenCalled();
      expect(pdfPage.cleanup).toHaveBeenCalledTimes(
        stage === "getPage" ? 0 : 1,
      );
      expectReleased();
    },
  );

  it("releases timers, listeners and canvases after normal blank confirmation", async () => {
    vi.useFakeTimers();
    values = [255, 255];
    const { source, pdf, pdfPage, thumbnail, confirmation } = pdfFixture();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    expect(
      (await renderStudioPagePreview(source, 2, controller.signal)).autoOut,
    ).toBe("빈 쪽");
    expect(pdf.getPage).toHaveBeenCalledWith(2);
    expect(pdfPage.render).toHaveBeenCalledTimes(2);
    expect(pdfPage.cleanup).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    for (const [type, listener] of add.mock.calls)
      expect(remove).toHaveBeenCalledWith(type, listener);
    controller.abort();
    expect(thumbnail.cancel).not.toHaveBeenCalled();
    expect(confirmation.cancel).not.toHaveBeenCalled();
    expectReleased();
  });

  it("keeps later pages usable after a failed candidate verification", async () => {
    vi.useFakeTimers();
    values = [255];
    const { source, pdfPage } = pdfFixture();
    pdfPage.getTextContent.mockReturnValue(new Promise(() => {}));
    const first = renderStudioPagePreview(source, 1, signal());
    await vi.advanceTimersByTimeAsync(3000);
    expectRetryable(await first);
    values = [0];
    canvases = [];
    const next = pdfFixture();
    const result = await renderStudioPagePreview(next.source, 2, signal());
    expect(result.error).toBeUndefined();
    expect(result.autoOut).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
