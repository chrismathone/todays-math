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

describe("4 · 결과가 있는 크롭을 지우면 경고", () => {
  const readProblem = () =>
    crop("p1", {
      content: "넓이를 구하시오.",
      mode: "text",
      figures: [figure("a", { svg })],
    });
  const problemMessage =
    "문제 1에는 인식 결과가 있습니다. 삭제하면 문자 인식과 SVG 도형 결과도 함께 지워집니다. 삭제할까요?";
  const figureMessage =
    "도형 1-1은 SVG 생성이 끝났습니다. 삭제하면 생성 결과도 지워집니다. 삭제할까요?";
  const problemBox = () =>
    screen.getByRole("button", { name: /^문제 1 영역( · 완료)?$/ });
  const figureBox = () =>
    screen.getByRole("button", { name: /^도형 1-1 영역( · 완료)?$/ });

  // 삭제 길은 모두 deleteBox 로 모인다 — 길마다 같은 확인을 거치는지 본다.
  const paths: [string, () => void, string][] = [
    [
      "검사 칸 휴지통",
      () =>
        fireEvent.click(
          screen.getByRole("button", { name: "선택한 자른 문제 삭제" }),
        ),
      problemMessage,
    ],
    [
      "페이지 위 × 단추",
      () =>
        fireEvent.click(
          within(problemBox()).getByRole("button", { name: /영역 삭제$/ }),
        ),
      problemMessage,
    ],
    [
      "Delete 키",
      () => fireEvent.keyDown(problemBox(), { key: "Delete" }),
      problemMessage,
    ],
    [
      "Backspace 키",
      () => fireEvent.keyDown(problemBox(), { key: "Backspace" }),
      problemMessage,
    ],
    [
      "지우기 도구로 누르기",
      () => {
        fireEvent.click(screen.getByRole("button", { name: "삭제" }));
        fireEvent.click(problemBox());
      },
      problemMessage,
    ],
    [
      "검사 칸 도형 ×",
      () =>
        fireEvent.click(screen.getByRole("button", { name: "도형 1-1 삭제" })),
      figureMessage,
    ],
    [
      "도형 크롭 Delete 키",
      () => fireEvent.keyDown(figureBox(), { key: "Delete" }),
      figureMessage,
    ],
  ];

  it.each(paths)(
    "%s — 취소하면 아무것도 안 바뀐다",
    async (_, remove, message) => {
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      await openStudio([readProblem()]);
      await screen.findByRole("button", { name: /^도형 1-1 영역/ });
      // 되살린 작업은 «문제 추가» 도구로 열린다 — 페이지 위 영역을 다루려면 «선택»으로 바꾼다.
      fireEvent.click(screen.getByRole("button", { name: "선택" }));
      remove();
      expect(confirm).toHaveBeenCalledWith(message);
      expect(problemBox()).toHaveAttribute("aria-pressed", "true");
      expect(figureBox()).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "문제 01" }),
      ).toBeInTheDocument();
    },
  );

  it("확인하면 지운다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await openStudio([readProblem()]);
    await screen.findByRole("button", { name: /^도형 1-1 영역/ });
    fireEvent.click(screen.getByRole("button", { name: "도형 1-1 삭제" }));
    expect(
      screen.queryByRole("button", { name: /^도형 1-1 영역/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 자른 문제 삭제" }),
    );
    expect(
      screen.queryByRole("button", { name: /^문제 1 영역/ }),
    ).not.toBeInTheDocument();
  });

  it("결과가 없으면 묻지 않고 지운다", async () => {
    const confirm = vi.spyOn(window, "confirm");
    await openStudio([crop("p1", { figures: [figure("a")] })]);
    fireEvent.click(
      await screen.findByRole("button", { name: "도형 1-1 삭제" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 자른 문제 삭제" }),
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /^문제 1 영역/ }),
    ).not.toBeInTheDocument();
  });
});

describe("5 · 크롭 라벨 옆 «완료» 칩", () => {
  it("다 끝난 문제·도형 크롭에만 칩을 달고 접근성 이름에도 넣는다", async () => {
    await openStudio([
      crop("done", {
        content: "본문",
        mode: "text",
        figures: [figure("a", { svg })],
      }),
      crop("half", {
        rect: { x: 0.1, y: 0.5, width: 0.8, height: 0.3 },
        content: "본문",
        mode: "text",
        figures: [
          figure("b", {
            svg,
            rect: { x: 0.2, y: 0.55, width: 0.1, height: 0.05 },
          }),
          figure("c", { rect: { x: 0.5, y: 0.55, width: 0.1, height: 0.05 } }),
        ],
      }),
    ]);
    const done = await screen.findByRole("button", {
      name: "문제 1 영역 · 완료",
    });
    expect(within(done).getByText("완료")).toBeInTheDocument();
    // 문자 인식은 끝났지만 도형 하나가 SVG 가 없다 — 문제는 덜 끝났다.
    const half = screen.getByRole("button", { name: "문제 2 영역" });
    expect(within(half).queryByText("완료")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "도형 2-1 영역 · 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "도형 2-2 영역" }),
    ).toBeInTheDocument();
  });
});
