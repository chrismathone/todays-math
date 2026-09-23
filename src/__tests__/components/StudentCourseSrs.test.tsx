import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoursePlanForm from "@/components/math-srs/CoursePlanForm";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import type {
  CoursePublicSession,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
} from "@/lib/math-srs/elementary/catalog";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import * as api from "@/components/math-srs/courseApi";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math-srs/courseApi", () => ({
  getCourseState: vi.fn(),
  saveOwnCoursePlan: vi.fn(),
  startCourse: vi.fn(),
  answerCourse: vi.fn(),
  hintCourse: vi.fn(),
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({
    content,
    figureSvg,
  }: {
    content: string;
    figureSvg?: string;
  }) => (
    <div>
      {content}
      {figureSvg ? <span>서버 그림 표시</span> : null}
    </div>
  ),
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));
const section = COURSE_SECTIONS[1];
const now = "2026-09-23T01:00:00.000Z";
function session(answered = 0): CoursePublicSession {
  const problems: CoursePublicSession["problems"] = Array.from(
    { length: 5 },
    (_, index) => ({
      id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
      sectionId: section.id,
      tier: "기본",
      content: `문제 ${index + 1}: 1 + 1`,
      figureUrl: null,
      input: {
        mode: "number" as const,
        label: "나의 답",
        placeholder: "답 입력",
        help: "숫자로 적어 주세요.",
      },
      hint: null,
      feedback:
        index < answered
          ? { answer: "2", solution: "서버가 알려 준 풀이", correct: true }
          : null,
    }),
  );
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: section.id,
    mode: "learn",
    startedAt: now,
    completedAt: answered === 5 ? now : null,
    problems,
    attempts: problems.slice(0, answered).map((problem) => ({
      problemId: problem.id,
      submittedAnswer: "2",
      correct: true,
      usedHint: false,
      selfAssessed: false,
      answeredAt: now,
    })),
  };
}
function state(run: CoursePublicSession | null = null): CourseStudentState {
  return {
    student: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "실제 학생",
      classId: "22222222-2222-4222-8222-222222222222",
      className: "초등 A반",
    },
    revision: 7,
    plan: {
      startSectionId: section.id,
      dailyQuestionCount: 10,
      enabled: true,
      configuredAt: now,
    },
    summary: {
      status: "ready",
      currentSectionId: section.id,
      dueCount: 2,
      todayAnswered: run?.attempts.length ?? 0,
      todayCorrect: run?.attempts.length ?? 0,
      todayGoal: 10,
      completedSections: 3,
      lastPracticedAt: now,
      nextReviewAt: "2026-09-25T01:00:00.000Z",
      recommendation: {
        sectionId: section.id,
        mode: run && !run.completedAt ? "resume" : "learn",
        reason: "이제 다음 소단원을 배울 차례예요.",
      },
    },
    session: run,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: state() });
  vi.mocked(api.startCourse).mockResolvedValue({
    ok: true,
    data: state(session()),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("shared course plan", () => {
  it("moves focus into settings and returns it to the opener on Escape", async () => {
    render(<StudentCourseSrs />);
    const opener = await screen.findByRole("button", { name: /학습 설정/ });
    await userEvent.click(opener);
    expect(screen.getByRole("heading", { name: "학습 설정" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByRole("heading", { name: "학습 설정" }),
    ).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("keeps the exact saved section when only the goal is changed", async () => {
    const saved = state();
    const onSave = vi.fn();
    render(
      <CoursePlanForm
        plan={saved.plan}
        revision={saved.revision}
        onSave={onSave}
      />,
    );
    expect(screen.getByLabelText("소단원")).toHaveValue(section.id);
    await userEvent.selectOptions(screen.getByLabelText("하루 학습량"), "15");
    await userEvent.click(
      screen.getByRole("button", { name: "학습 설정 저장" }),
    );
    expect(onSave).toHaveBeenCalledWith({
      startSectionId: section.id,
      dailyQuestionCount: 15,
      enabled: true,
      expectedRevision: 7,
    });
  });

  it("requires each curriculum choice and does not silently select the first section", async () => {
    const onSave = vi.fn();
    render(<CoursePlanForm plan={null} revision={0} onSave={onSave} />);
    expect(screen.getByLabelText("학년")).toHaveValue("");
    expect(screen.getByLabelText("하루 학습량")).toHaveValue("10");
    expect(
      screen.queryByRole("option", { name: "초등 2학년" }),
    ).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("학년"), "3");
    await userEvent.selectOptions(screen.getByLabelText("학기"), "1");
    await userEvent.selectOptions(
      screen.getByLabelText("단원"),
      COURSE_CHAPTERS[0].id,
    );
    expect(screen.getByLabelText("소단원")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "학습 설정 저장" }),
    ).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText("소단원"), section.id);
    await userEvent.selectOptions(screen.getByLabelText("학년"), "4");
    expect(screen.getByLabelText("학기")).toHaveValue("");
    expect(screen.getByLabelText("소단원")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "학습 설정 저장" }),
    ).toBeDisabled();
  });

  it("resets to the authoritative selection when a new revision arrives", () => {
    const props = { plan: state().plan, revision: 1, onSave: vi.fn() };
    const { rerender } = render(<CoursePlanForm {...props} />);
    fireEvent.change(screen.getByLabelText("학년"), { target: { value: "6" } });
    rerender(<CoursePlanForm {...props} revision={2} />);
    expect(screen.getByLabelText("소단원")).toHaveValue(section.id);
  });
});

