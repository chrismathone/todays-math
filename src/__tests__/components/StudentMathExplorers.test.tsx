import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import type {
  ExplorerRequest,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import ExplorerHome, {
  explorerJourney,
} from "@/components/math-explorers/ExplorerHome";
import ExplorerCardDialog from "@/components/math-explorers/ExplorerCardDialog";
import type {
  ExpeditionMission,
  ExpeditionPlan,
} from "@/contracts/mathExpedition.contract";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math-explorers/ExplorerBankActivity", () => ({
  default: ({
    kind,
    onExit,
    onComplete,
  }: {
    kind: string;
    onExit: () => void;
    onComplete: () => void;
  }) => (
    <section aria-label={`은행 활동 ${kind}`}>
      <button onClick={onExit}>탐험판으로</button>
      <button onClick={onComplete}>은행 완료</button>
    </section>
  ),
}));
vi.mock("@/components/math-srs/StudentReplayDialog", () => ({
  default: ({
    kind,
    dayId,
    step,
    onClose,
  }: {
    kind: string;
    dayId: string;
    step: number;
    onClose: () => void;
  }) => (
    <section
      aria-label="지난 문제 다시 풀기"
      data-kind={kind}
      data-day-id={dayId}
      data-step={step}
    >
      <button onClick={onClose}>다시 풀기 닫기</button>
    </section>
  ),
}));
const now = "2026-09-26";
const student = { id: "student-ui", name: "학생", className: "테스트반" };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value:
    function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  }});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StudentMathExplorers", () => {
  it("retries a lost mutation with the identical request identifier and revision", async () => {
    let stored = createExplorerState(student.id, 3);
    let revision = 0;
    const requests: ExplorerRequest[] = [];
    const data = () => ({
      ...explorerView(stored, now),
      student,
      revision,
      feedback: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (!options?.body)
          return new Response(JSON.stringify({ data: data() }), {
            status: 200,
          });
        const input = JSON.parse(options.body as string) as ExplorerRequest;
        requests.push(input);
        if (requests.length === 1) throw new TypeError("Lost response");
        const result = applyExplorerAction(
          stored,
          input.action,
          now,
          input.requestId,
        );
        stored = result.state;
        revision++;
        return new Response(
          JSON.stringify({ data: { ...data(), feedback: result.feedback } }),
          { status: 200 },
        );
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(await screen.findByRole("button", { name: "학습 설정" }));
    fireEvent.click(await screen.findByRole("button", { name: "초4" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "같은 요청 다시 시도" }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual(requests[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "초4" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("maps completed expedition days without moving for individual answers or a review-only run", () => {
    const stored = createExplorerState(student.id, 3);
    stored.completedDays = [
      {
        date: "2026-09-25",
        unitId: "e3-multiply",
        sessionId: "completed-session",
      },
    ];
    const view = {
      ...explorerView(stored, now),
      student,
      revision: 0,
      feedback: null,
    };
    const initial = explorerJourney(view);
    const afterAnswer = explorerJourney({
      ...view,
      session: {
        id: "active",
        route: "unit",
        title: "복습",
        unitId: "e3-multiply",
        cardIds: ["a", "b", "c", "d", "e"],
        index: 8,
        total: 15,
        round: 0,
        done: false,
        first: 5,
        stars: 0,
        unresolved: [],
        reviewOnly: false,
      },
    });
    expect(afterAnswer.completedDays).toBe(initial.completedDays);
    expect(afterAnswer.todayAnswered).toBe(8);
    expect(
      explorerJourney({
        ...view,
        session: { ...afterAnswerSession(), reviewOnly: true },
      }).todayAnswered,
    ).toBe(0);
  });

  it.each(["탐험판으로", "은행 완료"])(
    "re-fetches canonical progress after bank action %s",
    async (button) => {
      const initial = stateView();
      const active = {
        ...initial,
        expedition: {
          ...initial.expedition!,
          mission: mission("elementary"),
          next: null,
        },
      };
      const completed = {
        ...active,
        expedition: {
          ...active.expedition,
          completedToday: true,
          canStart: false,
          mission: {
            ...active.expedition.mission,
            status: "complete",
            answered: 10,
          },
        },
      };
      let reads = 0;
      const requests: ExplorerRequest[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, options) => {
          if (options?.body) {
            requests.push(JSON.parse(options.body));
            return response(active);
          }
          reads++;
          return response(reads === 1 ? initial : completed);
        }),
      );
      render(<StudentMathExplorers />);
      fireEvent.click(
        await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
      );
      expect(
        await screen.findByLabelText("은행 활동 elementary"),
      ).toBeVisible();
      expect(requests[0].action).toEqual({ type: "expedition-start" });
      fireEvent.click(screen.getByRole("button", { name: button }));
      expect(await screen.findByText("오늘의 한 칸 완료")).toBeVisible();
      expect(reads).toBe(2);
      expect(
        screen.queryByRole("button", { name: /오늘의 탐험 시작/ }),
      ).not.toBeInTheDocument();
    },
  );

  it("sends an explicit unresolved retry without starting a new mission", async () => {
    const state = unresolvedView();
    const requests: ExplorerRequest[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        if (options?.body) requests.push(JSON.parse(options.body));
        return response(state);
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /남은 문제 다시 풀기/ }),
    );
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].action).toEqual({ type: "retry-unresolved" });
    expect(screen.queryByText("오늘의 한 칸 완료")).not.toBeInTheDocument();
  });

  it.each([false, true])("re-fetches the canonical mission when concept practice exits or completes: %s", async (complete) => {
    const initial = stateView();
    initial.expedition!.next = plan("explorers");
    const active = { ...initial, session: { ...afterAnswerSession(), index: 14 }, currentActivity: { questionId: "last-question", cardId: initial.units[0].cards[0].id, cardName: "자릿값", unitId: initial.units[0].id, unitTitle: "덧셈과 뺄셈", kind: "truth" as const, prompt: "이 설명이 맞나요?", statement: "수를 자리에 맞게 살펴보세요.", choices: [{ id: 0, label: "맞아요" }, { id: 1, label: "아니에요" }] }, expedition: { ...initial.expedition!, mission: mission() } };
    const finished = { ...active, currentActivity: null, session: { ...active.session, done: true }, feedback: { correct: true }, expedition: { ...active.expedition, completedToday: true, mission: { ...mission(), status: "complete", answered: 15 } } };
    let reads = 0;
    const requests: ExplorerRequest[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      if (!options?.body) { reads++; return response(reads === 1 ? initial : complete ? finished : active); }
      const request = JSON.parse(options.body) as ExplorerRequest;
      requests.push(request);
      return response(request.action.type === "answer" ? finished : active);
    }));
    const { container } = render(<StudentMathExplorers />);
    fireEvent.click(await screen.findByRole("button", { name: /오늘의 탐험 시작/ }));
    await screen.findByRole("button", { name: "1 맞아요" });
    if (complete) {
      fireEvent.click(screen.getByRole("button", { name: "1 맞아요" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "1 맞아요" })).toBeDisabled());
      expect(container.querySelector("[data-explorer-dock]")).toBeInTheDocument();
      expect(screen.queryByText("오늘의 한 칸 완료")).not.toBeInTheDocument();
      expect(await screen.findByText("오늘의 한 칸 완료")).toBeVisible();
    } else {
      fireEvent.click(screen.getByRole("button", { name: "← 진도판" }));
      expect(await screen.findByRole("button", { name: /이어서 탐험하기/ })).toBeVisible();
    }
    expect(reads).toBe(2);
    expect(requests.map((request) => request.action.type)).toEqual(complete ? ["expedition-start", "answer"] : ["expedition-start"]);
  });

  it("opens and closes the collection when the route view changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(stateView())),
    );
    const { rerender } = render(<StudentMathExplorers />);
    await screen.findByRole("button", { name: /오늘의 탐험 시작/ });
    rerender(<StudentMathExplorers initialView="collection" />);
    const dialog = await screen.findByRole("dialog", {
      name: "나의 개념 도감",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "나의 개념 도감 닫기" }),
    );
    expect(router.replace).toHaveBeenCalledWith("/learn");
    rerender(<StudentMathExplorers />);
    await screen.findByRole("button", { name: /오늘의 탐험 시작/ });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps loading and failed initial requests in the practice frame", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const { container } = render(<StudentMathExplorers />);
    expect(screen.getByRole("status")).toBeVisible();
    expect(
      container.querySelector('[data-student-practice="true"]'),
    ).toBeInTheDocument();
    resolve(
      new Response(
        JSON.stringify({ error: { message: "다시 연결해 주세요" } }),
        { status: 500 },
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "다시 연결해 주세요",
    );
    expect(
      container.querySelector('[data-student-practice="true"]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /오늘의 탐험 시작/ }),
    ).not.toBeInTheDocument();
  });

  it("opens a saved bank day with its actual day identifier and board step without a mutation", async () => {
    const value = stateView();
    const review = {
      kind: "middle" as const,
      dayId: "middle:2026-09-24",
      title: "일차방정식",
      subtitle: "중1",
      reviewCount: 12,
    };
    value.journey = {
      activeKind: "elementary",
      completedDays: 2,
      todayComplete: false,
      todayAnswered: 0,
      todayGoal: 10,
      upcoming: [{ title: "곱셈", subtitle: "초등 3학년" }],
      days: ["2026-09-23", "2026-09-24"].map((date, index) => ({
        ...review,
        id: `global:${date}`,
        date,
        completedAt: `${date}T10:00:00.000Z`,
        reviews: [{ ...review, dayId: `middle:${date}` }],
        title: index ? "일차방정식" : "등식의 성질",
      })),
    };
    const fetcher = vi.fn(async () => response(value));
    vi.stubGlobal("fetch", fetcher);
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /2일차, 일차방정식, 학습 완료, 다시 풀기/,
      }),
    );
    const replay = await screen.findByLabelText("지난 문제 다시 풀기");
    expect(replay).toHaveAttribute("data-day-id", "middle:2026-09-24");
    expect(replay).toHaveAttribute("data-step", "2");
    fireEvent.click(screen.getByRole("button", { name: "다시 풀기 닫기" }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("내 말, 2일 학습 완료")).toBeVisible();
  });
});

