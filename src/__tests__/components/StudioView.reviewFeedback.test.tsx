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

const observers: { target: Element; callback: () => void }[] = [];
/** POST 는 기본으로 끝나지 않는다 — «도는 중»을 붙잡아 둔다. 유료 AI 는 부르지 않는다. */
let posts: { action: string }[] = [];
beforeEach(() => {
  posts = [];
  observers.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(readonly callback: () => void) {}
      observe(target: Element) {
        observers.push({ target, callback: this.callback });
      }
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
  await screen.findByText("이전 문제 추출 작업을 복원했습니다.");
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
    // 원장님 2026-09-21 — 좁은 진행 칸에는 짧은 이름표 «문제» 만 보이고, 읽는 이름·마우스 올림은
    // 카드와 같은 «문제 인식 중» 이다(이름은 studioWorkName 한 곳에서 짓는다).
    const progress = within(panel).getByRole("progressbar", {
      name: "문제 인식 중",
    });
    const tag = within(progress.parentElement!).getByTitle("문제 인식 중");
    expect(tag.querySelector('[aria-hidden="true"]')!.textContent).toBe("문제");
    expect(screen.queryByText("문자 인식 중")).not.toBeInTheDocument();
  });
});

describe("10 · 잘라내기 단계 이름", () => {
  it("단계 탭은 «문제&도형 잘라내기» — 옛 «문제 자르기»는 없다", async () => {
    await openStudio([crop("c1")], { step: "review" });
    fireEvent.click(screen.getByRole("button", { name: "1 영역 지정" }));
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
    screen.getByRole("button", { name: /^문제 1 영역( 삭제)? · 완료$/ });
  const figureBox = () =>
    screen.getByRole("button", { name: /^도형 1-1 영역( 삭제)? · 완료$/ });

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

describe("2 · 자른 문제 목록의 글자 넘침", () => {
  it("제목·설명 줄은 한 줄로 말줄임하고 전체 글자는 title 로 둔다", async () => {
    await openStudio([crop("p1", { content: "본문", mode: "text" })]);
    const list = screen.getByLabelText("자른 문제 목록");
    const item = within(list).getByRole("button", { name: /문제 01/ });
    expect(within(item).getByText("문제 01")).toHaveAttribute(
      "title",
      "문제 01",
    );
    expect(within(item).getByText("1쪽 · 중2 · 텍스트")).toHaveAttribute(
      "title",
      "1쪽 · 중2 · 텍스트",
    );
  });
});

/**
 * 원장님 2026-09-21 «편집창 확대/축소도 자동으로 하지말고 사용자 선택에 놔둘것».
 * 2026-09-19 에 고르신 시안 B(«검수는 확대로»)를 물린 것이다 — 단계가 바뀐다고 확대를
 * 건드리지 않는다. 켜고 끄는 것은 띠의 단추와 Esc 뿐이고, 고른 상태는 단계를 오가도 남는다.
 */
describe("6 · 편집창 확대는 원장님 선택에만 따른다(2026-09-21 — 시안 B 물림)", () => {
  const studio = () =>
    screen.getByRole("region", { name: "문제 제작 스튜디오" });
  const focused = () =>
    screen.queryByRole("dialog", { name: "문제 제작 스튜디오" }) !== null;
  // 머리 탭 — 단계 목록(편집 중에는 CSS 로 숨김)에도 같은 이름이 있다.
  const cropTab = () => {
    fireEvent.click(screen.getByRole("button", { name: "1 영역 지정" }));
    return screen.getAllByRole("button", { name: "문제&도형 잘라내기" })[0];
  };
  const twoCrops = () => [
    crop("p1", { content: "본문", mode: "text" }),
    crop("p2", { rect: { x: 0.1, y: 0.5, width: 0.8, height: 0.3 } }),
  ];

  it("검수에 들어서도 저절로 확대되지 않는다 — 단계를 오가도 꺼진 채다", async () => {
    await openStudio(twoCrops());
    expect(studio()).toBeInTheDocument();
    expect(focused()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
    expect(focused()).toBe(false);
    expect(screen.getByRole("button", { name: "편집창 확대" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(cropTab());
    expect(focused()).toBe(false);
    // 다시 들어가도 마찬가지다 — «검수는 확대로»가 되살아나지 않는다.
    fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
    expect(focused()).toBe(false);
  });

  it("잘라내기에서 켠 확대는 검수로 가도 남는다", async () => {
    await openStudio(twoCrops());
    fireEvent.click(screen.getByRole("button", { name: "편집창 확대" }));
    expect(focused()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
    expect(focused()).toBe(true);
  });

  it("검수에서 켠 확대는 잘라내기로 돌아가도 남는다 — 들어오기 전 상태로 되돌리지 않는다", async () => {
    await openStudio(twoCrops(), { step: "review" });
    expect(focused()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "편집창 확대" }));
    expect(focused()).toBe(true);
    fireEvent.click(cropTab());
    expect(focused()).toBe(true);
  });

  it("검수 중 «편집창 축소»를 누르면 그 뜻을 따른다 — 다른 문제로 옮겨도 다시 켜지 않는다", async () => {
    await openStudio(twoCrops(), { step: "review" });
    fireEvent.click(screen.getByRole("button", { name: "편집창 확대" }));
    expect(focused()).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "편집창 축소" }));
    expect(focused()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "다음 문제 검수" }));
    expect(
      screen.getByText(/^문제 2/, { selector: "strong" }),
    ).toBeInTheDocument();
    expect(focused()).toBe(false);
  });

  // 원장님 2026-09-21 안 A 확정 — 제목 줄은 네 단계가 똑같고(제목·탭 넷·단계 단추),
  // 파일·학년을 **포함한** 모든 도구가 둘째 줄로 내려갔다. 두 줄이라는 뼈대는 그대로다.
  it("위 띠는 두 줄 — 제목 줄에 탭과 단계 단추, 둘째 줄에 파일·학년·쪽·문제 이동과 전체 작업·진행 요약", async () => {
    await openStudio(twoCrops(), { step: "review" });
    const title = screen.getByRole("heading", { name: "문제 추출" });
    const band = title.closest("[data-studio-band]") as HTMLElement;
    expect(band).not.toBeNull();
    for (const name of ["원본 파일", "시험지 학년"])
      expect(within(band).queryByRole("combobox", { name })).toBeNull();
    expect(
      within(band).getByRole("button", { name: "편집창 확대" }),
    ).toBeInTheDocument();
    const second = screen.getByLabelText("문항 검수 이동");
    for (const name of ["원본 파일", "시험지 학년"])
      expect(
        within(second).getByRole("combobox", { name }),
      ).toBeInTheDocument();
    expect(
      within(second).getByRole("combobox", { name: "페이지 선택" }),
    ).toBeInTheDocument();
    expect(
      within(second).getByRole("button", { name: "전체 디지털화" }),
    ).toBeInTheDocument();
    expect(
      within(second).getByRole("button", { name: "다음 문제 검수" }),
    ).toBeInTheDocument();
    expect(
      within(second).getByRole("button", {
        name: /^작업 진행 상세 · 디지털화 1\/2/,
      }),
    ).toBeInTheDocument();
    expect(within(second).getByText(/문항 검수 완료$/)).toBeInTheDocument();
    // 설명 글 줄은 뺐다.
    expect(
      screen.queryByText("문자 인식 → 수식 후보정 → SVG 도형 → 검수"),
    ).not.toBeInTheDocument();
  });
});

describe("6 · 작업 칸은 화면 높이에서 그 밖의 줄만 빼고 다 쓴다", () => {
  // 원장님 2026-11-11 «하단 여백이 너무 쓸데없이 많은데 페이지 확장시켜 · 1920x1080 최적화».
  // 전에는 머리 띠만 재고 나머지(없어진 위 띠 52 · 바닥 줄 · 안내 줄)를 상수로 빼서 아래가 비었다.
  it("작업 칸 밖의 실제 높이(머리 띠 · 안내 줄 · 바닥 줄)를 --studio-chrome-height 로 알린다", async () => {
    await openStudio([crop("p1")], { step: "review" });
    const root = screen.getByRole("region", { name: "문제 제작 스튜디오" });
    const workspace = document.querySelector(
      "[data-studio-workspace]",
    ) as HTMLElement;
    const height = (element: HTMLElement, value: number) =>
      Object.defineProperty(element, "offsetHeight", {
        configurable: true,
        value,
      });
    height(root, 900);
    height(workspace, 700);
    // 복원 안내 글이 뜬 뒤에도 재는 효과(useEffect)는 아직 안 돌았을 수 있다 — 바로 세면
    // 전체 시험 부하에서만 0 으로 빨개졌다(2026-09-19 병합 검수). 관찰자가 붙을 때까지 기다린다.
    await waitFor(() =>
      expect(
        observers.filter((item) => item.target === root).length,
      ).toBeGreaterThan(0),
    );
    const fire = () =>
      act(() =>
        observers
          .filter((item) => item.target === root)
          .forEach((item) => item.callback()),
      );
    fire();
    expect(root.style.getPropertyValue("--studio-chrome-height")).toBe("200px");
    // 확대 중에는 스튜디오가 화면을 덮는 고정 칸이라 «전체 − 작업 칸»이 바깥 줄 높이가 아니다 —
    // 그 값으로 고치면 작업 칸이 줄고 다시 재는 되먹임이 된다. 확대 전 값을 그대로 둔다.
    fireEvent.click(screen.getByRole("button", { name: "편집창 확대" }));
    const dialog = screen.getByRole("dialog", { name: "문제 제작 스튜디오" });
    height(dialog, 1080);
    fire();
    expect(dialog.style.getPropertyValue("--studio-chrome-height")).toBe(
      "200px",
    );
  });
});

/**
 * 원장님 2026-09-19 «축소 확대 버튼을 눈에 잘 띄도록 [검수 완료 · 다음] 색상 맞춰주고.
 * '창 확대' 편집창 확대로 변경.» — 위 띠 오른쪽 끝의 단추 하나다(잘라내기·검수 두 단계가 같은 띠를 쓴다).
 * 계산된 색이 같은지는 jsdom 이 못 잰다(CSS 를 안 돈다) — `e2e/studio-ai/studio-ai.spec.ts` 가 브라우저에서 잰다.
 */
describe("7 · 편집창 확대 단추 — «검수 완료 · 다음»과 같은 채운 단추", () => {
  const band = () =>
    document.querySelector("[data-studio-band]") as HTMLElement;
  const twoCrops = () => [
    crop("p1", { content: "본문", mode: "text" }),
    crop("p2", { rect: { x: 0.1, y: 0.5, width: 0.8, height: 0.3 } }),
  ];

  it("글자는 «편집창 확대» ↔ «편집창 축소»이고 읽히는 이름도 그 글자다", async () => {
    await openStudio(twoCrops());
    const zoom = within(band()).getByRole("button", { name: "편집창 확대" });
    expect(zoom).toHaveTextContent(/^편집창 확대$/);
    expect(zoom).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(zoom);
    // 같은 단추다 — 글자만 바뀐다(확대를 풀면 포커스가 이 단추로 돌아온다).
    expect(within(band()).getByRole("button", { name: "편집창 축소" })).toBe(
      zoom,
    );
    expect(zoom).toHaveTextContent(/^편집창 축소$/);
    expect(zoom).toHaveAttribute("aria-pressed", "true");
  });

  // «검수 완료 · 다음»은 없앴다(원장님 2026-09-21 ⑹) — 견줄 짝이 사라졌으므로 채운 단추
  // 클래스가 실제로 붙어 있는지를 직접 본다(빈 문자열끼리 같아서 초록이 되지 않게).
  it("확대 전·중 모두 채운 단추 그대로다", async () => {
    await openStudio(twoCrops(), { step: "review" });
    const zoom = within(band()).getByRole("button", { name: "편집창 확대" });
    expect(zoom.className).toMatch(/primaryButton/);
    const filled = zoom.className;
    fireEvent.click(zoom);
    expect(zoom).toHaveAccessibleName("편집창 축소");
    expect(zoom.className).toBe(filled);
  });
});
