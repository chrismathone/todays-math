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
  subscribeCancel: vi.fn(),
  cancelListeners: new Set<() => void>(),
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
    subscribeCancel: bridge.subscribeCancel,
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
function mount(
  initial = [crop("a")],
  onDetected = vi.fn(),
  onRotatePage?: (sourceId: string, page: number, delta: number) => void,
) {
  /** ② 영역 지정에 있는 동안만 `figuresDeferred` — 안 주면 ③ 에 있는 것과 같다. */
  interface MountProps {
    contextKey: string;
    active: boolean;
    figuresDeferred?: boolean;
  }
  return renderHook(
    ({ contextKey, active, figuresDeferred }: MountProps) => {
      const [crops, setCrops] = useState(initial);
      const studio = useStudioAi({
        crops,
        setCrops,
        contextKey,
        active,
        figuresDeferred,
        onDetected,
        onRotatePage,
      });
      return { ...studio, crops, setCrops };
    },
    {
      initialProps: { contextKey: "source:1", active: true } as MountProps,
      wrapper: StrictMode,
    },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  bridge.enabled = true;
  bridge.status = "ready";
  bridge.activity = null;
  bridge.cancelListeners.clear();
  bridge.subscribeCancel.mockImplementation((listener: () => void) => {
    bridge.cancelListeners.add(listener);
    return () => bridge.cancelListeners.delete(listener);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Studio AI owner", () => {
  it("carries native metadata through rereading, solution input and worksheet conversion", async () => {
    const ocr = {
      number: 19,
      blocks: [{ type: "text" as const, value: "원본 문항", rows: [] }],
      choiceGroups: [],
      subQuestions: [],
      score: 4,
      labelType: "서답형",
      topic: "확률",
      confidence: "high" as const,
      choicesLayout: "auto" as const,
      bodyMissing: false,
      choicesMissing: false,
    };
    bridge.run.mockResolvedValue({
      ...response(),
      result: { ...response().result, ocr },
    });
    const { result } = mount();
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0].ocr).toEqual(ocr);
    expect(studioProblem(result.current.crops[0]).ocr).toEqual(ocr);
    await act(async () => {
      await result.current.processCrops("solution", ["a"]);
    });
    expect(bridge.run.mock.calls.at(-1)?.[0].ocr).toEqual(ocr);
  });
  it("preserves an explicit original-image output choice after rereading", async () => {
    bridge.run.mockResolvedValue(response());
    const { result } = mount([{ ...crop("a"), modeManual: true }]);
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0].content).toBe(response().result.content);
    expect(result.current.crops[0].mode).toBe("image");
    expect(studioProblem(result.current.crops[0]).croppedImage).toBe(
      crop("a").image,
    );
  });
  it("never dispatches on mount and retains source pixels/fractions after explicit OCR", async () => {
    bridge.run.mockResolvedValue(response());
    const { result } = mount();
    expect(bridge.run).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      image: crop("a").image,
      mode: "text",
      content: response().result.content,
      aiWarnings: response().result.warnings,
    });
    expect(studioProblem(result.current.crops[0]).croppedImage).toBeUndefined();
    expect(studioProblem(result.current.crops[0]).content).toBe(
      response().result.content,
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
        sourceName: "sheet.png",
      },
      expect.any(AbortSignal),
    );
    expect(result.current.crops[0]).toMatchObject({
      content: "수정한 문제",
      solution: "풀이 결과",
      mode: "image",
    });
  });

  it("applies optional OCR classification and retains the original image and edited figures", async () => {
    const value = response();
    Object.assign(value.result, { questionType: "multiple-choice" });
    bridge.run.mockResolvedValueOnce(value).mockResolvedValue(response());
    const original = {
      ...crop("a"),
      questionType: "short-answer" as const,
      figures: [
        {
          id: "edited-figure",
          rect: crop("a").rect,
          image: "data:image/png;base64,edited",
          originalImage: "data:image/png;base64,original",
          svg: '<svg><path d="M0 0L1 1"/></svg>',
        },
      ],
    };
    const { result } = mount([original]);
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      questionType: "multiple-choice",
      image: original.image,
    });
    expect(result.current.crops[0].figures).toBe(original.figures);
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0]).toMatchObject({
      questionType: "multiple-choice",
    });
    expect(result.current.crops[0].figures).toBe(original.figures);
  });

  it("protects manual question-type changes without a revision bump", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const initial = { ...crop("a"), questionType: "short-answer" as const };
    const { result } = mount([initial]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a"]);
    });
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) => ({
          ...item,
          questionType: "descriptive" as const,
        })),
      );
    });
    const value = response();
    Object.assign(value.result, { questionType: "multiple-choice" });
    await act(async () => {
      pending.resolve(value);
      await work;
    });
    expect(result.current.crops[0]).toMatchObject({
      content: "",
      questionType: "descriptive",
    });
    expect(result.current.cropJobs[0].state).toBe("cancelled");
  });

  it("keeps a missing solution input retryable without blocking valid queued jobs", async () => {
    bridge.run.mockResolvedValue(response("solution"));
    const { result } = mount([crop("a"), crop("b", "valid")]);
    await act(async () => {
      await result.current.processCrops("solution", ["a", "b"]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(1);
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "error",
      "complete",
    ]);
    expect(result.current.cropJobs[0].error).toContain("문제 내용을 먼저");
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) =>
          item.id === "a"
            ? { ...item, content: "new input", revision: 1 }
            : item,
        ),
      );
    });
    await act(async () => {
      await result.current.retryCrop("a", "solution");
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(bridge.run.mock.calls[1][0].content).toBe("new input");
    expect(
      result.current.cropJobs.every((job) => job.state === "complete"),
    ).toBe(true);
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

  it("runs two crop jobs at once and cancels active and waiting work independently of completed items", async () => {
    const replies = Array.from({ length: 3 }, () => deferred<DevAiResponse>());
    bridge.run.mockImplementation(
      () => replies[bridge.run.mock.calls.length - 1].promise,
    );
    const { result } = mount([crop("a"), crop("b"), crop("c"), crop("d")]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a", "b", "c", "d"]);
    });
    const startedAt = result.current.progress?.startedAt;
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "running",
      "running",
      "queued",
      "queued",
    ]);
    await act(async () => {
      replies[0].resolve(response());
    });
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(result.current.progress).toMatchObject({
      done: 1,
      total: 4,
      cropId: "b",
      startedAt,
    });
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    await act(async () => {
      result.current.cancel();
      await work;
    });
    expect(signals.map((signal) => signal.aborted)).toEqual([
      false,
      true,
      true,
    ]);
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "complete",
      "cancelled",
      "cancelled",
      "cancelled",
    ]);
    await act(async () => {
      replies[1].resolve(response());
      replies[2].resolve(response());
    });
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(result.current.crops.map((item) => Boolean(item.content))).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(result.current.running).toBe(false);
    expect(bridge.cancel).not.toHaveBeenCalled();
  });

  it.each(["source:2", "another:1"])(
    "preserves background crop work after page/source navigation to %s",
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
      expect(signal.aborted).toBe(false);
      await act(async () => {
        pending.resolve(response());
        await work;
      });
      expect(result.current.crops[0].content).toBe(response().result.content);
      expect(result.current.progress).toBeNull();
    },
  );

  it("continues when the mounted Studio becomes inactive", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result, rerender } = mount();
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a"]);
    });
    const signal = bridge.run.mock.calls[0][1] as AbortSignal;
    rerender({ contextKey: "source:1", active: false });
    expect(signal.aborted).toBe(false);
    await act(async () => {
      pending.resolve(response());
      await work;
    });
    expect(result.current.crops[0].content).toBe(response().result.content);
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

  it("preserves completed batch items and retries only failed jobs", async () => {
    bridge.run
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("CLI 응답 실패"))
      .mockResolvedValue(response());
    const { result } = mount([crop("a"), crop("b")]);
    await act(async () => {
      await result.current.processCrops("ocr", ["a", "b"]);
    });
    expect(result.current.error).toBe("CLI 응답 실패");
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "complete",
      "error",
    ]);
    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.progress).toBeNull());
    expect(bridge.run).toHaveBeenCalledTimes(3);
    expect(bridge.run.mock.calls[2][0].imageDataUrl).toBe(crop("b").image);
    expect(result.current.crops.every((item) => item.content)).toBe(true);
  });

  it("dedupes by crop/action and cancels one action without cancelling its sibling", async () => {
    const ocr = deferred<DevAiResponse>();
    const figures = deferred<DevAiResponse>();
    bridge.run
      .mockReturnValueOnce(ocr.promise)
      .mockReturnValueOnce(figures.promise);
    const { result } = mount([crop("a", "original"), crop("b", "another")]);
    let first!: Promise<void>;
    let duplicate!: Promise<void>;
    let second!: Promise<void>;
    let waiting!: Promise<void>;
    act(() => {
      first = result.current.processCrops("ocr", ["a", "a"]);
      duplicate = result.current.runCrops("ocr", ["a"]);
      second = result.current.processCrops("figures", ["a"]);
      waiting = result.current.processCrops("solution", ["b"]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.cropJobs).toHaveLength(3);
    expect(result.current.isCropBusy("a")).toBe(true);
    expect(result.current.isCropBusy("a", "solution")).toBe(false);
    expect(result.current.isCropBusy("b", "solution")).toBe(true);
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    await act(async () => {
      result.current.cancelCropJob("a", "ocr");
      result.current.cancelCropJob("b");
      await Promise.all([first, duplicate, waiting]);
    });
    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
    expect(result.current.isCropBusy("a")).toBe(true);
    expect(result.current.isCropBusy("a", "ocr")).toBe(false);
    expect(result.current.isCropBusy("b")).toBe(false);
    await act(async () => {
      figures.resolve({
        ...response("figures"),
        result: { ...response("figures").result, figures: [] },
      });
      ocr.resolve(response());
      await second;
      await result.current.retryCrop("a", "ocr");
      await result.current.retry();
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "cancelled",
      "complete",
      "cancelled",
    ]);
    expect(result.current.crops[0]).toMatchObject({
      content: "original",
      figures: [],
    });
  });

  it("drains after independent errors and retries only the selected failure with fresh content", async () => {
    bridge.run
      .mockRejectedValueOnce(new Error("first failed"))
      .mockRejectedValueOnce(new Error("second failed"))
      .mockResolvedValue(response("solution"));
    const { result } = mount([crop("a", "A"), crop("b", "B"), crop("c", "C")]);
    await act(async () => {
      await result.current.processCrops("solution", ["a", "b", "c"]);
    });
    expect(
      result.current.cropJobs.map((job) => [job.state, job.error]),
    ).toEqual([
      ["error", "first failed"],
      ["error", "second failed"],
      ["complete", undefined],
    ]);
    const successful = result.current.crops[2];
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) =>
          item.id === "b"
            ? { ...item, content: "corrected B", grade: "중2", revision: 1 }
            : item,
        ),
      );
    });
    await act(async () => {
      await result.current.retryCrop("b", "solution");
      await result.current.retryCrop("c", "solution");
      await result.current.retryCrop("missing", "ocr");
    });
    expect(bridge.run).toHaveBeenCalledTimes(4);
    expect(bridge.run.mock.calls[3][0]).toMatchObject({
      action: "solution",
      content: "corrected B",
      grade: "중2",
    });
    expect(result.current.cropJobs[0]).toMatchObject({
      state: "error",
      error: "first failed",
    });
    expect(result.current.cropJobs[1]).toMatchObject({ state: "complete" });
    expect(result.current.cropJobs[1].error).toBeUndefined();
    expect(result.current.crops[2]).toBe(successful);
    await act(async () => {
      await result.current.retry();
    });
    expect(bridge.run).toHaveBeenCalledTimes(5);
    expect(bridge.run.mock.calls[4][0].content).toBe("A");
    expect(
      result.current.cropJobs.every((job) => job.state === "complete"),
    ).toBe(true);
    expect(result.current.error).toBe("");
  });

  it("cancels deleted running and queued crops without disturbing surviving work", async () => {
    const replies = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    bridge.run
      .mockReturnValueOnce(replies[0].promise)
      .mockReturnValueOnce(replies[1].promise);
    const { result } = mount([crop("a"), crop("b"), crop("c")]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a", "b", "c"]);
    });
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    act(() => {
      result.current.setCrops((items) =>
        items.filter((item) => item.id === "b"),
      );
    });
    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
    expect(result.current.cropJobs.map((job) => job.state)).toEqual([
      "cancelled",
      "running",
      "cancelled",
    ]);
    await act(async () => {
      replies[1].resolve(response());
      await work;
      replies[0].resolve(response());
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.crops).toHaveLength(1);
    expect(result.current.crops[0]).toMatchObject({
      id: "b",
      content: response().result.content,
    });
  });

  it("rejects manual updates batched with a response and reports the result as cancelled", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result } = mount();
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a"]);
    });
    await act(async () => {
      result.current.setCrops((items) =>
        items.map((item) => ({ ...item, content: "manual", revision: 1 })),
      );
      pending.resolve(response());
      await work;
    });
    expect(result.current.crops[0].content).toBe("manual");
    expect(result.current.cropJobs[0].state).toBe("cancelled");
    expect(result.current.running).toBe(false);
  });

  it("fences reset crop owners and keeps physical slots occupied until their I/O settles", async () => {
    const oldReplies = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    bridge.run
      .mockReturnValueOnce(oldReplies[0].promise)
      .mockReturnValueOnce(oldReplies[1].promise)
      .mockResolvedValue(response());
    const { result } = mount([crop("a"), crop("b"), crop("c")]);
    let oldWork!: Promise<void>;
    let newWork!: Promise<void>;
    act(() => {
      oldWork = result.current.processCrops("ocr", ["a", "b", "c"]);
    });
    await act(async () => {
      result.current.cancel(true);
      newWork = result.current.processCrops("ocr", ["a"]);
      await oldWork;
    });
    expect(result.current.cropJobs).toEqual([
      { cropId: "a", action: "ocr", state: "queued" },
    ]);
    expect(bridge.run).toHaveBeenCalledTimes(2);
    await act(async () => {
      oldReplies[1].reject(new Error("stale failure"));
      await newWork;
    });
    expect(result.current.cropJobs[0].state).toBe("complete");
    const applied = result.current.crops[0];
    await act(async () => {
      oldReplies[0].resolve({
        ...response(),
        result: { ...response().result, content: "stale" },
      });
    });
    expect(result.current.crops[0]).toBe(applied);
    expect(result.current.error).toBe("");
    expect(bridge.run).toHaveBeenCalledTimes(3);
  });

  it("aborts every crop owner on unmount and never dispatches queued crops", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result, unmount } = mount([crop("a"), crop("b"), crop("c")]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("ocr", ["a", "b", "c"]);
    });
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    unmount();
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    await work;
    await act(async () => {
      pending.resolve(response());
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(bridge.cancelListeners.size).toBe(0);
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
      mode: "text",
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

  it("extracts figures during the same single-crop OCR request and preserves edited figures on reread", async () => {
    image();
    bridge.run.mockResolvedValue({ ...figureResponse(), action: "ocr" });
    const { result } = mount([initial()]);
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
    expect(result.current.crops[0].figures).toHaveLength(1);
    const figure = result.current.crops[0].figures![0];
    expect(figure.rect).toEqual({
      x: 0.375,
      y: 0.25,
      width: 0.25,
      height: 0.125,
    });
    await act(async () => {
      result.current.setCrops((previous) =>
        previous.map((crop) => ({
          ...crop,
          figures: [
            {
              ...figure,
              image: "data:image/svg+xml,edited",
              originalImage: figure.image,
              svg: "<svg/>",
            },
          ],
          revision: 2,
        })),
      );
    });
    await act(async () => {
      await result.current.processCrops("ocr", ["a"]);
    });
    expect(result.current.crops[0].figures![0]).toMatchObject({
      svg: "<svg/>",
      image: "data:image/svg+xml,edited",
      originalImage: figure.image,
    });
  });

  it("detects only on request, maps to page coordinates, and leaves every text field untouched", async () => {
    const { decode } = image();
    bridge.run.mockResolvedValue(figureResponse());
    const original = initial();
    const { result } = mount([original]);
    expect(bridge.run).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.processCrops("figures", ["a"]);
    });
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
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
      // 담았는지는 시험지 목록이 정한다(`studioCart.ts`) — 판이 올라 «고친 뒤 반영 전»이 된다.
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

  it("explicit reset aborts replacement, discards its late figures and clears retry history", async () => {
    image();
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const { result, rerender } = mount([initial()]);
    let work!: Promise<void>;
    act(() => {
      work = result.current.processCrops("figures", ["a"]);
    });
    const signal = bridge.run.mock.calls[0][1] as AbortSignal;
    act(() => {
      result.current.cancel(true);
    });
    rerender({ contextKey: "replacement:1", active: true });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(figureResponse());
      await work;
    });
    act(() => {
      result.current.retry();
    });
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
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
    expect(
      bridge.run.mock.calls
        .filter((call) => call[0].action !== "figure-redraw")
        .map((call) => call[0].action),
    ).toEqual(["figures", "figures"]);
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
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
  });

  /**
   * 원장님 2026-09-21: «도형의 경우 크롭이 불안전한게 있는데, 도형 생성을 먼저 돌려버리고 있으니까 이후에 크롭 조정하게 되면
   * 이중생성하게 되는 불편함이 있네. 잘라내기를 끝내고, 다음단계(OCR, 디지털화)를 시작하게 되면 디지털화를 시작하는걸로.
   * 크롭과 동시에 진행하지말고.»
   *
   * 자동 인식이 문제를 찾아 넣자마자 도형 생성(`figure-redraw` — 유료 호출)이 같이 돌았다. ② 영역 지정에서 도형 칸을
   * 고치면 같은 도형을 한 번 더 만든다. 이제 ② 에 있는 동안은 **미뤄 두고**, ③ 으로 넘어갈 때 시작한다.
   */
  describe("도형 생성은 ② 영역 지정이 끝난 뒤에", () => {
    const recognizeWithFigure = async (
      studio: ReturnType<typeof mount>["result"],
    ) => {
      const { canvas } = image();
      const value = response("page-ocr");
      value.result.problems = [
        {
          content: "도형 문제",
          answer: "",
          bbox: { left: 250, top: 125, width: 500, height: 500 },
          figures: [{ bbox: { left: 0, top: 250, width: 500, height: 250 } }],
        },
      ];
      bridge.run.mockImplementation(async (request) =>
        request.action === "figure-redraw"
          ? {
              ...response("figure-redraw"),
              result: { ...response().result, svg: "<svg></svg>" },
            }
          : value,
      );
      await act(async () => {
        await studio.current.recognizePage({
          sourceId: "source",
          sourceLabel: "sheet.png",
          page: 1,
          canvas,
          imageDataUrl: "data:image/png;base64,cGFnZQ==",
          grade: "초5",
          level: "elementary",
        });
      });
    };
    const redraws = () =>
      bridge.run.mock.calls.filter(
        (call) => call[0].action === "figure-redraw",
      );

    it("전제 — 미루지 않으면(③ 에서 인식하면) 인식 직후에 도형 생성을 부른다", async () => {
      const { result } = mount([]);
      await recognizeWithFigure(result);
      expect(result.current.crops[0]?.figures).toHaveLength(1);
      await waitFor(() => expect(redraws()).toHaveLength(1));
    });

    it("🔴 ② 에 있는 동안은 도형 생성을 부르지 않는다 — 문제와 도형 칸은 그대로 선다", async () => {
      const { result, rerender } = mount([]);
      rerender({ contextKey: "source:1", active: true, figuresDeferred: true });
      await recognizeWithFigure(result);
      expect(result.current.crops[0]?.figures).toHaveLength(1);
      // 한 박자 더 돌려도 안 부른다 — «아직 안 불렸을 뿐»과 가른다.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(redraws()).toEqual([]);
      expect(result.current.figureAi.jobs).toEqual([]);
      expect(result.current.running).toBe(false);
    });

    it("🔴 ③ 으로 넘어가면 미뤄 둔 도형을 그때 만든다 — 한 번만", async () => {
      const { result, rerender } = mount([]);
      rerender({ contextKey: "source:1", active: true, figuresDeferred: true });
      await recognizeWithFigure(result);
      expect(redraws()).toEqual([]);
      rerender({
        contextKey: "source:1",
        active: true,
        figuresDeferred: false,
      });
      await waitFor(() => expect(redraws()).toHaveLength(1));
      await waitFor(() =>
        expect(result.current.crops[0]?.figures?.[0]?.svg).toBeTruthy(),
      );
      // 다시 ② 로 갔다 와도 이미 만든 도형은 다시 만들지 않는다.
      rerender({ contextKey: "source:1", active: true, figuresDeferred: true });
      rerender({
        contextKey: "source:1",
        active: true,
        figuresDeferred: false,
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(redraws()).toHaveLength(1);
    });

    it("🔴 ② 에서 지운 문제의 도형은 ③ 에서도 안 만든다", async () => {
      const { result, rerender } = mount([]);
      rerender({ contextKey: "source:1", active: true, figuresDeferred: true });
      await recognizeWithFigure(result);
      act(() => result.current.setCrops([]));
      rerender({
        contextKey: "source:1",
        active: true,
        figuresDeferred: false,
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(redraws()).toEqual([]);
    });
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

  const detection = (count = 3): DevAiResponse => ({
    ...pageResponse(""),
    result: {
      ...pageResponse("").result,
      detectionOnly: true,
      problems: Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        content: "",
        answer: "",
        bbox: { left: 50, top: 50 + i * 300, width: 800, height: 200 },
      })),
    },
  });

  it.each([true, false])(
    "retains page crop quality warnings after empty=%s and child OCR",
    async (empty) => {
      const warning = "크롭 밖 원본 잉크를 확인해 주세요.";
      bridge.run.mockImplementation(async (request) =>
        request.action === "page-ocr"
          ? {
              ...detection(empty ? 0 : 1),
              result: {
                ...detection(empty ? 0 : 1).result,
                warnings: [warning],
              },
            }
          : { ...response(), result: { ...response().result, warnings: [] } },
      );
      const { result } = mount([]);
      await act(async () => {
        await result.current.recognizePages([task(1)]);
      });
      await waitFor(() =>
        expect(result.current.pageJobs[0]?.state).toBe(
          empty ? "empty" : "complete",
        ),
      );
      if (!empty) {
        await waitFor(() =>
          expect(
            bridge.run.mock.calls.some(([input]) => input.action === "ocr"),
          ).toBe(true),
        );
        await waitFor(() =>
          expect(result.current.crops[0]?.content).toBe(
            response().result.content,
          ),
        );
        expect(result.current.crops[0].aiWarnings).toEqual([]);
      }
      expect(result.current.pageJobs[0].warnings).toContain(warning);
    },
  );

  it("does not publish late crop warnings from an aborted page", async () => {
    const late = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(late.promise);
    const { result } = mount([]);
    let pending: Promise<void>;
    act(() => {
      pending = result.current.recognizePages([task(1)]);
    });
    await waitFor(() => expect(bridge.run).toHaveBeenCalledOnce());
    act(() => result.current.cancel(false));
    await act(async () => {
      late.resolve({
        ...detection(0),
        result: { ...detection(0).result, warnings: ["late crop warning"] },
      });
      await pending!;
    });
    expect(result.current.pageJobs[0].warnings ?? []).toEqual([]);
  });

  it("keeps source crop warnings alongside orientation feedback", async () => {
    bridge.run.mockImplementation(async (input) =>
      input.action === "page-ocr"
        ? {
            ...detection(1),
            result: {
              ...detection(1).result,
              warnings: ["source crop warning"],
            },
          }
        : {
            ...response(),
            result: { ...response().result, upsideDown: true, warnings: [] },
          },
    );
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.state).toBe("complete"),
    );
    expect(result.current.pageJobs[0].warnings).toContain(
      "source crop warning",
    );
    expect(result.current.pageJobs[0].warnings?.join(" ")).toContain("180도");
  });

  it("clears discarded orientation-pass warnings if the new render fails", async () => {
    let pageCalls = 0;
    bridge.run.mockImplementation(async (input) => {
      if (input.action === "page-ocr") {
        if (++pageCalls > 1) throw new Error("rotated request failed");
        return {
          ...detection(1),
          result: {
            ...detection(1).result,
            warnings: ["discarded crop warning"],
          },
        };
      }
      return {
        ...response(),
        result: { ...response().result, upsideDown: true },
      };
    });
    const { result } = mount([], vi.fn(), vi.fn());
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.state).toBe("error"),
    );
    expect(pageCalls).toBe(2);
    expect(result.current.pageJobs[0].warnings ?? []).toEqual([]);
  });

  it("uses a crop majority to rotate and retry a page exactly once before figure work", async () => {
    let ocrCalls = 0;
    bridge.run.mockImplementation(async (request) => {
      if (request.action === "page-ocr") return detection();
      ocrCalls++;
      return {
        ...response(),
        result: { ...response().result, upsideDown: ocrCalls !== 3 },
      };
    });
    const rotate = vi.fn();
    const input = task(1);
    const { result } = mount([], vi.fn(), rotate);
    await act(async () => {
      await result.current.recognizePages([input]);
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.state).toBe("complete"),
    );
    expect(rotate).toHaveBeenCalledExactlyOnceWith("source", 1, 180);
    expect(input.load).toHaveBeenCalledTimes(2);
    expect(input.load.mock.calls[1]).toEqual([expect.any(AbortSignal), 180]);
    expect(ocrCalls).toBe(6);
    expect(result.current.crops).toHaveLength(3);
    expect(result.current.cropJobs).toHaveLength(3);
    expect(result.current.pageJobs[0]).toMatchObject({
      rotationAutoRetried: true,
    });
    expect(result.current.pageJobs[0].warnings?.join(" ")).toContain(
      "추가 자동 인식은 하지 않습니다",
    );
  });

  it("preserves a manual edit and declines page rotation when the last crop completes late", async () => {
    const last = deferred<DevAiResponse>();
    let calls = 0;
    bridge.run.mockImplementation(async (request) => {
      if (request.action === "page-ocr") return detection(2);
      if (++calls === 2) return last.promise;
      return {
        ...response(),
        result: { ...response().result, upsideDown: true },
      };
    });
    const rotate = vi.fn();
    const { result } = mount([], vi.fn(), rotate);
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    await waitFor(() =>
      expect(result.current.cropJobs[0]?.state).toBe("complete"),
    );
    await act(async () => {
      result.current.setCrops((items) =>
        items.map((item, i) =>
          i === 0
            ? {
                ...item,
                content: "직접 수정한 내용",
                revision: (item.revision ?? 0) + 1,
              }
            : item,
        ),
      );
      last.resolve({
        ...response(),
        result: { ...response().result, upsideDown: true },
      });
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.state).toBe("complete"),
    );
    expect(rotate).not.toHaveBeenCalled();
    expect(result.current.crops[0].content).toBe("직접 수정한 내용");
    expect(result.current.crops).toHaveLength(2);
    expect(result.current.pageJobs[0].warnings?.join(" ")).toContain(
      "수정한 문항",
    );
  });

  it("cancels a pending orientation vote without rotating or accepting its late OCR", async () => {
    const late = deferred<DevAiResponse>();
    bridge.run.mockImplementation(async (request) =>
      request.action === "page-ocr" ? detection(1) : late.promise,
    );
    const rotate = vi.fn();
    const input = task(1);
    const { result } = mount([], vi.fn(), rotate);
    await act(async () => {
      await result.current.recognizePages([input]);
    });
    await waitFor(() =>
      expect(result.current.cropJobs[0]?.state).toBe("running"),
    );
    await act(async () => {
      result.current.cancel();
      late.resolve({
        ...response(),
        result: { ...response().result, upsideDown: true },
      });
    });
    expect(result.current.pageJobs[0].state).toBe("cancelled");
    expect(result.current.cropJobs[0].state).toBe("cancelled");
    expect(result.current.crops[0].content).toBe("");
    expect(rotate).not.toHaveBeenCalled();
    expect(input.load).toHaveBeenCalledTimes(1);
  });

  it("restores completed crop results if committing source rotation fails", async () => {
    bridge.run.mockImplementation(async (request) =>
      request.action === "page-ocr"
        ? detection(1)
        : { ...response(), result: { ...response().result, upsideDown: true } },
    );
    const input = task(1);
    const rotate = vi.fn(() => {
      throw new Error("source rotation failed");
    });
    const { result } = mount([], vi.fn(), rotate);
    await act(async () => {
      await result.current.recognizePages([input]);
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.state).toBe("error"),
    );
    expect(result.current.crops).toHaveLength(1);
    expect(result.current.crops[0].content).toBe(response().result.content);
    expect(input.load).toHaveBeenCalledTimes(1);
    expect(bridge.run).toHaveBeenCalledTimes(2);
  });

  it("settles two crop-first pages without holding FIFO slots for their children", async () => {
    bridge.run.mockImplementation(async (request) =>
      request.action === "page-ocr" ? detection(1) : response(),
    );
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages([task(1), task(2)]);
    });
    await waitFor(() => expect(result.current.pageProgress.done).toBe(2));
    expect(result.current.running).toBe(false);
    expect(result.current.cropJobs).toHaveLength(2);
    expect(bridge.run).toHaveBeenCalledTimes(4);
  });

  it("compares the settled page text layer without invalidating recognized crops", async () => {
    bridge.run.mockImplementation(async (request) =>
      request.action === "page-ocr" ? detection(1) : response(),
    );
    const input = {
      ...task(1),
      referenceText:
        "사과 바나나 포도 복숭아 자두 배추 무청 감자 고구마 당근 수박 참외 225 135",
    };
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages([input]);
    });
    await waitFor(() =>
      expect(result.current.pageJobs[0]?.textLayerWarning?.rule).toBe(
        "text-layer-mismatch",
      ),
    );
    expect(result.current.pageJobs[0].state).toBe("complete");
    expect(result.current.crops[0].content).toBe(response().result.content);
    expect(bridge.run).toHaveBeenCalledTimes(2);
  });

  it("OCRs detected crops independently and retries only the failed crop", async () => {
    let cropCalls = 0;
    bridge.run.mockImplementation(async (request) => {
      if (request.action === "page-ocr")
        return {
          ...pageResponse(""),
          result: {
            content: "",
            answer: "",
            solution: "",
            warnings: [],
            detectionOnly: true,
            problems: [
              {
                number: 19,
                content: "",
                answer: "",
                bbox: { left: 50, top: 100, width: 400, height: 250 },
              },
              {
                number: 20,
                content: "",
                answer: "",
                bbox: { left: 550, top: 100, width: 400, height: 250 },
              },
            ],
          },
        };
      cropCalls++;
      if (cropCalls === 2) throw new Error("isolated OCR failure");
      return {
        ...response("ocr"),
        result: {
          content: "다음을 계산하시오. $1+2$",
          answer: "",
          solution: "",
          warnings: [],
          ocr: {
            ...request.ocr,
            blocks: [
              { type: "text", value: "다음을 계산하시오. $1+2$", rows: [] },
            ],
            confidence: "high",
            bodyMissing: false,
          },
        },
      };
    });
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    await waitFor(() =>
      expect(result.current.cropJobs.map((job) => job.state)).toEqual([
        "complete",
        "error",
      ]),
    );
    expect(result.current.crops).toHaveLength(2);
    expect(result.current.crops[0].ocr?.number).toBe(19);
    expect(result.current.crops[1].content).toBe("");
    expect(result.current.crops[1].image).toContain("crop-pixels");
    await act(async () => {
      await result.current.retry();
    });
    expect(cropCalls).toBe(3);
    expect(result.current.crops[1].ocr?.number).toBe(20);
    expect(
      bridge.run.mock.calls.filter((call) => call[0].action === "page-ocr"),
    ).toHaveLength(1);
  });

  it("restores only settled page stamps without dispatching AI", async () => {
    const { result } = mount([]);
    await act(async () => {
      result.current.restorePageJobs([
        { key: "stale", sourceId: "source", page: 1, state: "empty" },
        { key: "source:2", sourceId: "source", page: 2, state: "complete" },
        { key: "source:3", sourceId: "source", page: 3, state: "running" },
        { key: "source:4", sourceId: "source", page: 4, state: "error" },
      ]);
    });
    expect(result.current.pageJobs.map((job) => [job.key, job.state])).toEqual([
      ["source:1", "empty"],
      ["source:2", "complete"],
    ]);
    expect(bridge.run).not.toHaveBeenCalled();
    expect(result.current.running).toBe(false);
  });

  it("applies per-problem classification while retaining page grade metadata and source name", async () => {
    const value = pageResponse();
    Object.assign(value.result.problems![0], { questionType: "descriptive" });
    value.result.detectedGrade = {
      grade: "초5",
      confidence: "high",
      evidence: "source title",
    };
    bridge.run.mockResolvedValue(value);
    const { result } = mount([]);
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    expect(bridge.run.mock.calls[0][0]).toMatchObject({
      sourceName: "source.pdf",
      grade: "초5",
    });
    expect(result.current.crops[0]).toMatchObject({
      questionType: "descriptive",
      grade: "초5",
      level: "elementary",
    });
    expect(result.current.pageJobs[0].detectedGrade).toEqual(
      value.result.detectedGrade,
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
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
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
      [1, "first"],
      [2, "second"],
      [3, "third"],
      [4, "fourth"],
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
    expect(
      bridge.run.mock.calls.filter(
        (call) => call[0].action !== "figure-redraw",
      ),
    ).toHaveLength(1);
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

  it("keeps a completed page owner intact when cancelling the remaining queue", async () => {
    const reply = deferred<DevAiResponse>();
    bridge.run
      .mockResolvedValueOnce(pageResponse())
      .mockReturnValue(reply.promise);
    const tasks = [task(1), task(2)];
    const { result } = mount([]);
    let work!: Promise<void>;
    await act(async () => {
      work = result.current.recognizePages(tasks);
    });
    expect(result.current.pageProgress.done).toBe(1);
    const completedSignal = tasks[0].load.mock.calls[0][0];
    await act(async () => {
      result.current.cancel();
      await work;
    });
    expect(completedSignal.aborted).toBe(false);
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "complete",
      "cancelled",
    ]);
    await act(async () => {
      reply.resolve(pageResponse());
    });
    expect(result.current.crops).toHaveLength(1);
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

  it("queues three deduped crop jobs behind pages, appends FIFO work, and survives navigation", async () => {
    const replies = Array.from({ length: 6 }, () => deferred<DevAiResponse>());
    bridge.run.mockImplementation(
      () => replies[bridge.run.mock.calls.length - 1].promise,
    );
    const tasks = [task(1, "pdf"), task(2, "pdf"), task(3, "pdf")];
    const { result, rerender } = mount([
      crop("a"),
      crop("b", "problem B"),
      crop("c", "problem C"),
    ]);
    let pages!: Promise<void>;
    let appendedPage!: Promise<void>;
    let a!: Promise<void>;
    let b!: Promise<void>;
    let c!: Promise<void>;
    let duplicate!: Promise<void>;
    await act(async () => {
      pages = result.current.recognizePages(tasks.slice(0, 2));
      a = result.current.processCrops("ocr", ["a"]);
      b = result.current.processCrops("solution", ["b"]);
      c = result.current.processCrops("figures", ["c"]);
      duplicate = result.current.processCrops("ocr", ["a"]);
      appendedPage = result.current.recognizePages([tasks[2]]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(2);
    expect(result.current.cropJobs).toEqual([
      { cropId: "a", action: "ocr", state: "queued" },
      { cropId: "b", action: "solution", state: "queued" },
      { cropId: "c", action: "figures", state: "queued" },
    ]);
    rerender({ contextKey: "other-source:9", active: false });
    expect(
      bridge.run.mock.calls.every((call) => !(call[1] as AbortSignal).aborted),
    ).toBe(true);
    await act(async () => {
      replies[1].resolve(pageResponse());
    });
    expect(
      bridge.run.mock.calls
        .filter((call) => call[0].action !== "figure-redraw")
        .map((call) => call[0].action),
    ).toEqual(["page-ocr", "page-ocr", "ocr"]);
    expect(result.current.cropJobs[0]).toMatchObject({
      state: "running",
      startedAt: expect.any(Number),
    });
    await act(async () => {
      replies[0].resolve(pageResponse());
      await pages;
    });
    expect(bridge.run.mock.calls[3][0]).toMatchObject({
      action: "solution",
      content: "problem B",
    });
    expect(tasks[2].load).not.toHaveBeenCalled();
    await act(async () => {
      replies[3].resolve(response("solution"));
      await b;
    });
    expect(bridge.run.mock.calls[4][0].action).toBe("figures");
    expect(tasks[2].load).not.toHaveBeenCalled();
    await act(async () => {
      replies[2].resolve(response());
      await Promise.all([a, duplicate]);
    });
    expect(tasks[2].load).toHaveBeenCalledOnce();
    expect(bridge.run.mock.calls[5][0].action).toBe("page-ocr");
    await act(async () => {
      replies[4].resolve({
        ...response("figures"),
        result: { ...response("figures").result, figures: [] },
      });
      replies[5].resolve(pageResponse());
      await Promise.all([c, appendedPage]);
    });
    expect(bridge.run).toHaveBeenCalledTimes(6);
    expect(
      result.current.cropJobs.every((job) => job.state === "complete"),
    ).toBe(true);
    expect(result.current.crops.find((item) => item.id === "a")?.content).toBe(
      response().result.content,
    );
    expect(result.current.crops.find((item) => item.id === "b")?.solution).toBe(
      response("solution").result.solution,
    );
    expect(result.current.pageProgress.done).toBe(3);
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
    expect(
      bridge.run.mock.calls
        .filter((call) => call[0].action !== "figure-redraw")
        .map((call) => call[0].action),
    ).toEqual(["page-ocr", "page-ocr", "page-ocr"]);
    expect(result.current.crops.find((item) => item.id === "a")?.content).toBe(
      "",
    );
  });

  it("global sidebar cancellation stops crop and queued page owners and unsubscribes on unmount", async () => {
    const pending = deferred<DevAiResponse>();
    bridge.run.mockReturnValue(pending.promise);
    const tasks = [task(1, "pdf"), task(2, "pdf")];
    const { result, rerender, unmount } = mount();
    let pages!: Promise<void>;
    let crops!: Promise<void>;
    await act(async () => {
      crops = result.current.processCrops("ocr", ["a"]);
      pages = result.current.recognizePages(tasks);
    });
    expect(bridge.cancelListeners.size).toBe(1);
    rerender({ contextKey: "source:1", active: true });
    expect(bridge.cancelListeners.size).toBe(1);
    const signals = bridge.run.mock.calls.map((call) => call[1] as AbortSignal);
    await act(async () => {
      for (const listener of bridge.cancelListeners) listener();
      await Promise.all([pages, crops]);
    });
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(result.current.pageJobs.map((job) => job.state)).toEqual([
      "cancelled",
      "cancelled",
    ]);
    expect(result.current.progress).toBeNull();
    expect(result.current.running).toBe(false);
    await act(async () => {
      pending.resolve(pageResponse());
    });
    expect(tasks[1].load).not.toHaveBeenCalled();
    expect(result.current.crops).toEqual([crop("a")]);
    expect(bridge.cancel).not.toHaveBeenCalled();
    unmount();
    expect(bridge.cancelListeners.size).toBe(0);
  });

  it("orders source pages while preserving other sources and within-page reading order", async () => {
    const value = pageResponse();
    value.result.problems = [
      {
        content: "left lower",
        answer: "",
        bbox: { left: 100, top: 600, width: 300, height: 200 },
      },
      {
        content: "right upper",
        answer: "",
        bbox: { left: 600, top: 100, width: 300, height: 200 },
      },
    ];
    bridge.run.mockResolvedValue(value);
    const later = { ...crop("later", "later page"), page: 3 };
    const other = { ...crop("other", "another source"), sourceId: "other" };
    const manual = {
      ...crop("manual", "manual first"),
      page: 1,
      rect: { x: 0, y: 0, width: 0.05, height: 0.05 },
    };
    const { result } = mount([later, other, manual]);
    await act(async () => {
      await result.current.recognizePages([task(1)]);
    });
    expect(result.current.crops[1]).toBe(other);
    expect(
      result.current.crops
        .filter((item) => item.sourceId === "source")
        .map((item) => [item.page, item.content]),
    ).toEqual([
      [1, "manual first"],
      [1, "left lower"],
      [1, "right upper"],
      [3, "later page"],
    ]);
  });
});

/**
 * 원장님 운영 콘솔 2026-09-21 — `POST /api/studio/ai 429`. 도형 편집기의 «요청대로 고치기»가 대기열을 안 거치고 바로 나가,
 * 일괄 작업이 서버의 계정당 두 자리를 쓰는 동안 세 번째 요청이 되어 거절됐다. 대기열 규칙은 `studioAiQueuePriority.test.ts` 가
 * 재고, 여기서는 **훅이 그 길로 보내는가**를 잰다.
 */
describe("편집기에서 직접 누른 요청은 대기열 맨 앞으로", () => {
  it("🔴 두 자리가 찬 동안에는 안 나가고, 자리가 나면 기다리던 일괄 작업보다 먼저 나간다", async () => {
    const gates = [deferred<DevAiResponse>(), deferred<DevAiResponse>()];
    const actions: string[] = [];
    let inFlight = 0;
    let peak = 0;
    bridge.run.mockImplementation(async (request) => {
      actions.push(request.action);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      try {
        const gate = request.action === "ocr" ? gates.shift() : undefined;
        return gate
          ? await gate.promise
          : { ...response(request.action), result: { ...response().result } };
      } finally {
        inFlight -= 1;
      }
    });
    const held = [...gates];
    const { result } = mount([crop("a"), crop("b"), crop("c")]);
    let batch!: Promise<unknown>;
    act(() => {
      batch = result.current.processCrops("ocr", ["a", "b", "c"]);
    });
    await waitFor(() => expect(actions).toEqual(["ocr", "ocr"]));
    let edit!: Promise<DevAiResponse>;
    act(() => {
      edit = result.current.runInteractive({
        action: "figure-edit",
        imageDataUrl: "data:image/png;base64,YWJj",
        content: "2번 선분을 점선으로",
        grade: "중2",
      } as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    // 세 번째 동시 요청은 없다 — 서버가 429 로 거절하는 자리
    expect(actions).toEqual(["ocr", "ocr"]);
    await act(async () => {
      held[0]!.resolve(response());
      await edit;
    });
    // 자리가 나자 기다리던 셋째 OCR 보다 먼저
    expect(actions.slice(0, 3)).toEqual(["ocr", "ocr", "figure-edit"]);
    await act(async () => {
      held[1]!.resolve(response());
      await batch;
    });
    expect(peak).toBe(2);
  });
});
