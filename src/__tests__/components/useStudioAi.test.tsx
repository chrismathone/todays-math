import { StrictMode, useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useStudioAi,
  type StudioAiPage,
} from "@/components/unified/useStudioAi";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import type { DevAiResponse } from "@/lib/dev-ai/contracts";
import * as imageHelpers from "@/components/unified/studioAiHelpers";

const bridge = vi.hoisted(() => ({
  run: vi.fn(),
  cancel: vi.fn(),
  enabled: true,
  status: "ready",
}));
vi.mock("@/components/unified/useDevAi", () => ({
  useDevAi: () => ({
    provider: "codex",
    checking: false,
    activity: null,
    statusError: "",
    run: bridge.run,
    cancel: bridge.cancel,
    status: {
      enabled: bridge.enabled,
      providers: [
        { id: "codex", status: bridge.status, detail: "CLI 로그인 필요" },
      ],
    },
  }),
}));
const crop = (id: string, content = ""): StudioCrop => ({
  id,
  content,
  sourceId: "source",
  sourceLabel: "sheet.png",
  page: 1,
  rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
  image: `data:image/png;base64,${id}`,
  answer: "",
  solution: "",
  grade: "초5",
  level: "elementary",
  mode: "image",
  added: false,
});
const response = (action: DevAiResponse["action"] = "ocr"): DevAiResponse => ({
  provider: "codex",
  action,
  result: {
    content: String.raw`$\frac{7}{3}$을 계산하세요.`,
    answer: String.raw`$\frac{7}{3}$`,
    solution: "풀이 결과",
    warnings: ["원본 도형을 확인하세요."],
  },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mount(initial = [crop("a")]) {
  return renderHook(
    ({ contextKey, active }) => {
      const [crops, setCrops] = useState(initial);
      const studio = useStudioAi({
        crops,
        setCrops,
        contextKey,
        active,
        onDetected: vi.fn(),
      });
      return { ...studio, crops, setCrops };
    },
    {
      initialProps: { contextKey: "source:1", active: true },
      wrapper: StrictMode,
    },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  bridge.enabled = true;
  bridge.status = "ready";
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Studio AI owner", () => {
  it("never dispatches on mount and retains source pixels/fractions after explicit OCR", async () => {
    bridge.run.mockResolvedValue(response());
    const { result } = mount();
    expect(bridge.run).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      image: crop("a").image,
      mode: "image",
      content: response().result.content,
      aiWarnings: response().result.warnings,
    });
    expect(studioProblem(result.current.crops[0]).croppedImage).toBe(
      crop("a").image,
    );
    expect(result.current.crops[0].answer).toBe(String.raw`$\frac{7}{3}$`);
  });

  it("sends the corrected content, original image and grade when solving", async () => {
    bridge.run.mockResolvedValue(response("solution"));
    const { result } = mount([crop("a", "수정한 문제")]);
    await act(async () => {
      await result.current.processCrops("solution", ["a"]);
    });
    expect(bridge.run).toHaveBeenCalledWith(
      {
        action: "solution",
        content: "수정한 문제",
        imageDataUrl: crop("a").image,
        grade: "초5",
      },
      expect.any(AbortSignal),
    );
    expect(result.current.crops[0]).toMatchObject({
      content: "수정한 문제",
      solution: "풀이 결과",
      mode: "image",
    });
  });

  it.each(["content", "answer", "solution"] as const)(
    "keeps manual %s edits, even when the text is changed back during the request",
    async (field) => {
      const pending = deferred<DevAiResponse>();
      bridge.run.mockReturnValue(pending.promise);
      const { result } = mount([crop("a", "원래 문제")]);
      let work!: Promise<void>;
      act(() => {
        work = result.current.processCrops("solution", ["a"]);
      });
      act(() => {
        result.current.setCrops((items) =>
          items.map((item) => ({ ...item, [field]: "편집", revision: 1 })),
        );
      });
      act(() => {
        result.current.setCrops((items) =>
          items.map((item) => ({
            ...item,
            [field]: crop("a", "원래 문제")[field],
            revision: 2,
          })),
        );
      });
      await act(async () => {
        pending.resolve(response("solution"));
        await work;
      });
      expect(result.current.crops[0].solution).toBe("");
      expect(result.current.message).toContain("수정되거나 제외된 1문항");
    },
  );

  it("runs a batch sequentially and stops its remaining queue on cancel", async () => {
    const first = deferred<DevAiResponse>();
    const second = deferred<DevAiResponse>();
    bridge.run
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = mount([crop("a"), crop("b"), crop("c")]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a", "b", "c"]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.resolve(response());
    });
    await waitFor(() => expect(bridge.run).toHaveBeenCalledTimes(2));
    expect(result.current.progress).toMatchObject({
      done: 1,
      total: 3,
      cropId: "b",
    });
    const ownedSignal = bridge.run.mock.calls[1][1] as AbortSignal;
    act(() => {
      result.current.cancel();
    });
    expect(ownedSignal.aborted).toBe(true);
    await act(async () => {
      second.resolve(response());
      await work;
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.crops.map((item) => Boolean(item.content))).toEqual([
      true,
      false,
      false,
    ]);
    expect(bridge.cancel).not.toHaveBeenCalled();
  });

  it.each(["source:2", "another:1"])(
    "aborts page/source changes and rejects a late response for %s",
    async (contextKey) => {
      const pending = deferred<DevAiResponse>();
      bridge.run.mockReturnValue(pending.promise);
      const { result, rerender } = mount();
      let work!: Promise<void>;
      act(() => {
        work = result.current.processCrops("ocr", ["a"]);
      });
      const signal = bridge.run.mock.calls[0][1] as AbortSignal;
      rerender({ contextKey, active: true });
      expect(signal.aborted).toBe(true);
      await act(async () => {
        pending.resolve(response());
        await work;
      });
      expect(result.current.crops[0].content).toBe("");
      expect(result.current.progress).toBeNull();
    },
  );

  it("aborts when the mounted Studio becomes inactive", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result, rerender } = mount();
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a"]);
    });
    const signal = bridge.run.mock.calls[0][1] as AbortSignal;
    rerender({ contextKey: "source:1", active: false });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(response());
      await work;
    });
    expect(result.current.crops[0].content).toBe("");
  });

  it("does not recreate a removed crop after a late response", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result } = mount();
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a"]);
    });
    act(() => {
      result.current.cancel(true);
      result.current.setCrops([]);
    });
    await act(async () => {
      pending.resolve(response());
      await work;
    });
    expect(result.current.crops).toEqual([]);
  });

  it("preserves completed batch items and retries only the failed remainder", async () => {
    bridge.run
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("CLI 응답 실패"))
      .mockResolvedValue(response());
    const { result } = mount([crop("a"), crop("b")]);
    await act(async () => {
      await result.current.processCrops("ocr", ["a", "b"]);
    });
    expect(result.current.error).toContain("1문항 완료 후 중단");
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.progress).toBeNull());
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(bridge.run.mock.calls[2][0].imageDataUrl).toBe(crop("b").image);
    expect(result.current.crops.every((item) => item.content)).toBe(true);
  });

  it.each(["login-required", "not-installed", "unsupported", "error"])(
    "blocks %s providers with useful detail",
    async (status) => {
      bridge.status = status;
      const { result } = mount();
      await act(async () => {
        await result.current.processCrops("ocr", ["a"]);
      });
      expect(result.current.available).toBe(false);
      expect(result.current.unavailableReason).toBe("CLI 로그인 필요");
      expect(bridge.run).not.toHaveBeenCalled();
    },
  );

  it("allows an unverified enabled provider but blocks a disabled bridge", async () => {
    bridge.status = "unverified";
    bridge.run.mockResolvedValue(response());
    const { result, rerender } = mount();
    expect(result.current.available).toBe(true);
    bridge.enabled = false;
    rerender({ contextKey: "source:1", active: true });
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(bridge.run).not.toHaveBeenCalled();
  });

  it("creates pixel crops from detected boxes, suppresses duplicates, and never auto-solves", async () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,real-crop",
    );
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const page: StudioAiPage = {
      sourceId: "source",
      sourceLabel: "sheet.png",
      page: 1,
      canvas,
      imageDataUrl: "data:image/png;base64,page",
      grade: "중1",
      level: "secondary",
    };
    const value = response("page-ocr");
    value.result.problems = [
      {
        content: "도형 문제",
        answer: "40",
        bbox: { left: 100, top: 250, width: 600, height: 200 },
      },
    ];
    bridge.run.mockResolvedValue(value);
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePage(page);
    });
    expect(drawImage).toHaveBeenCalledWith(
      canvas,
      120,
      400,
      720,
      320,
      0,
      0,
      720,
      320,
    );
    expect(result.current.crops[0]).toMatchObject({
      content: "도형 문제",
      grade: "중1",
      mode: "image",
      solution: "",
    });
    await act(async () => {
      await result.current.recognizePage(page);
    });
    expect(result.current.crops).toHaveLength(1);
    expect(bridge.run.mock.calls.map((call) => call[0].action)).toEqual([
      "page-ocr",
      "page-ocr",
    ]);
  });
});

