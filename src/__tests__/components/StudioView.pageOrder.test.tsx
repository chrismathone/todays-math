import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import type {
  StudioAiPageTask,
  StudioAiPageJob,
} from "@/components/unified/useStudioAi";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import {
  addToCart,
  reconcileStudioPageCart,
  type StudioCartRemoval,
} from "@/components/unified/studioCart";
import * as imageHelpers from "@/components/unified/studioAiHelpers";
import * as pagePreviews from "@/components/unified/studioPagePreview";

const state = vi.hoisted(() => ({
  saved: null as unknown,
  save: vi.fn(),
  recognize: vi.fn(),
  jobs: null as StudioAiPageJob[] | null,
  activePages: [] as readonly { sourceId: string; page: number }[],
  pdfPages: 2,
  readText: vi.fn(),
  readOperators: vi.fn(),
  blankPages: [] as number[],
  renderedPages: new WeakMap<HTMLCanvasElement, number>(),
}));
vi.mock("@/components/unified/studioSessionStore", () => ({
  StudioSessionStore: class {
    load = async () => state.saved;
    save = state.save;
    clear = async () => {};
    retain() {}
    release() {}
  },
}));
vi.mock("@/components/unified/useStudioAi", async (original) => {
  const actual =
    await original<typeof import("@/components/unified/useStudioAi")>();
  return {
    ...actual,
    useStudioAi: (...args: Parameters<typeof actual.useStudioAi>) => {
      state.activePages = args[0].activePages ?? [];
      return {
        ...actual.useStudioAi(...args),
        ...(state.jobs ? { pageJobs: state.jobs } : {}),
        recognizePages: state.recognize,
      };
    },
  };
});
vi.mock("pdfjs-dist", () => ({
  version: "test",
  GlobalWorkerOptions: {},
  OPS: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: state.pdfPages,
      getPage: async (page: number) => ({
        cleanup() {},
        getViewport: ({ scale }: { scale: number }) => ({
          width: 100 * scale,
          height: 140 * scale,
        }),
        getTextContent: state.readText,
        getOperatorList: state.readOperators,
        render: ({ canvas }: { canvas: HTMLCanvasElement }) => {
          state.renderedPages.set(canvas, page);
          return { promise: Promise.resolve(), cancel() {} };
        },
      }),
      loadingTask: { destroy: async () => {} },
    }),
    destroy: async () => {},
  }),
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

beforeEach(() => {
  state.saved = null;
  state.save.mockReset().mockResolvedValue(undefined);
  state.recognize.mockReset();
  state.jobs = null;
  state.activePages = [];
  state.pdfPages = 2;
  state.blankPages = [];
  state.renderedPages = new WeakMap();
  state.readText.mockReset().mockResolvedValue({
    items: [{ str: "1. 값을 구하시오.", hasEOL: true }],
  });
  state.readOperators
    .mockReset()
    .mockResolvedValue({ fnArray: [], argsArray: [] });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        enabled: true,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [
          { id: "codex", label: "Codex", status: "ready", image: true },
        ],
      }),
    ),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      return new Proxy(
        {},
        {
          get: (_, key) =>
            key === "getImageData"
              ? (_x: number, _y: number, width: number, height: number) => {
                  // Full pixel buffers also exercise the high-resolution blank check.
                  const data = new Uint8ClampedArray(width * height * 4).fill(
                    255,
                  );
                  if (
                    !state.blankPages.includes(
                      state.renderedPages.get(this) ?? 0,
                    )
                  )
                    data[0] = data[1] = data[2] = 0;
                  return { data, width, height };
                }
              : vi.fn(),
        },
      ) as CanvasRenderingContext2D;
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,c291cmNl",
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(onAdd = vi.fn()) {
  return render(
    <DevAiProvider>
      <StudioView onAdd={onAdd} onExport={() => {}} storageScope="local-test" />
    </DevAiProvider>,
  );
}
async function beginUpload() {
  const view = open();
  const input = screen.getByLabelText("PDF 또는 이미지 파일 가져오기");
  await waitFor(() => expect(input).toBeEnabled());
  const file = new File(["pdf"], "본문.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new ArrayBuffer(8),
  });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
  return view;
}
async function upload() {
  const view = await beginUpload();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled(),
  );
  return view;
}
function savedSession(
  extra: Partial<StudioSessionData> = {},
): StudioSessionData {
  return {
    sources: [
      { id: "a", name: "본문.pdf", kind: "sample", pages: 2 },
      { id: "b", name: "서술형.pdf", kind: "sample", pages: 1 },
    ],
    crops: [],
    sourceId: "a",
    pageNumber: 1,
    activeCropId: "",
    inspectedPages: {},
    step: "crop",
    grade: "미지정",
    level: "secondary",
    ...extra,
  };
}
const pageChoices = () =>
  within(screen.getByRole("combobox", { name: "페이지 선택" }))
    .getAllByRole("option")
    .map((el) => el.textContent);

function workedPages(): StudioCrop[] {
  return [1, 2].map((page) => ({
    id: `c${page}`,
    sourceId: "a",
    sourceLabel: "본문.pdf",
    page,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
    image: "data:image/png;base64,c291cmNl",
    content: `인식 ${page}`,
    answer: "2",
    solution: `해설 ${page}`,
    grade: "중1",
    level: "secondary",
    mode: "image",
    reviewed: true,
  }));
}

async function excludeFirstWorkedPage() {
  fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "이 쪽 빼기" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
}

