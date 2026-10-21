import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import {
  LearningSoundsProvider,
  useLearningSounds,
} from "@/components/math-srs/LearningSounds";
import type {
  CourseAttemptInput,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import * as api from "@/components/math-srs/courseApi";
import {
  installSoundWorld,
  serveSounds,
  soundWorld,
  SOUND_URLS,
} from "../helpers/learningSoundWorld";

const controls = vi.hoisted(() => ({ self: true }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-srs/courseApi", () => ({
  getCourseState: vi.fn(),
  startCourse: vi.fn(),
  answerCourse: vi.fn(),
  hintCourse: vi.fn(),
}));
vi.mock("@/components/math-srs/StudentCoursePractice", () => ({
  default: ({
    session,
    onAnswer,
    onExit,
    feedbackId,
  }: {
    session: NonNullable<CourseStudentState["session"]>;
    onAnswer: (input: CourseAttemptInput) => void;
    onExit: () => void;
    feedbackId: string | null;
  }) => (
    <section>
      <button
        onClick={() =>
          onAnswer({
            sessionId: session.id,
            problemId: session.problems[0].id,
            submittedAnswer: "내가 쓴 설명",
            ...(controls.self ? { selfCorrect: true } : {}),
          })
        }
      >
        직접 답 제출
      </button>
      <button onClick={onExit}>풀이 닫기</button>
      {feedbackId ? <p>확정 기록 표시</p> : null}
    </section>
  ),
}));

function SoundControls() {
  const sounds = useLearningSounds();
  return (
    <>
      <button onClick={() => sounds.setEnabled(true)}>소리 켜기</button>
      <span data-testid="sound-status">{sounds.status}</span>
    </>
  );
}
function courseState(answered = false): CourseStudentState {
  const sectionId = COURSE_SECTIONS[1].id;
  const problems = Array.from({ length: 5 }, (_, i) => ({
    id: `problem-${i}`,
    sectionId,
    tier: "기본" as const,
    content: "1+1",
    figureUrl: null,
    answerChoices: null,
    interactive: null,
    input: { mode: "text" as const, label: "답", placeholder: "", help: "" },
    hint: null,
    feedback: null,
  }));
  return {
    student: {
      id: "student-1",
      name: "학생",
      classId: "class-1",
      className: "학급",
    },
    revision: 1,
    plan: null,
    summary: {
      status: "ready",
      currentSectionId: sectionId,
      dueCount: 0,
      todayAnswered: answered ? 1 : 0,
      todayCorrect: answered ? 1 : 0,
      todayGoal: 10,
      completedSections: 0,
      lastPracticedAt: null,
      nextReviewAt: null,
      recommendation: null,
    },
    session: {
      id: "session-1",
      sectionId,
      mode: "learn",
      startedAt: "2026-10-04T00:00:00Z",
      completedAt: null,
      retry: null,
      problems,
      attempts: answered
        ? [
            {
              problemId: problems[0].id,
              submittedAnswer: "내가 쓴 설명",
              correct: true,
              usedHint: false,
              selfAssessed: controls.self,
              answeredAt: "2026-10-04T00:01:00Z",
            },
          ]
        : [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  controls.self = true;
});
afterEach(() => vi.unstubAllGlobals());

describe("real caller/provider/engine boundary", () => {
  it.each([
    "typed-self",
    "source-throws",
    "outside",
    "student-changed",
    "closed",
  ] as const)(
    "preserves confirmed UI and sound isolation: %s",
    async (mode) => {
      const world = soundWorld({ startThrows: mode === "source-throws" });
      const host = installSoundWorld(world);
      controls.self = mode !== "source-throws";
      const saved = courseState(true);
      if (mode === "student-changed") saved.student.id = "student-2";
      vi.mocked(api.getCourseState).mockResolvedValue({
        ok: true,
        data: courseState(),
      });
      let resolveAnswer!: (
        result: Awaited<ReturnType<typeof api.answerCourse>>,
      ) => void;
      vi.mocked(api.answerCourse).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAnswer = resolve;
          }),
      );
      const onConfirmedAnswer = vi.fn();
      const content = (
        <>
          <SoundControls />
          <StudentCourseSrs
            expedition={{
              onExit: vi.fn(),
              onComplete: vi.fn(),
              onConfirmedAnswer,
            }}
          />
        </>
      );
      const view = render(
        mode === "outside" ? (
          content
        ) : (
          <LearningSoundsProvider>{content}</LearningSoundsProvider>
        ),
      );
      try {
        await screen.findByRole("button", { name: "직접 답 제출" });
        expect(world.contexts).toHaveLength(0);
        fireEvent.click(screen.getByRole("button", { name: "소리 켜기" }));
        await act(async () => serveSounds(world));
        if (mode !== "outside")
          await waitFor(() =>
            expect(screen.getByTestId("sound-status")).toHaveTextContent(
              "ready",
            ),
          );
        fireEvent.click(screen.getByRole("button", { name: "직접 답 제출" }));
        if (mode === "closed")
          fireEvent.click(screen.getByRole("button", { name: "풀이 닫기" }));
        await act(async () => resolveAnswer({ ok: true, data: saved }));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        if (mode !== "closed")
          expect(screen.getByText("확정 기록 표시")).toBeVisible();
        if (mode === "typed-self")
          expect(world.played).toEqual([SOUND_URLS.soft]);
        else expect(world.played).toEqual([]);
        if (mode === "student-changed" || mode === "closed")
          expect(onConfirmedAnswer).not.toHaveBeenCalled();
        else
          expect(onConfirmedAnswer).toHaveBeenCalledExactlyOnceWith(
            "student-1",
          );
        if (mode === "outside") {
          expect(world.contexts).toHaveLength(0);
          expect(world.requests).toHaveLength(0);
        }
        if (mode === "source-throws")
          expect(world.contexts[0].sources).toHaveLength(1);
      } finally {
        view.unmount();
        host.restore();
      }
    },
  );
});
