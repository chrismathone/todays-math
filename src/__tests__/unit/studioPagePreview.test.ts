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
    showText: 44,
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
afterEach(() => vi.restoreAllMocks());

function pdfSource(
  textLines: readonly string[],
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>,
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