describe("Studio 쪽 차례 연결", () => {
  it("정상 쪽 뒤 100개 확인 후보가 멈춰도 이동·실패 재시도·시작은 즉시 가능하다", async () => {
    state.pdfPages = 102;
    const pending: {
      signal: AbortSignal;
      finish: (value: pagePreviews.StudioPagePreview) => void;
    }[] = [];
    let failed = false;
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockImplementation(async (_source, page, signal, options) => {
        if (page === 1) return { url: "blob:ready" };
        if (page === 2 && !failed) {
          failed = true;
          return { url: "blob:failed", error: "확인 시간 초과" };
        }
        options?.onPreview?.({ url: `blob:pending-${page}`, inkRatio: 0 });
        return new Promise((finish) => pending.push({ signal, finish }));
      });
    await beginUpload();
    const cards = () => [
      ...screen
        .getByRole("region", { name: "쪽 카드" })
        .querySelectorAll("figure"),
    ];
    expect(cards()).toHaveLength(102);
    expect(within(cards()[0]).getByRole("img")).toHaveAttribute(
      "src",
      "blob:ready",
    );
    const retry = within(cards()[1]).getByRole("button", { name: /다시 시도/ });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2, 3, 2]);
    expect(within(cards()[2]).getByRole("img")).toHaveAttribute(
      "src",
      "blob:pending-3",
    );
    expect(screen.getByRole("button", { name: "맨 뒤" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "맨 뒤" }));
    expect(JSON.parse(cards().at(-1)!.dataset.stripKey!)[1]).toBe(1);
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "1 영역 지정" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(pending.every((request) => request.signal.aborted)).toBe(true);
    expect(pageChoices()).toHaveLength(102);
    expect(preview).toHaveBeenCalledTimes(4);
  });

  it("여러 실패 쪽을 재시도해도 직렬 확인과 재시도 한 쪽만 함께 실행한다", async () => {
    state.pdfPages = 4;
    const failed = new Set<number>();
    const pending: {
      page: number;
      finish: (value: pagePreviews.StudioPagePreview) => void;
    }[] = [];
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockImplementation(async (_source, page, _signal, options) => {
        if (page === 1) return { url: "blob:ready" };
        if ((page === 2 || page === 3) && !failed.has(page)) {
          failed.add(page);
          return { url: `blob:failed-${page}`, error: "확인 실패" };
        }
        options?.onPreview?.({ url: `blob:pending-${page}`, inkRatio: 0 });
        return new Promise((finish) => pending.push({ page, finish }));
      });
    await beginUpload();
    const cards = screen
      .getByRole("region", { name: "쪽 카드" })
      .querySelectorAll("figure");
    fireEvent.click(
      within(cards[1]).getByRole("button", { name: /다시 시도/ }),
    );
    fireEvent.click(
      within(cards[2]).getByRole("button", { name: /다시 시도/ }),
    );
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2, 3, 4, 2]);
    expect(
      within(cards[2]).getByRole("button", { name: /다시 시도/ }),
    ).toBeDisabled();
    await act(async () => {
      pending
        .find((request) => request.page === 2)!
        .finish({ url: "blob:recovered-2" });
    });
    expect(preview.mock.calls.map((call) => call[1])).toEqual([
      1, 2, 3, 4, 2, 3,
    ]);
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(preview.mock.calls.every((call) => call[2].aborted)).toBe(true);
    expect(pageChoices()).toHaveLength(4);
  });

  it.each(["start", "crop-tab", "external-crop"] as const)(
    "%s 시작은 확인을 즉시 취소하고 아직 안 읽은 쪽까지 유지하며 재진입 후에도 자동 제외하지 않는다",
    async (entry) => {
      state.pdfPages = 3;
      const pending: {
        signal: AbortSignal;
        emit: (value: pagePreviews.StudioPagePreview) => void;
        finish: (value: pagePreviews.StudioPagePreview) => void;
      }[] = [];
      let checking = true;
      const preview = vi
        .spyOn(pagePreviews, "renderStudioPagePreview")
        .mockImplementation(async (_source, page, signal, options) => {
          if (page === 1) return { url: "blob:ready" };
          if (!checking)
            return { url: `blob:verified-${page}`, autoOut: "빈 쪽" };
          options?.onPreview?.({ url: `blob:pending-${page}`, inkRatio: 0 });
          return new Promise((finish) =>
            pending.push({
              signal,
              emit: (value) => options?.onPreview?.(value),
              finish,
            }),
          );
        });
      const view = await beginUpload();
      fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
      if (entry === "external-crop") {
        view.rerender(
          <DevAiProvider>
            <StudioView
              onAdd={vi.fn()}
              onExport={() => {}}
              storageScope="local-test"
              stepRequest={{ id: 1, step: "crop" }}
            />
          </DevAiProvider>,
        );
      } else {
        fireEvent.click(
          screen.getByRole("button", {
            name: entry === "start" ? "이 순서로 시작 →" : "1 영역 지정",
          }),
        );
      }
      expect(pending[0].signal.aborted).toBe(true);
      expect(pageChoices()).toEqual([
        expect.stringMatching(/원본 2쪽/),
        expect.stringMatching(/원본 3쪽/),
      ]);
      // The viewport render has a separate owner and remains usable after abort.
      await screen.findByRole("img", { name: "본문.pdf, 2쪽 원본" });
      checking = false;
      fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
      await waitFor(() => expect(preview).toHaveBeenCalledTimes(4));
      await act(async () => {
        pending[0].emit({ url: "blob:stale-thumbnail" });
        pending[0].finish({ url: "blob:stale-confirmation", autoOut: "빈 쪽" });
      });
      expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 1")).toBeVisible();
      const cards = screen
        .getByRole("region", { name: "쪽 카드" })
        .querySelectorAll("figure");
      expect(cards[0]).toHaveAttribute("data-excluded", "true");
      expect(cards[1]).toHaveAttribute("data-excluded", "false");
      expect(cards[2]).toHaveAttribute("data-excluded", "false");
      expect(within(cards[1]).getByRole("img")).toHaveAttribute(
        "src",
        "blob:verified-2",
      );
    },
  );

  it.each(["confirmation", "retry"] as const)(
    "%s가 늦게 빈 쪽을 확인해도 직접 빼기·되살리기와 두 번 되돌리기의 원래 스냅샷을 보존한다",
    async (mode) => {
      let finish!: (value: pagePreviews.StudioPagePreview) => void;
      let first = true;
      vi.spyOn(pagePreviews, "renderStudioPagePreview").mockImplementation(
        async (_source, page, _signal, options) => {
          if (page === 2) return { url: "blob:page2" };
          if (mode === "retry" && first) {
            first = false;
            return { url: "blob:failed", error: "확인 시간 초과" };
          }
          options?.onPreview?.({ url: "blob:unconfirmed", inkRatio: 0 });
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
      );
      await beginUpload();
      const firstCard = () =>
        screen
          .getByRole("region", { name: "쪽 카드" })
          .querySelector("figure")!;
      if (mode === "confirmation")
        expect(within(firstCard()).getByRole("img")).toHaveAttribute(
          "src",
          "blob:unconfirmed",
        );
      fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
      fireEvent.click(screen.getByRole("button", { name: "되살리기" }));
      if (mode === "retry") {
        fireEvent.click(
          within(firstCard()).getByRole("button", { name: /다시 시도/ }),
        );
        expect(within(firstCard()).getByRole("img")).toHaveAttribute(
          "src",
          "blob:unconfirmed",
        );
      }
      await act(async () => {
        finish({ url: "blob:verified", autoOut: "빈 쪽" });
      });
      expect(firstCard()).toHaveAttribute("data-excluded", "false");
      fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
      expect(firstCard()).toHaveAttribute("data-excluded", "true");
      fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
      expect(firstCard()).toHaveAttribute("data-excluded", "false");
    },
  );

  it("직접 뺀 선택을 되돌린 뒤에도 늦은 자동 확인이 다시 제외하지 않는다", async () => {
    let finish!: (value: pagePreviews.StudioPagePreview) => void;
    vi.spyOn(pagePreviews, "renderStudioPagePreview").mockImplementation(
      async (_source, page, _signal, options) => {
        if (page === 2) return { url: "blob:page2" };
        options?.onPreview?.({ url: "blob:unconfirmed" });
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );
    await beginUpload();
    fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
    fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
    await act(async () => {
      finish({ url: "blob:verified", autoOut: "빈 쪽" });
    });
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
  });

  it("자동 제외는 현재만 갱신하고 이전 이동의 되돌리기 스냅샷은 고치지 않는다", async () => {
    let finish!: (value: pagePreviews.StudioPagePreview) => void;
    vi.spyOn(pagePreviews, "renderStudioPagePreview").mockImplementation(
      async (_source, page, _signal, options) => {
        if (page === 1) return { url: "blob:page1" };
        options?.onPreview?.({ url: "blob:unconfirmed" });
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );
    await beginUpload();
    fireEvent.click(screen.getByRole("button", { name: "맨 뒤" }));
    await act(async () => {
      finish({ url: "blob:blank", autoOut: "빈 쪽" });
    });
    expect(screen.getByText("시작할 쪽 1 · 뺀 쪽 1")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
  });

  it("확인 실패와 재시도 실패 후에도 이미 받은 그림을 유지하고 다시 시도할 수 있다", async () => {
    let reject!: (cause: Error) => void;
    let first = true;
    vi.spyOn(pagePreviews, "renderStudioPagePreview").mockImplementation(
      async (_source, page, _signal, options) => {
        if (page === 2) return { url: "blob:page2" };
        if (!first) throw new Error("재시도 실패");
        first = false;
        options?.onPreview?.({ url: "blob:thumbnail", inkRatio: 0 });
        return new Promise((_resolve, fail) => {
          reject = fail;
        });
      },
    );
    await beginUpload();
    const card = () =>
      screen.getByRole("region", { name: "쪽 카드" }).querySelector("figure")!;
    expect(within(card()).getByRole("img")).toHaveAttribute(
      "src",
      "blob:thumbnail",
    );
    await act(async () => {
      reject(new Error("확인 실패"));
    });
    expect(within(card()).getByRole("img")).toHaveAttribute(
      "src",
      "blob:thumbnail",
    );
    fireEvent.click(within(card()).getByRole("button", { name: /다시 시도/ }));
    await within(card()).findByText("재시도 실패");
    expect(within(card()).getByRole("img")).toHaveAttribute(
      "src",
      "blob:thumbnail",
    );
    expect(
      within(card()).getByRole("button", { name: /다시 시도/ }),
    ).toBeEnabled();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
  });

  it("확인이 멈춘 저장 작업도 이동·빼기·되살리기·되돌리기·시작 후 원래 크롭을 모두 보존한다", async () => {
    const crops = workedPages();
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "sample", pages: 2 }],
        crops,
        step: "order",
      }),
      originals: new Map(),
    };
    let finish!: (value: pagePreviews.StudioPagePreview) => void;
    vi.spyOn(pagePreviews, "renderStudioPagePreview").mockImplementation(
      async (_source, page, _signal, options) => {
        if (page === 1) return { url: "blob:page1" };
        options?.onPreview?.({ url: "blob:unconfirmed" });
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );
    open();
    const grid = await screen.findByRole("region", { name: "쪽 카드" });
    await within(grid).findByRole("img", { name: "본문.pdf 원본 1쪽" });
    fireEvent.click(screen.getByRole("button", { name: "맨 뒤" }));
    fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
    fireEvent.click(screen.getByRole("button", { name: "되살리기" }));
    fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    await act(async () => {
      finish({ url: "blob:stale", autoOut: "빈 쪽" });
    });
    expect(pageChoices()).toEqual([
      expect.stringMatching(/원본 2쪽/),
      expect.stringMatching(/원본 1쪽/),
    ]);
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0].crops).toEqual(crops),
    );
    expect(crops).toEqual(workedPages());
  });

  it("시간 초과 뒤 재진입하면 실패한 쪽만 다시 읽고 성공한 미리보기는 캐시에 남긴다", async () => {
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockRejectedValueOnce(new DOMException("시간 초과", "TimeoutError"))
      .mockImplementation(async (_source, page) => ({
        url: `blob:ok-${page}`,
      }));
    await upload();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2]);
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(3), {
      timeout: 1000,
    });
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2, 1]);
    expect(screen.queryByText("시간 초과")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    await act(async () => {});
    expect(preview).toHaveBeenCalledTimes(3);
  });

  it.each(["card", "aside"] as const)(
    "%s의 다시 시도는 같은 쪽 번호의 다른 파일 대신 정확한 원본·회전을 회복하고 중복 호출을 막는다",
    async (location) => {
      const crops = workedPages();
      const pageOrder = [
        { sourceId: "a", page: 2, out: false },
        { sourceId: "b", page: 1, out: false },
        { sourceId: "a", page: 1, out: false },
      ];
      state.saved = {
        data: savedSession({
          step: "order",
          crops,
          pageOrder,
          sources: [
            { id: "a", name: "본문.pdf", kind: "sample", pages: 2 },
            {
              id: "b",
              name: "서술형.pdf",
              kind: "sample",
              pages: 1,
              pageRotations: { 1: 90 },
            },
          ],
        }),
        originals: new Map(),
      };
      let resolveRetry!: (value: pagePreviews.StudioPagePreview) => void;
      let failed = false;
      const preview = vi
        .spyOn(pagePreviews, "renderStudioPagePreview")
        .mockImplementation(async (source, page) => {
          if (source.pageRotations?.[page] === 90) {
            if (!failed) {
              failed = true;
              // Candidate verification may fail after the thumbnail was rendered.
              return { url: "blob:unverified", error: "시간 초과" };
            }
            return new Promise((resolve) => {
              resolveRetry = resolve;
            });
          }
          return { url: `blob:ok-${page}` };
        });
      open();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "이 순서로 시작 →" }),
        ).toBeEnabled(),
      );
      const figures = () => [
        ...screen
          .getByRole("region", { name: "쪽 카드" })
          .querySelectorAll("figure"),
      ];
      const target = figures()[1];
      if (location === "aside")
        fireEvent.click(
          within(target).getByRole("button", { name: /크게 보기/ }),
        );
      const region =
        location === "card"
          ? target
          : screen.getByRole("complementary", { name: "선택한 쪽" });
      const retry = await within(region).findByRole("button", {
        name: /다시 시도/,
      });
      expect(retry).toHaveTextContent("다시 시도");
      expect(target).not.toHaveAttribute("role", "button");
      fireEvent.click(target);
      expect(preview).toHaveBeenCalledTimes(3);
      act(() => {
        fireEvent.click(retry);
        // Both callbacks can be queued before React commits the loading state.
        fireEvent.click(retry);
      });
      await waitFor(() => expect(preview).toHaveBeenCalledTimes(4));
      expect(preview.mock.calls[3][0]).toMatchObject({
        id: "b",
        pageRotations: { 1: 90 },
      });
      expect(preview.mock.calls[3][1]).toBe(1);
      expect(
        within(region).getByRole("button", { name: /다시 시도/ }),
      ).toBeDisabled();
      fireEvent.click(retry);
      expect(preview).toHaveBeenCalledTimes(4);
      await act(async () => {
        resolveRetry({ url: "blob:recovered-b1-90" });
      });
      expect(within(target).getByRole("img")).toHaveAttribute(
        "src",
        "blob:recovered-b1-90",
      );
      expect(
        figures().map((figure) => JSON.parse(figure.dataset.stripKey!)),
      ).toEqual(pageOrder.map((page) => [page.sourceId, page.page]));
      expect(screen.getByText("시작할 쪽 3 · 뺀 쪽 0")).toBeVisible();
      await waitFor(() =>
        expect(state.save.mock.calls.at(-1)?.[0].crops).toEqual(crops),
      );
      fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
      fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
      await act(async () => {});
      expect(preview).toHaveBeenCalledTimes(4);
    },
  );

  it("실패가 계속되어도 저절로 반복하지 않고 클릭 한 번에 한 번만 재시도한다", async () => {
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockImplementation(async (_source, page) => {
        if (page === 1) throw new DOMException("시간 초과", "TimeoutError");
        return { url: "blob:page2" };
      });
    await upload();
    const card = screen
      .getByRole("region", { name: "쪽 카드" })
      .querySelector("figure")!;
    fireEvent.click(within(card).getByRole("button", { name: /다시 시도/ }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(3));
    await act(async () => {});
    expect(
      within(card).getByRole("button", { name: /다시 시도/ }),
    ).toBeEnabled();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
    expect(preview).toHaveBeenCalledTimes(3);
  });

  it("이미지 디코딩 실패도 다시 시도하며 같은 URL의 새 결과를 다시 보여 준다", async () => {
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockResolvedValue({ url: "blob:same-image" });
    await upload();
    const card = screen
      .getByRole("region", { name: "쪽 카드" })
      .querySelector("figure")!;
    const aside = screen.getByRole("complementary", { name: "선택한 쪽" });
    fireEvent.error(within(card).getByRole("img"));
    fireEvent.error(within(aside).getByRole("img"));
    fireEvent.click(within(aside).getByRole("button", { name: /다시 시도/ }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(3));
    expect(within(card).getByRole("img")).toHaveAttribute(
      "src",
      "blob:same-image",
    );
    expect(within(aside).getByRole("img")).toHaveAttribute(
      "src",
      "blob:same-image",
    );
  });

  it("재시도 중 떠난 화면의 늦은 결과는 재진입한 쪽의 새 요청·캐시·제외 상태를 덮지 않는다", async () => {
    const pending: ((value: pagePreviews.StudioPagePreview) => void)[] = [];
    let first = true;
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockImplementation(async (_source, page) => {
        if (page === 2) return { url: "blob:page2" };
        if (first) {
          first = false;
          throw new DOMException("시간 초과", "TimeoutError");
        }
        // Deliberately ignore abort to exercise the caller's stale-result fence.
        return new Promise((resolve) => pending.push(resolve));
      });
    const view = await upload();
    const grid = () => screen.getByRole("region", { name: "쪽 카드" });
    fireEvent.click(within(grid()).getByRole("button", { name: /다시 시도/ }));
    expect(preview).toHaveBeenCalledTimes(3);
    view.rerender(
      <DevAiProvider>
        <StudioView
          onAdd={vi.fn()}
          onExport={() => {}}
          storageScope="local-test"
          stepRequest={{ id: 1, step: "crop" }}
        />
      </DevAiProvider>,
    );
    await screen.findByRole("combobox", { name: "페이지 선택" });
    expect(preview.mock.calls[2][2].aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(4));
    await act(async () => {
      pending[0]({ url: "blob:stale", autoOut: "빈 쪽" });
    });
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
    expect(within(grid()).queryByRole("img", { name: /원본 1쪽/ })).toBeNull();
    expect(
      within(grid()).getByRole("button", { name: /다시 시도/ }),
    ).toBeDisabled();
    await act(async () => {
      pending[1]({ url: "blob:current" });
    });
    expect(
      within(grid()).getByRole("img", { name: /원본 1쪽/ }),
    ).toHaveAttribute("src", "blob:current");
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    await act(async () => {});
    expect(preview).toHaveBeenCalledTimes(4);
    expect(
      within(grid()).getByRole("img", { name: /원본 1쪽/ }),
    ).toHaveAttribute("src", "blob:current");
  });

  it("내용 있는 PDF 미리보기는 텍스트·연산 목록이 멈춰 있어도 두 API를 부르지 않고 준비된다", async () => {
    state.readText.mockReturnValue(new Promise(() => {}));
    state.readOperators.mockReturnValue(new Promise(() => {}));
    await upload();
    expect(state.readText).not.toHaveBeenCalled();
    expect(state.readOperators).not.toHaveBeenCalled();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
  });

  it("흰 쪽 확인 실패는 제외 판정을 소비하지 않고 명시적 재시도에 성공한 뒤에만 빈 쪽으로 뺀다", async () => {
    let first = true;
    const preview = vi
      .spyOn(pagePreviews, "renderStudioPagePreview")
      .mockImplementation(async (_source, page) => {
        if (page === 2) return { url: "blob:page2" };
        if (first) {
          first = false;
          return { url: "blob:unverified-white", error: "시간 초과" };
        }
        return { url: "blob:verified-white", autoOut: "빈 쪽" };
      });
    await upload();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
    const card = screen
      .getByRole("region", { name: "쪽 카드" })
      .querySelector("figure")!;
    fireEvent.click(within(card).getByRole("button", { name: /다시 시도/ }));
    await screen.findByText(/빈 쪽으로 보여 미리 뺐습니다/);
    expect(screen.getByText("시작할 쪽 1 · 뺀 쪽 1")).toBeVisible();
    expect(card).toHaveAttribute("data-excluded", "true");
    expect(preview).toHaveBeenCalledTimes(3);
  });

  it("흰 PDF 후보의 텍스트가 응답하지 않으면 3초 안에 쪽을 유지하고 재시도를 연다", async () => {
    const preview = vi.spyOn(pagePreviews, "renderStudioPagePreview");
    state.blankPages = [2];
    state.readText.mockReturnValue(new Promise(() => {}));
    state.readOperators.mockReturnValue(new Promise(() => {}));
    open();
    const input = screen.getByLabelText("PDF 또는 이미지 파일 가져오기");
    await waitFor(() => expect(input).toBeEnabled());
    const file = new File(["pdf"], "지연.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new ArrayBuffer(8),
    });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    // Only the zero-ink second page needs text verification.
    expect(state.readText).toHaveBeenCalledTimes(1);
    expect(state.readOperators).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "이 쪽 빼기" })).toBeEnabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2999);
    });
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("button", { name: "이 쪽 빼기" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
    const cards = screen
      .getByRole("region", { name: "쪽 카드" })
      .querySelectorAll("figure");
    expect(cards[0]).toHaveAttribute("data-excluded", "false");
    expect(cards[1]).toHaveAttribute("data-excluded", "false");
    expect(
      within(cards[1]).getByRole("button", { name: /다시 시도/ }),
    ).toBeEnabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(state.readText).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(pageChoices()).toEqual([
      expect.stringMatching(/지연.pdf.*원본 1쪽/),
      expect.stringMatching(/지연.pdf.*원본 2쪽/),
    ]);
    expect(state.readText).toHaveBeenCalledTimes(1);
    expect(state.readOperators).not.toHaveBeenCalled();
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2]);
    // Reenter after the real helper's TimeoutError: only the failed white candidate retries.
    state.readText.mockResolvedValue({ items: [{ str: "작은 글자" }] });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    });
    expect(preview.mock.calls.map((call) => call[1])).toEqual([1, 2, 2]);
    expect(state.readText).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled();
    expect(screen.queryByRole("button", { name: /다시 시도/ })).toBeNull();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 0")).toBeVisible();
  });

  it("저장한 표지·정답표 사유와 되살린 상태를 그대로 읽고 빈 PDF 미리보기로 다시 제외하지 않는다", async () => {
    state.pdfPages = 4;
    state.blankPages = [1, 2, 3, 4];
    state.readText.mockResolvedValue({ items: [] });
    vi.stubGlobal(
      "File",
      class extends File {
        async arrayBuffer() {
          return new ArrayBuffer(8);
        }
      },
    );
    const pageOrder = [
      { sourceId: "a", page: 2, out: true, autoOut: "정답표" as const },
      { sourceId: "a", page: 4, out: false },
      { sourceId: "a", page: 1, out: true, autoOut: "표지" as const },
      { sourceId: "a", page: 3, out: false, autoOut: "표지" as const },
    ];
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "pdf", pages: 4 }],
        step: "order",
        pageOrder,
      }),
      originals: new Map([
        ["a", new Blob(["pdf"], { type: "application/pdf" })],
      ]),
    };
    open();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "이 순서로 시작 →" }),
      ).toBeEnabled(),
    );
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 2")).toBeVisible();
    for (const page of [1, 2]) {
      expect(
        screen.getByText(
          `본문.pdf 원본 ${page}쪽은 이전 작업에서 뺀 쪽입니다.`,
        ),
      ).toBeVisible();
    }
    expect(
      screen.queryByText(/빈 쪽으로 보여|문항 번호가 없습니다/),
    ).toBeNull();
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0].pageOrder).toEqual(pageOrder),
    );
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(pageChoices()).toEqual([
      expect.stringMatching(/본문.pdf.*원본 4쪽/),
      expect.stringMatching(/본문.pdf.*원본 3쪽/),
    ]);
    expect(state.readText).toHaveBeenCalledTimes(4);
    expect(state.readOperators).not.toHaveBeenCalled();
  });

  it("2차 원본 복원: 같은 옛 쪽에서 각각 새 원본이 된 담은 문항도 제외·출력·되살리기가 연결된다", async () => {
    const originals = workedPages().map((crop) => ({
      ...crop,
      sourceId: "old-source",
      page: 7,
    }));
    vi.spyOn(imageHelpers, "studioImageCanvas").mockImplementation(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 80;
      return canvas;
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob(["image"], { type: "image/png" })),
    );
    const output = vi.fn();
    function RestoredWorksheet() {
      const [cart, setCart] = useState({
        picked: originals.map(studioProblem),
        removed: [] as StudioCartRemoval[],
      });
      return (
        <>
          <StudioView
            picked={cart.picked}
            removed={cart.removed}
            onAdd={(problems) =>
              setCart((current) => ({
                ...current,
                picked: addToCart(current.picked, problems),
              }))
            }
            onPageOrderChange={(order, pageCrops) =>
              setCart((current) => {
                const next = reconcileStudioPageCart(
                  current.picked,
                  current.removed,
                  order,
                  pageCrops,
                );
                return next.picked === current.picked &&
                  next.removed === current.removed
                  ? current
                  : next;
              })
            }
            onExport={() => output(cart.picked.map((p) => p.id))}
            storageScope="local-test"
            restoreRequest={{ id: 1, crops: originals }}
          />
          <output aria-label="복원 시험지 목록">
            {cart.picked.map((p) => p.id).join(",")}
          </output>
        </>
      );
    }
    render(
      <DevAiProvider>
        <RestoredWorksheet />
      </DevAiProvider>,
    );
    await screen.findByText("저장한 문제의 원본과 검수 내용을 열었습니다.");
    await excludeFirstWorkedPage();
    fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    expect(screen.getByLabelText("복원 시험지 목록")).toHaveTextContent(/^c2$/);
    fireEvent.click(screen.getByRole("button", { name: /3 양식 구성/ }));
    expect(output).toHaveBeenLastCalledWith(["c2"]);
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    fireEvent.click(screen.getByRole("button", { name: "처음 차례로" }));
    expect(screen.getByLabelText("복원 시험지 목록")).toHaveTextContent(
      /^c1,c2$/,
    );
    expect(
      originals.every(
        (crop) => crop.sourceId === "old-source" && crop.page === 7,
      ),
    ).toBe(true);
  });

  it("모든 쪽을 빼면 남은 작업을 지우거나 빈 시험지 출력으로 넘어갈 수 없다", async () => {
    const crops = workedPages();
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "sample", pages: 2 }],
        crops,
        step: "review",
      }),
      originals: new Map(),
    };
    const onExport = vi.fn();
    const props = { onAdd: vi.fn(), onExport, storageScope: "local-test" };
    const view = render(
      <DevAiProvider>
        <StudioView {...props} />
      </DevAiProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "2문항 담기" }));
    await excludeFirstWorkedPage();
    fireEvent.click(screen.getByRole("button", { name: /원본 2쪽 크게 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
    expect(screen.getByRole("button", { name: /3 양식 구성/ })).toBeDisabled();
    view.rerender(
      <DevAiProvider>
        <StudioView
          {...props}
          stepRequest={{ id: 1, step: "crop" }}
          exportRequest={{ id: 1 }}
        />
      </DevAiProvider>,
    );
    const rotate = screen.queryByRole("button", { name: /90도 회전/ });
    if (rotate) expect(rotate).toBeDisabled();
    fireEvent.keyDown(window, { key: "Delete" });
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0].crops).toEqual(crops),
    );
    expect(onExport).not.toHaveBeenCalled();
  });

  it("실패 목록과 재시도 범위가 함께 활성 쪽만 가리킨다", async () => {
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "sample", pages: 2 }],
      }),
      originals: new Map(),
    };
    state.jobs = [1, 2].map((page) => ({
      key: `a:${page}`,
      sourceId: "a",
      page,
      state: "error",
    }));
    open();
    await screen.findByRole("combobox", { name: "페이지 선택" });
    await excludeFirstWorkedPage();
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(state.activePages).toEqual([{ sourceId: "a", page: 2, out: false }]);
    fireEvent.click(screen.getByRole("button", { name: /작업 진행 상세/ }));
    expect(
      screen.getByRole("button", { name: "실패 1쪽 재시도" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "실패 2쪽 재시도" }),
    ).not.toBeInTheDocument();
  });

  it("쪽 순서에서 저장한 작업은 문항 검토를 건너뛰고 저장한 차례 편집으로 복원한다", async () => {
    const pageOrder = [
      { sourceId: "a", page: 2, out: false },
      { sourceId: "b", page: 1, out: false },
      { sourceId: "a", page: 1, out: true },
    ];
    state.saved = {
      data: savedSession({ step: "order", pageOrder }),
      originals: new Map(),
    };
    open();
    const cards = await screen.findByRole("region", { name: "쪽 카드" });
    expect(
      [...cards.querySelectorAll("figure")].map((card) =>
        JSON.parse(card.dataset.stripKey!),
      ),
    ).toEqual(pageOrder.map((page) => [page.sourceId, page.page]));
    expect(screen.queryByRole("combobox", { name: "페이지 선택" })).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "이 순서로 시작 →" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(pageChoices()).toEqual([
      expect.stringMatching(/본문.pdf.*원본 2쪽/),
      expect.stringMatching(/서술형.pdf.*원본 1쪽/),
    ]);
  });

  it("현재 쪽을 빼고 검토를 거쳐 회전해도 뺀 쪽의 상자·인식·해설을 보존한다", async () => {
    const crops = workedPages();
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "sample", pages: 2 }],
        crops,
        activeCropId: "c1",
      }),
      originals: new Map(),
    };
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    open();
    await screen.findByRole("combobox", { name: "페이지 선택" });
    await excludeFirstWorkedPage();
    fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    fireEvent.click(screen.getByRole("button", { name: "1 영역 지정" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /90도 회전/ })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /90도 회전/ }));
    expect(confirm).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0]).toMatchObject({
        sourceId: "a",
        pageNumber: 2,
        crops,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    fireEvent.click(screen.getByRole("button", { name: "처음 차례로" }));
    fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    expect(screen.getByRole("button", { name: "2문항 담기" })).toBeEnabled();
  });

  it("담은 뒤 쪽을 빼면 담은 목록·출력 배지에서 빠지고 되살리면 돌아온다", async () => {
    state.saved = {
      data: savedSession({
        sources: [{ id: "a", name: "본문.pdf", kind: "sample", pages: 2 }],
        crops: workedPages(),
        activeCropId: "c1",
        step: "review",
      }),
      originals: new Map(),
    };
    open();
    fireEvent.click(await screen.findByRole("button", { name: "2문항 담기" }));
    await excludeFirstWorkedPage();
    fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    expect(
      screen.getByRole("button", { name: /^담은 문항/ }),
    ).toHaveTextContent("담은 문항 1");
    expect(
      screen.getByRole("button", { name: /3 양식 구성/ }),
    ).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: /^담은 문항/ }));
    const list = screen.getByRole("region", { name: /담은 문항/ });
    expect(within(list).queryByText("인식 1")).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole("button", { name: /닫기/ }));
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    fireEvent.click(screen.getByRole("button", { name: "처음 차례로" }));
    fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    expect(
      screen.getByRole("button", { name: /^담은 문항/ }),
    ).toHaveTextContent("담은 문항 2");
  });

  it("한 파일을 올려도 쪽 순서에서 시작하고 단추 이동·빼기·되돌리기가 인식 대상에 반영된다", async () => {
    await upload();
    const choose = screen.getAllByRole("button", { name: /크게 보기/ });
    fireEvent.click(choose[1]);
    fireEvent.click(screen.getByRole("button", { name: "맨 앞" }));
    fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
    fireEvent.click(screen.getAllByRole("button", { name: "되돌리기" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    expect(pageChoices()[0]).toMatch(/원본 2쪽/);
    expect(pageChoices()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "쪽 순서" }));
    fireEvent.click(screen.getByRole("button", { name: "이 쪽 빼기" }));
    fireEvent.click(screen.getByRole("button", { name: "이 순서로 시작 →" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /페이지 자동 인식/ }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /페이지 자동 인식/ }));
    expect(state.recognize).toHaveBeenCalled();
    const tasks = state.recognize.mock.calls.at(-1)![0] as StudioAiPageTask[];
    expect(tasks.map((p) => p.page)).toEqual([1]);
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0].pageOrder).toEqual([
        expect.objectContaining({ page: 2, out: true }),
        expect.objectContaining({ page: 1, out: false }),
      ]),
    );
  });

  it("섞은 저장 차례 전체를 인식하고 이전·다음이 파일 경계를 넘는다", async () => {
    state.saved = {
      data: savedSession({
        pageOrder: [
          { sourceId: "b", page: 1, out: false },
          { sourceId: "a", page: 2, out: false },
          { sourceId: "a", page: 1, out: true },
        ],
      }),
      originals: new Map(),
    };
    open();
    await screen.findByRole("combobox", { name: "페이지 선택" });
    expect(pageChoices()).toEqual([
      expect.stringMatching(/서술형.pdf.*원본 1쪽/),
      expect.stringMatching(/본문.pdf.*원본 2쪽/),
    ]);
    expect(screen.getByRole("button", { name: "이전 페이지" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    expect(screen.getByRole("button", { name: "다음 페이지" })).toBeDisabled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /전체 페이지 자동 인식/ }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /전체 페이지 자동 인식/ }),
    );
    expect(
      (state.recognize.mock.calls[0][0] as StudioAiPageTask[]).map((p) => [
        p.sourceId,
        p.page,
      ]),
    ).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });

  it("쪽 차례 칸이 없는 옛 저장본은 파일·쪽 차례로 열린다", async () => {
    state.saved = { data: savedSession(), originals: new Map() };
    open();
    await screen.findByRole("combobox", { name: "페이지 선택" });
    expect(pageChoices()).toEqual([
      expect.stringMatching(/본문.pdf.*원본 1쪽/),
      expect.stringMatching(/본문.pdf.*원본 2쪽/),
      expect.stringMatching(/서술형.pdf.*원본 1쪽/),
    ]);
  });
  it("문항 검토에서 영역 지정으로 돌아올 때 보던 원본 쪽을 유지한다", async () => {
    state.saved = {
      data: savedSession({ step: "review", sourceId: "b", pageNumber: 1 }),
      originals: new Map(),
    };
    open();
    const pages = await screen.findByRole("combobox", { name: "페이지 선택" });
    expect(pages).toHaveValue("2");
    fireEvent.click(screen.getByRole("button", { name: "1 영역 지정" }));
    expect(screen.getByRole("combobox", { name: "페이지 선택" })).toHaveValue(
      "2",
    );
  });

  it("옛 저장본의 PDF와 예시 원본이 섞여 있어도 저장한 파일 차례로 복원한다", async () => {
    vi.stubGlobal(
      "File",
      class extends File {
        async arrayBuffer() {
          return new ArrayBuffer(8);
        }
      },
    );
    state.saved = {
      data: savedSession({
        sources: [
          { id: "a", name: "본문.pdf", kind: "pdf", pages: 2 },
          { id: "b", name: "예시", kind: "sample", pages: 1 },
        ],
      }),
      originals: new Map([
        ["a", new Blob(["pdf"], { type: "application/pdf" })],
      ]),
    };
    open();
    await screen.findByRole("combobox", { name: "페이지 선택" });
    expect(pageChoices()).toEqual([
      expect.stringMatching(/본문.pdf.*원본 1쪽/),
      expect.stringMatching(/본문.pdf.*원본 2쪽/),
      expect.stringMatching(/예시.*원본 1쪽/),
    ]);
  });

  it("기존 상자·해설은 쪽 신분을 보존하고 담기는 새 차례를 따른다", async () => {
    const crops = [
      { id: "a1", sourceId: "a", page: 1 },
      { id: "a2", sourceId: "a", page: 2 },
      { id: "b1", sourceId: "b", page: 1 },
    ].map((identity) => ({
      ...identity,
      sourceLabel: identity.sourceId,
      rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
      image: "data:image/png;base64,c291cmNl",
      content: identity.id + " 본문",
      answer: "2",
      solution: identity.id + " 해설",
      level: "secondary" as const,
      grade: "중1",
      mode: "image" as const,
      added: false,
      reviewed: true,
    }));
    state.saved = {
      data: savedSession({
        crops,
        step: "review",
        activeCropId: "b1",
        pageOrder: [
          { sourceId: "b", page: 1, out: false },
          { sourceId: "a", page: 2, out: false },
          { sourceId: "a", page: 1, out: true },
        ],
      }),
      originals: new Map(),
    };
    const add = vi.fn();
    open(add);
    const button = await screen.findByRole("button", { name: "2문항 담기" });
    fireEvent.click(button);
    expect(add).toHaveBeenCalled();
    expect(
      add.mock.calls[0][0].map((problem: { id: string; solution: string }) => [
        problem.id,
        problem.solution,
      ]),
    ).toEqual([
      ["b1", "b1 해설"],
      ["a2", "a2 해설"],
    ]);
    await waitFor(() =>
      expect(state.save.mock.calls.at(-1)?.[0].crops).toHaveLength(3),
    );
    expect(state.save.mock.calls.at(-1)?.[0].crops).toEqual(crops);
  });
});
