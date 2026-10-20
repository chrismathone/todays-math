import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ElementaryPractice from "@/components/math-srs/ElementaryPractice";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";
import type {
  CourseAttempt,
  CourseProblem,
  CourseSection,
  CourseSession,
} from "@/lib/math-srs/elementary/types";

const section: CourseSection = {
  id: "course-fractions",
  grade: 3,
  semester: 1,
  chapterId: "g3-fractions",
  chapterTitle: "분수와 소수",
  title: "분수 알아보기",
  order: 1,
  unit: {
    grade: "초3",
    chapter: "1-6 분수와 소수",
    section: "1-6-1 분수 알아보기",
    orderIndex: 1,
  },
};
const first: CourseProblem = {
  id: "course-first",
  sectionId: section.id,
  tier: "기본",
  seed: 42,
  content: "1을 2로 나눈 값을 구하세요.",
  answer: "$\\frac{1}{2}$",
  solution:
    "전체를 똑같이 나눈 부분은 2개이고, 그중 1개이므로 $\\frac{1}{2}$입니다.",
  figureSpec: null,
  input: {
    mode: "number",
    label: "나의 답",
    placeholder: "예: 1/2",
    help: "분수는 1/2처럼 입력해 주세요.",
  },
};
const second: CourseProblem = {
  ...first,
  id: "course-second",
  seed: 43,
  content: "3과 5를 더하세요.",
  answer: "$8$",
  solution: "$3+5=8$입니다.",
};
const baseSession: CourseSession = {
  id: "course-practice",
  sectionId: section.id,
  mode: "learn",
  problems: [first, second],
  attempts: [],
  startedAt: "2026-09-23T00:00:00.000Z",
  completedAt: null,
};

