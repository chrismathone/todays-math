import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import type { DocumentSharing } from "@/contracts/privateWorkspace.contract";
const storage = vi.hoisted(() => ({
  save: vi
    .fn<
      (data: unknown, originals: unknown, sharing?: unknown) => Promise<void>
    >()
    .mockResolvedValue(undefined),
}));

/**
 * 로그인한 작업실은 들어오자마자 계정에 저장된 마지막 작업을 되살린다. 그런데 화면은 «파일 불러오는 중»·
 * «파일 여는 중…»이라 새 파일을 여는 것처럼 보였고, 바닥 글은 «브라우저에서 원본을 보관 · 새로고침하면
 * 초기화»라 실제와 반대였다(원장님 2026-09-18 «왜 파일 여는중이지? 지금 접속했는데» → 문구 확정).
 */
const saved: { current: Promise<unknown> } = { current: new Promise(() => {}) };
vi.mock("@/components/unified/studioSessionStore", () => ({
  StudioSessionStore: class {
    documentId = "doc-1";
    load = () => saved.current;
    save = (
      data: StudioSessionData,
      originals: Map<string, Blob>,
      sharing?: DocumentSharing,
    ) => storage.save(data, originals, sharing);
    clear = () => Promise.resolve();
    retain() {}
    release() {}
  },
}));
// 되살리는 PDF 를 여는 데서 멈춰 둔다 — 진행 표시가 떠 있는 순간을 본다.
vi.mock("pdfjs-dist", () => new Promise(() => {}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));

const session: StudioSessionData = {
  sources: [{ id: "s1", name: "미래엔 중간.pdf", kind: "pdf", pages: 3 }],
  crops: [],
  sourceId: "s1",
  pageNumber: 1,
  activeCropId: "",
  inspectedPages: {},
  step: "crop",
  grade: "중1",
  level: "secondary",
};

function renderStudio(
  branchId?: string,
  stepRequest?: { id: number; step: "review" },
) {
  // 제목 줄은 네 단계에 다 선다(안 A, 2026-09-21) — 그 줄의 높이를 재는 관찰자가 늘 붙는다.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ enabled: false, providers: [] })),
  );
  return render(
    <DevAiProvider>
      <StudioView
        onAdd={() => {}}
        onExport={() => {}}
        canExport
        storageScope="owner-a"
        branchId={branchId}
        stepRequest={stepRequest}
      />
    </DevAiProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  saved.current = new Promise(() => {});
  vi.restoreAllMocks();
  storage.save.mockClear();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});

describe("작업실 — 이전 작업 되살리기 문구", () => {
  it("opens the requested review step after restoring a source saved at scope", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,c291cmNl",
    );
    saved.current = Promise.resolve({
      data: {
        ...session,
        sources: [{ id: "s1", name: "예제", kind: "sample", pages: 1 }],
        step: "upload",
      },
      originals: new Map(),
    });
    renderStudio(undefined, { id: 1, step: "review" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: /^2 문항 검토/,
        }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("지점 추출 자료 저장은 비공개 기본 확인창을 거쳐 공개 범위를 전송한다", async () => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,c291cmNl",
    );
    saved.current = Promise.resolve({
      data: {
        ...session,
        sources: [{ id: "s1", name: "예제", kind: "sample", pages: 1 }],
        step: "upload",
      },
      originals: new Map(),
    });
    const branchId = "30000000-0000-4000-8000-000000000003";
    renderStudio(branchId);
    const button = screen.getByRole("button", {
      name: "우리학원 시험지에 저장",
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(screen.getByRole("radio", { name: "학원에 비공개" })).toBeChecked();
    expect(storage.save.mock.calls.some((call) => call[2])).toBe(false);
    fireEvent.click(screen.getByRole("radio", { name: "학원에 공개" }));
    fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
    await waitFor(() =>
      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ sources: expect.any(Array) }),
        expect.any(Map),
        { visibility: "branch", sharedBranchId: branchId },
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("저장된 작업을 되살리는 동안은 «이전 작업 불러오는 중»과 파일 이름", async () => {
    saved.current = Promise.resolve({
      data: session,
      originals: new Map([
        ["s1", new Blob(["%PDF-1.4"], { type: "application/pdf" })],
      ]),
    });
    renderStudio();
    expect(await screen.findByText("이전 작업 불러오는 중")).toBeTruthy();
    expect(screen.getByText("미래엔 중간.pdf")).toBeTruthy();
    expect(screen.queryByText("파일 불러오는 중")).toBeNull();
    expect(screen.queryAllByText("파일 여는 중…")).toHaveLength(0);
  });
  it("저장소를 읽는 동안 버튼도 «파일 여는 중…»이 아니다", () => {
    renderStudio();
    expect(screen.queryAllByText("파일 여는 중…")).toHaveLength(0);
    expect(
      screen.getAllByText("이전 작업 불러오는 중…").length,
    ).toBeGreaterThan(0);
  });
  it("바닥 글은 계정 자동 저장 — «새로고침하면 초기화»·«브라우저에서 보관»이 아니다", () => {
    renderStudio();
    expect(screen.getByText("작업은 계정에 자동 저장됩니다.")).toBeTruthy();
    expect(
      screen.queryByText("새로고침하면 작업 내용이 초기화됩니다."),
    ).toBeNull();
    expect(
      screen.queryByText("파일을 열면 브라우저에서 원본을 보관합니다."),
    ).toBeNull();
  });
});