function plan(kind: ExpeditionPlan["kind"] = "elementary"): ExpeditionPlan {
  return {
    kind,
    route: kind === "explorers" ? "unit" : "bank",
    unitId: "e3-multiply",
    title: "곱셈",
    subtitle: "초등 3학년",
    goal: kind === "explorers" ? 15 : kind === "middle" ? 12 : 10,
  };
}
function mission(
  kind: ExpeditionPlan["kind"] = "explorers",
): ExpeditionMission {
  return {
    ...plan(kind),
    id: "00000000-0000-4000-8000-000000000001",
    date: now,
    answered: 0,
    retryRemaining: 0,
    status: "active",
    sourceSessionId: "source",
    sourceSessionIds: ["source"],
    startedAt: `${now}T00:00:00.000Z`,
    completedAt: null,
  };
}
function stateView(): ExplorerState {
  return {
    ...explorerView(createExplorerState(student.id, 3), now),
    student,
    revision: 0,
    feedback: null,
    expedition: {
      mission: null,
      next: plan(),
      completedToday: false,
      canStart: true,
    },
  };
}
function unresolvedView(): ExplorerState {
  const state = stateView();
  const card = state.units[0].cards[0];
  state.session = {
    ...afterAnswerSession(),
    done: true,
    index: 1,
    total: 1,
    round: 3,
    unresolved: [{ cardId: card.id, name: card.name, kind: 2 }],
  };
  state.expedition = {
    mission: { ...mission(), status: "retry", answered: 15, retryRemaining: 1 },
    next: null,
    completedToday: false,
    canStart: true,
  };
  return state;
}
function response(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

describe("ExplorerHome mission and sheets", () => {
  function home(state = stateView()) {
    const actions = {
      onAction: vi.fn(),
      onStart: vi.fn(),
      onResume: vi.fn(),
      onRetry: vi.fn(),
      onInspect: vi.fn(),
      onReviewDay: vi.fn(),
    };
    const result = render(
      <ExplorerHome state={state} busy={false} {...actions} />,
    );
    return { ...actions, ...result };
  }

  it("shows one primary mission action and keeps study settings and the base in sheets", () => {
    const { container, onStart } = home();
    expect(container.querySelectorAll("[data-expedition-start]")).toHaveLength(
      1,
    );
    expect(screen.getByRole("heading", { name: "곱셈" })).toBeVisible();
    expect(screen.getByText("0 / 10 문제")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "초4" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/기지 키우기/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /오늘의 탐험 시작/ }));
    expect(onStart).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "학습 설정" }));
    expect(screen.getByRole("dialog", { name: "학습 설정" })).toBeVisible();
    expect(screen.getByRole("button", { name: "초4" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "학습 설정 닫기" }));
    fireEvent.click(screen.getByRole("button", { name: "우리 기지" }));
    expect(screen.getByRole("dialog", { name: "우리 기지" })).toBeVisible();
  });

  it("uses tomorrow's actual plan instead of a completed previous mission", () => {
    const state = stateView();
    state.expedition!.mission = {
      ...mission(),
      title: "어제의 단원",
      status: "complete",
      answered: 15,
    };
    state.expedition!.next = {
      ...plan("middle"),
      title: "일차방정식",
      subtitle: "중학교 1학년",
    };
    home(state);
    expect(screen.getByRole("heading", { name: "일차방정식" })).toBeVisible();
    expect(screen.getByText("0 / 12 문제")).toBeVisible();
    expect(screen.queryByText("어제의 단원")).not.toBeInTheDocument();
  });

  it("does not call a full first pass complete while an unresolved retry remains", () => {
    const { onRetry, onStart } = home(unresolvedView());
    expect(screen.getByText("15 / 15 활동")).toBeVisible();
    expect(
      screen.getByText("다시 풀 문제 1개를 마치면 한 칸 전진해요."),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: /남은 문제 다시 풀기/ }),
    );
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.queryByText("오늘의 한 칸 완료")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "학습 설정" }));
    expect(screen.getByRole("button", { name: "초4" })).toBeDisabled();
  });
});

