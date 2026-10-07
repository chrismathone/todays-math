// D-147 · 05 §8.22 — 보충 카드가 학생 화면에 보이는 모양(Hi-fi 1안 «교재» 딱지, 3자 합의 세부 다섯).
import { randomUUID } from "node:crypto";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import ExplorerSupplementDialog from "@/components/math-explorers/ExplorerSupplementDialog";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { conceptHeadingLabel } from "@/components/math-explorers/ExplorerConceptHead";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import { supplementCard } from "@/lib/math-explorers/supplement-content";
import type {
  ExplorerAction,
  ExplorerState,
  StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import type { ExpeditionMission } from "@/contracts/mathExpedition.contract";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));

const today = "2026-09-28";
const student = { id: "student-sup-ui", name: "김하늘", className: "초3반" };
const mission: ExpeditionMission = {
  kind: "explorers",
  route: "unit",
  unitId: "g3-shapes",
  title: "평면도형과 원",
  subtitle: "초등 3학년",
  goal: 15,
  id: "00000000-0000-4000-8000-000000000001",
  date: today,
  answered: 15,
  retryRemaining: 0,
  status: "complete",
  sourceSessionId: "source",
  sourceSessionIds: ["source"],
  startedAt: `${today}T00:00:00.000Z`,
  completedAt: `${today}T09:00:00.000Z`,
};

/** 엔진으로 만든 학생 — 평면도형과 원을 오늘 다 모았다(칸을 얻은 날). */
function engine() {
  let stored: StoredExplorer = createExplorerState(student.id, 3);
  const act = (action: ExplorerAction) => {
    stored = applyExplorerAction(stored, action, today, randomUUID()).state;
  };
  act({ type: "start", route: "unit", unitId: "g3-shapes" });
  while (!stored.profile.definitions!.session!.done) {
    const s = stored.profile.definitions!.session!;
    if (definitionNeedsRead(stored.profile, s)) {
      act({ type: "read", questionId: definitionQuestionId(s) });
      continue;
    }
    const task = s.queue[s.index]!;
    const card = definitionCard(task.cardId);
    const ids =
      task.kind === 0
        ? [0, 1]
        : task.kind === 1
          ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
          : [card.truth ? 1 : 0];
    const options = definitionOptions(s, task);
    act({
      type: "answer",
      questionId: definitionQuestionId(s),
      choiceIds: ids.map((id) => options.indexOf(id)),
    });
  }
  const state = (): ExplorerState => ({
    ...explorerView(stored, today),
    today,
    student,
    revision: 3,
    feedback: null,
    expedition: {
      mission,
      next: null,
      completedToday: true,
      canStart: false,
      todayStars: { cards: 5, bonus: 0 },
    },
  });
  /** 보충 한 장을 끝까지(맞게) — 또는 `steps` 걸음만. */
  const supplement = (cardId: string, steps = Infinity) => {
    act({ type: "supplement-start", cardId });
    for (let n = 0; n < steps; n++) {
      const activity = explorerView(stored, today).supplements!.activity;
      if (!activity) break;
      if (activity.kind === "read") {
        act({ type: "supplement-read", questionId: activity.questionId });
        continue;
      }
      const card = supplementCard(cardId);
      const labels =
        activity.kind === "assemble"
          ? card.words.slice(0, 2)
          : activity.kind === "examples"
            ? card.examples.filter((e) => e.yes).map((e) => e.text)
            : [card.truth ? "맞다" : "아니다"];
      act({
        type: "supplement-answer",
        questionId: activity.questionId,
        choiceIds: labels.map(
          (label) => activity.choices.find((c) => c.label === label)!.id,
        ),
      });
    }
  };
  const stateOf = (value: StoredExplorer): ExplorerState => ({
    ...explorerView(value, today),
    today,
    student,
    revision: 3,
    feedback: null,
    expedition: {
      mission,
      next: null,
      completedToday: true,
      canStart: false,
      todayStars: { cards: 5, bonus: 0 },
    },
  });
  return { state, supplement, act, stored: () => stored, stateOf };
}

