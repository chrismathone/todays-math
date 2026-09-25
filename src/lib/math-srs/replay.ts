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
import { checkAnswer, parseSubmittedNumber } from "./sharedAnswers";
import {
  currentSrsMission,
  type StoredSrsMission,
  type StoredSrsState,
} from "./serverState";

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

type MiddleProblem = StoredSrsMission["problems"][number];

/** Keep equivalent fractions and units from identifying the correct choice by formatting. */
function numericChoices(
  problem: MiddleProblem,
  mission: StoredSrsMission,
): string[] {
  const expected = problem.answer;
  let denominator = 1;
  if (!Number.isInteger(expected)) {
    for (let d = 2; d <= 1000; d++) {
      if (checkAnswer(`${Math.round(expected * d)}/${d}`, expected)) {
        denominator = d;
        break;
      }
    }
  }
  const format = (value: number) =>
    denominator > 1
      ? `$\\frac{${Math.round(value * denominator)}}{${denominator}}$`
      : `$${value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })}$`;
  const choices = [format(expected)];
  if (!checkAnswer(choices[0], expected)) throw unsupported();
  const add = (value: number) => {
    if (choices.length === 4 || !Number.isFinite(value)) return;
    if (Number.isInteger(expected) && !Number.isInteger(value)) return;
    const choice = format(value);
    const parsed = parseSubmittedNumber(choice);
    if (parsed === null || choices.some((other) => checkAnswer(other, parsed)))
      return;
    choices.push(choice);
  };
  let hash = 2166136261;
  for (const char of problem.id)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    return hash / 0x1_0000_0000;
  };
  const candidates = mission.problems.filter(
    (p) =>
      p.id !== problem.id &&
      p.conceptId === problem.conceptId &&
      p.answerUnit === problem.answerUnit,
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.forEach((candidate) => add(candidate.answer));
  const delta = Number.isInteger(expected)
    ? Math.max(1, Math.ceil(Math.abs(expected) * 0.1))
    : Math.max(1 / denominator, Math.abs(expected) * 0.1);
  for (const offset of [-1, 1, -2, 2, -3, 3]) add(expected + delta * offset);
  if (choices.length !== 4) throw unsupported();
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function middleSource(
  state: StoredSrsState,
  step: number,
  now: Date,
): ReplaySource {
  // A mission started yesterday can still be the board's active mission today.
  const mission = currentSrsMission(state, now);
  const problem = mission?.problems[step - 1];
  if (
    !mission ||
    !problem ||
    !mission.attempts.some((a) => a.problemId === problem.id)
  )
    throw missing();
  const content = [
    problem.prompt,
    problem.equation,
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
      answerChoices: numericChoices(problem, mission),
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
      : middleSource(state, step, now);
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