function UpdatingParent({
  initial = baseSession,
  record,
  hint,
  next,
}: {
  initial?: CourseSession;
  record: (attempt: CourseAttempt) => boolean;
  hint?: (id: string) => boolean;
  next?: () => void;
}) {
  const [session, setSession] = useState(initial);
  return (
    <ElementaryPractice
      session={session}
      section={section}
      onAttempt={(attempt) => {
        if (!record(attempt)) return false;
        setSession((previous) => ({
          ...previous,
          attempts: [...previous.attempts, attempt],
          completedAt:
            previous.attempts.length + 1 === previous.problems.length
              ? attempt.answeredAt
              : null,
        }));
        return true;
      }}
      onHint={(id) => {
        if (hint && !hint(id)) return false;
        setSession((previous) => ({
          ...previous,
          hintedProblemIds: [...(previous.hintedProblemIds ?? []), id],
        }));
        return true;
      }}
      onExit={vi.fn()}
      onContinue={next ?? vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("elementary practice", () => {
  it("validates keyboard answers and keeps feedback until Next despite parent progress updates", async () => {
    const user = userEvent.setup();
    const record = vi.fn(() => true);
    const next = vi.fn();
    render(<UpdatingParent record={record} next={next} />);
    const input = screen.getByLabelText("나의 답");
    expect(input).toHaveFocus();
    expect(screen.queryByText(first.solution)).not.toBeInTheDocument();
    await user.type(input, "1/0{Enter}");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(record).not.toHaveBeenCalled();
    await user.clear(input);
    expect(input).toHaveAttribute("aria-invalid", "false");
    await user.type(input, "1/2{Enter}");
    expect(record).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        correct: true,
        usedHint: false,
        selfAssessed: false,
        submittedAnswer: "1/2",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "정확하게 풀었어요" }),
    ).toHaveFocus();
    expect(screen.queryByText(second.content)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(screen.getByText(second.content)).toBeInTheDocument();
    expect(screen.getByLabelText("나의 답")).toHaveFocus();
    await user.type(screen.getByLabelText("나의 답"), "8{Enter}");
    expect(
      screen.queryByText("차근차근, 오늘도 배웠어요."),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "이번 학습 마치기" }));
    expect(
      screen.getByRole("heading", { name: "차근차근, 오늘도 배웠어요." }),
    ).toHaveFocus();
    expect(
      screen.getByRole("listitem", { name: "1번: 정답" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음 학습으로" }));
    expect(next).toHaveBeenCalledOnce();
  });

  it("requires explicit solution reveal and records self-check separately from automatic grading", async () => {
    const user = userEvent.setup();
    const record = vi.fn(() => true);
    const hint = vi.fn(() => true);
    const selfCheck: CourseProblem = {
      ...first,
      input: { ...first.input, mode: "self-check" },
      answer: "⑴ 3 ⑵ 5",
      solution: "각 도형의 변을 하나씩 세어 비교합니다.",
    };
    render(
      <UpdatingParent
        initial={{ ...baseSession, problems: [selfCheck] }}
        record={record}
        hint={hint}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "맞았어요" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(selfCheck.solution)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/나의 답 또는 풀이 메모/), "3, 5");
    await user.click(
      screen.getByRole("button", { name: "다 풀었어요 · 정답 확인" }),
    );
    expect(record).not.toHaveBeenCalled();
    expect(hint).not.toHaveBeenCalled();
    expect(screen.getByText(selfCheck.solution)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "연습장의 풀이와 비교해 보세요." }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "맞았어요" }));
    expect(record).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        correct: true,
        selfAssessed: true,
        usedHint: false,
        submittedAnswer: "3, 5",
      }),
    );
    await user.click(screen.getByRole("button", { name: "이번 학습 마치기" }));
    expect(screen.getByText("직접 확인한 문제")).toBeInTheDocument();
    expect(screen.queryByText("자동 채점 정답")).not.toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "1번: 스스로 확인" }),
    ).toBeInTheDocument();
  });

  it("persists help before revealing an automatic answer and restores its helped status", async () => {
    const user = userEvent.setup();
    const record = vi.fn(() => true);
    const hint = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const view = render(<UpdatingParent record={record} hint={hint} />);
    await user.click(screen.getByRole("button", { name: "풀이 보기" }));
    expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했어요");
    expect(
      screen.queryByText("풀이를 참고한 문제로 기록해요."),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "풀이 보기" }));
    expect(hint).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText("풀이를 참고한 문제로 기록해요."),
    ).toBeInTheDocument();
    view.unmount();
    render(
      <UpdatingParent
        initial={{ ...baseSession, hintedProblemIds: [first.id] }}
        record={record}
      />,
    );
    expect(
      screen.getByRole("button", { name: "풀이를 확인했어요" }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText("나의 답"), "1/2{Enter}");
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ usedHint: true, correct: true }),
    );
    expect(
      screen.getByRole("heading", { name: "풀이를 보고 확인했어요." }),
    ).toBeInTheDocument();
  });

  it("blocks incomplete figures, offers retry, and enables answering only after a trusted SVG response", async () => {
    const user = userEvent.setup();
    const fetchFigure = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          '<svg viewBox="0 0 100 100"><title>문제 도형</title><path d="M0 0L100 100"/></svg>',
          {
            headers: { "content-type": "image/svg+xml" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchFigure);
    const record = vi.fn(() => true);
    render(
      <UpdatingParent
        initial={{
          ...baseSession,
          problems: [{ ...first, figureSpec: { type: "triangle" } }],
        }}
        record={record}
      />,
    );
    expect(screen.getByLabelText("나의 답")).toBeDisabled();
    await screen.findByRole("button", { name: "그림 다시 불러오기" });
    expect(screen.getByRole("button", { name: "정답 확인" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "풀이 보기" })).toBeDisabled();
    expect(record).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "그림 다시 불러오기" }),
    );
    await waitFor(() => expect(screen.getByLabelText("나의 답")).toBeEnabled());
    expect(screen.getByTitle("문제 도형")).toBeInTheDocument();
    expect(fetchFigure).toHaveBeenCalledWith(
      expect.stringContaining(
        "/lab/math-srs/figure?sectionId=course-fractions&seed=42&tier=",
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const figureUrl = new URL(fetchFigure.mock.calls[0][0], "http://localhost");
    expect(figureUrl.searchParams.get("spec")).toBe(
      courseFigureFingerprint({ type: "triangle" }),
    );
    await user.type(screen.getByLabelText("나의 답"), "1/2{Enter}");
    expect(record).toHaveBeenCalledOnce();
  });

  it("keeps a rejected attempt editable and prevents duplicate accepted submissions", async () => {
    const user = userEvent.setup();
    const record = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    render(<UpdatingParent record={record} />);
    const input = screen.getByLabelText("나의 답");
    await user.type(input, "1/2{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("저장하지 못했어요");
    expect(input).toHaveFocus();
    expect(input).toHaveValue("1/2");
    await user.keyboard("{Enter}{Enter}");
    expect(record).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("heading", { name: "정확하게 풀었어요" }),
    ).toBeInTheDocument();
  });
});
