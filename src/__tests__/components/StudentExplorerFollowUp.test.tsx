import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type {
  ExplorerRequest,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
const solution = {
  cardId: "g5-divisor",
  name: "약수",
  definition: "나누어떨어지게 하는 수예요.",
  explanation: "나머지가 없는지 확인해요.",
  note: "",
  examples: [],
  statement: "3은 12의 약수예요.",
  truth: true,
};
function view(
  stage: "again" | "solution" | "next" | "done" = "again",
): ExplorerState {
  const base = explorerView(
    createExplorerState("student-follow-up", 5),
    "2026-10-20",
  );
  return {
    ...base,
    student: { id: "student-follow-up", name: "학생", className: "초5" },
    revision: stage === "again" ? 0 : 1,
    feedback: null,
    session: {
      id: "session-follow-up",
      route: "unit",
      title: "약수와 배수",
      unitId: base.units.find((u) => u.grade === 5)!.id,
      cardIds: base.units.find((u) => u.grade === 5)!.cards.map((c) => c.id),
      index: stage === "next" ? 1 : 0,
      total: 15,
      round: 0,
      continuation: 0,
      done: stage === "done",
      first: 0,
      stars: 0,
      unresolved: [],
      reviewOnly: false,
    },
    currentActivity:
      stage === "done"
        ? null
        : {
            questionId: stage === "next" ? "question-next" : "question-current",
            cardId: "g5-divisor",
            cardName: "약수",
            unitId: base.units.find((u) => u.grade === 5)!.id,
            unitTitle: "약수와 배수",
            kind: "truth",
            prompt:
              stage === "next" ? "다음 문항이에요." : "3은 12의 약수예요.",
            choices: [
              { id: 1, label: "맞아요" },
              { id: 0, label: "아니에요" },
            ],
            ...(stage === "next"
              ? {}
              : { followUp: { state: stage, firstChoiceIds: [0] } }),
            ...(stage === "solution" ? { solution } : {}),
          },
  };
}
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("student explorer follow-up requests and progression", () => {
  it("restores the waiting question, keeps the solution open without a timer, and sends understood before leaving", async () => {
    let stage: "again" | "solution" | "done" = "again";
    const requests: ExplorerRequest[] = [];
    const api = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.body) {
        const body = JSON.parse(String(options.body)) as ExplorerRequest;
        requests.push(body);
        stage = body.action.type === "understood" ? "done" : "solution";
      }
      const data = view(stage);
      if (stage === "solution")
        data.feedback = {
          message: "풀이를 확인해요.",
          correct: false,
          advance: false,
          solution,
        };
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    vi.stubGlobal("fetch", api);
    render(<StudentMathExplorers />);
    await screen.findByText("다시 해 볼까요");
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByRole("heading", { name: "정답과 풀이" });
    expect(requests[0].action).toEqual({
      type: "answer",
      questionId: "question-current",
      choiceIds: [],
    });
    vi.useFakeTimers();
    await act(async () => vi.advanceTimersByTime(10000));
    expect(
      screen.getByRole("heading", { name: "정답과 풀이" }),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "알겠어요" }));
    await waitFor(() =>
      expect(requests[1]?.action).toEqual({
        type: "understood",
        questionId: "question-current",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "정답과 풀이" })).toBeNull(),
    );
    expect(api.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const [, options] of api.mock.calls)
      expect(new Headers(options?.headers).get("x-explorer-follow-up")).toBe(
        "1",
      );
  });
  it("restores an already open solution on initial data without sending an answer", async () => {
    const api = vi.fn();
    vi.stubGlobal("fetch", api);
    render(<StudentMathExplorers initialState={view("solution")} />);
    expect(
      await screen.findByRole("heading", { name: "정답과 풀이" }),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it("shows a second correct answer as 맞았어요, then continues with the existing short transition", async () => {
    const api = vi.fn(async (_url: string, options?: RequestInit) => {
      const data = options?.body ? view("next") : view();
      if (options?.body)
        data.feedback = { message: "맞았어요", correct: true, advance: true };
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    vi.stubGlobal("fetch", api);
    render(<StudentMathExplorers />);
    await screen.findByText("다시 해 볼까요");
    fireEvent.keyDown(document, { key: "2" });
    await screen.findByText("맞았어요");
    expect(
      await screen.findByRole(
        "heading",
        { name: "다음 문항이에요." },
        { timeout: 2500 },
      ),
    ).toBeInTheDocument();
  });
});
