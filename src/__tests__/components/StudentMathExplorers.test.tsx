import {
  act,
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

const sounds = vi.hoisted(() => ({
  enabled: true,
  status: "ready" as const,
  setEnabled: vi.fn(),
  gesture: vi.fn(),
  preview: vi.fn(),
  play: vi.fn(),
  resetStudent: vi.fn(),
}));
vi.mock("@/components/math-srs/LearningSounds", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/components/math-srs/LearningSounds")
  >()),
  LearningSoundsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useLearningSounds: () => sounds,
}));

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math-explorers/ExplorerBankActivity", () => ({
  default: ({
    kind,
    onExit,
    onComplete,
    onConfirmedAnswer,
  }: {
    kind: string;
    onExit: () => void;
    onComplete: () => void;
    onConfirmedAnswer?: (studentId: string) => void;
  }) => (
    <section aria-label={`은행 활동 ${kind}`}>
      <button onClick={onExit}>탐험판으로</button>
      <button onClick={onComplete}>은행 완료</button>
      <button onClick={() => onConfirmedAnswer?.("student-ui")}>
        은행 확정 답
      </button>
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
async function userEventClickStart() {
  fireEvent.click(
    await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StudentMathExplorers", () => {
  it.each(["graded", "unknown", "workshop"] as const)(
    "commits answer and completion sounds at existing transitions: %s",
    async (mode) => {
      const initial = stateView();
      initial.expedition!.next = plan("explorers");
      const active = structuredClone(initial);
      active.session = afterAnswerSession();
      active.currentActivity = {
        questionId: "sound-question",
        cardId: active.units[0].cards[0].id,
        cardName: "자릿값",
        unitId: active.units[0].id,
        unitTitle: "덧셈과 뺄셈",
        kind: "truth",
        prompt: "이 설명이 맞나요?",
        choices: [
          { id: 0, label: "맞아요" },
          { id: 1, label: "아니에요" },
        ],
      };
      active.expedition!.mission = mission();
      if (mode === "workshop")
        active.workshop = {
          memoryDate: null,
          memoryDue: false,
          blueprintAt: null,
          discoveredAt: null,
          rememberedAt: null,
          session: {
            id: "sound-workshop",
            route: "explore",
            stage: "predict",
            attachedTo: {
              sessionId: active.session.id,
              questionId: "sound-question",
              cardId: "g5-common-denominator",
            },
            questionId: "predict-question",
            checkIndex: 0,
            checkTotal: 2,
            done: false,
            prompt: "조각을 나누면 전체 크기가 변하나요?",
            fractions: [{ numerator: 1, denominator: 2 }],
            targetDenominator: null,
            factors: [1, 1],
            choices: [{ id: 0, label: "그대로예요" }],
            predictionLabel: null,
            stars: 0,
          },
        };
      const completed = structuredClone(active);
      completed.session!.done = true;
      completed.currentActivity = null;
      completed.expedition!.completedToday = true;
      completed.expedition!.todayStars = { cards: 0, bonus: 3 };
      completed.feedback = { message: "확정", correct: true };
      const requests: ExplorerRequest[] = [];
      let read = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, options) => {
          if (!options?.body)
            return response(++read === 1 ? initial : completed);
          const input = JSON.parse(options.body) as ExplorerRequest;
          requests.push(input);
          return response(
            input.action.type === "expedition-start" ? active : completed,
          );
        }),
      );
      render(<StudentMathExplorers />);
      await userEventClickStart();
      const button = await screen.findByRole("button", {
        name:
          mode === "workshop"
            ? /그대로예요/
            : mode === "unknown"
              ? "아직 모르겠어요"
              : "1 맞아요",
      });
      expect(sounds.play).not.toHaveBeenCalled();
      vi.useFakeTimers();
      try {
        await act(async () => fireEvent.click(button));
        if (mode === "workshop") expect(sounds.play).not.toHaveBeenCalled();
        else
          expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
            mode === "unknown" ? "soft" : "correct",
            `${student.id}:${requests[1].requestId}`,
          );
        await act(async () => vi.advanceTimersByTime(1200));
        expect(sounds.play).toHaveBeenLastCalledWith(
          "complete",
          `complete:${student.id}:${mission().id}`,
        );
        expect(sounds.play).toHaveBeenCalledTimes(mode === "workshop" ? 1 : 2);
      } finally {
        vi.useRealTimers();
      }
    },
  );
  it.each(["confirmed", "no-answer", "other-student"] as const)(
    "allows complete sound only after local bank confirmation: %s",
    async (mode) => {
      const initial = stateView();
      const active = {
        ...initial,
        expedition: {
          ...initial.expedition!,
          mission: mission("elementary"),
          next: null,
        },
      };
      const completed = structuredClone(active);
      completed.expedition!.completedToday = true;
      completed.expedition!.canStart = false;
      completed.expedition!.todayStars = { cards: 0, bonus: 3 };
      completed.expedition!.mission!.status = "complete";
      if (mode === "other-student")
        completed.student = { ...student, id: "other-student" };
      let reads = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, options) =>
          options?.body
            ? response(active)
            : response(++reads === 1 ? initial : completed),
        ),
      );
      render(<StudentMathExplorers />);
      await userEventClickStart();
      await screen.findByLabelText("은행 활동 elementary");
      if (mode !== "no-answer")
        fireEvent.click(screen.getByRole("button", { name: "은행 확정 답" }));
      expect(sounds.play).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "은행 완료" }));
      await screen.findByText("오늘의 한 칸 완료");
      if (mode === "confirmed")
        await waitFor(() =>
          expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
            "complete",
            `complete:${student.id}:${mission().id}`,
          ),
        );
      else expect(sounds.play).not.toHaveBeenCalled();
      expect(sounds.resetStudent).toHaveBeenCalledTimes(2);
    },
  );
  it("keeps an initially completed day silent", async () => {
    const initial = stateView();
    initial.expedition!.completedToday = true;
    initial.expedition!.todayStars = { cards: 0, bonus: 3 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(initial)),
    );
    render(<StudentMathExplorers />);
    await screen.findByText("오늘의 한 칸 완료");
    expect(sounds.play).not.toHaveBeenCalled();
    expect(sounds.gesture).not.toHaveBeenCalled();
  });
  it.each(["lost", "duplicate", "other-student", "late"] as const)(
    "shows feedback only for the first confirmed local request: %s",
    async (mode) => {
      const initial = stateView();
      initial.expedition!.next = plan("explorers");
      const activity = {
        questionId: "guard-question",
        cardId: initial.units[0].cards[0].id,
        cardName: "자릿값",
        unitId: initial.units[0].id,
        unitTitle: "덧셈과 뺄셈",
        kind: "truth" as const,
        prompt: "이 설명이 맞나요?",
        choices: [
          { id: 0, label: "맞아요" },
          { id: 1, label: "아니에요" },
        ],
      };
      const active = {
        ...initial,
        session: afterAnswerSession(),
        currentActivity: activity,
        expedition: { ...initial.expedition!, mission: mission() },
      };
      const confirmed = {
        ...active,
        currentActivity: { ...activity, questionId: "guard-next" },
        feedback: { message: "잘했어!", correct: true },
      };
      const requests: ExplorerRequest[] = [];
      let answers = 0;
      let resolveLate: (value: Response) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, options) => {
          if (!options?.body) return response(initial);
          const input = JSON.parse(options.body) as ExplorerRequest;
          if (input.action.type !== "answer") return response(active);
          requests.push(input);
          answers++;
          if (mode === "late")
            return new Promise<Response>((resolve) => {
              resolveLate = resolve;
            });
          if (mode === "lost" && answers === 1)
            throw new TypeError("Lost response");
          return response(
            mode === "other-student"
              ? {
                  ...confirmed,
                  student: { ...confirmed.student, id: "another-student" },
                }
              : confirmed,
          );
        }),
      );
      const { container } = render(<StudentMathExplorers />);
      fireEvent.click(
        await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
      );
      const firstChoice = await screen.findByRole("button", {
        name: "1 맞아요",
      });
      if (mode === "late") vi.useFakeTimers();
      fireEvent.click(firstChoice);
      if (mode === "late") {
        try {
          act(() => vi.advanceTimersByTime(15_000));
          await act(async () => {
            resolveLate(response(confirmed));
          });
          expect(
            container.querySelector("[data-answer-feedback]"),
          ).not.toBeInTheDocument();
          expect(screen.getByRole("alert")).toHaveTextContent(
            "응답이 늦어지고 있어요",
          );
        } finally {
          vi.useRealTimers();
        }
        return;
      }
      if (mode === "other-student") {
        await waitFor(() =>
          expect(screen.getByRole("alert")).toBeInTheDocument(),
        );
        expect(
          container.querySelector("[data-answer-feedback]"),
        ).not.toBeInTheDocument();
        expect(sounds.play).not.toHaveBeenCalled();
        return;
      }
      if (mode === "lost") {
        expect(
          container.querySelector("[data-answer-feedback]"),
        ).not.toBeInTheDocument();
        fireEvent.click(
          await screen.findByRole("button", { name: "같은 요청 다시 시도" }),
        );
        await waitFor(() => expect(requests).toHaveLength(2));
        expect(requests[1]).toEqual(requests[0]);
      }
      const result = await screen.findByText("정확하게 풀었어요");
      expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
        "correct",
        `${student.id}:${requests[0].requestId}`,
      );
      expect(sounds.gesture).toHaveBeenCalled();
      expect(result.closest("[data-explorer-dock]")).toBeInTheDocument();
      expect(screen.queryByText("잘했어!")).not.toBeInTheDocument();
      if (mode === "duplicate") {
        const acceptedId = requests[0].requestId;
        await waitFor(
          () =>
            expect(
              screen.getByRole("button", { name: "1 맞아요" }),
            ).toBeEnabled(),
          { timeout: 2000 },
        );
        vi.spyOn(crypto, "randomUUID").mockReturnValue(
          acceptedId as `${string}-${string}-${string}-${string}-${string}`,
        );
        fireEvent.click(screen.getByRole("button", { name: "1 맞아요" }));
        await act(async () => {});
        await waitFor(() => expect(requests).toHaveLength(2));
        expect(sounds.play).toHaveBeenCalledTimes(1);
        expect(
          container.querySelector("[data-answer-feedback]"),
        ).not.toBeInTheDocument();
      }
    },
  );
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
        continuation: 0,
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
      expect(sounds.play).not.toHaveBeenCalled();
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

  it.each([false, true])(
    "re-fetches the canonical mission when concept practice exits or completes: %s",
    async (complete) => {
      const initial = stateView();
      initial.expedition!.next = plan("explorers");
      const active = {
        ...initial,
        session: { ...afterAnswerSession(), index: 14 },
        currentActivity: {
          questionId: "last-question",
          cardId: initial.units[0].cards[0].id,
          cardName: "자릿값",
          unitId: initial.units[0].id,
          unitTitle: "덧셈과 뺄셈",
          kind: "truth" as const,
          prompt: "수를 자리에 맞게 살펴보세요. 이 설명이 맞나요?",
          choices: [
            { id: 0, label: "맞아요" },
            { id: 1, label: "아니에요" },
          ],
        },
        expedition: { ...initial.expedition!, mission: mission() },
      };
      const finished = {
        ...active,
        currentActivity: null,
        session: { ...active.session, done: true },
        feedback: { message: "정답", correct: true },
        expedition: {
          ...active.expedition,
          completedToday: true,
          mission: { ...mission(), status: "complete", answered: 15 },
        },
      };
      let reads = 0;
      const requests: ExplorerRequest[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, options) => {
          if (!options?.body) {
            reads++;
            return response(
              reads === 1 ? initial : complete ? finished : active,
            );
          }
          const request = JSON.parse(options.body) as ExplorerRequest;
          requests.push(request);
          return response(request.action.type === "answer" ? finished : active);
        }),
      );
      const { container } = render(<StudentMathExplorers />);
      fireEvent.click(
        await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
      );
      await screen.findByRole("button", { name: "1 맞아요" });
      if (complete) {
        fireEvent.click(screen.getByRole("button", { name: "1 맞아요" }));
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "1 맞아요" }),
          ).toBeDisabled(),
        );
        expect(
          container.querySelector("[data-explorer-dock]"),
        ).toBeInTheDocument();
        expect(screen.queryByText("오늘의 한 칸 완료")).not.toBeInTheDocument();
        expect(await screen.findByText("오늘의 한 칸 완료")).toBeVisible();
      } else {
        fireEvent.click(screen.getByRole("button", { name: "진도판" }));
        expect(
          await screen.findByRole("button", { name: /이어서 탐험하기/ }),
        ).toBeVisible();
      }
      expect(reads).toBe(2);
      expect(requests.map((request) => request.action.type)).toEqual(
        complete ? ["expedition-start", "answer"] : ["expedition-start"],
      );
    },
  );

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

  it("replays a past concept day read-only in the same frame without starting today's mission", async () => {
    const value = stateView();
    const review = {
      kind: "explorers" as const,
      dayId: "explorers:2026-09-24",
      title: "덧셈과 뺄셈",
      subtitle: "초등 3학년",
      reviewCount: 15,
    };
    value.journey = {
      activeKind: "explorers",
      completedDays: 1,
      todayComplete: false,
      todayAnswered: 0,
      todayGoal: 15,
      upcoming: [{ title: "곱셈", subtitle: "초등 3학년" }],
      days: [
        {
          ...review,
          id: "global:2026-09-24",
          date: "2026-09-24",
          completedAt: "2026-09-24T10:00:00.000Z",
          reviews: [review],
        },
      ],
    };
    const card = value.units[0].cards[0];
    const replaying: ExplorerState = {
      ...value,
      session: { ...afterAnswerSession(), index: 0, reviewOnly: true },
      currentActivity: {
        questionId: "replay-question",
        cardId: card.id,
        cardName: card.name,
        unitId: value.units[0].id,
        unitTitle: value.units[0].title,
        kind: "truth",
        prompt: "이 설명이 맞나요?",
        choices: [
          { id: 0, label: "맞아요" },
          { id: 1, label: "아니에요" },
        ],
      },
    };
    const requests: ExplorerRequest[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        if (!options?.body) return response(value);
        requests.push(JSON.parse(options.body));
        return response(replaying);
      }),
    );
    const { container } = render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /1일차, 덧셈과 뺄셈, 학습 완료, 다시 풀기/,
      }),
    );
    // 다시 풀기 첫 활동 앞 «오늘 다시 만날 개념» 한 장(05 §8.19 · D-143 ③) — 요청 없이 넘긴다.
    fireEvent.click(
      await screen.findByRole("button", { name: /다시 풀기 시작하기/ }),
    );
    expect(
      await screen.findByRole("button", { name: "1 맞아요" }),
    ).toBeVisible();
    expect(requests.map((request) => request.action)).toEqual([
      { type: "start", route: "unit", dayId: "2026-09-24" },
    ]);
    expect(container.querySelector("[data-explorer-dock]")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /^우리 기지/ }));
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
        fireEvent.click(screen.getByRole("button", { name: "뜻과 해설 보기" }));
        expect(onSolution).toHaveBeenCalledOnce();
      } else
        expect(
          screen.queryByRole("button", { name: "뜻과 해설 보기" }),
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
    continuation: 0,
    done: false,
    first: 5,
    stars: 0,
    unresolved: [],
    reviewOnly: false,
  };
}

describe("ExplorerCardDialog — 이름 옆 갈래 딱지(05 §8.19 · D-143)", () => {
  it("도감 카드 제목에 풀이 화면과 같은 딱지", () => {
    const state = stateView();
    const card = state.units
      .flatMap((unit) => unit.cards)
      .find((item) => item.id === "g3-check-division")!;
    render(
      <ExplorerCardDialog
        card={card}
        state={state}
        solution={null}
        busy={false}
        onInspect={vi.fn()}
        onSolution={vi.fn()}
        onSetGoal={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const title = document.getElementById("explorer-card-title")!;
    expect(title).toHaveTextContent("나눗셈 확인");
    expect(title.querySelector("[data-concept-kind]")).toHaveTextContent(
      "성질",
    );
  });
});
