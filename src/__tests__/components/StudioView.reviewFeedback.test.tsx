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
import type {
  StudioCrop,
  StudioFigure,
} from "@/components/unified/studioHelpers";

/**
 * 2026-09-19 원장님 작업실 피드백(트랙 1). 크롭·도형 상태를 AI 없이 꾸미려고 계정 저장소를
 * 모킹해 «되살린 작업»으로 연다 — 예제 지면(sample)이라 파일을 읽지 않는다.
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

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" />';
function figure(id: string, patch: Partial<StudioFigure> = {}): StudioFigure {
  return {
    id,
    rect: { x: 0.2, y: 0.2, width: 0.1, height: 0.05 },
    image: "data:image/png;base64,Zmln",
    ...patch,
  };
}
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

/** POST 는 기본으로 끝나지 않는다 — «도는 중»을 붙잡아 둔다. 유료 AI 는 부르지 않는다. */
let posts: { action: string }[] = [];
beforeEach(() => {
  posts = [];
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
      if (init?.method === "POST") {
        posts.push(JSON.parse(init.body as string));
        return new Promise<Response>(() => {});
      }
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
        onExport={() => {}}
        canExport
        storageScope="owner-a"
      />
    </DevAiProvider>,
  );
  await screen.findByText("이전 자료 제작 작업을 복원했습니다.");
  return view;
}
const openProgress = async () =>
  fireEvent.click(
    await screen.findByRole("button", { name: /^작업 진행 상세/ }),
  );

describe("1 · 문제 인식 진행 문구", () => {
  it("문항 인식이 도는 동안 진행 칸과 카드 모두 «문제 인식 중»이라 적는다", async () => {
    await openStudio([crop("c1")], { step: "review" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "문자 인식" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "문자 인식" }));
    await waitFor(() => expect(posts).toHaveLength(1));
    const card = screen.getByRole("article", { name: "문제 1 인식 결과" });
    expect(within(card).getByText("문제 인식 중")).toBeInTheDocument();
    await openProgress();
    const panel = screen.getByRole("region", { name: "작업별 진행 상황" });
    expect(within(panel).getByText("문제 인식 중")).toBeInTheDocument();
    expect(screen.queryByText("문자 인식 중")).not.toBeInTheDocument();
  });
});

describe("10 · 잘라내기 단계 이름", () => {
  it("단계 탭은 «문제&도형 잘라내기» — 옛 «문제 자르기»는 없다", async () => {
    await openStudio([crop("c1")], { step: "review" });
    const tabs = screen.getAllByRole("button", { name: "문제&도형 잘라내기" });
    expect(tabs.length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /문제 자르기/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(tabs[0]);
    expect(
      await screen.findByRole("group", { name: "문제 자르기 영역" }),
    ).toBeInTheDocument();
  });
});

describe("3 · 도형 번호 «문제번호-순번»", () => {
  // 문제 1(도형 하나) · 문제 2(도형 둘) — 옛 화면은 두 문제에 모두 «도형 1»을 붙였다.
  const twoProblems = () => [
    crop("p1", { figures: [figure("a")] }),
    crop("p2", {
      rect: { x: 0.1, y: 0.5, width: 0.8, height: 0.3 },
      figures: [
        figure("b", { rect: { x: 0.2, y: 0.55, width: 0.1, height: 0.05 } }),
        figure("c", { rect: { x: 0.5, y: 0.55, width: 0.1, height: 0.05 } }),
      ],
    }),
  ];

  it("페이지 위 도형 크롭과 검사 칸 도형 목록이 같은 번호를 쓴다", async () => {
    await openStudio(twoProblems(), { activeCropId: "p2" });
    for (const name of ["도형 1-1 영역", "도형 2-1 영역", "도형 2-2 영역"])
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "도형 1 영역" }),
    ).not.toBeInTheDocument();
    const list = screen.getByLabelText("내부 도형 검수");
    expect(
      within(list).getByRole("button", { name: "도형 2-1" }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole("button", { name: "도형 2-2 삭제" }),
    ).toBeInTheDocument();
  });

  it("검수 카드의 도형 캡션과 대체 글도 같은 번호", async () => {
    await openStudio(twoProblems(), { step: "review" });
    const card = screen.getByRole("article", { name: "문제 2 인식 결과" });
    expect(
      within(card).getByText(/^도형 2-2 · 원본 크롭 · SVG 미생성/),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("button", { name: "그림 2 편집: 도형 2-2" }),
    ).toBeInTheDocument();
  });

  it("진행 칸은 생성 중인 도형의 번호를 적는다", async () => {
    const crops = twoProblems().map((item) => ({
      ...item,
      content: "넓이를 구하시오.",
      mode: "text" as const,
    }));
    await openStudio(crops, { step: "review" });
    const digitize = screen.getByRole("button", { name: "전체 디지털화" });
    await waitFor(() => expect(digitize).toBeEnabled());
    fireEvent.click(digitize);
    await waitFor(() =>
      expect(
        posts.filter((post) => post.action === "figure-redraw"),
      ).toHaveLength(2),
    );
    await openProgress();
    const panel = screen.getByRole("region", { name: "작업별 진행 상황" });
    expect(
      within(panel).getByText("도형 1-1, 2-1 생성 중 · 1개 대기"),
    ).toBeInTheDocument();
  });
});
