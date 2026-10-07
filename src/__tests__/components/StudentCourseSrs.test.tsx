import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoursePlanForm from "@/components/math-srs/CoursePlanForm";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import type {
  CoursePublicSession,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";
import type { MathSrsJourney } from "@/contracts/mathSrsJourney.contract";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
} from "@/lib/math-srs/elementary/catalog";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import { publicCourseSession } from "@/lib/math-srs/courseAutomation";
import type { CourseSession } from "@/lib/math-srs/elementary/types";
import * as api from "@/components/math-srs/courseApi";

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
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
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
    (_, index) =>
      ({
        id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
        sectionId: section.id,
        tier: "기본",
        content: `문제 ${index + 1}: 1 + 1`,
        figureUrl: null,
        answerChoices: null,
        interactive: null,
        input: {
          mode: "number" as const,
          label: "나의 답",
          placeholder: "답 입력",
          help: "숫자로 적어 주세요.",
        },
        hint: null,
        feedback: index < answered ? { correct: true } : null,
      }) as CoursePublicSession["problems"][number],
  );
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: section.id,
    mode: "learn",
    startedAt: now,
    completedAt: answered === 5 ? now : null,
    retry: null,
    problems,
    attempts: problems.slice(0, answered).map((problem) => ({
      problemId: problem.id,
      submittedAnswer: "2",
      correct: true,
      usedHint: false,
      selfAssessed: false,
      answeredAt: now,
    })),
  } as CoursePublicSession;
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
  vi.stubGlobal("scrollTo", vi.fn());
  vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: state() });
  vi.mocked(api.startCourse).mockResolvedValue({
    ok: true,
    data: state(session()),
  });
});

describe("embedded expedition bank activity", () => {
  const versions = {
    graphSchemaVersion: "1.1.0" as const,
    graphContentHash: "0".repeat(64),
    mappingVersion: 1 as const,
    policyVersion: 1 as const,
  };
  function shortage(run: CoursePublicSession | null = null) {
    const result = state(run);
    result.summary.recommendation = null;
    result.prerequisiteContext = {
      kind: "unavailable",
      targetSectionId: "5-2-2-1",
      sectionId: null,
      reason: "새 문제를 준비하지 못했어요. 선생님께 알려 주세요.",
      canStart: false,
      partial: true,
      versions,
    };
    return result;
  }
  it("does not auto-start or claim completion when new problems are unavailable", async () => {
    const unavailable = shortage(session(5));
    vi.mocked(api.getCourseState).mockResolvedValue({
      ok: true,
      data: unavailable,
    });
    const onComplete = vi.fn();
    render(<StudentCourseSrs expedition={{ onExit: vi.fn(), onComplete }} />);
    expect(
      await screen.findByText(unavailable.prerequisiteContext!.reason),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "오늘의 추천 학습 시작" }),
    ).toBeDisabled();
    expect(api.startCourse).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
  it("keeps supply shortage distinct from expedition completion after the last answer", async () => {
    vi.mocked(api.getCourseState).mockResolvedValue({
      ok: true,
      data: state(session(4)),
    });
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: shortage(session(5)),
    });
    const onComplete = vi.fn();
    render(<StudentCourseSrs expedition={{ onExit: vi.fn(), onComplete }} />);
    await screen.findByText("문제 5: 1 + 1");
    await userEvent.type(screen.getByRole("textbox", { name: "나의 답" }), "2");
    fireEvent.submit(document.getElementById("course-answer-form")!);
    await userEvent.click(
      await screen.findByRole("button", { name: /이번 학습 마치기/ }),
    );
    expect(
      await screen.findByText(shortage().prerequisiteContext!.reason),
    ).toBeVisible();
    expect(onComplete).not.toHaveBeenCalled();
    expect(api.startCourse).not.toHaveBeenCalled();
  });
  it("shows the actual P review and its reason while resuming", async () => {
    const result = state({
      ...session(),
      sectionId: "5-1-5-4",
      mode: "review",
    });
    result.prerequisiteContext = {
      kind: "check",
      targetSectionId: "5-2-2-1",
      sectionId: "5-1-5-4",
      reason: "분수의 곱셈에 쓰이는 분수의 뺄셈을 먼저 확인해요.",
      canStart: true,
      partial: true,
      versions,
    };
    vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: result });
    render(
      <StudentCourseSrs
        expedition={{ onExit: vi.fn(), onComplete: vi.fn() }}
      />,
    );
    expect(
      await screen.findByText(result.prerequisiteContext.reason),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "대분수의 뺄셈" }),
    ).toBeVisible();
    expect(api.startCourse).not.toHaveBeenCalled();
  });
  it("uses canStart to allow fresh target fallback despite its unavailable context kind", async () => {
    const ready = shortage();
    ready.summary.recommendation = state().summary.recommendation;
    ready.prerequisiteContext = {
      ...ready.prerequisiteContext!,
      sectionId: "5-2-2-1",
      canStart: true,
      reason: "확인 문제를 준비하지 못해 분수의 곱셈 학습을 이어 갑니다.",
    };
    vi.mocked(api.getCourseState).mockResolvedValue({ ok: true, data: ready });
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: { ...ready, session: session() },
    });
    render(
      <StudentCourseSrs
        expedition={{ onExit: vi.fn(), onComplete: vi.fn() }}
      />,
    );
    expect(
      await screen.findByText(ready.prerequisiteContext.reason),
    ).toBeVisible();
    expect(api.startCourse).toHaveBeenCalledOnce();
  });
  it("opens the current problem directly and exits to the parent board", async () => {
    vi.mocked(api.getCourseState).mockResolvedValue({
      ok: true,
      data: state(session(2)),
    });
    const onExit = vi.fn();
    render(<StudentCourseSrs expedition={{ onExit, onComplete: vi.fn() }} />);
    expect(await screen.findByText("문제 3: 1 + 1")).toBeVisible();
    expect(api.startCourse).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "전체 학습 진도" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /학습 홈/ }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("starts the assigned bank lesson without a second home/start button", async () => {
    render(
      <StudentCourseSrs
        expedition={{ onExit: vi.fn(), onComplete: vi.fn() }}
      />,
    );
    expect(await screen.findByText("문제 1: 1 + 1")).toBeVisible();
    expect(api.startCourse).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "오늘의 추천 학습 시작" }),
    ).not.toBeInTheDocument();
  });
});

