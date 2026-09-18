import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";

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
    save = () => Promise.resolve();
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

function renderStudio() {
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
      />
    </DevAiProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  saved.current = new Promise(() => {});
});

describe("작업실 — 이전 작업 되살리기 문구", () => {
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
