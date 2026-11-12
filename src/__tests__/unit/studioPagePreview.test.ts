import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { OPS } from "pdfjs-dist";
import {
  renderStudioPagePreview,
  studioPdfTextLines,
} from "@/components/unified/studioPagePreview";

vi.mock("pdfjs-dist", () => ({
  OPS: {
    save: 10,
    restore: 11,
    stroke: 20,
    closeStroke: 21,
    fill: 22,
    eoFill: 23,
    fillStroke: 24,
    eoFillStroke: 25,
    closeFillStroke: 26,
    closeEOFillStroke: 27,
    endPath: 28,
    showText: 44,
    shadingFill: 62,
    paintFormXObjectBegin: 74,
    paintFormXObjectEnd: 75,
    paintImageMaskXObject: 83,
    paintImageMaskXObjectGroup: 84,
    paintImageXObject: 85,
    paintInlineImageXObject: 86,
    paintInlineImageXObjectGroup: 87,
    paintImageXObjectRepeat: 88,
    paintImageMaskXObjectRepeat: 89,
    paintSolidColorImageMask: 90,
    constructPath: 91,
    rawFillPath: 94,
  },
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,cGFnZQ==",
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type OperatorList = { fnArray: number[]; argsArray: unknown[] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function pdfSource(
  textLines: readonly string[],
  getOperatorList: () => Promise<OperatorList>,
) {
  return {
    pdf: {
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 200 * scale,
          height: 300 * scale,
        }),
        getTextContent: async () => ({
          items: textLines.map((str) => ({ str, hasEOL: true })),
        }),
        getOperatorList,
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      }),
    },
  } as never;
}

const textCandidates = [
  { textLines: ["문제지", "2학년", "유의 사항"], expected: "표지" },
  { textLines: ["빠른 정답", "01 ③", "02 ⑤"], expected: "정답표" },
] as const;

describe.each(textCandidates)(
  "$expected text with vector questions",
  ({ textLines, expected }) => {
    it.each(
      (
        [
          "fill",
          "eoFill",
          "fillStroke",
          "eoFillStroke",
          "closeFillStroke",
          "closeEOFillStroke",
          "rawFillPath",
          "shadingFill",
        ] as const
      ).flatMap((name) => [false, true].map((wrapped) => ({ name, wrapped }))),
    )(
      "retains $name paints, constructPath=$wrapped",
      async ({ name, wrapped }) => {
        const result = await renderStudioPagePreview(
          pdfSource(textLines, async () => ({
            fnArray: [
              OPS.showText,
              OPS.paintFormXObjectBegin,
              wrapped ? OPS.constructPath : OPS[name],
              OPS.paintFormXObjectEnd,
            ],
            // PDF.js 6 stores the paint op as constructPath's first argument;
            // rawFillPath includes compiled Type3 glyph outlines.
            argsArray: [[], [], wrapped ? [OPS[name], [null], null] : [], []],
          })),
          1,
          new AbortController().signal,
        );
        expect(
          result.autoOut,
          `${name}, constructPath=${wrapped}`,
        ).toBeUndefined();
        expect(result.url).toMatch(/^data:image/);
      },
    );

    it.each(["stroke", "closeStroke", "endPath"] as const)(
      "still excludes a verified text-only page with %s paths",
      async (name) => {
        const result = await renderStudioPagePreview(
          pdfSource(textLines, async () => ({
            fnArray: [OPS.showText, OPS.constructPath],
            argsArray: [[], [OPS[name], [null], null]],
          })),
          1,
          new AbortController().signal,
        );
        expect(result.autoOut).toBe(expected);
      },
    );

    it("keeps a page if constructPath's paint could not be verified", async () => {
      const result = await renderStudioPagePreview(
        pdfSource(textLines, async () => ({
          fnArray: [OPS.constructPath],
          argsArray: [],
        })),
        1,
        new AbortController().signal,
      );
      expect(result.autoOut).toBeUndefined();
    });

    it("keeps Type3 vector glyphs whose paints live outside the page operator list", async () => {
      const result = await renderStudioPagePreview(
        pdfSource(textLines, async () => ({
          fnArray: [OPS.showText],
          // PDF.js keeps Type3 charProcOperatorList on the font, referenced by
          // this glyph id. Its fill/image paints are absent from page.fnArray.
          argsArray: [[[{ operatorListId: "outlined-question", unicode: "" }]]],
        })),
        1,
        new AbortController().signal,
      );
      expect(result.autoOut).toBeUndefined();
    });
  },
);