describe("one-screen student answers", () => {
  function view(
    run: CoursePublicSession,
    onAnswer = vi.fn(),
    journey?: MathSrsJourney,
  ) {
    const props = {
      session: run,
      summary: state(run).summary,
      journey,
      feedbackId: null,
      busy: false,
      onAnswer,
      onHint: vi.fn(),
      onNext: vi.fn(),
      onContinue: vi.fn(),
      onExit: vi.fn(),
      onAuthFailure: vi.fn(),
    };
    return { ...render(<StudentCoursePractice {...props} />), props };
  }

  it("shows the question and four server choices together and submits the selected string", async () => {
    const run = session();
    Object.assign(run.problems[0], { answerChoices: ["1", "2", "3", "4"] });
    const onAnswer = vi.fn();
    view(run, onAnswer);
    expect(await screen.findByText("문제 1: 1 + 1")).toBeInTheDocument();
    expect(
      document.querySelector('[data-question-transition="true"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "답안" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "나의 답" }),
    ).not.toBeInTheDocument();
    const choices = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    expect(choices).toHaveLength(4);
    await userEvent.click(choices[1]);
    expect(choices[1]).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: /정답 확인/ }),
    ).not.toBeInTheDocument();
    expect(onAnswer).toHaveBeenCalledWith({
      sessionId: run.id,
      problemId: run.problems[0].id,
      submittedAnswer: "2",
    });
  });

  it.each(["retry-wrong", "retry-give-up", "self-check"] as const)(
    "uses client copy for the actual recorded action: %s",
    async (mode) => {
      const inRetry = mode !== "self-check";
      const run = session(inRetry ? 5 : 0);
      const problemId = run.problems[0].id;
      if (inRetry) {
        run.attempts[0].correct = false;
        run.problems[0].feedback = null;
        run.problems[0].answerChoices = ["1", "2", "3", "4"];
        run.retry = {
          pendingProblemIds: [problemId],
          attempts: [],
          completedAt: null,
        };
      } else run.problems[0].input.mode = "self-check";
      const { props, rerender } = view(run);
      await screen.findByText("문제 1: 1 + 1");
      if (mode === "retry-give-up")
        fireEvent.click(
          screen.getByRole("button", { name: "아직 모르겠어요" }),
        );
      else if (mode === "self-check") {
        fireEvent.click(screen.getByRole("button", { name: "다 풀었어요" }));
        fireEvent.click(
          screen.getByRole("button", { name: "다시 연습할래요" }),
        );
      } else
        fireEvent.click(
          within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
            "button",
          )[0],
        );
      expect(props.onAnswer).toHaveBeenCalledWith(
        expect.objectContaining(
          mode === "retry-give-up"
            ? { giveUp: true, retryIndex: 0 }
            : mode === "self-check"
              ? { selfCorrect: false }
              : { submittedAnswer: "1", retryIndex: 0 },
        ),
      );
      const saved = structuredClone(run);
      const attempt = {
        ...session(1).attempts[0],
        correct: false,
        selfAssessed: mode === "self-check",
        submittedAnswer: mode === "retry-wrong" ? "1" : "",
      };
      saved.problems[0].feedback = { correct: false };
      if (inRetry)
        saved.retry = {
          pendingProblemIds: mode === "retry-give-up" ? [] : [problemId],
          attempts: [attempt],
          completedAt: mode === "retry-give-up" ? now : null,
        };
      else saved.attempts = [attempt];
      rerender(
        <StudentCoursePractice
          {...props}
          session={saved}
          feedbackId={problemId}
        />,
      );
      expect(
        screen.getByText(
          mode === "retry-give-up"
            ? "아직 모르겠어요로 기록했어요"
            : mode === "self-check"
              ? "다시 볼 내용으로 기록했어요"
              : "아직 해결하지 못했어요",
        ),
      ).toBeInTheDocument();
    },
  );

  it("guards repeated taps and advances only after saved feedback, cancelling the timer on exit", async () => {
    const run = session();
    Object.assign(run.problems[0], { answerChoices: ["1", "2", "3", "4"] });
    const { rerender, unmount, props } = view(run);
    await screen.findByText("문제 1: 1 + 1");
    const choices = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    fireEvent.click(choices[1]);
    fireEvent.click(choices[2]);
    expect(props.onAnswer).toHaveBeenCalledTimes(1);
    expect(props.onNext).not.toHaveBeenCalled();
    const saved = session(1);
    Object.assign(saved.problems[0], { answerChoices: ["1", "2", "3", "4"] });
    vi.useFakeTimers();
    try {
      rerender(
        <StudentCoursePractice
          {...props}
          session={saved}
          feedbackId={saved.problems[0].id}
        />,
      );
      expect(screen.getByText("정확하게 풀었어요")).toBeInTheDocument();
      expect(
        screen
          .getByText("정확하게 풀었어요")
          .closest('[class*="answerDockHeader"]'),
      ).toBeInTheDocument();
      expect(screen.queryByText("서버가 알려 준 풀이")).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1199));
      expect(props.onNext).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(props.onNext).toHaveBeenCalledTimes(1);
      unmount();
      act(() => vi.advanceTimersByTime(5000));
      expect(props.onNext).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("advances into retry when the final first-round answer is the only wrong answer", async () => {
    const run = session(5);
    run.attempts[4].correct = false;
    const stored: CourseSession = {
      ...run,
      problems: run.problems.map((problem, index) => ({
        ...problem,
        seed: index,
        answer: "2",
        solution: "비공개 풀이",
        figureSpec: null,
        answerChoices: ["1", "2", "3", "4"],
        interactive: null,
      })),
      retry: {
        pendingProblemIds: [run.problems[4].id],
        attempts: [],
        requests: [],
        completedAt: null,
      },
    };
    const response = publicCourseSession(stored);
    expect(response.problems[4].feedback).toBeNull();
    const { props, rerender } = view(response);
    await screen.findByText("문제 5: 1 + 1");
    vi.useFakeTimers();
    try {
      rerender(
        <StudentCoursePractice
          {...props}
          feedbackId={response.problems[4].id}
        />,
      );
      expect(screen.getByText("다시 생각해 볼 문제예요")).toBeInTheDocument();
      expect(screen.queryByText("비공개 풀이")).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1200));
      expect(props.onNext).toHaveBeenCalledTimes(1);
      rerender(<StudentCoursePractice {...props} feedbackId={null} />);
      expect(screen.getByText("틀린 문제 다시 풀기")).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
          "button",
        )[1],
      );
      expect(props.onAnswer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          problemId: response.problems[4].id,
          retryIndex: 0,
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets the student shade fraction parts and submits the part count", async () => {
    const run = session();
    Object.assign(run.problems[0], {
      interactive: { kind: "fraction-parts", denominator: 4, shape: "bar" },
    });
    const onAnswer = vi.fn();
    view(run, onAnswer);
    const parts = within(
      screen.getByRole("group", { name: "4칸 중 칠할 칸 선택" }),
    ).getAllByRole("button");
    expect(parts).toHaveLength(4);
    await userEvent.click(parts[0]);
    await userEvent.click(parts[2]);
    expect(parts[0]).toHaveAttribute("aria-pressed", "true");
    expect(parts[2]).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "완성했어요" }));
    expect(onAnswer).toHaveBeenCalledWith({
      sessionId: run.id,
      problemId: run.problems[0].id,
      submittedAnswer: "2/4",
    });
  });

  it("keeps wrong questions in the retry queue and sends the retry sequence", async () => {
    const run = session(5);
    run.attempts[0].correct = false;
    run.attempts[2].correct = false;
    Object.assign(run, {
      retry: {
        pendingProblemIds: [run.problems[0].id, run.problems[2].id],
        attempts: [],
        completedAt: null,
      },
    });
    Object.assign(run.problems[0], { answerChoices: ["1", "2", "3", "4"] });
    Object.assign(run.problems[2], { answerChoices: ["1", "2", "3", "4"] });
    const onAnswer = vi.fn();
    const { rerender, props } = view(run, onAnswer);
    expect(screen.getByText("틀린 문제 다시 풀기")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "틀린 문제 다시 풀기 진행" }),
    ).toHaveAttribute("max", "2");
    expect(
      screen.getByRole("progressbar", { name: "틀린 문제 다시 풀기 진행" }),
    ).toHaveAttribute("value", "0");
    expect(screen.getByText("문제 1: 1 + 1")).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    );
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        problemId: run.problems[0].id,
        retryIndex: 0,
        submittedAnswer: "1",
      }),
    );
    const next = structuredClone(run);
    Object.assign(next, {
      retry: {
        pendingProblemIds: [next.problems[2].id, next.problems[0].id],
        attempts: [{ ...next.attempts[0], correct: false }],
        completedAt: null,
      },
    });
    rerender(<StudentCoursePractice {...props} session={next} />);
    expect(screen.getByText("문제 3: 1 + 1")).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[1],
    );
    expect(onAnswer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        problemId: run.problems[2].id,
        retryIndex: 1,
      }),
    );
  });

  it("offers completed tiles for replay without automatically requesting explanations", () => {
    const run = session(5);
    run.attempts[0].correct = false;
    Object.assign(run, {
      retry: {
        pendingProblemIds: [],
        attempts: [{ ...run.attempts[0], correct: true, answeredAt: now }],
        completedAt: now,
      },
    });
    const { props } = view(run, vi.fn(), {
      completedDays: 1,
      todayComplete: true,
      todayAnswered: 10,
      todayGoal: 10,
      days: [
        {
          id: "elementary:2026-09-23",
          date: "2026-09-23",
          completedAt: now,
          title: section.title,
          subtitle: "초등 수학",
          reviewCount: 10,
        },
      ],
      upcoming: [{ title: "다음 단원", subtitle: "초등 수학" }],
    });
    expect(screen.queryByText("완료 후 풀이")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1일차.*다시 풀기/ }),
    ).toBeEnabled();
    expect(props.onHint).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "풀이" }),
    ).not.toBeInTheDocument();
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("shared course plan", () => {
  it("moves focus into settings and returns it to the opener on Escape", async () => {
    render(<StudentCourseSrs />);
    const opener = (
      await screen.findAllByRole("button", { name: "학습 설정" })
    )[0];
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
    expect(
      screen.queryByRole("link", { name: "강의" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "도감" })).toHaveAttribute(
      "href",
      "/learn?view=collection",
    );
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
      screen.getByRole("button", { name: "다시 불러오기" }),
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
  it.each([
    "self-true",
    "self-false",
    "give-up",
    "other-student",
    "other-session",
  ] as const)("maps actual confirmed course action: %s", async (mode) => {
    const run = session();
    if (mode.startsWith("self-")) {
      run.problems[0].input.mode = "self-check";
      run.problems[0].hint = { answer: "2", solution: "1 더하기 1은 2" };
    }
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: state(run),
    });
    const saved = state(session(1));
    if (mode === "self-false") saved.session!.attempts[0].correct = false;
    if (mode === "other-student")
      saved.student.id = "99999999-9999-4999-8999-999999999999";
    if (mode === "other-session")
      saved.session!.id = "99999999-9999-4999-8999-999999999999";
    vi.mocked(api.answerCourse).mockResolvedValue({ ok: true, data: saved });
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    if (mode.startsWith("self-")) {
      await userEvent.click(
        await screen.findByRole("button", { name: "다 풀었어요" }),
      );
      await userEvent.click(
        await screen.findByRole("button", {
          name:
            mode === "self-false"
              ? "다시 연습할래요"
              : "혼자 풀었다고 생각해요",
        }),
      );
    } else if (mode === "give-up")
      await userEvent.click(
        await screen.findByRole("button", { name: "아직 모르겠어요" }),
      );
    else
      await userEvent.type(
        await screen.findByRole("textbox", { name: "나의 답" }),
        "2{Enter}",
      );
    await waitFor(() => expect(api.answerCourse).toHaveBeenCalledOnce());
    await act(async () => {});
    if (mode.startsWith("other-")) expect(sounds.play).not.toHaveBeenCalled();
    else
      expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
        "soft",
        `${state().student.id}:${run.id}:${run.problems[0].id}:first`,
      );
  });
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
      name: "다음 5문제",
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
    expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
      "correct",
      `${state().student.id}:${session().id}:${session().problems[0].id}:first`,
    );
    expect(sounds.gesture).toHaveBeenCalled();
    expect(screen.queryByText("서버가 알려 준 풀이")).not.toBeInTheDocument();
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
    expect(sounds.play).not.toHaveBeenCalled();
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
    expect(sounds.play).toHaveBeenCalledTimes(1);
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
    expect(sounds.play).not.toHaveBeenCalled();
    expect(input).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "같은 요청 다시 시도" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "다시 불러오기" }),
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

  it("keeps the first answer and feedback in the question without revealing the solution", async () => {
    const answered = session(1);
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    const input = await begin();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    await userEvent.type(input, "2{Enter}");
    expect(await screen.findByText("정확하게 풀었어요")).toBeInTheDocument();
    expect(screen.getByText("문제 1: 1 + 1")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "나의 답" })).toHaveValue("2");
    expect(
      screen.queryByRole("dialog", { name: "풀이" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "풀이 보기" }),
    ).not.toBeInTheDocument();
    expect(api.hintCourse).not.toHaveBeenCalled();
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
      await screen.findByText("모르는 부분을 확인했어요"),
    ).toBeInTheDocument();
  });

  it("records first-pass self-check without revealing an answer", async () => {
    const run = session();
    run.problems[0].input.mode = "self-check";
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: state(run),
    });
    const answered = session(1);
    answered.attempts[0].selfAssessed = true;
    answered.attempts[0].usedHint = false;
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    expect(
      screen.queryByRole("textbox", { name: /메모/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole("button", { name: "다 풀었어요" }),
    );
    expect(api.hintCourse).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "풀이" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "혼자 풀었다고 생각해요" }),
    );
    expect(api.answerCourse).toHaveBeenCalledWith({
      sessionId: run.id,
      problemId: run.problems[0].id,
      submittedAnswer: "",
      selfCorrect: true,
    });
    expect(
      await screen.findByText("혼자 풀었다고 기록했어요"),
    ).toBeInTheDocument();
  });

  it("records retry self-check privately before optional explanation", async () => {
    const run = session(5);
    run.attempts[0].correct = false;
    run.problems[0].input.mode = "self-check";
    Object.assign(run, {
      retry: {
        pendingProblemIds: [run.problems[0].id],
        attempts: [],
        completedAt: null,
      },
    });
    run.problems[0].feedback = null;
    vi.mocked(api.startCourse).mockResolvedValue({
      ok: true,
      data: state(run),
    });
    const answered = structuredClone(run);
    Object.assign(answered.problems[0], { feedback: { correct: true } });
    Object.assign(answered, {
      retry: {
        pendingProblemIds: [],
        attempts: [
          {
            ...answered.attempts[0],
            correct: true,
            selfAssessed: true,
            usedHint: false,
          },
        ],
        completedAt: now,
      },
    });
    vi.mocked(api.answerCourse).mockResolvedValue({
      ok: true,
      data: state(answered),
    });
    render(<StudentCourseSrs />);
    await userEvent.click(
      await screen.findByRole("button", { name: "오늘의 추천 학습 시작" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "다 풀었어요" }),
    );
    expect(api.hintCourse).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "혼자 풀었다고 생각해요" }),
    );
    expect(api.answerCourse).toHaveBeenCalledWith(
      expect.objectContaining({ selfCorrect: true, retryIndex: 0 }),
    );
    expect(
      await screen.findByText("혼자 풀었다고 기록했어요"),
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
    const nextRun = session(4);
    nextRun.id = "66666666-6666-4666-8666-666666666666";
    const nextState = state(nextRun);
    nextState.summary.todayAnswered = 9;
    vi.mocked(api.startCourse).mockResolvedValueOnce({
      ok: true,
      data: nextState,
    });
    await userEvent.click(
      await screen.findByRole("button", { name: /이번 학습 마치기/ }),
    );
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
      await screen.findByRole("heading", { name: "전체 학습 진도" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("오늘의 목표 도착!")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /다음 5문제 시작/ }),
    ).not.toBeInTheDocument();
    expect(api.startCourse).toHaveBeenCalledTimes(2);
  });
});
