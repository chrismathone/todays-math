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
