import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
import { ClassMathSrs } from "@/components/math-srs/ClassMathSrs";
import type {
  MathSrsPublicMission,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import { createMemories } from "@/lib/math-srs/memory";
import { kstDateOf } from "@/lib/kstDate";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import * as api from "@/components/math-srs/mathSrsApi";
import { effectAppears } from "../helpers/answerFeedback";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-srs/mathSrsApi", () => ({
  fetchMathSrs: vi.fn(),
  startMathSrs: vi.fn(),
  submitMathSrsAttempt: vi.fn(),
  revealMathSrsHint: vi.fn(),
  submitMathSrsReplay: vi.fn(),
  fetchClassMathSrs: vi.fn(),
}));

const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const unitId = "33333333-3333-4333-8333-333333333333";
const missionId = "44444444-4444-4444-8444-444444444444";
function state(mission: MathSrsPublicMission | null = null): MathSrsState {
  const complete =
    !!mission?.completedAt &&
    mission.attempts.every(
      (a) =>
        a.correct || mission.resolvedRetryProblemIds?.includes(a.problemId),
    );
  return {
    journey: {
      completedDays: complete ? 1 : 0,
      todayComplete: complete && mission?.date === kstDateOf(new Date()),
      todayAnswered: mission?.attempts.length ?? 0,
      todayGoal: 12,
      days: complete
        ? [
            {
              id: `middle:${mission!.date}`,
              date: mission!.date,
              completedAt: mission!.completedAt!,
              title: "등식의 성질",
              subtitle: "중1 · 일차방정식",
              reviewCount: 12,
            },
          ]
        : [],
      upcoming: [{ title: "등식의 성질", subtitle: "중1 · 일차방정식" }],
    },
    student: {
      id: studentId,
      name: "실제 학생",
      classId,
      className: "중1 A반",
    },
    revision: 0,
    memories: createMemories(),
    mission,
    recentMissions: [],
    currentProgress: {
      unitId,
      section: "일차방정식의 풀이",
      recordedAt: "2026-09-21",
      source: "individual",
    },
    lectures: [],
    available: true,
  };
}
function mission(answered = 0): MathSrsPublicMission {
  const problems: MathSrsPublicMission["problems"] = Array.from(
    { length: 12 },
    (_, i) => ({
      id: `55555555-5555-4555-8555-${String(i + 1).padStart(12, "0")}`,
      templateId: "m1-equation",
      conceptId: "balance",
      conceptWeights: [{ conceptId: "balance", weight: 1 }],
      difficulty: 1,
      kind: "warmup",
      prompt: `${i + 1}번. $3x=1$을 풀어라.`,
      answerChoices: ["$\\frac{1}{3}$", "$\\frac{2}{3}$", "$-1$", "$3$"],
      equation: "",
      hint: null,
      feedback:
        i < answered
          ? {
              answer: 1 / 3,
              answerText: "$\\frac{1}{3}$",
              solution: ["$x=\\frac{1}{3}$"],
            }
          : null,
      expectedSeconds: 30,
    }),
  );
  return {
    id: missionId,
    date: "2026-09-21",
    startedAt: "2026-09-21T08:00:00.000Z",
    completedAt: answered === 12 ? "2026-09-21T08:10:00.000Z" : null,
    problems,
    attempts: problems.slice(0, answered).map((problem) => ({
      problemId: problem.id,
      templateId: problem.templateId,
      conceptId: problem.conceptId,
      kind: problem.kind,
      submittedAnswer: "1/3",
      correct: true,
      rating: "good",
      usedHint: false,
      elapsedSeconds: 20,
      answeredAt: "2026-09-21T08:10:00.000Z",
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(api.fetchMathSrs).mockResolvedValue({ ok: true, data: state() });
});

describe("embedded expedition algebra activity", () => {
  it("resumes the server lesson directly without a separate home", async () => {
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission(2)),
    });
    const onExit = vi.fn();
    render(<StudentMathSrs expedition={{ onExit, onComplete: vi.fn() }} />);
    expect(
      await screen.findByRole("group", { name: "답 고르기" }),
    ).toBeVisible();
    expect(api.startMathSrs).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "전체 학습 진도" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /학습 홈/ }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe("account-based math practice", () => {
  it("shows storage setup failure without inventing local progress, and retries", async () => {
    vi.mocked(api.fetchMathSrs).mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: "저장소 준비 중",
    });
    render(<StudentMathSrs />);
    expect(await screen.findByRole("alert")).toHaveTextContent("선생님께 알려");
    expect(
      screen.queryByRole("button", { name: "오늘의 복습 시작" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "다시 불러오기" }),
    );
    expect(
      await screen.findByRole("button", { name: "오늘의 복습 시작" }),
    ).toBeEnabled();
    expect(screen.getAllByText("측정 전")).toHaveLength(6);
    expect(screen.getByText("일차방정식의 풀이")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "복습 진행" }),
    ).toHaveAttribute("value", "0");
  });

  it.each([
    [401, "로그인이 필요합니다.", "/learn/login"],
    [403, STUDENT_MUST_CHANGE_MESSAGE, "/learn/password"],
  ])("reuses the student redirect for %s", async (status, message, target) => {
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: false,
      status: status as number,
      message: message as string,
    });
    render(<StudentMathSrs />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(target));
  });

  it("does not mistake a different forbidden response for a password change", async () => {
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: false,
      status: 403,
      message: "허용되지 않은 요청입니다.",
    });
    render(<StudentMathSrs />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "허용되지 않은 요청",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("grades a choice immediately, holds the problem for the overlay, then advances without revealing the answer", async () => {
    const user = userEvent.setup();
    const initial = mission();
    vi.mocked(api.startMathSrs).mockResolvedValue({
      ok: true,
      data: state(initial),
    });
    let finish!: (
      value: Awaited<ReturnType<typeof api.submitMathSrsAttempt>>,
    ) => void;
    vi.mocked(api.submitMathSrsAttempt).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 복습 시작" }),
    );
    const question = screen.getByRole("region", { name: "현재 문제" });
    const choices = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    expect(choices).toHaveLength(4);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "정답 확인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "힌트 보기" }),
    ).not.toBeInTheDocument();
    await user.click(choices[0]);
    expect(api.submitMathSrsAttempt).toHaveBeenCalledTimes(1);
    expect(api.submitMathSrsAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedAnswer: "$\\frac{1}{3}$",
        rating: "good",
      }),
    );
    expect(choices.every((choice) => choice.hasAttribute("disabled"))).toBe(
      true,
    );
    expect(screen.queryByText("정확하게 풀었어요")).not.toBeInTheDocument();
    const graded = mission(1);
    graded.problems[0].feedback = null;
    await act(async () => finish({ ok: true, data: state(graded) }));
    expect(await screen.findByText("정확하게 풀었어요")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "현재 문제" })).toBe(question);
    expect(screen.queryByText("이렇게 풀어요")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다음 문제" }),
    ).not.toBeInTheDocument();
    await waitFor(
      () =>
        expect(screen.getByRole("region", { name: "현재 문제" })).not.toBe(
          question,
        ),
      { timeout: 2200 },
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    ).toBeEnabled();
  });

  it("retries the exact submission after a lost response, and blocks a duplicate click", async () => {
    const user = userEvent.setup();
    vi.mocked(api.startMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission()),
    });
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValueOnce({
      ok: false,
      status: 0,
      message: "연결되지 않았습니다.",
    });
    let finish!: (
      value: Awaited<ReturnType<typeof api.submitMathSrsAttempt>>,
    ) => void;
    vi.mocked(api.submitMathSrsAttempt).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 복습 시작" }),
    );
    const answer = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button")[0];
    await user.click(answer);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결되지 않았습니다",
    );
    const first = vi.mocked(api.submitMathSrsAttempt).mock.calls[0][0];
    await user.dblClick(answer);
    expect(api.submitMathSrsAttempt).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.submitMathSrsAttempt).mock.calls[1][0]).toEqual(first);
    await act(async () => finish({ ok: true, data: state(mission(1)) }));
    expect(await screen.findByText("정확하게 풀었어요")).toBeInTheDocument();
  });

  it("collects wrong answers after the first pass and regrades them without changing the saved progress", async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission(11)),
    });
    vi.mocked(api.startMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission(11)),
    });
    const finished = mission(12);
    finished.attempts[11].submittedAnswer = "3";
    finished.attempts[11].correct = false;
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
      ok: true,
      data: state(finished),
    });
    const replay = {
      kind: "middle" as const,
      step: 12,
      problemId: finished.problems[11].id,
      title: "등식의 성질",
      subtitle: "중1",
      content: finished.problems[11].prompt,
      figureUrl: null,
      answerChoices: finished.problems[11].answerChoices!,
      interactive: null,
      canRevealSolution: true,
      solution: null,
    };
    vi.mocked(api.submitMathSrsReplay)
      .mockResolvedValueOnce({ ok: true, data: { ...replay, correct: false } })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          ...replay,
          correct: true,
          journey: state({
            ...finished,
            resolvedRetryProblemIds: [finished.problems[11].id],
          }).journey,
        },
      });
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "이어서 학습하기" }),
    );
    // 연출은 1.2초 뒤 사라진다 — 누르기 전에 걸어 둔다(helpers/answerFeedback)
    const wrongFirst = effectAppears();
    await user.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[3],
    );
    expect(await wrongFirst).toHaveTextContent("다시 생각해 볼 문제예요");
    expect(
      screen.queryByRole("heading", { name: "미션을 마쳤어요" }),
    ).not.toBeInTheDocument();
    await screen.findByText("모아 둔 오답 다시 풀기", {}, { timeout: 2200 });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "12");
    const wrongRetry = effectAppears();
    await user.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[3],
    );
    expect(await wrongRetry).toHaveTextContent("아직 해결하지 못했어요");
    expect(api.submitMathSrsReplay).toHaveBeenCalledWith(
      expect.objectContaining({
        missionId,
        step: 12,
        problemId: finished.problems[11].id,
        submittedAnswer: "$3$",
      }),
    );
    await waitFor(
      () =>
        expect(
          within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
            "button",
          )[0],
        ).toBeEnabled(),
      { timeout: 2200 },
    );
    const rightRetry = effectAppears();
    await user.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    );
    expect(await rightRetry).toHaveTextContent("이번에는 해결했어요");
    expect(screen.queryByText("이렇게 풀어요")).not.toBeInTheDocument();
    await screen.findByRole(
      "heading",
      { name: "전체 학습 진도" },
      { timeout: 2200 },
    );
    expect(
      screen.queryByRole("heading", { name: "미션을 마쳤어요" }),
    ).not.toBeInTheDocument();
    expect(api.submitMathSrsAttempt).toHaveBeenCalledTimes(1);
    expect(api.submitMathSrsReplay).toHaveBeenCalledTimes(2);
  });

  it("keeps a completed today's mission in the same card hierarchy", async () => {
    const today = mission(12);
    today.date = kstDateOf(new Date());
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(today),
    });
    render(<StudentMathSrs />);
    expect(
      await screen.findByText("오늘의 복습을 마쳤어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "오늘의 결과 보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "전체 학습 진도" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "복습 진행" }),
    ).toHaveAttribute("value", "12");
  });

  it("restores unfinished wrong-answer practice after leaving and reloading, then unlocks review after it is solved", async () => {
    const user = userEvent.setup();
    const finished = mission(12);
    finished.date = kstDateOf(new Date());
    finished.attempts[0].correct = false;
    finished.attempts[1].correct = false;
    finished.resolvedRetryProblemIds = [finished.problems[0].id];
    localStorage.setItem(
      `math-srs-resolved-retries:${studentId}:${missionId}`,
      JSON.stringify([1, 2]),
    );
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(finished),
    });
    vi.mocked(api.submitMathSrsReplay).mockResolvedValue({
      ok: true,
      data: {
        kind: "middle",
        step: 2,
        problemId: finished.problems[1].id,
        title: "등식",
        subtitle: "중1",
        content: finished.problems[1].prompt,
        figureUrl: null,
        answerChoices: finished.problems[1].answerChoices!,
        interactive: null,
        correct: true,
        canRevealSolution: true,
        solution: null,
      },
    });
    const first = render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오답 다시 풀기 · 1문제" }),
    );
    expect(screen.getByText("모아 둔 오답 다시 풀기")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "학습 홈" }));
    expect(
      await screen.findByRole("button", { name: "오답 다시 풀기 · 1문제" }),
    ).toBeInTheDocument();
    first.unmount();
    const second = render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오답 다시 풀기 · 1문제" }),
    );
    const resumedRetry = effectAppears();
    await user.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    );
    expect(await resumedRetry).toHaveTextContent("이번에는 해결했어요");
    expect(api.submitMathSrsReplay).toHaveBeenCalledWith(
      expect.objectContaining({ step: 2, recordRetry: true }),
    );
    second.unmount();
    finished.resolvedRetryProblemIds.push(finished.problems[1].id);
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(finished),
    });
    render(<StudentMathSrs />);
    expect(
      await screen.findByText("오늘의 복습을 마쳤어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("오답 다시 풀기 · 1문제"),
    ).not.toBeInTheDocument();
    expect(api.submitMathSrsAttempt).not.toHaveBeenCalled();
  });

  it("requires a refresh after an ordered-attempt conflict and resumes from server progress", async () => {
    const user = userEvent.setup();
    vi.mocked(api.startMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission()),
    });
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
      ok: false,
      status: 409,
      message: "이미 변경된 기록입니다.",
    });
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 복습 시작" }),
    );
    await user.click(screen.getByText("아직 모르겠어요"));
    expect(await screen.findByRole("alert")).toHaveTextContent("다른 화면");
    expect(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    ).toBeDisabled();
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission(1)),
    });
    await user.click(
      within(screen.getByRole("alert")).getByRole("button", {
        name: "다시 불러오기",
      }),
    );
    expect(
      within(
        await screen.findByRole("group", { name: "답 고르기" }),
      ).getAllByRole("button")[0],
    ).toBeEnabled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
  });
});

