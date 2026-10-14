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
import type { StudioCrop } from "@/components/unified/studioHelpers";

/**
 * 원장님 2026-09-20~21 작업실 피드백 — «자료 제작 · 검수» 상단 두 줄 재배치(트랙 35).
 *
 * ⑴ 쪽 이동과 문제 이동을 한 줄에 모으고, 1행에 남는 자리는 파일 이름에 준다
 * ⑵ 진행 띠를 좁힌다(폭은 CSS — 브라우저 검수)
 * ⑶ «전체 페이지 자동 인식 · 전체 디지털화 · 전체 해설 생성»을 한 줄에
 * ⑷ 상단 «AI 연결»을 없앤다(왼쪽 탭 AI 상태판이 대신한다). 쪽 재인식 길은 남긴다
 * ⑸ «파일 가져오기»는 원본이 하나도 없을 때만 — 진행 중에는 «원본 가져오기» 단계로 간다
 * ⑹ «검수 완료 · 다음»을 없앤다(카드 바닥의 «이 문제 검수 완료»가 있다)
 * ⑺ 학년은 자동 인식이 서면 조용히, «학년 확인 필요»일 때만 드러낸다 — 고칠 길은 항상 남는다
 * ⑻ 단계 표시가 어느 단계에서든 «지금 여기»를 보인다
 *
 * 크롭 상태는 AI 없이 꾸미려고 계정 저장소를 모킹해 «되살린 작업»으로 연다(트랙 1 과 같은 틀).
 * 유료 AI 는 부르지 않는다 — POST 는 끝나지 않는 약속으로 붙잡아 둔다.
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

/** 페이지 인식 응답 — 기본은 끝나지 않는다(유료 AI 는 부르지 않는다). 학년 시험만 값을 넣는다. */
let pageResult: Record<string, unknown> | null = null;
beforeEach(() => {
  pageResult = null;
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
        if (!pageResult) return new Promise<Response>(() => {});
        const request = JSON.parse(init.body as string) as { action: string };
        return Response.json({
          provider: "codex",
          action: request.action,
          result: pageResult,
        });
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
  source: Partial<{ pages: number; grade: string; gradeManual: boolean }> = {},
) {
  saved.current = Promise.resolve({
    data: {
      sources: [
        {
          id: "s1",
          name: "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf",
          kind: "sample",
          pages: 1,
          ...source,
        },
      ],
      crops,
      sourceId: "s1",
      pageNumber: 1,
      activeCropId: crops[0]?.id ?? "",
      inspectedPages: {},
      step: "review",
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

/** 검수 단계 둘째 줄 — 쪽 이동·문제 이동이 함께 사는 자리. */
const reviewRow = () => screen.getByLabelText("문항 검수 이동");
/**
 * 파일 고르는 칸 — 안 A(원장님 2026-09-21)로 제목 줄에서 **둘째 줄**로 내려왔다.
 * 표(`data-studio-band-tools`)가 그 칸을 따라간다.
 */
const bandTools = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-studio-band-tools]");

describe("⑴ 쪽 이동과 문제 이동은 같은 줄", () => {
  it("검수 단계에서 쪽 이동 넷과 문제 이동 셋이 모두 둘째 줄에 있다", async () => {
    await openStudio([crop("c1"), crop("c2")]);
    const row = reviewRow();
    for (const name of [
      "이전 페이지",
      "다음 페이지",
      "이전 문제 검수",
      "다음 문제 검수",
    ])
      expect(within(row).getByRole("button", { name })).toBeInTheDocument();
    expect(within(row).getByLabelText("페이지 선택")).toBeInTheDocument();
    expect(within(row).getByText(/문제 1/)).toBeInTheDocument();
  });

  it("제목 줄에는 쪽 이동이 없다 — 그 자리는 파일 이름이 쓴다", async () => {
    const { container } = await openStudio([crop("c1")]);
    const tools = bandTools(container);
    expect(tools).not.toBeNull();
    expect(
      within(tools!).queryByRole("button", { name: "이전 페이지" }),
    ).toBeNull();
    expect(within(tools!).queryByLabelText("페이지 선택")).toBeNull();
    // 파일 이름은 제목 줄에 남는다.
    expect(within(tools!).getByLabelText("원본 파일")).toBeInTheDocument();
  });
});

describe("⑶ 전체 작업 셋은 한 줄", () => {
  it("«전체 페이지 자동 인식 · 전체 디지털화 · 전체 해설 생성»이 한 묶음에 있다", async () => {
    const { container } = await openStudio([crop("c1")]);
    const bulk = container.querySelector<HTMLElement>("[data-studio-bulk]");
    expect(bulk).not.toBeNull();
    for (const name of [
      /페이지 자동 인식$/,
      /^전체 디지털화$/,
      /^전체 해설 생성$/,
    ])
      expect(within(bulk!).getByRole("button", { name })).toBeInTheDocument();
    // 검수 단계에서는 둘째 줄에 함께 선다 — 제목 줄은 파일 이름에 자리를 내준다.
    expect(reviewRow().contains(bulk)).toBe(true);
    expect(bandTools(container)!.contains(bulk)).toBe(false);
  });
});

describe("⑷ 상단 «AI 연결» 제거", () => {
  it("상단에 «AI 연결» 칸이 없다 — 왼쪽 탭의 AI 상태판이 대신한다", async () => {
    await openStudio([crop("c1")]);
    expect(screen.queryByText("AI 연결")).toBeNull();
    expect(screen.queryByLabelText("Studio AI 도구")).toBeNull();
    expect(screen.queryByRole("button", { name: "연결 다시 확인" })).toBeNull();
  });

  it("여러 쪽 원본이면 «현재 쪽만 다시 인식»은 남는다", async () => {
    await openStudio([crop("c1")], {}, { pages: 3 });
    expect(
      screen.getByRole("button", { name: /현재 1쪽만 다시 인식/ }),
    ).toBeInTheDocument();
  });
});

describe("⑸ 파일 가져오기는 완전히 빈 상태에서만", () => {
  it("원본을 열어 둔 동안 상단에 «파일 가져오기»가 없다", async () => {
    await openStudio([crop("c1")]);
    expect(screen.queryByRole("button", { name: "파일 가져오기" })).toBeNull();
  });

  it("«원본 가져오기» 단계로 가면 파일을 더 넣을 수 있다", async () => {
    await openStudio([crop("c1")]);
    fireEvent.click(screen.getByRole("button", { name: "1 범위 설정" }));
    expect(
      await screen.findByRole("button", { name: "내 컴퓨터에서 선택" }),
    ).toBeInTheDocument();
  });
});

describe("⑹ «검수 완료 · 다음» 제거", () => {
  it("상단 오른쪽 «검수 완료 · 다음» 단추가 없다", async () => {
    await openStudio([crop("c1"), crop("c2")]);
    expect(
      screen.queryByRole("button", { name: "검수 완료 · 다음" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "검수 완료" })).toBeNull();
  });

  it("다음 문제로 넘어가는 길과 카드의 «이 문제 검수 완료»는 남는다", async () => {
    await openStudio([crop("c1"), crop("c2")]);
    expect(
      within(reviewRow()).getByRole("button", { name: "다음 문제 검수" }),
    ).toBeEnabled();
    const card = screen.getByRole("article", { name: "문제 1 인식 결과" });
    expect(
      within(card).getByRole("button", { name: "이 문제 검수 완료" }),
    ).toBeInTheDocument();
    // 검수 완료 수는 그대로 보인다.
    expect(screen.getAllByText(/0문항 검수 완료/).length).toBeGreaterThan(0);
  });
});

describe("⑺ 학년은 확인이 필요할 때만 드러낸다", () => {
  it("자동 인식이 선 학년은 조용히 두되, 눌러 고칠 수 있다", async () => {
    const { container } = await openStudio(
      [crop("c1")],
      {},
      { grade: "중2", gradeManual: true },
    );
    const grade = container.querySelector<HTMLElement>("[data-grade]");
    expect(grade?.dataset.grade).toBe("quiet");
    const select = screen.getByLabelText<HTMLSelectElement>("시험지 학년");
    expect(select).toBeEnabled();
    fireEvent.change(select, { target: { value: "중3" } });
    await waitFor(() => expect(select.value).toBe("중3"));
  });

  it("«학년 확인 필요»면 드러내고, 그 자리에서 바로 고칠 수 있다", async () => {
    // 인식이 끝났는데 학년 근거가 없으면 needsReview 다 — 그 상태를 만들려고 한 쪽을 인식시킨다.
    pageResult = { content: "", answer: "", solution: "", warnings: [] };
    const { container } = await openStudio([crop("c1")]);
    const recognize = await screen.findByRole("button", {
      name: /페이지 자동 인식/,
    });
    await waitFor(() => expect(recognize).toBeEnabled());
    fireEvent.click(recognize);
    await waitFor(() =>
      expect(
        container.querySelector<HTMLElement>("[data-grade]")?.dataset.grade,
      ).toBe("review"),
    );
    expect(screen.getByText("학년")).toBeInTheDocument();
    const select = screen.getByLabelText<HTMLSelectElement>("시험지 학년");
    expect(
      within(select).getByRole("option", { name: "학년 확인 필요" }),
    ).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "중1" } });
    await waitFor(() =>
      expect(
        container.querySelector<HTMLElement>("[data-grade]")?.dataset.grade,
      ).toBe("quiet"),
    );
  });

  it("조용한 상태에서도 읽는 이름은 남는다", async () => {
    await openStudio([crop("c1")], {}, { grade: "중2", gradeManual: true });
    expect(screen.getByLabelText("시험지 학년")).toBeInTheDocument();
  });
});

// 원장님 2026-09-21 안 A 확정 — 탭은 넷이 됐다(「시험지 구성」이 늘었다).
describe("⑻ 단계 표시는 어느 단계에서든 «지금 여기»를 보인다", () => {
  it("잘라내기 단계에서 네 단계가 모두 보이고 현재만 눌려 있다", async () => {
    await openStudio([crop("c1")], { step: "crop" });
    const tabs = screen.getByLabelText("제작 단계 이동");
    const pressed = within(tabs)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName("1 범위 설정");
    expect(within(tabs).getAllByRole("button")).toHaveLength(3);
  });

  it("검수 단계에서도 현재 단계가 드러난다", async () => {
    await openStudio([crop("c1")]);
    const tabs = screen.getByLabelText("제작 단계 이동");
    const pressed = within(tabs)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAccessibleName(/2 문항 검토/);
  });
});
