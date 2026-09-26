import type {
  MathSrsReplay,
  MathSrsReplayKind,
  MathSrsReplaySubmitInput,
} from "@/contracts/mathSrsReplay.contract";
import { createHash } from "node:crypto";
import { kstDateOf } from "@/lib/kstDate";
import { CONCEPTS } from "./concepts";
import {
  CourseConflict,
  CourseInvalidInput,
  publicCourseSession,
} from "./courseAutomation";
import { gradeCourseAnswer } from "./elementary/answers";
import { getCourseSection } from "./elementary/catalog";
import { correctSrsChoice, gradeSrsAnswer } from "./sharedAnswers";
import { srsAnswerChoices } from "./serverDto";
import { currentSrsMission, type StoredSrsState } from "./serverState";
import { findJourneyDay } from "./dailyJourney";
import { generateCourseSession } from "./elementary/generator";
import { quickMissionProblem } from "./quickMission";
import type { ConceptId } from "./types";

type ReplaySource = {
  public: Omit<MathSrsReplay, "correct" | "solution">;
  grade: (answer: string) => boolean;
  solution: NonNullable<MathSrsReplay["solution"]>;
  figureSpec?: Record<string, unknown> | null;
};

const missing = () =>
  new CourseConflict(
    "복습할 문제의 순서가 변경되었어요. 진도판을 다시 불러와 주세요.",
  );
const unsupported = () =>
  new CourseInvalidInput("이 문제는 선생님과 함께 다시 확인해 주세요.");

function archivedReference(
  state: StoredSrsState,
  kind: MathSrsReplayKind,
  dayId: string,
  step: number,
) {
  const day = findJourneyDay(state, kind, dayId);
  const entry = day?.references.flatMap((ref) =>
    ref.problemIds.map((problemId, index) => ({
      sessionId: ref.id,
      problemId,
      unitId: ref.unitIds[index],
    })),
  )[step - 1];
  if (!entry) throw missing();
  return entry;
}
const stableSeed = (key: string) =>
  createHash("sha256").update(key).digest().readUInt32LE(0);
