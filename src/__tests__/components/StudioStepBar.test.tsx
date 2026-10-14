import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import type { StudioCrop } from "@/components/unified/studioHelpers";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 원장님 2026-09-21 «4단계 헤더 구성 일치화 시킬것. 대신 각 단계에서 필요없는 헤더는 지울것.
 * 단계마다 헤더 구조가 바뀌는 치명적인 ux 고칠것» → **안 A 확정**(2026-09-21).
 *
 * 뼈대: 제목 줄은 네 단계가 똑같다 — 「자료 제작」 + 단계 탭 셋 + 그 단계의 큰 단추.
 * 파일·학년을 포함한 모든 도구는 둘째 줄. 큰 제목·설명 줄·원형 체크 막대는 없앴다.
 *
 * 계산된 모양(높이·꺾임)은 jsdom 이 못 잰다 — `e2e/studio-ai/step-header.spec.ts` 가 브라우저에서 잰다.
 * 여기서는 **무엇이 서고 무엇이 사라졌는가**와 **눌러서 어디로 가는가**를 본다.
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
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/unified/print/PrintOptionsPanel", () => ({
  PrintOptionsPanel: () => null,
}));
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: ({ onReady }: { onReady?: (ready: boolean) => void }) => {
    // 인쇄 준비가 안 끝나면 「인쇄 / PDF 저장」 자리에 진행 표시가 대신 선다 — 띠를 보려고 끝내 둔다.
    useEffect(() => onReady?.(true), [onReady]);
    return <div data-mathgen-document />;
  },
}));

function crop(id: string, patch: Partial<StudioCrop> = {}): StudioCrop {
  return {
    id,
    sourceId: "s1",
    sourceLabel: "예제",
    page: 1,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.3 },
    image: "data:image/png;base64,Y3JvcA==",
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
    added: false,
    ...patch,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,c291cmNl",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise<Response>(() => {});
      return Response.json({
        enabled: true,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [
          {
            id: "codex",
            label: "Codex",
            status: "ready",
            detail: "사용 가능",
            image: true,
          },
        ],
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  saved.current = new Promise(() => {});
});

async function openStudio(
  crops: StudioCrop[],
  patch: Partial<StudioSessionData> = {},
  props: Partial<{ pickedCount: number; onExport: () => void }> = {},
) {
  saved.current = Promise.resolve({
    data: {
      sources: [{ id: "s1", name: "예제 지면", kind: "sample", pages: 1 }],
      crops,
      sourceId: "s1",
      pageNumber: 1,
      activeCropId: crops[0]?.id ?? "",
      inspectedPages: {},
      step: "crop",
      grade: "중2",
      level: "secondary",
      ...patch,
    } satisfies StudioSessionData,
    originals: new Map(),
  });
  const view = render(
    <DevAiProvider>
      <StudioView
        onAdd={() => {}}
        onExport={props.onExport ?? (() => {})}
        pickedCount={props.pickedCount ?? 0}
        canExport
        storageScope="owner-a"
      />
    </DevAiProvider>,
  );
  await screen.findByText("이전 문제 추출 작업을 복원했습니다.");
  return view;
}

const bar = () => document.querySelector("[data-studio-band]") as HTMLElement;
const tabs = () => screen.getByRole("navigation", { name: "제작 단계 이동" });
const tab = (name: RegExp | string) =>
  within(tabs()).getByRole("button", { name });
const pressed = () =>
  within(tabs())
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.textContent);
const toolRow = () =>
  document.querySelector("[data-studio-tool-row]") as HTMLElement | null;

