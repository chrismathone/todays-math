import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentReplayDialog from "@/components/math-srs/StudentReplayDialog";
import type { MathSrsReplay } from "@/contracts/mathSrsReplay.contract";

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

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const problem: MathSrsReplay = {
  kind: "elementary",
  step: 2,
  problemId: "55555555-5555-4555-8555-555555555555",
  title: "약수와 배수",
  subtitle: "초5 · 1학기 · 약수와 배수",
  content: "36의 약수 중 두 번째로 작은 수는?",
  figureUrl: null,
  answerChoices: ["2", "3", "4", "6"],
  interactive: null,
  correct: null,
  canRevealSolution: true,
  solution: null,
};
const response = (data: MathSrsReplay) =>
  new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
  });

describe("completed tile replay", () => {
  it("does not create feedback from a response after the request deadline", async () => {
    let resolveLate: (value: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(problem))
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveLate = resolve;
            }),
        ),
    );
    const { container } = render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    const choices = await screen.findByRole("group", {
      name: "복습 답 고르기",
    });
    vi.useFakeTimers();
    try {
      fireEvent.click(within(choices).getAllByRole("button")[0]);
      act(() => vi.advanceTimersByTime(15_000));
      await act(async () => {
        resolveLate(response({ ...problem, correct: true }));
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
  });
  it("does not create an answer effect from a loaded grade", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ ...problem, correct: true })),
    );
    const { container } = render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    await screen.findByRole("group", { name: "복습 답 고르기" });
    expect(sounds.play).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-answer-feedback]"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-question-transition="true"]'),
    ).not.toBeInTheDocument();
  });
  it("keeps the completed day identity while progressing through its review questions", async () => {
    const dayId = "elementary:2026-09-21";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ ...problem, step: 1 }))
      .mockResolvedValueOnce(response({ ...problem, step: 1, correct: true }))
      .mockResolvedValueOnce(
        response({
          ...problem,
          step: 2,
          regenerated: true,
          problemId: "66666666-6666-4666-8666-666666666666",
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <StudentReplayDialog
        kind="elementary"
        step={1}
        dayId={dayId}
        total={2}
        onClose={vi.fn()}
      />,
    );
    const choices = await screen.findByRole("group", {
      name: "복습 답 고르기",
    });
    fireEvent.click(within(choices).getAllByRole("button")[0]);
    fireEvent.click(
      await screen.findByRole("button", { name: "다음 복습 문제" }),
    );
    await screen.findByText(/같은 단원 새 문제/);
    expect(fetcher.mock.calls[0][0]).toContain(
      `dayId=${encodeURIComponent(dayId)}`,
    );
    expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
      "correct",
      `replay:elementary:${dayId}:1:${problem.problemId}:1`,
    );
    expect(sounds.gesture).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      dayId,
      step: 1,
    });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).not.toHaveProperty(
      "recordRetry",
    );
    expect(fetcher.mock.calls[2][0]).toContain(
      `step=2&dayId=${encodeURIComponent(dayId)}`,
    );
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
  });
  it("grades a tapped answer immediately and permits a new choice after the wrong-answer effect", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(problem))
      .mockResolvedValueOnce(response({ ...problem, correct: false }))
      .mockResolvedValueOnce(response({ ...problem, correct: true }))
      .mockResolvedValueOnce(
        response({
          ...problem,
          correct: true,
          solution: {
            answer: "$2$",
            solution: "36의 약수는 1, 2, 3, 4, 6, 9, 12, 18, 36입니다.",
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const onClose = vi.fn();
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={onClose} />,
    );
    const options = await screen.findByRole("group", {
      name: "복습 답 고르기",
    });
    expect(
      document.querySelector('[data-question-transition="true"]'),
    ).not.toBeInTheDocument();
    expect(within(options).getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "정답 확인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(options).getAllByRole("button")[1]);
    expect(await screen.findByText("다시 생각해 보세요")).toBeInTheDocument();
    expect(screen.getByText(problem.content)).toBeVisible();
    expect(screen.queryByText("$2$")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다시 풀기" }),
    ).not.toBeInTheDocument();
    expect(within(options).getAllByRole("button")[0]).toBeDisabled();
    await waitFor(
      () => expect(within(options).getAllByRole("button")[0]).toBeEnabled(),
      { timeout: 2000 },
    );
    expect(within(options).getAllByRole("button")[1]).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(within(options).getAllByRole("button")[0]);
    expect(await screen.findByText("정확하게 풀었어요")).toBeInTheDocument();
    const savedResult = document.querySelector("[data-answer-feedback]");
    expect(savedResult?.closest('[class*="answers"]')).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "복습 풀이" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "풀이 보기" }));
    expect(
      await screen.findByRole("dialog", { name: "복습 풀이" }),
    ).toBeVisible();
    expect(screen.getByText("$2$")).toBeInTheDocument();
    expect(document.querySelector("[data-answer-feedback]")).toBe(savedResult);
    fireEvent.click(screen.getByRole("button", { name: "풀이 닫기" }));
    expect(screen.getByText(problem.content)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "진도판으로" }));
    expect(onClose).toHaveBeenCalledOnce();
    const submitted = fetcher.mock.calls
      .slice(1)
      .map(([, init]) => JSON.parse(init.body));
    expect(submitted).toEqual([
      {
        kind: "elementary",
        step: 2,
        problemId: problem.problemId,
        submittedAnswer: "3",
      },
      {
        kind: "elementary",
        step: 2,
        problemId: problem.problemId,
        submittedAnswer: "2",
      },
      {
        kind: "elementary",
        step: 2,
        problemId: problem.problemId,
        submittedAnswer: "2",
        revealSolution: true,
      },
    ]);
  });

  it("allows fraction pieces and respects the server's solution restriction", async () => {
    const fraction: MathSrsReplay = {
      ...problem,
      interactive: { kind: "fraction-parts", denominator: 4, shape: "bar" },
      canRevealSolution: false,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(fraction))
      .mockResolvedValueOnce(response({ ...fraction, correct: true }));
    vi.stubGlobal("fetch", fetcher);
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    const parts = await screen.findByRole("group", {
      name: "4칸 중 칠할 칸 선택",
    });
    fireEvent.click(within(parts).getAllByRole("button")[0]);
    fireEvent.click(within(parts).getAllByRole("button")[1]);
    expect(fetcher).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "완성했어요" }));
    await screen.findByText("정확하게 풀었어요");
    expect(JSON.parse(fetcher.mock.calls[1][1].body).submittedAnswer).toBe(
      "2/4",
    );
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
  });

  it("blocks duplicate taps while grading and enables answer selection after a server error", async () => {
    let failSubmission: (response: Response) => void = () => {};
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response(problem))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            failSubmission = resolve;
          }),
      )
      .mockResolvedValueOnce(response({ ...problem, correct: true }));
    vi.stubGlobal("fetch", fetcher);
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    const options = await screen.findByRole("group", {
      name: "복습 답 고르기",
    });
    const buttons = within(options).getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    buttons.forEach((button) => expect(button).toBeDisabled());
    failSubmission(
      new Response(
        JSON.stringify({ error: { message: "잠시 후 다시 시도해 주세요." } }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "잠시 후 다시 시도해 주세요.",
    );
    buttons.forEach((button) => expect(button).toBeEnabled());
    fireEvent.click(buttons[0]);
    expect(await screen.findByText("정확하게 풀었어요")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aborts an in-flight request when the replay window is removed", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => {
        signal = init.signal;
        return new Promise(() => {});
      }),
    );
    const { unmount } = render(
      <StudentReplayDialog kind="middle" step={1} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(signal).toBeDefined());
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });
});