function spoken(element: Element) {
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll('[aria-hidden="true"]')
    .forEach((node) => node.remove());
  return copy.textContent!.replace(/\s+/g, " ").trim();
}
function home(state: ExplorerState, initialView?: "collection") {
  const onStartSupplement = vi.fn();
  const onInspectSupplement = vi.fn();
  render(
    <ExplorerHome
      state={state}
      busy={false}
      onAction={vi.fn()}
      onStart={vi.fn()}
      onResume={vi.fn()}
      onRetry={vi.fn()}
      onInspect={vi.fn()}
      onReviewDay={vi.fn()}
      onStartSupplement={onStartSupplement}
      onInspectSupplement={onInspectSupplement}
      initialView={initialView}
    />,
  );
  return { onStartSupplement, onInspectSupplement };
}

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("«교재» 딱지 — 이름 뒤 속 빈 딱지(1안)", () => {
  it("제목의 화면 읽기 이름에 갈래와 «교재»가 함께 든다", () => {
    expect(conceptHeadingLabel("sup-line", "직선")).toBe("직선 · 정의 · 교재");
    expect(conceptHeadingLabel("g3-segment", "선분")).toBe("선분 · 정의");
  });
});

describe("단원 끝 줄 — 오늘의 한 칸 카드 안", () => {
  it("그 단원 다섯을 다 모은 날, 칸 완료 줄 아래 «교재에 한 장 더» 한 줄 — 누르면 그 장을 시작한다", () => {
    const { onStartSupplement } = home(engine().state());
    const card = screen
      .getByRole("heading", { name: "평면도형과 원" })
      .closest("section")!;
    expect(within(card).getByText("교재에 한 장 더")).toBeVisible();
    const row = within(card).getByRole("button", { name: /직선/ });
    expect(spoken(row)).toBe("직선 · 정의 · 교재 살펴보기");
    expect(row.querySelector("[data-concept-source]")).toHaveTextContent(
      "교재",
    );
    expect(within(card).getByText("세 활동 · 한 칸과 따로예요")).toBeVisible();
    fireEvent.click(row);
    expect(onStartSupplement).toHaveBeenCalledWith("sup-line");
  });

  it("도중에 나가면 그날 줄이 «이어서 하기 · n / 3»(해결한 수)", () => {
    const e = engine();
    e.supplement("sup-line", 2); // 뜻 만나기 + 문장 조립
    home(e.state());
    expect(
      screen.getByRole("button", { name: /직선.*이어서 하기 · 1 \/ 3/ }),
    ).toBeVisible();
  });

  it("모으면 ✓ 없이 도감 글자색 줄 «교재 개념 직선을 도감에 모았어요.» + 별 알약, 남은 장은 도감에", () => {
    const e = engine();
    e.supplement("sup-line");
    home(e.state());
    const line = screen.getByText(/교재 개념 직선을 도감에 모았어요/);
    expect(line).not.toHaveTextContent("✓");
    expect(line).toHaveTextContent("✦+1");
    expect(spoken(line)).toBe("교재 개념 직선을 도감에 모았어요. 별 1개");
    expect(line).toHaveAttribute("data-supplement-done");
    expect(
      screen.getByText("남은 교재 개념 4장은 도감에 있어요."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /살펴보기/ }),
    ).not.toBeInTheDocument();
  });

  it("세 바퀴 뒤에도 남으면 «아직 모으지 못했어요» 한 줄(조사는 받침에 맞춤)", () => {
    const e = engine();
    e.act({ type: "supplement-start", cardId: "sup-line" });
    // 모두 틀리게 — 뜻 만나기 뒤 매 활동 오답
    for (let n = 0; n < 20; n++) {
      const activity = e.state().supplements!.activity;
      if (!activity) break;
      if (activity.kind === "read") {
        e.act({ type: "supplement-read", questionId: activity.questionId });
        continue;
      }
      const card = supplementCard("sup-line");
      const wrong =
        activity.kind === "assemble"
          ? [card.words[1]!, card.words[0]!]
          : activity.kind === "examples"
            ? []
            : [card.truth ? "아니다" : "맞다"];
      e.act({
        type: "supplement-answer",
        questionId: activity.questionId,
        choiceIds: wrong.map(
          (label) => activity.choices.find((c) => c.label === label)!.id,
        ),
      });
    }
    home(e.state());
    expect(
      screen.getByText(
        "직선은 아직 모으지 못했어요. 도감에서 다시 해 볼 수 있어요.",
      ),
    ).toBeVisible();
  });

  it("보충이 없는 날은 줄이 없다", () => {
    const state = engine().state();
    home({ ...state, supplements: { ...state.supplements!, offer: null } });
    expect(screen.queryByText("교재에 한 장 더")).not.toBeInTheDocument();
  });
});