describe("1 · 뼈대 — 세 단계가 같은 제목 줄을 쓴다", () => {
  it("① 원본 가져오기에도 띠가 서고, 큰 제목·설명 줄·원형 막대·로컬 작업 배지는 없다", async () => {
    await openStudio([], { step: "upload" });
    expect(bar()).not.toBeNull();
    expect(
      within(bar()).getByRole("heading", { name: "문제 추출" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "내 자료로 만드는 문제" }),
    ).toBeNull();
    expect(screen.queryByLabelText("제작 단계")).toBeNull();
    expect(screen.queryByText("로컬 작업")).toBeNull();
    expect(document.querySelector("[data-workspace-page-header]")).toBeNull();
  });

  it("단계 탭은 늘 셋이고 눌린 것은 정확히 하나다", async () => {
    await openStudio([crop("c1")], { step: "upload" });
    expect(within(tabs()).getAllByRole("button")).toHaveLength(3);
    expect(pressed()).toHaveLength(1);
    expect(pressed()[0]).toMatch(/^1 범위 설정$/);
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "원본 범위 작업" }),
      ).getByRole("button", { name: "문제&도형 잘라내기" }),
    );
    expect(pressed()[0]).toMatch(/^1 범위 설정$/);
    expect(within(tabs()).getAllByRole("button")).toHaveLength(3);
    fireEvent.click(tab(/^2 문항 검토/));
    expect(pressed()[0]).toMatch(/^2 문항 검토/);
    expect(within(tabs()).getAllByRole("button")).toHaveLength(3);
  });

  it("네 단계 어디서나 제목 줄의 구성이 같다 — 제목 하나 · 탭 셋 · 단추 묶음 하나", async () => {
    await openStudio([crop("c1")], { step: "upload" });
    const shape = () => ({
      제목: within(bar()).getAllByRole("heading").length,
      탭: within(tabs()).getAllByRole("button").length,
    });
    const upload = shape();
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "원본 범위 작업" }),
      ).getByRole("button", { name: "문제&도형 잘라내기" }),
    );
    expect(shape()).toEqual(upload);
    fireEvent.click(tab(/^2 문항 검토/));
    expect(shape()).toEqual(upload);
  });
});