function stableId(key: string) {
  const hash = createHash("sha256").update(key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function elementarySource(
  state: StoredSrsState,
  step: number,
  now: Date,
  dayId?: string,
): ReplaySource {
  const course = state.course;
  if (!course) throw missing();
  const today = kstDateOf(now);
  // Match the daily board's first-attempt count, including older completed sessions.
  // Retry attempts never occupy another tile and never change this mapping.
  const sessions = [
    ...course.history.map(({ session }) => session),
    ...(course.learner.session ? [course.learner.session] : []),
  ];
  const entries = sessions.flatMap((session) =>
    session.attempts
      .filter((attempt) => kstDateOf(new Date(attempt.answeredAt)) === today)
      .map((attempt) => ({ session, attempt })),
  );
  const archived = dayId
    ? archivedReference(state, "elementary", dayId, step)
    : null;
  const retained = archived
    ? sessions.find((session) => session.id === archived.sessionId)
    : null;
  const entry = archived
    ? retained &&
      retained.attempts.find(
        (attempt) => attempt.problemId === archived.problemId,
      )
      ? {
          session: retained,
          attempt: retained.attempts.find(
            (attempt) => attempt.problemId === archived.problemId,
          )!,
        }
      : null
    : entries[step - 1];
  if (!entry && archived && dayId) {
    // Detailed sessions are bounded. Revisit the recorded unit with a stable
    // generated question, explicitly labelled as such instead of claiming an original.
    for (let offset = 0; offset < 20; offset++) {
      const generated = generateCourseSession(
        archived.unitId,
        stableSeed(`${dayId}:${step}:${offset}`),
        new Date(
          `${findJourneyDay(state, "elementary", dayId)!.date}T00:00:00.000Z`,
        ),
        "review",
      );
      generated.id = stableId(`${dayId}:${step}:session`);
      generated.problems = generated.problems.map((p, index) => ({
        ...p,
        id: stableId(`${dayId}:${step}:${offset}:${index}`),
      }));
      for (const problem of generated.problems) {
        const view = publicCourseSession(generated).problems.find(
          (p) => p.id === problem.id,
        )!;
        if (
          !view.answerChoices ||
          view.answerChoices.filter(
            (choice) => gradeCourseAnswer(problem, choice) === true,
          ).length !== 1 ||
          view.answerChoices.some(
            (choice) => gradeCourseAnswer(problem, choice) === null,
          )
        )
          continue;
        const section = getCourseSection(problem.sectionId)!;
        return {
          public: {
            kind: "elementary",
            step,
            problemId: problem.id,
            title: section.title,
            subtitle: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
            content: view.content,
            figureUrl: problem.figureSpec
              ? `/api/learn/math-srs/replay?kind=elementary&step=${step}&dayId=${encodeURIComponent(dayId)}&figure=true`
              : null,
            answerChoices: view.answerChoices,
            interactive: view.interactive,
            canRevealSolution: true,
            regenerated: true,
          },
          grade: (answer) => gradeCourseAnswer(problem, answer) === true,
          solution: { answer: problem.answer, solution: problem.solution },
          figureSpec: problem.figureSpec,
        };
      }
    }
    throw unsupported();
  }
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
    figureSpec: problem.figureSpec,
  };
}

function middleSource(
  state: StoredSrsState,
  step: number,
  now: Date,
  missionId?: string,
  dayId?: string,
): ReplaySource {
  // A mission started yesterday can still be the board's active mission today.
  const archived = dayId
    ? archivedReference(state, "middle", dayId, step)
    : null;
  const targetId = archived?.sessionId ?? missionId;
  const mission = targetId
    ? state.missions.find((item) => item.id === targetId)
    : currentSrsMission(state, now);
  let problem = archived
    ? mission?.problems.find((p) => p.id === archived.problemId)
    : mission?.problems[step - 1];
  let regenerated = false;
  if (!problem && archived && dayId) {
    // 미션이 90개를 넘어 잘린 옛 일차 — 원래 문항이 없으니 새로 만든다. 학생 복습 미션과 같은
    // 폰 «한 걸음» 문항으로(원장님 확정 2026-09-27 · B2 §8.5). 채점·보기 경로는 보기형도 탄다.
    const generated = quickMissionProblem({
      conceptId: archived.unitId as ConceptId,
      difficulty: 2,
      seed: stableSeed(`${dayId}:${step}`),
    });
    problem = { ...generated, id: stableId(`${dayId}:${step}:middle`) };
    regenerated = true;
  }
  if (
    !problem ||
    (!regenerated &&
      (!mission || !mission.attempts.some((a) => a.problemId === problem.id)))
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
      answerChoices: srsAnswerChoices(problem, mission?.problems ?? [problem]),
      interactive: null,
      canRevealSolution:
        regenerated ||
        (!!mission?.completedAt &&
          mission.attempts.every(
            (a) =>
              a.correct ||
              mission.resolvedRetryProblemIds?.includes(a.problemId),
          )),
      ...(regenerated ? { regenerated: true } : {}),
    },
    grade: (answer) => gradeSrsAnswer(problem, answer),
    solution: {
      answer:
        correctSrsChoice(problem) ??
        problem.answerText ??
        `$${problem.answer}$${problem.answerUnit ?? ""}`,
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
  dayId?: string,
): MathSrsReplay {
  const source =
    kind === "elementary"
      ? elementarySource(state, step, now, dayId ?? input?.dayId)
      : middleSource(state, step, now, input?.missionId, dayId ?? input?.dayId);
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

export function replayFigureSpec(
  state: StoredSrsState,
  kind: MathSrsReplayKind,
  step: number,
  dayId: string,
  now: Date,
) {
  if (kind !== "elementary") throw missing();
  return elementarySource(state, step, now, dayId).figureSpec ?? null;
}
