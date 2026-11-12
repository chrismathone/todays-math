import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import type { StudioAiPageTask } from "@/components/unified/useStudioAi";

const state = vi.hoisted(() => ({
  saved: null as unknown,
  save: vi.fn(),
  recognize: vi.fn(),
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
    useStudioAi: (...args: Parameters<typeof actual.useStudioAi>) => ({
      ...actual.useStudioAi(...args),
      recognizePages: state.recognize,
    }),
  };
});
vi.mock("pdfjs-dist", () => ({
  version: "test",
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 100 * scale,
          height: 140 * scale,
        }),
        getTextContent: async () => ({
          items: [{ str: "1. 값을 구하시오.", hasEOL: true }],
        }),
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

describe("Studio 쪽 차례 연결", () => {
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
