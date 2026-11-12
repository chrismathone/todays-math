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

const state = vi.hoisted(() => ({
  saved: null as unknown,
  save: vi.fn(),
  recognize: vi.fn(),
  jobs: null as StudioAiPageJob[] | null,
  activePages: [] as readonly { sourceId: string; page: number }[],
  pdfPages: 2,
  readOperators: vi.fn(),
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
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 100 * scale,
          height: 140 * scale,
        }),
        getTextContent: async () => ({
          items: [{ str: "1. 값을 구하시오.", hasEOL: true }],
        }),
        getOperatorList: state.readOperators,
        render: () => ({ promise: Promise.resolve(), cancel() {} }),
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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy(
      {},
      {
        get: (_, key) =>
          key === "getImageData"
            ? () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })
            : vi.fn(),
      },
    ) as CanvasRenderingContext2D,
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
async function upload() {
  open();
  const input = screen.getByLabelText("PDF 또는 이미지 파일 가져오기");
  await waitFor(() => expect(input).toBeEnabled());
  const file = new File(["pdf"], "본문.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new ArrayBuffer(8),
  });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled(),
  );
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
  it("연산 목록 응답이 없어도 3초 뒤 쪽을 유지하고 쪽 순서 조작·시작을 연다", async () => {
    state.pdfPages = 1;
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
    expect(state.readOperators).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole("button", { name: "이 쪽 빼기" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "이 순서로 시작 →" }),
    ).toBeEnabled();
    expect(screen.getByText(/시작할 쪽 1 · 뺀 쪽 0/)).toBeVisible();
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