describe("student course home", () => {
  it("uses the signed-in student, server recommendation, real progress and navigation", async () => {
    render(<StudentCourseSrs />);
    expect(await screen.findByText("실제 학생 · 초등 A반")).toBeInTheDocument();
    expect(
      screen.getByText("이제 다음 소단원을 배울 차례예요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "오늘 목표 진행" }),
    ).toHaveAttribute("max", "10");
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개념 강의" })).toHaveAttribute(
      "href",
      "/learn",
    );
    expect(
      screen.getByRole("link", { name: "중등 일차방정식 연습" }),
    ).toHaveAttribute("href", "/learn/math-srs/algebra");
    expect(screen.queryByText(/기억률|%/)).not.toBeInTheDocument();
  });

  it.each(["setup", "paused", "done", "complete"] as const)(
    "shows %s without starting unrequested work",
    async (status) => {
      const saved = state();
      saved.summary.status = status;
      saved.summary.recommendation = null;
      if (status === "setup") saved.plan = null;
      if (status === "paused") saved.plan!.enabled = false;
      vi.mocked(api.getCourseState).mockResolvedValue({
        ok: true,
        data: saved,
      });
      render(<StudentCourseSrs />);
      await screen.findByText("실제 학생 · 초등 A반");
      expect(
        screen.queryByRole("button", { name: "오늘의 추천 학습 시작" }),
      ).not.toBeInTheDocument();
      expect(api.startCourse).not.toHaveBeenCalled();
      if (status === "setup")
        expect(screen.getByLabelText("소단원")).toHaveValue("");
      if (status === "paused")
        expect(
          screen.getByRole("button", { name: "학습 설정 열기" }),
        ).toBeEnabled();
    },
  );

  it.each([
    [401, "로그인이 필요합니다.", "/learn/login"],
    [403, STUDENT_MUST_CHANGE_MESSAGE, "/learn/password"],
  ])(
    "redirects expired or password-required sessions (%s)",
    async (status, message, target) => {
      vi.mocked(api.getCourseState).mockResolvedValue({
        ok: false,
        status: Number(status),
        message,
      });
      render(<StudentCourseSrs />);
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(target));
    },
  );

  it("shows 503 and reloads without inventing a local plan", async () => {
    vi.mocked(api.getCourseState).mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: "준비 중",
    });
    render(<StudentCourseSrs />);
    expect(await screen.findByRole("alert")).toHaveTextContent("선생님께 알려");
    expect(screen.queryByLabelText("학년")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "최신 기록 불러오기" }),
    );
    expect(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    ).toBeEnabled();
  });

  it("does not claim the goal was reached when the server rests a weak lesson early", async () => {
    const saved = state(session(5));
    saved.summary.status = "done";
    saved.summary.recommendation = null;
    vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: saved });
    render(<StudentCourseSrs />);
    expect(
      await screen.findByText("오늘은 여기까지, 기억할 시간을 가져요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("오늘의 목표를 모두 채웠어요."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "오늘 목표 진행" }),
    ).toHaveAttribute("value", "5");
    expect(
      screen.getByRole("progressbar", { name: "오늘 목표 진행" }),
    ).toHaveAttribute("max", "10");
  });

  it("persists a setup plan before allowing automatic start", async () => {
    const saved = state();
    saved.plan = null;
    saved.summary.status = "setup";
    saved.summary.recommendation = null;
    vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: saved });
    vi.mocked(api.saveOwnCoursePlan).mockResolvedValue({
      ok: true,
      data: state(),
    });
    render(<StudentCourseSrs />);
    await screen.findByLabelText("학년");
    await userEvent.selectOptions(
      screen.getByLabelText("학년"),
      String(section.grade),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("학기"),
      String(section.semester),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("단원"),
      section.chapterId,
    );
    await userEvent.selectOptions(screen.getByLabelText("소단원"), section.id);
    await userEvent.click(
      screen.getByRole("button", { name: "저장하고 학습 준비" }),
    );
    expect(api.saveOwnCoursePlan).toHaveBeenCalledWith({
      startSectionId: section.id,
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 7,
    });
    expect(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    ).toBeEnabled();
    expect(api.startCourse).not.toHaveBeenCalled();
  });
});

