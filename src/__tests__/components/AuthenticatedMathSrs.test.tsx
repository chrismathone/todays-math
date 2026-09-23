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
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import * as api from "@/components/math-srs/mathSrsApi";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math-srs/mathSrsApi", () => ({
  fetchMathSrs: vi.fn(),
  startMathSrs: vi.fn(),
  submitMathSrsAttempt: vi.fn(),
  revealMathSrsHint: vi.fn(),
  fetchClassMathSrs: vi.fn(),
}));

const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const unitId = "33333333-3333-4333-8333-333333333333";
const missionId = "44444444-4444-4444-8444-444444444444";
function state(mission: MathSrsPublicMission | null = null): MathSrsState {
  return {
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
      prompt: "$3x=1$을 풀어라.",
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
  vi.mocked(api.fetchMathSrs).mockResolvedValue({ ok: true, data: state() });
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
      screen.queryByRole("button", { name: "오늘의 미션 시작" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "다시 불러오기" }),
    );
    expect(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    ).toBeEnabled();
    expect(screen.getAllByText("측정 전")).toHaveLength(6);
    expect(screen.getByText("일차방정식의 풀이")).toBeInTheDocument();
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

  it("validates a numeric answer, waits for the saved hint, then renders exact fraction feedback", async () => {
    const user = userEvent.setup();
    const initial = mission();
    vi.mocked(api.startMathSrs).mockResolvedValue({
      ok: true,
      data: state(initial),
    });
    const hinted = structuredClone(initial);
    hinted.problems[0].hint = "양변을 $3$으로 나누세요.";
    vi.mocked(api.revealMathSrsHint).mockResolvedValue({
      ok: true,
      data: state(hinted),
    });
    const graded = mission(1);
    graded.attempts[0].usedHint = true;
    graded.attempts[0].rating = "hard";
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
      ok: true,
      data: state(graded),
    });
    const view = render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    await user.type(screen.getByLabelText("나의 답"), "1/0");
    await user.click(screen.getByRole("button", { name: "정답 확인" }));
    expect(screen.getByRole("alert")).toHaveTextContent("분모는 0");
    expect(api.submitMathSrsAttempt).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "힌트 보기" }));
    expect(
      await screen.findByRole("button", { name: "힌트를 확인했어요" }),
    ).toBeDisabled();
    expect(api.revealMathSrsHint).toHaveBeenCalledWith({
      missionId,
      problemId: initial.problems[0].id,
    });
    await user.clear(screen.getByLabelText("나의 답"));
    await user.type(screen.getByLabelText("나의 답"), "1/3");
    await user.click(screen.getByRole("button", { name: "정답 확인" }));
    expect(
      await screen.findByRole("heading", { name: "잘 풀었어요!" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("힌트를 참고한 풀이로 기록했어요."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(view.container.querySelector(".katex")).not.toBeNull(),
    );
    expect(screen.queryByText("0.3333333333333333")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
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
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    await user.type(screen.getByLabelText("나의 답"), "1/3");
    await user.click(screen.getByRole("button", { name: "정답 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결되지 않았습니다",
    );
    const first = vi.mocked(api.submitMathSrsAttempt).mock.calls[0][0];
    await user.dblClick(screen.getByRole("button", { name: "정답 확인" }));
    expect(api.submitMathSrsAttempt).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.submitMathSrsAttempt).mock.calls[1][0]).toEqual(first);
    await act(async () => finish({ ok: true, data: state(mission(1)) }));
    expect(
      await screen.findByRole("heading", { name: "잘 풀었어요!" }),
    ).toBeInTheDocument();
  });

  it("keeps the previous day's final feedback before showing its result", async () => {
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
    finished.attempts[11].submittedAnswer = "";
    finished.attempts[11].correct = false;
    finished.attempts[11].rating = "again";
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
      ok: true,
      data: state(finished),
    });
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: "미션 이어하기 · 11/12" }),
    );
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(
      await screen.findByRole("heading", {
        name: "풀이를 보며 다시 생각해 봐요.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "미션을 마쳤어요" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "미션 결과 보기" }));
    expect(
      screen.getByRole("heading", { name: "미션을 마쳤어요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("11 / 12")).toBeInTheDocument();
    expect(api.startMathSrs).toHaveBeenCalledTimes(1);
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
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다른 화면");
    expect(screen.getByLabelText("나의 답")).toBeDisabled();
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(mission(1)),
    });
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(await screen.findByLabelText("나의 답")).toBeEnabled();
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