describe("도감 선반 — «교재에서 더 만나는 개념»", () => {
  it("그 학년 보충 카드를 본 카드 격자 아래에 같은 카드 모양 + «교재» 딱지로 — 누르면 카드 창", () => {
    const e = engine();
    e.supplement("sup-line");
    const { onInspectSupplement } = home(e.state(), "collection");
    const sheet = screen.getByRole("dialog", { name: "나의 개념 도감" });
    const shelf = within(sheet)
      .getByRole("heading", { name: "교재에서 더 만나는 개념" })
      .closest("section")!;
    expect(within(shelf).getByText("1 / 5")).toBeVisible();
    expect(
      within(shelf).getByText("선택 · 오늘의 탐험 · 기억 복습과 따로예요."),
    ).toBeVisible();
    const buttons = within(shelf).getAllByRole("button");
    // 이름 뒤 «교재» 딱지 — 화면 읽기에는 가운뎃점으로 이어 읽힌다(갈래 딱지와 같은 방식).
    expect(buttons.map((b) => b.querySelector("strong")!.textContent)).toEqual([
      "직선 · 교재",
      "각 · 교재",
      "변과 꼭짓점(도형) · 교재",
      "직사각형 · 교재",
      "정사각형 · 교재",
    ]);
    expect(buttons[0]).toHaveTextContent("수집 완료");
    expect(buttons[0]).toHaveAttribute("data-level", "1");
    expect(buttons[1]).toHaveTextContent("아직 수집 전");
    fireEvent.click(buttons[1]!);
    expect(onInspectSupplement).toHaveBeenCalledWith("sup-angle");
  });

  it("보충 카드가 없는 학년이면 선반을 그리지 않는다", () => {
    const state = engine().state();
    home(
      { ...state, profile: { ...state.profile, courseGrade: 9 } },
      "collection",
    );
    expect(
      screen.queryByRole("heading", { name: "교재에서 더 만나는 개념" }),
    ).not.toBeInTheDocument();
  });
});

describe("보충 카드 창", () => {
  function dialog(
    state: ExplorerState,
    cardId: string,
    locked = false,
    solution: Parameters<typeof ExplorerSupplementDialog>[0]["solution"] = null,
  ) {
    const onStart = vi.fn();
    const onSolution = vi.fn();
    render(
      <ExplorerSupplementDialog
        cardId={cardId}
        state={state}
        solution={solution}
        busy={false}
        locked={locked}
        onStart={onStart}
        onSolution={onSolution}
        onClose={vi.fn()}
      />,
    );
    return { onStart, onSolution };
  }

  it("아직 수집 전 — 학년 · 단원 머리, 이름 + 갈래 + «교재», «세 활동 해 보기»", () => {
    const { onStart } = dialog(engine().state(), "sup-angle");
    const box = screen.getByRole("dialog");
    expect(within(box).getByText("초등 3학년 · 평면도형과 원")).toBeVisible();
    expect(
      within(box).getByRole("heading", { name: "각 · 정의 · 교재" }),
    ).toBeVisible();
    expect(within(box).getByText("아직 수집 전")).toBeVisible();
    fireEvent.click(
      within(box).getByRole("button", { name: /세 활동 해 보기/ }),
    );
    expect(onStart).toHaveBeenCalled();
  });

  it("오늘의 탐험이 열려 있으면 흐리게 + «오늘의 탐험을 마친 뒤 해 볼 수 있어요.»", () => {
    dialog(engine().state(), "sup-angle", true);
    expect(
      screen.getByRole("button", { name: /세 활동 해 보기/ }),
    ).toBeDisabled();
    expect(
      screen.getByText("오늘의 탐험을 마친 뒤 해 볼 수 있어요."),
    ).toBeVisible();
  });

  it("멈춘 진행이 있으면 «이어서 하기 · n / 3»", () => {
    const e = engine();
    e.supplement("sup-angle", 2);
    dialog(e.state(), "sup-angle");
    expect(
      screen.getByRole("button", { name: /이어서 하기 · 1 \/ 3/ }),
    ).toBeVisible();
  });

  it("모은 카드는 «수집 완료 · 기억 복습 없음» · 뜻과 해설만(다시 풀기 없음)", () => {
    const e = engine();
    e.supplement("sup-line");
    const { onSolution } = dialog(e.state(), "sup-line");
    expect(screen.getByText("수집 완료 · 기억 복습 없음")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /해 보기|이어서/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "뜻과 해설 보기" }));
    expect(onSolution).toHaveBeenCalled();
  });
});