describe("ExplorerCardDialog explanations", () => {
  it.each([true, false])(
    "only offers requested explanations after the attempt ends: %s",
    (done) => {
      const state = unresolvedView();
      state.session!.done = done;
      const onSolution = vi.fn();
      render(
        <ExplorerCardDialog
          card={state.units[0].cards[0]}
          state={state}
          solution={null}
          busy={false}
          onInspect={vi.fn()}
          onSolution={onSolution}
          onSetGoal={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(onSolution).not.toHaveBeenCalled();
      if (done) {
        fireEvent.click(
          screen.getByRole("button", { name: "정의와 해설 보기" }),
        );
        expect(onSolution).toHaveBeenCalledOnce();
      } else
        expect(
          screen.queryByRole("button", { name: "정의와 해설 보기" }),
        ).not.toBeInTheDocument();
      expect(screen.queryByText("뜻 다시 보기")).not.toBeInTheDocument();
    },
  );
});

function afterAnswerSession() {
  return {
    id: "review",
    route: "unit" as const,
    title: "복습",
    unitId: "e3-multiply",
    cardIds: ["a", "b", "c", "d", "e"],
    index: 8,
    total: 15,
    round: 0,
    done: false,
    first: 5,
    stars: 0,
    unresolved: [],
    reviewOnly: false,
  };
}