it("shows the actual class roster, individual progress, and unassessed concepts", async () => {
  vi.mocked(api.fetchClassMathSrs).mockResolvedValue({
    ok: true,
    data: {
      class: { id: classId, name: "중1 A반" },
      students: [
        {
          id: studentId,
          name: "등록 학생",
          hasAccount: false,
          memories: createMemories(),
          today: null,
          lastPracticedAt: null,
          currentProgress: state().currentProgress,
        },
      ],
      available: true,
    },
  });
  render(<ClassMathSrs classId={classId} />);
  const student = await screen.findByRole("region", {
    name: "등록 학생 학습 현황",
  });
  expect(within(student).getAllByText("측정 전")).toHaveLength(6);
  expect(within(student).getByText("계정 발급 필요")).toBeInTheDocument();
  expect(within(student).getByText("오늘 학습 기록 없음")).toBeInTheDocument();
  expect(within(student).getByText("일차방정식의 풀이")).toBeInTheDocument();
  expect(api.fetchClassMathSrs).toHaveBeenCalledWith(classId);
});

it("combines teacher name search with real learning status and resets an empty result", async () => {
  const user = userEvent.setup();
  const base = {
    memories: createMemories(),
    lastPracticedAt: null,
    currentProgress: null,
  };
  const today = {
    id: missionId,
    date: "2026-09-21",
    startedAt: "2026-09-21T08:00:00.000Z",
    total: 12 as const,
    answered: 4,
    correct: 3,
    completedAt: null,
  };
  vi.mocked(api.fetchClassMathSrs).mockResolvedValue({
    ok: true,
    data: {
      class: { id: classId, name: "중1 A반" },
      students: [
        {
          ...base,
          id: "waiting",
          name: "김하루",
          hasAccount: false,
          today: null,
        },
        { ...base, id: "practicing", name: "이수학", hasAccount: true, today },
        {
          ...base,
          id: "completed",
          name: "김수학",
          hasAccount: true,
          today: {
            ...today,
            answered: 12,
            correct: 10,
            completedAt: "2026-09-21T08:10:00.000Z",
          },
        },
      ],
      available: true,
    },
  });
  render(<ClassMathSrs classId={classId} />);
  await screen.findByRole("region", { name: "김하루 학습 현황" });
  const filters = screen.getByRole("group", { name: "학습 상태 필터" });
  await user.click(within(filters).getByRole("button", { name: "학습 중 1" }));
  expect(
    screen.getByRole("region", { name: "이수학 학습 현황" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "김수학 학습 현황" }),
  ).not.toBeInTheDocument();
  await user.type(
    screen.getByRole("searchbox", { name: "학생 이름 검색" }),
    " 김 ",
  );
  expect(screen.getByText("조건에 맞는 학생이 없어요.")).toBeInTheDocument();
  // Counts describe the entire roster, even when the name query has no match.
  expect(
    within(filters).getByRole("button", { name: "완료 1" }),
  ).toBeInTheDocument();
  await user.click(within(filters).getByRole("button", { name: "완료 1" }));
  expect(
    screen.getByRole("region", { name: "김수학 학습 현황" }),
  ).toBeInTheDocument();
  await user.click(
    within(filters).getByRole("button", { name: "계정 미발급 1" }),
  );
  expect(
    screen.getByRole("region", { name: "김하루 학습 현황" }),
  ).toBeInTheDocument();
  await user.click(within(filters).getByRole("button", { name: "미학습 1" }));
  expect(
    screen.getByRole("region", { name: "김하루 학습 현황" }),
  ).toBeInTheDocument();
  await user.clear(screen.getByRole("searchbox", { name: "학생 이름 검색" }));
  await user.type(
    screen.getByRole("searchbox", { name: "학생 이름 검색" }),
    "없는 학생",
  );
  await user.click(screen.getByRole("button", { name: "필터 초기화" }));
  expect(screen.getByRole("searchbox", { name: "학생 이름 검색" })).toHaveValue(
    "",
  );
  expect(
    within(filters).getByRole("button", { name: "전체 3" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("region", { name: "김하루 학습 현황" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "이수학 학습 현황" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "김수학 학습 현황" }),
  ).toBeInTheDocument();
});