describe("한 장 세션 머리 — 같은 풀이 틀(§8.19)", () => {
  it("도구 줄 · 진행 줄이 «교재에 한 장 더», 제목에 «교재» 딱지", () => {
    const e = engine();
    e.act({ type: "supplement-start", cardId: "sup-line" });
    const state = e.state();
    render(
      <ExplorerPractice
        activity={state.supplements!.activity!}
        session={{
          title: state.supplements!.session!.title,
          index: state.supplements!.session!.index,
          total: state.supplements!.session!.total,
          round: state.supplements!.session!.round,
          reviewOnly: false,
        }}
        progressLabel="교재에 한 장 더"
        units={state.units}
        busy={false}
        correct={null}
        eventKey=""
        onAction={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    expect(screen.getAllByText("교재에 한 장 더")).toHaveLength(2);
    expect(screen.getByText("1 / 3")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "직선 · 정의 · 교재" }),
    ).toBeVisible();
    expect(screen.getByText("초3 · 평면도형과 원")).toBeVisible();
  });
});

describe("학생 화면 흐름 — 단원 끝 줄에서 한 장을 풀고 홈으로", () => {
  it("줄을 누르면 supplement-start 를 보내고 같은 풀이 틀이 뜨며, «← 진도판»으로 돌아온다", async () => {
    const e = engine();
    const first = e.state();
    e.act({ type: "supplement-start", cardId: "sup-line" });
    const started = { ...e.state(), revision: 4 };
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          bodies.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ data: started }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify({ data: bodies.length ? started : first }),
          { status: 200 },
        );
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(await screen.findByRole("button", { name: /직선/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "직선 · 정의 · 교재" }),
      ).toBeVisible(),
    );
    expect(bodies[0]).toMatchObject({
      action: { type: "supplement-start", cardId: "sup-line" },
    });
    fireEvent.click(screen.getByRole("button", { name: "진도판" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /이어서 하기|살펴보기/ }),
      ).toBeVisible(),
    );
  });
});

/** 학생 화면 전체용 작은 서버 — 행동은 엔진으로 적용 · 다음 POST 를 멈추거나 409 로 답할 수 있다. */
function miniServer(start: ReturnType<typeof engine>) {
  let stored = start.stored();
  let revision = 3;
  const posts: ExplorerAction[] = [];
  let hold: Promise<void> | null = null;
  let conflictNext = false;
  const data = (feedback: unknown = null) => ({
    ...start.stateOf(stored),
    revision,
    feedback,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method !== "POST")
        return new Response(JSON.stringify({ data: data() }), { status: 200 });
      const input = JSON.parse(String(init.body)) as {
        requestId: string;
        action: ExplorerAction;
      };
      posts.push(input.action);
      if (hold) await hold;
      if (conflictNext) {
        conflictNext = false;
        return new Response(
          JSON.stringify({ error: { code: "CONFLICT", message: "바뀜" } }),
          { status: 409 },
        );
      }
      const result = applyExplorerAction(
        stored,
        input.action,
        today,
        input.requestId,
      );
      stored = result.state;
      revision += 1;
      return new Response(JSON.stringify({ data: data(result.feedback) }), {
        status: 200,
      });
    }),
  );
  return {
    posts,
    holdNext() {
      let release!: () => void;
      hold = new Promise<void>((resolve) => (release = resolve));
      return () => {
        hold = null;
        release();
      };
    },
    conflictNext() {
      conflictNext = true;
    },
  };
}