describe("Studio figure detection owner", () => {
  const figureResponse = (): DevAiResponse => ({
    ...response("figures"),
    result: {
      ...response("figures").result,
      figures: [{ bbox: { left: 250, top: 250, width: 500, height: 250 } }],
    },
  });
  const initial = (): StudioCrop => ({
    ...crop("a", String.raw`$\frac{7}{3}$을 계산하세요.`),
    rect: { x: 0.25, y: 0.125, width: 0.5, height: 0.5 },
    answer: "검수 답",
    solution: "검수 해설",
    reviewed: true,
    added: true,
  });
  function image() {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 800;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,ZmlndXJl",
    );
    const decode = vi
      .spyOn(imageHelpers, "studioImageCanvas")
      .mockResolvedValue(canvas);
    return { canvas, decode };
  }

  it("detects only on request, maps to page coordinates, and leaves every text field untouched", async () => {
    const { decode } = image();
    bridge.run.mockResolvedValue(figureResponse());
    const original = initial();
    const { result } = mount([original]);
    expect(bridge.run).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(1);
    expect(bridge.run.mock.calls[0][0].action).toBe("figures");
    expect(decode).toHaveBeenCalledWith(
      original.image,
      expect.any(AbortSignal),
    );
    expect(result.current.crops[0]).toMatchObject({
      content: original.content,
      answer: original.answer,
      solution: original.solution,
      reviewed: false,
      added: false,
      revision: 1,
      sourceSize: { width: 2000, height: 1600 },
      figures: [
        {
          rect: { x: 0.375, y: 0.25, width: 0.25, height: 0.125 },
          image: "data:image/png;base64,ZmlndXJl",
        },
      ],
    });
  });

  it("keeps reviewed and added when a repeated detection only changes warnings", async () => {
    image();
    bridge.run.mockResolvedValue(figureResponse());
    const { result } = mount([initial()]);
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    const detected = result.current.crops[0];
    act(() => {
      result.current.setCrops([{ ...detected, reviewed: true, added: true }]);
    });
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      reviewed: true,
      added: true,
      revision: 1,
    });
    expect(result.current.crops[0].figures).toBe(detected.figures);
  });

  it("initializes an explicit empty result without decoding pixels or invalidating unchanged content", async () => {
    const { decode } = image();
    const value = figureResponse();
    value.result.figures = [];
    bridge.run.mockResolvedValue(value);
    const { result } = mount([initial()]);
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      figures: [],
      reviewed: true,
      added: true,
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it.each(["figures", "rect", "reviewed"] as const)(
    "rejects replies after manual %s edits even without a revision bump",
    async (field) => {
      image();
      const pending = deferred<DevAiResponse>();
      bridge.run.mockReturnValue(pending.promise);
      const { result } = mount([initial()]);
      let work!: Promise<void>;
      act(() => {
        work = result.current.processCrops("figures", ["a"]);
      });
      act(() => {
        result.current.setCrops((items) =>
          items.map((item) => ({
            ...item,
            ...(field === "figures"
              ? {
                  figures: [
                    {
                      id: "manual",
                      rect: item.rect,
                      image: "data:image/png;base64,bWFudWFs",
                    },
                  ],
                }
              : field === "rect"
                ? { rect: { ...item.rect, x: 0.3 } }
                : { reviewed: false }),
          })),
        );
      });
      const edited = result.current.crops[0];
      await act(async () => {
        pending.resolve(figureResponse());
        await work;
      });
      expect(result.current.crops[0]).toBe(edited);
      expect(result.current.message).toContain("수정되거나 제외된 1문항");
    },
  );

  it("rejects a crop edit made while figure image pixels are being decoded", async () => {
    const { canvas, decode } = image();
    const pending = deferred<HTMLCanvasElement>();
    decode.mockReturnValue(pending.promise);
    bridge.run.mockResolvedValue(figureResponse());
    const { result } = mount([initial()]);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.processCrops("figures", ["a"]);
    });
    expect(decode).toHaveBeenCalledOnce();
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) => ({ ...item, revision: 1, content: "직접 수정" })),
      );
    });
    await act(async () => {
      pending.resolve(canvas);
      await work;
    });
    expect(result.current.crops[0].figures).toBeUndefined();
    expect(result.current.crops[0].content).toBe("직접 수정");
  });

  it("aborts replacement, discards its late figures and clears the old retry owner", async () => {
    image();
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result, rerender } = mount([initial()]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("figures", ["a"]);
    });
    const signal = bridge.run.mock.calls[0][1] as AbortSignal;
    rerender({ contextKey: "replacement:1", active: true });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(figureResponse());
      await work;
    });
    act(() => {
      result.current.retry();
    });
    expect(bridge.run).toHaveBeenCalledTimes(1);
    expect(result.current.crops[0].figures).toBeUndefined();
    expect(result.current.error).toBe("");
  });

  it("preserves existing figures on decode failure and retries the same explicit action", async () => {
    const { canvas, decode } = image();
    decode
      .mockRejectedValueOnce(new Error("이미지 읽기 실패"))
      .mockResolvedValue(canvas);
    bridge.run.mockResolvedValue(figureResponse());
    const original = initial();
    original.figures = [
      { id: "manual", rect: original.rect, image: original.image },
    ];
    const { result } = mount([original]);
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    expect(result.current.error).toContain("이미지 읽기 실패");
    expect(result.current.crops[0]).toBe(original);
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.progress).toBeNull());
    expect(bridge.run.mock.calls.map((call) => call[0].action)).toEqual([
      "figures",
      "figures",
    ]);
    expect(result.current.crops[0].figures?.[0].id).not.toBe("manual");
    expect(result.current.error).toBe("");
  });

  it("initializes page OCR figures in source-page coordinates, clipping to the problem and warning on outliers", async () => {
    const { canvas, decode } = image();
    const value = response("page-ocr");
    value.result.problems = [
      {
        content: "도형 문제",
        answer: "",
        bbox: { left: 250, top: 125, width: 500, height: 500 },
        figures: [
          { bbox: { left: 0, top: 250, width: 500, height: 250 } },
          { bbox: { left: 800, top: 800, width: 100, height: 100 } },
        ],
      },
    ];
    bridge.run.mockResolvedValue(value);
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePage({
        sourceId: "source",
        sourceLabel: "sheet.png",
        page: 1,
        canvas,
        imageDataUrl: "data:image/png;base64,cGFnZQ==",
        grade: "초5",
        level: "elementary",
      });
    });
    expect(decode).not.toHaveBeenCalled();
    expect(result.current.crops[0]).toMatchObject({
      reviewed: false,
      sourceSize: { width: 1000, height: 800 },
      figures: [{ rect: { x: 0.25, y: 0.25, width: 0.25, height: 0.25 } }],
    });
    expect(result.current.crops[0].aiWarnings?.join(" ")).toContain(
      "1개를 제외",
    );
    expect(bridge.run).toHaveBeenCalledTimes(1);
  });
});
