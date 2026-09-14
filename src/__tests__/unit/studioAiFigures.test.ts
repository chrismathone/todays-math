import { afterEach, describe, expect, it, vi } from "vitest";
import {
  studioAiFigureRect,
  studioAiFigures,
  studioImageCanvas,
} from "@/components/unified/studioAiHelpers";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import { createWorkspaceDraftStore } from "@/components/unified/draftStore";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function pixels() {
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,YWJj",
  );
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 800;
  return { canvas, drawImage };
}

describe("Studio figure coordinates and source pixels", () => {
  const parent = { x: 0.25, y: 0.125, width: 0.5, height: 0.5 };
  it("maps crop-relative detections to the page while extracting only the crop pixels", () => {
    const { canvas, drawImage } = pixels();
    const result = studioAiFigures(
      canvas,
      [{ bbox: { left: 250, top: 250, width: 500, height: 250 } }],
      parent,
      parent,
    );
    expect(result.figures[0]).toMatchObject({
      rect: { x: 0.375, y: 0.25, width: 0.25, height: 0.125 },
      image: "data:image/png;base64,YWJj",
    });
    expect(drawImage).toHaveBeenCalledWith(
      canvas,
      250,
      200,
      500,
      200,
      0,
      0,
      500,
      200,
    );
    expect(result.warnings).toEqual([]);
  });

  it("intersects page-coordinate figures with their problem without treating them as crop-relative", () => {
    expect(
      studioAiFigureRect({ left: 0, top: 0, width: 500, height: 500 }, parent),
    ).toEqual({
      x: 0.25,
      y: 0.125,
      width: 0.25,
      height: 0.375,
    });
    expect(
      studioAiFigureRect(
        { left: 750, top: 750, width: 100, height: 100 },
        parent,
      ),
    ).toBeNull();
  });

  it("drops invalid, outside-parent, and tiny boxes with a warning while keeping a usable figure", () => {
    const { canvas, drawImage } = pixels();
    const result = studioAiFigures(
      canvas,
      [
        { bbox: { left: NaN, top: 0, width: 100, height: 100 } },
        { bbox: { left: -1, top: 200, width: 500, height: 100 } },
        { bbox: { left: 900, top: 200, width: 101, height: 100 } },
        { bbox: { left: 800, top: 800, width: 100, height: 100 } },
        { bbox: { left: 300, top: 300, width: 1, height: 1 } },
        { bbox: { left: 300, top: 300, width: 100, height: 100 } },
      ],
      parent,
    );
    expect(result.figures).toHaveLength(1);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(result.warnings.join(" ")).toContain("5개를 제외");
  });

  it("surfaces canvas failures for retry instead of treating them as an empty detection", () => {
    const { canvas } = pixels();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() =>
      studioAiFigures(
        canvas,
        [{ bbox: { left: 300, top: 300, width: 100, height: 100 } }],
        parent,
      ),
    ).toThrow("이미지를 만들");
  });

  it.each(["abort", "error"])("cleans up crop decoding on %s", async (mode) => {
    const source = document.createElement("img");
    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          return source;
        }
      },
    );
    const controller = new AbortController();
    const pending = studioImageCanvas(
      "data:image/png;base64,YWJj",
      controller.signal,
    );
    const rejection = expect(pending).rejects.toThrow(
      mode === "abort" ? "작업 취소" : "원본 문제 이미지를 읽지 못했습니다",
    );
    if (mode === "abort") controller.abort();
    else source.dispatchEvent(new Event("error"));
    await rejection;
    expect(source.onload).toBeNull();
    expect(source.onerror).toBeNull();
  });
});

describe("Studio figure export", () => {
  const crop: StudioCrop = {
    id: "crop",
    sourceId: "source",
    sourceLabel: "sheet.pdf",
    page: 1,
    rect: { x: 0, y: 0, width: 0.5, height: 0.5 },
    image: "data:image/png;base64,cGFnZQ==",
    content: String.raw`$\frac{9}{4}$을 계산하세요.`,
    answer: "",
    solution: "",
    level: "elementary",
    grade: "초5",
    mode: "text",
    added: false,
    sourceSize: { width: 1200, height: 1600 },
    sourceWidthMm: 210,
    figures: [
      {
        id: "figure",
        rect: { x: 0.125, y: 0.25, width: 0.25, height: 0.125 },
        image: "data:image/png;base64,YWJj",
      },
    ],
  };

  it("exports text with figure URLs, pixel dimensions and measured source width through draft reload", () => {
    const exported = studioProblem(crop);
    expect(exported).toMatchObject({
      content: crop.content,
      figureUrls: [crop.figures![0].image],
      figureDims: [300, 200],
      figureSourceMm: [52.5],
    });
    expect(exported.croppedImage).toBeUndefined();
    const saved = new Map<string, string>();
    const access = () => ({
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    });
    const store = createWorkspaceDraftStore(access);
    store.hydrate();
    store.setProblems([exported]);
    expect(store.saveNow()).toBe(true);
    const reloaded = createWorkspaceDraftStore(access);
    reloaded.hydrate();
    expect(reloaded.getSnapshot().draft.problems[0]).toEqual(exported);
  });

  it("keeps full image mode without duplicate figures and handles old crops with unknown metrics", () => {
    const image = studioProblem({ ...crop, mode: "image" });
    expect(image).toMatchObject({
      croppedImage: crop.image,
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
    });
    expect(studioProblem({ ...crop, figures: undefined }).figureUrls).toEqual(
      [],
    );
    const unknown = studioProblem({
      ...crop,
      sourceSize: undefined,
      sourceWidthMm: undefined,
    });
    expect(unknown.figureUrls).toEqual([crop.figures![0].image]);
    expect(unknown.figureDims).toEqual([]);
    expect(unknown.figureSourceMm).toEqual([]);
  });
});