describe("리드 검토 화면 고침(S1~S4)", () => {
  it("S2 끝 줄 · 못 모은 줄의 이름도 수식으로 그린다(모든 화면 일치 — y축…)", async () => {
    const state = engine().state();
    const card = (patch: object) => ({
      ...state.supplements!.cards.find((c) => c.id === "sup-y-axis-symmetry")!,
      ...patch,
    });
    const withCard = (patch: object) => ({
      ...state,
      supplements: {
        ...state.supplements!,
        offer: { cardId: "sup-y-axis-symmetry", unitId: "g7-coordinate" },
        cards: [card(patch)],
      },
    });
    const { unmount } = render(
      <ExplorerHome
        state={withCard({ collectedAt: today })}
        busy={false}
        onAction={vi.fn()}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onRetry={vi.fn()}
        onInspect={vi.fn()}
        onReviewDay={vi.fn()}
      />,
    );
    const done = document.querySelector('[data-supplement-line="done"]')!;
    await waitFor(() => expect(done.querySelector(".katex")).not.toBeNull());
    unmount();
    render(
      <ExplorerHome
        state={withCard({ missedAt: today })}
        busy={false}
        onAction={vi.fn()}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onRetry={vi.fn()}
        onInspect={vi.fn()}
        onReviewDay={vi.fn()}
      />,
    );
    const missed = document.querySelector('[data-supplement-line="missed"]')!;
    await waitFor(() => expect(missed.querySelector(".katex")).not.toBeNull());
  });

  it("S4 보충 카드 창의 닫기 이름은 본 카드 창과 같다(«개념 카드 닫기»)", () => {
    render(
      <ExplorerSupplementDialog
        cardId="sup-angle"
        state={engine().state()}
        solution={null}
        busy={false}
        locked={false}
        onStart={vi.fn()}
        onSolution={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "개념 카드 닫기" }),
    ).toBeVisible();
  });

  it("S3 보충 한 장을 푸는 중 저장이 막히면(409) 풀이 틀 위 오류 패널로 알린다", async () => {
    const api = miniServer(engine());
    render(<StudentMathExplorers />);
    fireEvent.click(await screen.findByRole("button", { name: /직선/ }));
    await screen.findByRole("heading", { name: "직선 · 정의 · 교재" });
    api.conflictNext();
    fireEvent.click(
      screen.getByRole("button", { name: /뜻을 가리고 도전하기/ }),
    );
    expect(
      await screen.findByText("기록이 바뀌었어요. 최신 기록을 불러와 주세요."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "최신 기록 불러오기" }),
    ).toBeVisible();
  });

  it("S1 상자를 저장하는 동안 단원 끝 줄 · 보충 카드 창의 시작 단추도 막는다", async () => {
    const api = miniServer(engine());
    render(<StudentMathExplorers />);
    const line = await screen.findByRole("button", { name: /직선/ });
    expect(line).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /우리 기지/ }));
    const base = await screen.findByRole("dialog", { name: "우리 기지" });
    const release = api.holdNext();
    fireEvent.click(
      within(base)
        .getAllByRole("button")
        .find((b) => b.getAttribute("data-state") === "ready")!,
    );
    await waitFor(() => expect(api.posts).toHaveLength(1));
    expect(line).toBeDisabled();
    fireEvent.click(
      within(base).getByRole("button", { name: "우리 기지 닫기" }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /^.?도감$/ })[0]!);
    const dex = await screen.findByRole("dialog", { name: "나의 개념 도감" });
    fireEvent.click(
      dex.querySelector('[data-supplement-card="sup-angle"]') as HTMLElement,
    );
    const start = await screen.findByRole("button", {
      name: /세 활동 해 보기/,
    });
    expect(start).toBeDisabled();
    fireEvent.click(start);
    expect(api.posts).toHaveLength(1);
    await act(async () => release());
    await waitFor(() => expect(start).toBeEnabled());
  });
});