it("retains a filled vector-only page even when raster measurements are blank", async () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }),
  } as unknown as CanvasRenderingContext2D);
  const result = await renderStudioPagePreview(
    pdfSource([], async () => ({
      fnArray: [OPS.constructPath],
      argsArray: [[OPS.rawFillPath, [null], null]],
    })),
    1,
    new AbortController().signal,
  );
  expect(result.autoOut).toBeUndefined();
});

describe("bounded operator inspection", () => {
  it.each(textCandidates)(
    "returns a $expected candidate after 3 seconds and ignores late operators",
    async ({ textLines }) => {
      vi.useFakeTimers();
      const operators = deferred<OperatorList>();
      const getOperatorList = vi.fn(() => operators.promise);
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const settled = vi.fn();
      const preview = renderStudioPagePreview(
        pdfSource(textLines, getOperatorList),
        1,
        controller.signal,
      );
      void preview.then(settled, settled);
      await vi.advanceTimersByTimeAsync(0);
      expect(getOperatorList).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(2999);
      expect(settled).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toHaveBeenCalledOnce();
      const result = await preview;
      expect(result.autoOut).toBeUndefined();
      expect(result.url).toMatch(/^data:image/);
      expect(vi.getTimerCount()).toBe(0);
      for (const [type, listener] of add.mock.calls)
        expect(remove).toHaveBeenCalledWith(type, listener);
      operators.resolve({ fnArray: [OPS.showText], argsArray: [[]] });
      await vi.advanceTimersByTimeAsync(0);
      controller.abort();
      expect(settled).toHaveBeenCalledOnce();
      expect(result.autoOut).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("does not auto-exclude a white page after operator timeout or leak a late rejection", async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getImageData: () => ({
        data: new Uint8ClampedArray([255, 255, 255, 255]),
      }),
    } as unknown as CanvasRenderingContext2D);
    const operators = deferred<OperatorList>();
    const settled = vi.fn();
    const preview = renderStudioPagePreview(
      pdfSource([], () => operators.promise),
      1,
      new AbortController().signal,
    );
    void preview.then(settled, settled);
    await vi.advanceTimersByTimeAsync(3000);
    expect(settled).toHaveBeenCalledOnce();
    const result = await preview;
    expect(result.autoOut).toBeUndefined();
    operators.reject(new Error("operator list failed after timeout"));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toHaveBeenCalledOnce();
    expect(result.autoOut).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["resolve", "reject"] as const)(
    "aborts an in-flight operator wait promptly and ignores late %s",
    async (late) => {
      vi.useFakeTimers();
      const operators = deferred<OperatorList>();
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const getOperatorList = vi.fn(() => operators.promise);
      const settled = vi.fn();
      const preview = renderStudioPagePreview(
        pdfSource(textCandidates[0].textLines, getOperatorList),
        1,
        controller.signal,
      );
      void preview.then(settled, settled);
      await vi.advanceTimersByTimeAsync(0);
      expect(getOperatorList).toHaveBeenCalledOnce();
      controller.abort();
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toHaveBeenCalledOnce();
      await expect(preview).rejects.toMatchObject({ name: "AbortError" });
      expect(vi.getTimerCount()).toBe(0);
      for (const [type, listener] of add.mock.calls)
        expect(remove).toHaveBeenCalledWith(type, listener);
      if (late === "resolve")
        operators.resolve({ fnArray: [OPS.showText], argsArray: [[]] });
      else operators.reject(new Error("operator list failed after abort"));
      await vi.advanceTimersByTimeAsync(4000);
      expect(settled).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("cleans the timer and listener after successful or failed inspection", async () => {
    vi.useFakeTimers();
    for (const fail of [false, true]) {
      const controller = new AbortController();
      const add = vi.spyOn(controller.signal, "addEventListener");
      const remove = vi.spyOn(controller.signal, "removeEventListener");
      const result = await renderStudioPagePreview(
        pdfSource(textCandidates[0].textLines, async () => {
          if (fail) throw new Error("operator failure");
          return { fnArray: [OPS.showText], argsArray: [[]] };
        }),
        1,
        controller.signal,
      );
      expect(result.autoOut).toBe(fail ? undefined : "표지");
      expect(vi.getTimerCount()).toBe(0);
      for (const [type, listener] of add.mock.calls)
        expect(remove).toHaveBeenCalledWith(type, listener);
    }
  });
});

describe.each(textCandidates)(
  "$expected text with PDF image questions",
  ({ textLines, expected }) => {
    it.each([
      "paintImageXObject",
      "paintInlineImageXObject",
      "paintInlineImageXObjectGroup",
      "paintImageXObjectRepeat",
      "paintImageMaskXObject",
      "paintImageMaskXObjectGroup",
      "paintImageMaskXObjectRepeat",
      "paintSolidColorImageMask",
    ] as const)(
      "retains the page for %s anywhere in the operator list",
      async (operation) => {
        const getOperatorList = vi.fn(async () => ({
          // Include nested form markers and preceding text: neither may hide the image.
          fnArray: [
            OPS.showText,
            OPS.paintFormXObjectBegin,
            OPS[operation],
            OPS.paintFormXObjectEnd,
          ],
          argsArray: [[], [], [], []],
        }));
        const result = await renderStudioPagePreview(
          pdfSource(textLines, getOperatorList),
          1,
          new AbortController().signal,
        );
        expect(result.autoOut).toBeUndefined();
        expect(result.url).toMatch(/^data:image/);
        expect(getOperatorList).toHaveBeenCalledOnce();
      },
    );

    it("retains the page if the operator list cannot be read", async () => {
      const result = await renderStudioPagePreview(
        pdfSource(textLines, async () => {
          throw new Error("operator list unavailable");
        }),
        1,
        new AbortController().signal,
      );
      expect(result.autoOut).toBeUndefined();
      expect(result.url).toMatch(/^data:image/);
    });

    it("still excludes an explicit text-only page after checking the operator list", async () => {
      const getOperatorList = vi.fn(async () => ({
        fnArray: [
          OPS.save,
          OPS.paintFormXObjectBegin,
          OPS.showText,
          OPS.paintFormXObjectEnd,
          OPS.restore,
        ],
        argsArray: [[], [], [], [], []],
      }));
      const result = await renderStudioPagePreview(
        pdfSource(textLines, getOperatorList),
        1,
        new AbortController().signal,
      );
      expect(result.autoOut).toBe(expected);
      expect(getOperatorList).toHaveBeenCalledOnce();
    });
  },
);

it("keeps touching PDF fragments together, including Korean grade labels", () => {
  expect(
    studioPdfTextLines([
      { str: "2", width: 7, transform: [12, 0, 0, 12, 63, 711] },
      {
        str: "학년",
        width: 24,
        transform: [12, 0, 0, 12, 70, 711],
        hasEOL: true,
      },
    ]),
  ).toEqual(["2학년"]);
});
it("joins PDF text fragments on each baseline so line-start question numbers survive", () => {
  expect(
    studioPdfTextLines([
      { str: "01", transform: [1, 0, 0, 1, 10, 700] },
      { str: "값을 구하시오", transform: [1, 0, 0, 1, 30, 700], hasEOL: true },
      { str: "정답", transform: [1, 0, 0, 1, 10, 650] },
    ]),
  ).toEqual(["01 값을 구하시오", "정답"]);
});
it("uses the existing PDF renderer and returns only local preview and conservative analysis", async () => {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const result = await renderStudioPagePreview(
    {
      pdf: {
        getPage: async () => ({
          getViewport: ({ scale }: { scale: number }) => ({
            width: 200 * scale,
            height: 300 * scale,
          }),
          getTextContent: async () => ({ items: [{ str: "1. 문제" }] }),
          render,
        }),
      },
    } as never,
    1,
    new AbortController().signal,
  );
  expect(render).toHaveBeenCalledOnce();
  expect(result.url).toMatch(/^data:image/);
  expect(result.autoOut).toBeUndefined();
});
