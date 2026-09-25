import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentReplayDialog from "@/components/math-srs/StudentReplayDialog";
import type { MathSrsReplay } from "@/contracts/mathSrsReplay.contract";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));
afterEach(() => vi.unstubAllGlobals());

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
  it("keeps the question and four options in place through a wrong answer, retry and requested solution", async () => {
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
    expect(within(options).getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(options).getAllByRole("button")[1]);
    fireEvent.click(screen.getByRole("button", { name: "정답 확인" }));
    expect(
      await screen.findByText("↻ 한 번 더 생각해 보세요"),
    ).toBeInTheDocument();
    expect(screen.getByText(problem.content)).toBeVisible();
    expect(screen.queryByText("$2$")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 풀기" }));
    fireEvent.click(within(options).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "정답 확인" }));
    expect(await screen.findByText("✓ 정확하게 풀었어요!")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "복습 풀이" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "풀이 보기" }));
    expect(
      await screen.findByRole("dialog", { name: "복습 풀이" }),
    ).toBeVisible();
    expect(screen.getByText("$2$")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "정답 확인" }));
    await screen.findByText("✓ 정확하게 풀었어요!");
    expect(JSON.parse(fetcher.mock.calls[1][1].body).submittedAnswer).toBe(
      "2/4",
    );
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
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
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
