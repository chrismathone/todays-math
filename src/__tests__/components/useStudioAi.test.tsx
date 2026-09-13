import { StrictMode, useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useStudioAi,
  type StudioAiPage,
  type StudioAiPageTask,
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
  activity: null as { state: "running" } | null,
}));
vi.mock("@/components/unified/useDevAi", () => ({
  useDevAi: () => ({
    provider: "codex",
    checking: false,
    activity: bridge.activity,
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
function mount(initial = [crop("a")], onDetected = vi.fn()) {
  return renderHook(
    ({ contextKey, active }) => {
      const [crops, setCrops] = useState(initial);
      const studio = useStudioAi({
        crops,
        setCrops,
        contextKey,
        active,
        onDetected,
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
  bridge.activity = null;
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
    const startedAt = result.current.progress?.startedAt;
    expect(startedAt).toEqual(expect.any(Number));
    expect(bridge.run).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.resolve(response());
    });
    await waitFor(() => expect(bridge.run).toHaveBeenCalledTimes(2));
    expect(result.current.progress).toMatchObject({
      done: 1,
      total: 3,
      cropId: "b",
      startedAt,
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

describe("Studio background page queue", () => {
  const pageResponse = (content = "인식한 문제"): DevAiResponse => ({
    ...response("page-ocr"),
    result: {
      ...response("page-ocr").result,
      problems: [
        {
          content,
          answer: "42",
          bbox: { left: 100, top: 100, width: 500, height: 200 },
        },
      ],
    },
  });
  function pixels(page: number, sourceId = "source") {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    return {
      canvas,
      imageDataUrl: `data:image/png;base64,${sourceId}-${page}`,
    };
  }
  function task(page: number, sourceId = "source") {
    return {
      sourceId,
      sourceLabel: `${sourceId}.pdf`,
      page,
      grade: "초5",
      level: "elementary" as const,
      load: vi.fn<StudioAiPageTask["load"]>(async () => pixels(page, sourceId)),
    };
  }
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,crop-pixels",
    );
  });

  it("loads at most two pages just in time, appends work, and drains out of order", async () => {
    const loads = [
      deferred<ReturnType<typeof pixels>>(),
      deferred<ReturnType<typeof pixels>>(),
    ];
    const replies = Array.from({ length: 4 }, () => deferred<DevAiResponse>());
    bridge.run.mockImplementation((request) => {
      const page = Number(request.imageDataUrl.split("-").at(-1));
      return replies[page - 1].promise;
    });
    const tasks = [task(1), task(2), task(3), task(4)];
    tasks[0].load.mockReturnValue(loads[0].promise);
    tasks[1].load.mockReturnValue(loads[1].promise);
    const { result } = mount([]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.recognizePages(tasks.slice(0, 3));
    });
    expect(tasks.map((item) => item.load.mock.calls.length)).toEqual([
      1, 1, 0, 0,
    ]);
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "rendering",
      "rendering",
      "queued",
    ]);
    expect(result.current.pageProgress).toEqual({
      done: 0,
      total: 3,
      queued: 1,
      running: 2,
      failed: 0,
      startedAt: expect.any(Number),
    });
    expect(result.current.progress).toBeNull();
    expect(result.current.isPageBusy("source", 3)).toBe(true);
    expect(result.current.isPageBusy("other", 3)).toBe(false);
    let appended!: Promise<void>;
    act(() => {
      appended = result.current.recognizePages([tasks[3]]);
    });
    await act(async () => {
      loads[1].resolve(pixels(2));
    });
    expect(bridge.run).toHaveBeenCalledTimes(1);
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "rendering",
      "running",
      "queued",
      "queued",
    ]);
    await act(async () => {
      replies[1].resolve(pageResponse("second"));
    });
    expect(tasks[2].load).toHaveBeenCalledOnce();
    expect(tasks[3].load).not.toHaveBeenCalled();
    await act(async () => {
      replies[2].resolve(pageResponse("third"));
    });
    expect(tasks[3].load).toHaveBeenCalledOnce();
    await act(async () => {
      loads[0].resolve(pixels(1));
      replies[0].resolve(pageResponse("first"));
      replies[3].resolve(pageResponse("fourth"));
      await Promise.all([work, appended]);
    });
    expect(
      result.current.crops.map((item) => [item.page, item.content]),
    ).toEqual([
      [2, "second"],
      [3, "third"],
      [4, "fourth"],
      [1, "first"],
    ]);
    expect(result.current.pageProgress).toMatchObject({
      done: 4,
      total: 4,
      queued: 0,
      running: 0,
      failed: 0,
    });
    expect(result.current.running).toBe(false);
    expect(result.current.isPageBusy("source", 1)).toBe(false);
  });

  it.each([
    { contextKey: "source:2", active: true },
    { contextKey: "other:1", active: true },
    { contextKey: "source:1", active: false },
  ])(
    "keeps page jobs alive after navigation to $contextKey active=$active",
    async (navigation) => {
      const pending = deferred<DevAiResponse>();
      bridge.run.mockReturnValue(pending.promise);
      const onDetected = vi.fn();
      const { result, rerender } = mount([], onDetected);
      let work!: Promise<void>;
      await act(async () => {
        work = result.current.recognizePages([task(1)]);
      });
      const signal = bridge.run.mock.calls[0][1] as AbortSignal;
      rerender(navigation);
      expect(signal.aborted).toBe(false);
      expect(result.current.pageJobs[0].state).toBe("running");
      await act(async () => {
        pending.resolve(pageResponse());
        await work;
      });
      expect(result.current.crops[0]).toMatchObject({
        sourceId: "source",
        page: 1,
        grade: "초5",
      });
      expect(result.current.pageJobs[0].state).toBe("complete");
      expect(onDetected).not.toHaveBeenCalled();
    },
  );

  it("captures source and grade, keeps both out-of-order sources, and selects only the current page", async () => {
    const replies = [
      deferred<DevAiResponse>(),
      deferred<DevAiResponse>(),
      deferred<DevAiResponse>(),
    ];
    bridge.run
      .mockReturnValueOnce(replies[0].promise)
      .mockReturnValueOnce(replies[1].promise)
      .mockReturnValueOnce(replies[2].promise);
    const tasks = [task(1), task(1, "other"), task(2, "other")];
    tasks[1].grade = "중1";
    tasks[2].grade = "고1";
    const onDetected = vi.fn();
    const { result, rerender } = mount([], onDetected);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.recognizePages(tasks);
    });
    tasks[2].sourceId = "mutated";
    tasks[2].sourceLabel = "mutated.pdf";
    tasks[2].grade = "초1";
    rerender({ contextKey: "other:1", active: true });
    await act(async () => {
      replies[1].resolve(pageResponse("other first"));
    });
    expect(onDetected).toHaveBeenCalledExactlyOnceWith(
      result.current.crops[0].id,
    );
    expect(bridge.run.mock.calls[2][0].grade).toBe("고1");
    rerender({ contextKey: "other:1", active: false });
    await act(async () => {
      replies[0].resolve(pageResponse("source first"));
      replies[2].resolve(pageResponse("other second"));
      await work;
    });
    expect(
      result.current.crops.map((item) => [
        item.sourceId,
        item.sourceLabel,
        item.page,
        item.grade,
      ]),
    ).toEqual([
      ["other", "other.pdf", 1, "중1"],
      ["source", "source.pdf", 1, "초5"],
      ["other", "other.pdf", 2, "고1"],
    ]);
    expect(onDetected).toHaveBeenCalledTimes(1);
  });

  it("deduplicates rendering, queued, running and completed pages, but supports explicit lazy reruns", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const tasks = [task(1), task(2), task(3)];
    const { result } = mount([]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.recognizePages([...tasks, ...tasks]);
      void result.current.recognizePages(tasks, { force: true });
    });
    expect(result.current.pageJobs).toHaveLength(3);
    await act(async () => {
      void result.current.recognizePages(tasks);
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    await act(async () => {
      pending.resolve(pageResponse());
      await work;
    });
    await act(async () => {
      await result.current.recognizePages(tasks);
    });
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(tasks.map((item) => item.load.mock.calls.length)).toEqual([1, 1, 1]);
    await act(async () => {
      await result.current.recognizePages([tasks[0]], { force: true });
    });
    expect(bridge.run).toHaveBeenCalledTimes(4);
    expect(result.current.crops).toHaveLength(3);
    expect(result.current.pageJobs).toHaveLength(3);
  });

  it("records successful empty pages separately from invalid replies and retries only failures", async () => {
    const empty = response("page-ocr");
    empty.result.problems = [];
    bridge.run
      .mockResolvedValueOnce(empty)
      .mockRejectedValueOnce(new Error("provider failed"))
      .mockResolvedValueOnce(response("page-ocr"))
      .mockResolvedValue(pageResponse());
    const tasks = [task(1), task(2), task(3), task(4)];
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages(tasks);
    });
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "empty",
      "error",
      "error",
      "complete",
    ]);
    expect(result.current.pageJobs[1].error).toBe("provider failed");
    expect(result.current.pageProgress).toMatchObject({
      done: 2,
      total: 4,
      failed: 2,
      running: 0,
    });
    expect(result.current.error).toBe("");
    await act(async () => {
      await result.current.retryPages();
    });
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "empty",
      "complete",
      "complete",
      "complete",
    ]);
    expect(result.current.pageJobs.every((job) => !job.error)).toBe(true);
    expect(tasks.map((item) => item.load.mock.calls.length)).toEqual([
      1, 2, 2, 1,
    ]);
    expect(result.current.pageProgress).toMatchObject({ done: 4, failed: 0 });
    await act(async () => {
      await result.current.recognizePages(tasks);
    });
    expect(bridge.run).toHaveBeenCalledTimes(6);
    await act(async () => {
      await result.current.recognizePages([tasks[0]], { force: true });
    });
    expect(result.current.pageJobs[0].state).toBe("complete");
    expect(result.current.crops).toHaveLength(4);
  });

  it("drains after a render failure and retries that page with its captured loader", async () => {
    bridge.run.mockResolvedValue(pageResponse());
    const tasks = [task(1), task(2), task(3)];
    tasks[0].load.mockRejectedValueOnce(new Error("render failed"));
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages(tasks);
    });
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "error",
      "complete",
      "complete",
    ]);
    expect(bridge.run).toHaveBeenCalledTimes(2);
    await act(async () => {
      await result.current.retryPages();
    });
    expect(tasks[0].load).toHaveBeenCalledTimes(2);
    expect(result.current.pageProgress.done).toBe(3);
  });

  it("cancels rendering, requests, and queued pages without applying late replies", async () => {
    const loading = deferred<ReturnType<typeof pixels>>();
    const reply = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(reply.promise);
    const tasks = [task(1), task(2), task(3)];
    tasks[0].load.mockReturnValue(loading.promise);
    const { result } = mount([]);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.recognizePages(tasks);
    });
    const signals = tasks.slice(0, 2).map((item) => item.load.mock.calls[0][0]);
    await act(async () => {
      result.current.cancel();
      await work;
    });
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "cancelled",
      "cancelled",
      "cancelled",
    ]);
    expect(result.current.running).toBe(false);
    expect(tasks[2].load).not.toHaveBeenCalled();
    await act(async () => {
      loading.resolve(pixels(1));
      reply.resolve(pageResponse());
    });
    expect(result.current.crops).toEqual([]);
    expect(bridge.run).toHaveBeenCalledTimes(1);
    expect(bridge.cancel).not.toHaveBeenCalled();
    act(() => {
      result.current.cancel(true);
    });
    expect(result.current.pageJobs).toEqual([]);
    expect(result.current.pageProgress).toEqual({
      done: 0,
      total: 0,
      queued: 0,
      running: 0,
      failed: 0,
      startedAt: null,
    });
  });

  it("reset fences old replies and retains physical slots until aborted I/O settles", async () => {
    const oldReplies = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    bridge.run
      .mockReturnValueOnce(oldReplies[0].promise)
      .mockReturnValueOnce(oldReplies[1].promise)
      .mockResolvedValue(pageResponse("new"));
    const { result } = mount([]);
    await act(async () => {
      void result.current.recognizePages([task(1), task(2)]);
    });
    const fresh = task(1);
    let work!: Promise<void>;
    act(() => {
      result.current.cancel(true);
      work = result.current.recognizePages([fresh]);
    });
    expect(fresh.load).not.toHaveBeenCalled();
    expect(result.current.pageJobs).toMatchObject([
      { key: "source:1", state: "queued" },
    ]);
    await act(async () => {
      oldReplies[1].reject(new Error("stale failure"));
      await work;
    });
    expect(result.current.crops).toHaveLength(1);
    expect(result.current.crops[0].content).toBe("new");
    await act(async () => {
      oldReplies[0].resolve(pageResponse("old"));
    });
    expect(result.current.crops).toHaveLength(1);
    expect(result.current.pageJobs).toMatchObject([{ state: "complete" }]);
    expect(result.current.pageProgress).toMatchObject({
      total: 1,
      done: 1,
      failed: 0,
    });
  });

  it("aborts every owned job on unmount and never starts queued loaders", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const tasks = [task(1), task(2), task(3)];
    const onDetected = vi.fn();
    const { result, unmount } = mount([], onDetected);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.recognizePages(tasks);
    });
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await work;
    await act(async () => {
      pending.resolve(pageResponse());
    });
    expect(tasks[2].load).not.toHaveBeenCalled();
    expect(onDetected).not.toHaveBeenCalled();
  });

  it("shares two slots with crop batches, preserves queued edit snapshots, and ignores global AI activity", async () => {
    bridge.activity = { state: "running" };
    const replies = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    bridge.run
      .mockReturnValueOnce(replies[0].promise)
      .mockReturnValueOnce(replies[1].promise)
      .mockResolvedValue(response());
    const { result } = mount([crop("a"), crop("b")]);
    expect(result.current.running).toBe(false);
    let pages!: Promise<void>;
    let batch!: Promise<void>;
    await act(async () => {
      pages = result.current.recognizePages([task(1, "pdf"), task(2, "pdf")]);
    });
    act(() => {
      batch = result.current.processCrops("ocr", ["a", "b"]);
    });
    const startedAt = result.current.progress?.startedAt;
    expect(startedAt).toEqual(expect.any(Number));
    expect(bridge.run).toHaveBeenCalledTimes(2);
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) =>
          item.id === "a" ? { ...item, content: "manual", revision: 1 } : item,
        ),
      );
    });
    await act(async () => {
      replies[0].resolve(pageResponse());
      await batch;
    });
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(bridge.run.mock.calls[2][0].imageDataUrl).toBe(crop("b").image);
    expect(result.current.crops.find((item) => item.id === "a")?.content).toBe(
      "manual",
    );
    expect(result.current.message).toContain("수정되거나 제외된 1문항");
    await act(async () => {
      replies[1].resolve(pageResponse());
      await pages;
    });
    expect(result.current.running).toBe(false);
  });

  it("cancelCrop aborts only the crop owner and page navigation still drains the queue", async () => {
    const cropReply = deferred<DevAiResponse>();
    const pageReplies = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    bridge.run.mockImplementation((request) =>
      request.action === "ocr"
        ? cropReply.promise
        : pageReplies[Number(request.imageDataUrl.split("-").at(-1)) - 1]
            .promise,
    );
    const tasks = [task(1, "pdf"), task(2, "pdf")];
    const { result, rerender } = mount();
    let cropWork!: Promise<void>;
    let pageWork!: Promise<void>;
    await act(async () => {
      cropWork = result.current.processCrops("ocr", ["a"]);
      pageWork = result.current.recognizePages(tasks);
    });
    expect(tasks[1].load).not.toHaveBeenCalled();
    const cropSignal = bridge.run.mock.calls[0][1] as AbortSignal;
    const pageSignal = bridge.run.mock.calls[1][1] as AbortSignal;
    await act(async () => {
      result.current.cancelCrop(true);
      await cropWork;
    });
    expect(cropSignal.aborted).toBe(true);
    expect(pageSignal.aborted).toBe(false);
    expect(result.current.pageProgress).toMatchObject({
      queued: 1,
      running: 1,
    });
    rerender({ contextKey: "elsewhere:1", active: false });
    await act(async () => {
      cropReply.resolve(response());
    });
    expect(tasks[1].load).toHaveBeenCalledOnce();
    await act(async () => {
      pageReplies[0].resolve(pageResponse());
      pageReplies[1].resolve(pageResponse());
      await pageWork;
    });
    expect(result.current.crops.find((item) => item.id === "a")?.content).toBe(
      "",
    );
    expect(result.current.pageProgress.done).toBe(2);
  });

  it("preserves a manual overlapping crop inserted in the same update batch as page completion", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const onDetected = vi.fn();
    const { result } = mount([], onDetected);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.recognizePages([task(1)]);
    });
    const manual = {
      ...crop("manual", "manual content"),
      reviewed: true,
      revision: 2,
    };
    await act(async () => {
      result.current.setCrops([manual]);
      pending.resolve(pageResponse("AI content"));
      await work;
    });
    expect(result.current.crops).toEqual([manual]);
    expect(result.current.pageJobs[0].state).toBe("complete");
    expect(onDetected).not.toHaveBeenCalled();
  });

  it("cancels a waiting crop batch without occupying a page slot or creating a retry", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result } = mount();
    let pages!: Promise<void>;
    let crops!: Promise<void>;
    await act(async () => {
      pages = result.current.recognizePages([
        task(1, "pdf"),
        task(2, "pdf"),
        task(3, "pdf"),
      ]);
      crops = result.current.processCrops("ocr", ["a"]);
    });
    await act(async () => {
      result.current.cancelCrop();
      await crops;
    });
    expect(result.current.progress).toBeNull();
    expect(result.current.pageProgress).toMatchObject({
      queued: 1,
      running: 2,
    });
    await act(async () => {
      pending.resolve(pageResponse());
      await pages;
      result.current.retry();
    });
    expect(bridge.run.mock.calls.map((call) => call[0].action)).toEqual([
      "page-ocr",
      "page-ocr",
      "page-ocr",
    ]);
    expect(result.current.crops.find((item) => item.id === "a")?.content).toBe(
      "",
    );
  });
});
