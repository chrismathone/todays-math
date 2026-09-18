import { StrictMode, useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStudioFigureAi } from "@/components/unified/useStudioFigureAi";
import { StudioAiQueue } from "@/components/unified/studioAiQueue";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import type { useDevAi } from "@/components/unified/useDevAi";
import type { DevAiResponse } from "@/lib/dev-ai/contracts";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90L50 10L90 90Z" fill="none" stroke="black"/></svg>';
const response = (): DevAiResponse => ({
  provider: "claude",
  action: "figure-redraw",
  result: {
    content: "",
    answer: "",
    solution: "",
    warnings: [],
    svg,
    spec: { version: 2 },
    engine: "todays-math-python",
    figureReview: { mode: "source-image-and-spec", passed: true, issues: [] },
  },
});
function deferred() {
  let resolve!: (value: DevAiResponse) => void;
  const promise = new Promise<DevAiResponse>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
function crop(id: string): StudioCrop {
  return {
    id,
    sourceId: "source",
    sourceLabel: "test.png",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: `original-${id}`,
    content: "삼각형의 넓이를 구하시오.",
    answer: "",
    solution: "",
    grade: "고1",
    level: "secondary",
    mode: "text",
    added: false,
    figures: [
      {
        id: `f-${id}`,
        rect: { x: 0.1, y: 0.2, width: 0.5, height: 0.5 },
        image: `raster-${id}`,
      },
    ],
  };
}
function mount(
  initial: StudioCrop[],
  run = vi.fn().mockResolvedValue(response()),
  queue = new StudioAiQueue(),
) {
  const rendered = renderHook(
    () => {
      const [crops, setCrops] = useState(initial);
      const figures = useStudioFigureAi({
        crops,
        setCrops,
        queue,
        ai: { run } as unknown as ReturnType<typeof useDevAi>,
        available: true,
      });
      return { ...figures, crops, setCrops };
    },
    { wrapper: StrictMode },
  );
  return { ...rendered, run };
}

describe("Studio automatic SVG ownership", () => {
  it("does not run on mount; preserves raster and produces editable SVG used by digital output", async () => {
    const { result, run } = mount([crop("a")]);
    expect(run).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.run(["a"]);
    });
    const rendered = result.current.crops[0];
    expect(rendered.figures?.[0]).toMatchObject({
      originalImage: "raster-a",
      engine: "todays-math-python",
      spec: { version: 2 },
      figureReview: { passed: true },
    });
    expect(rendered.figures?.[0].svg).toContain("<path");
    expect(studioProblem(rendered).figureUrls[0]).toMatch(
      /^data:image\/svg\+xml/,
    );
    expect(studioProblem(rendered).croppedImage).toBeUndefined();
    await act(async () => {
      await result.current.run(["a"]);
    });
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("uses the same bounded FIFO as page work and deduplicates a queued figure", async () => {
    const queue = new StudioAiQueue(2);
    let release!: () => void;
    const page = queue.enqueue(
      new AbortController().signal,
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const requests = [deferred(), deferred(), deferred()];
    const run = vi
      .fn()
      .mockImplementationOnce(() => requests[0].promise)
      .mockImplementationOnce(() => requests[1].promise)
      .mockImplementationOnce(() => requests[2].promise);
    const { result } = mount([crop("a"), crop("b"), crop("c")], run, queue);
    let work!: Promise<void>;
    act(() => {
      work = result.current.run(["a", "b", "c"]);
      void result.current.run(["b"]);
    });
    expect(run).toHaveBeenCalledTimes(1);
    await act(async () => {
      release();
      await page;
    });
    expect(run).toHaveBeenCalledTimes(2);
    await act(async () => {
      requests[0].resolve(response());
    });
    await waitFor(() => expect(run).toHaveBeenCalledTimes(3));
    await act(async () => {
      requests[1].resolve(response());
      requests[2].resolve(response());
      await work;
    });
    expect(result.current.jobs.every((job) => job.state === "complete")).toBe(
      true,
    );
  });
  it("cancels one figure without cancelling another and rejects late cancelled output", async () => {
    const first = deferred();
    const second = deferred();
    const run = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = mount([crop("a"), crop("b")], run);
    let work!: Promise<void>;
    act(() => {
      work = result.current.run(["a", "b"]);
    });
    act(() => {
      result.current.cancel("a", "f-a");
    });
    await act(async () => {
      first.resolve(response());
      second.resolve(response());
      await work;
    });
    expect(result.current.crops[0].figures?.[0].image).toBe("raster-a");
    expect(result.current.crops[1].figures?.[0].svg).toContain("<path");
    expect(result.current.jobs.find((job) => job.cropId === "a")?.state).toBe(
      "cancelled",
    );
  });
  it("preserves a manual edit made while a figure is running", async () => {
    const request = deferred();
    const { result } = mount(
      [crop("a")],
      vi.fn().mockReturnValue(request.promise),
    );
    let work!: Promise<void>;
    act(() => {
      work = result.current.run(["a"]);
    });
    act(() => {
      result.current.setCrops((items) =>
        items.map((item) => ({
          ...item,
          figures: item.figures?.map((f) => ({
            ...f,
            image: "manual",
            svg: "manual-svg",
          })),
        })),
      );
    });
    await act(async () => {
      request.resolve(response());
      await work;
    });
    expect(result.current.crops[0].figures?.[0].image).toBe("manual");
    expect(result.current.jobs[0].state).toBe("cancelled");
  });
  // 2026-09-19 — 서버(422)가 재작도 실패 사유를 «… 원본은 유지됩니다.»로 끝내 보낸다. 그 뒤에 또
  // «원본 그림을 유지했습니다.»를 붙이면 같은 말이 겹친다. 이미 그렇게 끝나면 덧붙이지 않는다.
  it.each([
    [
      "도형 엔진이 그림을 해석하지 못했습니다. 원본은 유지됩니다.",
      "도형 엔진이 그림을 해석하지 못했습니다. 원본은 유지됩니다.",
    ],
    [
      "재작도가 오래 걸려 원본을 유지했습니다.",
      "재작도가 오래 걸려 원본을 유지했습니다.",
    ],
    [
      "원본 대조 응답을 읽지 못했습니다. 원본은 유지됩니다",
      "원본 대조 응답을 읽지 못했습니다. 원본은 유지됩니다",
    ],
    ["engine failed", "engine failed 원본 그림을 유지했습니다."],
  ])("does not repeat the keep-original note: %s", async (message, shown) => {
    const run = vi.fn().mockRejectedValueOnce(new Error(message));
    const { result } = mount([crop("a")], run);
    await act(async () => {
      await result.current.run(["a"]);
    });
    expect(result.current.jobs[0]).toMatchObject({
      state: "error",
      error: shown,
    });
  });
  it("retries only the failed figure and retains originals while failures are visible", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("engine failed"))
      .mockResolvedValue(response());
    const { result } = mount([crop("a"), crop("b")], run);
    await act(async () => {
      await result.current.run(["a", "b"]);
    });
    expect(result.current.jobs[0]).toMatchObject({
      state: "error",
      error: expect.stringContaining("원본 그림을 유지"),
    });
    expect(result.current.crops[0].figures?.[0].image).toBe("raster-a");
    await act(async () => {
      await result.current.run(["a"], "f-a");
    });
    expect(run).toHaveBeenCalledTimes(3);
    expect(run.mock.calls[2][0].imageDataUrl).toBe("raster-a");
    expect(result.current.jobs.every((job) => job.state === "complete")).toBe(
      true,
    );
  });
});