async function begin() {
  render(<StudentCourseSrs />);
  await userEvent.click(
    await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
  );
  return screen.findByRole("textbox", { name: "나의 답" });
}

describe("persisted course practice", () => {
  it("focuses the next recommendation at completion so Enter continues", async () => {
    const completed = state(session(5));
    vi.mocked(api.startCourse).mockResolvedValueOnce({
      ok: true,
      data: completed,
    });
    vi.mocked(api.startCourse).mockResolvedValueOnce({
      ok: true,
      data: state(session()),
    });
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    const next = await screen.findByRole("button", {
      name: "다음 추천 학습 · 5문제",
    });
    expect(next).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(api.startCourse).toHaveBeenCalledTimes(2);
  });

  it("waits for the saved answer, prevents double submit, and supports Enter to advance", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof api.answerCourse>>) => void;
    vi.mocked(api.answerCourse).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const input = await begin();
    await userEvent.type(input, "2{Enter}");
    expect(api.answerCourse).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("서버가 알려 준 풀이")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다음 문제" }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(api.answerCourse).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: state(session(1)) }));
    expect(await screen.findByText("서버가 알려 준 풀이")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다음 문제/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("문제 2: 1 + 1")).toBeInTheDocument();
  });

  it("locks an uncertain offline answer and retries the exact same request", async () => {
    vi.mocked(api.answerCourse)
      .mockResolvedValueOnce({
        ok: false,
        status: 0,
        message: "연결되지 않았습니다.",
      })
      .mockResolvedValueOnce({ ok: true, data: state(session(1)) });
    const input = await begin();
    await userEvent.type(input, "2{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("연결되지");
    expect(input).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /다음 문제/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "같은 요청 다시 시도" }),
    );
    expect(
      await screen.findByRole("button", { name: /다음 문제/ }),
    ).toBeEnabled();
    expect(vi.mocked(api.answerCourse).mock.calls[0]).toEqual(
      vi.mocked(api.answerCourse).mock.calls[1],
    );
  });

  it("requires a fresh server reload after a 409", async () => {
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: false,
      status: 409,
      message: "충돌",
    });
    const input = await begin();
    await userEvent.type(input, "2{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("다른 화면");
    expect(input).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "같은 요청 다시 시도" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "최신 기록 불러오기" }),
    );
    expect(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    ).toBeEnabled();
    expect(api.getCourseState).toHaveBeenCalledTimes(2);
  });

  it("loads the authenticated SVG before answer controls and can retry a broken figure", async () => {
    const run = session();
    run.problems[0].figureUrl =
      "/api/learn/math-srs/course/figure?sessionId=s&problemId=p";
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: state(run),
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', {
          headers: { "content-type": "image/svg+xml" },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    expect(
      await screen.findByText("그림을 먼저 확인해요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "나의 답" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      (await screen.findAllByRole("button", { name: "그림 다시 불러오기" }))[0],
    );
    expect(
      await screen.findByRole("textbox", { name: "나의 답" }),
    ).toBeEnabled();
    expect(screen.getByText("서버 그림 표시")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      run.problems[0].figureUrl,
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });

  it("only reveals server-provided solutions after hint persistence", async () => {
    const hinted = session();
    hinted.problems[0].hint = { answer: "2", solution: "힌트 API의 풀이" };
    vi.mocked(api.hintCourse).mockResolvedValue({
      ok: true,
      data: state(hinted),
    });
    const input = await begin();
    expect(screen.queryByText("힌트 API의 풀이")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "풀이 보기" }));
    expect(await screen.findByText("힌트 API의 풀이")).toBeInTheDocument();
    expect(
      screen.getByText("풀이를 참고한 문제로 기록해요."),
    ).toBeInTheDocument();
    expect(api.answerCourse).not.toHaveBeenCalled();
    const answered = session(1);
    answered.attempts[0].usedHint = true;
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    await userEvent.type(input, "2{Enter}");
    expect(
      await screen.findByText("풀이를 참고해 확인했어요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("정확하게 풀었어요!")).not.toBeInTheDocument();
  });

  it("records giveUp explicitly without locally judging correctness", async () => {
    const answered = session(1);
    answered.attempts[0].correct = false;
    answered.problems[0].feedback!.correct = false;
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    await begin();
    await userEvent.click(
      screen.getByRole("button", { name: "아직 모르겠어요" }),
    );
    expect(api.answerCourse).toHaveBeenCalledWith({
      sessionId: session().id,
      problemId: session().problems[0].id,
      submittedAnswer: "",
      giveUp: true,
    });
    expect(
      await screen.findByText("괜찮아요, 풀이를 살펴봐요."),
    ).toBeInTheDocument();
  });

  it("gets self-check solutions through the hint endpoint and labels assistance", async () => {
    const run = session();
    run.problems[0].input.mode = "self-check";
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: state(run),
    });
    const hinted = structuredClone(run);
    hinted.problems[0].hint = { answer: "도형", solution: "직접 비교할 풀이" };
    vi.mocked(api.hintCourse).mockResolvedValue({
      ok: true,
      data: state(hinted),
    });
    const answered = session(1);
    answered.attempts[0].usedHint = true;
    answered.attempts[0].selfAssessed = true;
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "다 풀었어요 · 정답 확인" }),
    );
    expect(await screen.findByText("직접 비교할 풀이")).toBeInTheDocument();
    expect(api.hintCourse).toHaveBeenCalledWith({
      sessionId: run.id,
      problemId: run.problems[0].id,
    });
    await userEvent.click(screen.getByRole("button", { name: "맞았어요" }));
    expect(api.answerCourse).toHaveBeenCalledWith(
      expect.objectContaining({ selfCorrect: true }),
    );
    expect(
      await screen.findByText("풀이를 참고해 확인했어요."),
    ).toBeInTheDocument();
  });

  it("requests the next recommendation after five problems and stops at the daily goal", async () => {
    const first = session(4);
    vi.mocked(api.startCourse).mockResolvedValueOnce({
      ok: true,
      data: state(first),
    });
    vi.mocked(api.answerCourse).mockResolvedValueOnce({
      ok: true,
      data: state(session(5)),
    });
    const input = await begin();
    await userEvent.type(input, "2{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /이번 학습 마치기/ }),
    );
    const next = await screen.findByRole("button", {
      name: "다음 추천 학습 · 5문제",
    });
    expect(api.startCourse).toHaveBeenCalledTimes(1);
    const nextRun = session(4);
    nextRun.id = "66666666-6666-4666-8666-666666666666";
    const nextState = state(nextRun);
    nextState.summary.todayAnswered = 9;
    vi.mocked(api.startCourse).mockResolvedValueOnce({
      ok: true,
      data: nextState,
    });
    await userEvent.click(next);
    expect(api.startCourse).toHaveBeenCalledTimes(2);
    const finished = state({ ...session(5), id: nextRun.id });
    finished.summary.todayAnswered = 10;
    finished.summary.status = "done";
    finished.summary.recommendation = null;
    vi.mocked(api.answerCourse).mockResolvedValueOnce({
      ok: true,
      data: finished,
    });
    await userEvent.type(
      await screen.findByRole("textbox", { name: "나의 답" }),
      "2{Enter}",
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /이번 학습 마치기/ }),
    );
    expect(
      await screen.findByText("오늘의 수학을 마쳤어요."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다음 추천 학습 · 5문제" }),
    ).not.toBeInTheDocument();
    expect(api.startCourse).toHaveBeenCalledTimes(2);
  });
});
