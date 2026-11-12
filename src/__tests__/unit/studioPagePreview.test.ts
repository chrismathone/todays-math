import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  renderStudioPagePreview,
  studioPdfTextLines,
} from "@/components/unified/studioPagePreview";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,cGFnZQ==",
  );
});
afterEach(() => vi.restoreAllMocks());
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
