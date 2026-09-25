import type {
  MathSrsReplay,
  MathSrsReplayKind,
  MathSrsReplaySubmitInput,
} from "@/contracts/mathSrsReplay.contract";
import { kstDateOf } from "@/lib/kstDate";
import { CONCEPTS } from "./concepts";
import {
  CourseConflict,
  CourseInvalidInput,
  publicCourseSession,
} from "./courseAutomation";
import { gradeCourseAnswer } from "./elementary/answers";
import { getCourseSection } from "./elementary/catalog";
import { checkAnswer } from "./sharedAnswers";
import { numericAnswerChoices } from "./numericAnswerChoices";
import { currentSrsMission, type StoredSrsState } from "./serverState";

type ReplaySource = {
  public: Omit<MathSrsReplay, "correct" | "solution">;
  grade: (answer: string) => boolean;
  solution: NonNullable<MathSrsReplay["solution"]>;
};

const missing = () =>
  new CourseConflict(
    "복습할 문제의 순서가 변경되었어요. 진도판을 다시 불러와 주세요.",
  );
const unsupported = () =>
  new CourseInvalidInput("이 문제는 선생님과 함께 다시 확인해 주세요.");

function elementarySource(
  state: StoredSrsState,
  step: number,
  now: Date,
): ReplaySource {
  const course = state.course;
  if (!course) throw missing();
  const today = kstDateOf(now);
  // Match the daily board's first-attempt count, including older completed sessions.
  // Retry attempts never occupy another tile and never change this mapping.
  const entries = [
    ...course.history.map(({ session }) => session),
    ...(course.learner.session ? [course.learner.session] : []),
  ].flatMap((session) =>
    session.attempts
      .filter((attempt) => kstDateOf(new Date(attempt.answeredAt)) === today)
      .map((attempt) => ({ session, attempt })),
  );
  const entry = entries[step - 1];
  if (!entry) throw missing();
  const { session, attempt } = entry;
  const problem = session.problems.find((p) => p.id === attempt.problemId);
  const view = publicCourseSession(session).problems.find(
    (p) => p.id === attempt.problemId,
  );
  if (!problem || !view) throw missing();
  const choices = view.answerChoices;
  if (
    !choices ||
    choices.length !== 4 ||
    choices.some((choice) => gradeCourseAnswer(problem, choice) === null) ||
    choices.filter((choice) => gradeCourseAnswer(problem, choice) === true)
      .length !== 1
  )
    throw unsupported();
  const section = getCourseSection(problem.sectionId)!;
  return {
    public: {
      kind: "elementary",
      step,
      problemId: problem.id,
      title: section.title,
      subtitle: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
      content: view.content,
      figureUrl: view.figureUrl,
      answerChoices: [...choices],
      interactive: view.interactive,
      canRevealSolution:
        !!session.completedAt &&
        (!session.retry || !!session.retry.completedAt),
    },
    grade: (answer) => gradeCourseAnswer(problem, answer) === true,
    solution: { answer: problem.answer, solution: problem.solution },
  };
}

function middleSource(
  state: StoredSrsState,
  step: number,
  now: Date,
  missionId?: string,
): ReplaySource {
  // A mission started yesterday can still be the board's active mission today.
  const mission = missionId
    ? state.missions.find((item) => item.id === missionId)
    : currentSrsMission(state, now);
  const problem = mission?.problems[step - 1];
  if (
    !mission ||
    !problem ||
    !mission.attempts.some((a) => a.problemId === problem.id)
  )
    throw missing();
  const equation = problem.equation.trim();
  // Legacy stored missions used bare TeX; the common problem renderer needs
  // explicit math boundaries, while current missions put equations in prompt.
  const equationContent =
    !equation || equation.startsWith("$")
      ? equation
      : /^\\\([\s\S]*\\\)$/.test(equation) || /^\\\[[\s\S]*\\\]$/.test(equation)
        ? `$${equation.slice(2, -2)}$`
        : `$${equation}$`;
  const content = [
    problem.prompt,
    equationContent,
    problem.answerUnit ? `답의 단위: ${problem.answerUnit}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    public: {
      kind: "middle",
      step,
      problemId: problem.id,
      title:
        CONCEPTS.find((c) => c.id === problem.conceptId)?.title ?? "일차방정식",
      subtitle: "중1 · 일차방정식",
      content,
      figureUrl: null,
      answerChoices: numericAnswerChoices(problem, mission.problems),
      interactive: null,
      canRevealSolution: !!mission.completedAt,
    },
    grade: (answer) => checkAnswer(answer, problem.answer),
    solution: {
      answer:
        problem.answerText ?? `$${problem.answer}$${problem.answerUnit ?? ""}`,
      solution: problem.solution.join("\n"),
    },
  };
}

/** Pure projection/grading: replay never updates a session, daily ledger, revision or memory. */
export function replayProblem(
  state: StoredSrsState,
  kind: MathSrsReplayKind,
  step: number,
  now: Date,
  input?: MathSrsReplaySubmitInput,
): MathSrsReplay {
  const source =
    kind === "elementary"
      ? elementarySource(state, step, now)
      : middleSource(state, step, now, input?.missionId);
  if (
    input &&
    (input.kind !== kind ||
      input.step !== step ||
      input.problemId !== source.public.problemId)
  )
    throw missing();
  const correct = input ? source.grade(input.submittedAnswer) : null;
  return {
    ...source.public,
    correct,
    solution:
      input?.revealSolution && correct && source.public.canRevealSolution
        ? source.solution
        : null,
  };
}