describe("2 · 단계마다 필요 없는 것은 지운다", () => {
  it("③ 디지털화 도구 줄에는 «회전»이 없다 — ② 잘라내기에는 있다", async () => {
    await openStudio([crop("c1")], { step: "crop" });
    expect(
      within(toolRow()!).getByRole("button", { name: "현재 페이지 90도 회전" }),
    ).toBeInTheDocument();
    fireEvent.click(tab(/^2 문항 검토/));
    expect(
      within(toolRow()!).queryByRole("button", {
        name: "현재 페이지 90도 회전",
      }),
    ).toBeNull();
  });

  it("파일·학년은 둘째 줄에 있고 제목 줄에는 없다 — ②③ 둘 다", async () => {
    await openStudio([crop("c1")], { step: "crop" });
    for (const step of ["crop", "review"] as const) {
      if (step === "review") fireEvent.click(tab(/^2 문항 검토/));
      for (const name of ["원본 파일", "시험지 학년"]) {
        expect(
          within(toolRow()!).getByRole("combobox", { name }),
        ).toBeInTheDocument();
        expect(within(bar()).queryByRole("combobox", { name })).toBeNull();
      }
    }
  });

  it("②의 도구 줄은 캔버스 칸 밖에 선다 — 띠 바로 뒤 전폭 자리", async () => {
    await openStudio([crop("c1")], { step: "crop" });
    const row = toolRow()!;
    expect(row.parentElement).toBe(bar().parentElement);
    expect(
      bar().compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("3 · 확대를 켠 채 ①로 가도 풀 길이 남는다 (2026-09-21 덫)", () => {
  const focused = () =>
    screen.queryByRole("dialog", { name: "문제 제작 스튜디오" }) !== null;

  it("①에도 «편집창 확대»가 있다", async () => {
    await openStudio([], { step: "upload" });
    expect(
      within(bar()).getByRole("button", { name: "편집창 확대" }),
    ).toBeInTheDocument();
  });

  it("②에서 확대를 켜고 ①로 가도 «편집창 축소»가 남아 눌러서 풀린다", async () => {
    await openStudio([crop("c1")], { step: "crop" });
    fireEvent.click(within(bar()).getByRole("button", { name: "편집창 확대" }));
    expect(focused()).toBe(true);
    fireEvent.click(tab("1 범위 설정"));
    expect(focused()).toBe(true);
    const shrink = within(bar()).getByRole("button", { name: "편집창 축소" });
    fireEvent.click(shrink);
    expect(focused()).toBe(false);
  });
});

describe("4 · 시험지 구성 탭", () => {
  it("담은 문항과 추가할 추출 문항이 모두 없으면 흐리고 배지는 0 이다", async () => {
    await openStudio([], { step: "crop" }, { pickedCount: 0 });
    const worksheet = tab(/^3 양식 구성·출력/);
    expect(worksheet).toBeDisabled();
    expect(worksheet).toHaveTextContent(/^3 양식 구성·출력 0$/);
  });

  it("추출 문항을 추가할 수 있으면 배지 0을 유지하면서 구성으로 이동한다", async () => {
    const onExport = vi.fn();
    await openStudio(
      [crop("c1")],
      { step: "crop" },
      { pickedCount: 0, onExport },
    );
    const worksheet = tab(/^3 양식 구성·출력/);
    expect(worksheet).toBeEnabled();
    expect(worksheet).toHaveTextContent(/^3 양식 구성·출력 0$/);
    fireEvent.click(worksheet);
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("담은 문항이 있으면 눌러서 시험지 화면으로 간다", async () => {
    const onExport = vi.fn();
    await openStudio(
      [crop("c1")],
      { step: "crop" },
      { pickedCount: 3, onExport },
    );
    const worksheet = tab(/^3 양식 구성·출력/);
    expect(worksheet).toBeEnabled();
    expect(worksheet).toHaveTextContent(/^3 양식 구성·출력 3$/);
    fireEvent.click(worksheet);
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

describe("5 · ④ 시험지 구성 화면도 같은 띠를 쓴다", () => {
  const problem: StudioProblem = {
    id: "one",
    content: "1 + 1",
    answer: "2",
    solution: "",
    grade: "중1",
    chapter: "수와 연산",
    section: "",
    difficulty: "기본",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  };
  const props = {
    selected: [problem],
    title: "시험지",
    columns: 2,
    answers: true,
    savedAt: "",
    setTitle: vi.fn(),
    setColumns: vi.fn(),
    setAnswers: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    download: vi.fn(),
    toggle: vi.fn(),
    move: vi.fn(),
    reorder: vi.fn(),
    navigate: vi.fn(),
  };

  it("큰 제목·설명 줄 대신 같은 띠가 서고 «시험지 구성» 탭이 눌려 있다", () => {
    render(<WorksheetEditor {...props} cropCount={19} onGoToStep={vi.fn()} />);
    expect(bar()).not.toBeNull();
    expect(
      within(bar()).getByRole("heading", { name: "시험지 만들기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "시험지 구성하기" }),
    ).toBeNull();
    expect(within(tabs()).getAllByRole("button")).toHaveLength(3);
    expect(pressed()[0]).toMatch(/^3 양식 구성·출력/);
  });

  it("문제 추출을 못 쓰는 계정이면 앞 세 탭을 아예 세우지 않는다", () => {
    render(<WorksheetEditor {...props} allowedMenus={["export"]} />);
    expect(
      within(bar()).getByRole("heading", { name: "시험지 만들기" }),
    ).toBeInTheDocument();
    expect(within(tabs()).getAllByRole("button")).toHaveLength(1);
  });

  it("작업실의 셈을 몰라도 «OCR · 디지털화»로 돌아갈 수 있다 — 배지만 빠진다", () => {
    const onGoToStep = vi.fn();
    render(<WorksheetEditor {...props} onGoToStep={onGoToStep} />);
    const review = tab(/^2 문항 검토$/);
    expect(review).toBeEnabled();
    fireEvent.click(review);
    expect(onGoToStep).toHaveBeenCalledWith("review");
  });

  it("«이전 검토 단계»는 없다 — 탭 «OCR · 디지털화»가 그 일을 한다", () => {
    const onGoToStep = vi.fn();
    render(
      <WorksheetEditor {...props} cropCount={19} onGoToStep={onGoToStep} />,
    );
    expect(screen.queryByRole("button", { name: /이전 검토 단계/ })).toBeNull();
    fireEvent.click(tab(/^2 문항 검토/));
    expect(onGoToStep).toHaveBeenCalledWith("review");
  });

  it("내보내기 단추 넷은 띠 오른쪽에 그대로 있다", () => {
    render(<WorksheetEditor {...props} cropCount={0} onGoToStep={vi.fn()} />);
    for (const name of [
      "작업 저장",
      "인쇄 / PDF 저장",
      "HWPX 내보내기",
      "PDF 내려받기",
    ])
      expect(within(bar()).getByRole("button", { name })).toBeInTheDocument();
  });
});
