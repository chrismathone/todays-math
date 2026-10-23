import type { StoredSrsState } from "@/lib/math-srs/serverState";
import {
  retainedSessions,
  sessionOutcome,
} from "@/lib/math-prerequisite/evidence";
/** Read-only descriptive projection. Body/answer/input strings never leave this module. Existing grading/count rules remain the authority. */
export function projectRetainedMathOntologyLearning(
  state: StoredSrsState | null,
  now: Date,
  observedAfter?: string,
) {
  const after = observedAfter ? Date.parse(observedAfter) : -Infinity,
    until = now.getTime();
  if (Number.isNaN(after) || !Number.isFinite(until))
    throw new Error("Invalid source observation window");
  const course = state?.course;
  const firstAttempts: {
    id: string;
    domain: "course";
    sessionId: string;
    problemId: string;
    sectionId: string;
    answeredAt: string;
    completedAt: string | null;
    correct: boolean;
    independentFirstAttempt: boolean;
    eligibleForPlanObservation: boolean;
    exclusions: string[];
  }[] = [];
  const followUps: {
    id: string;
    domain: "course-follow-up";
    sessionId: string;
    problemId: string;
    sectionId: string;
    answeredAt: string;
    kind: "retry" | "reveal";
    correct: boolean;
    independentFirstAttempt: false;
    exclusions: string[];
  }[] = [];
  if (course)
    for (const s of retainedSessions(course)) {
      for (const [index, a] of s.attempts.entries()) {
        if (
          Date.parse(a.answeredAt) < after ||
          Date.parse(a.answeredAt) > until
        )
          continue;
        const problem = s.problems[index];
        if (!problem || problem.id !== a.problemId)
          throw new Error("Retained source attempt identity mismatch");
        const before = sessionOutcome(course, {
            ...s,
            attempts: s.attempts.slice(0, index),
          }),
          through = sessionOutcome(course, {
            ...s,
            attempts: s.attempts.slice(0, index + 1),
          });
        const independent =
          through.independentCorrect + through.independentIncorrect >
          before.independentCorrect + before.independentIncorrect;
        const exclusions: string[] = [];
        if (!s.completedAt) exclusions.push("unfinished");
        if (
          Date.parse(s.startedAt) > until ||
          (s.completedAt && Date.parse(s.completedAt) > until)
        )
          exclusions.push("future");
        if (a.usedHint || (s.hintedProblemIds ?? []).includes(a.problemId))
          exclusions.push("hint");
        if (a.selfAssessed || problem.input.mode === "self-check")
          exclusions.push("self-check");
        if (a.submittedAnswer === "") exclusions.push("give-up");
        if (!independent && !exclusions.length)
          exclusions.push("duplicate-or-not-independent");
        if (!course.plan) exclusions.push("no-plan-context");
        else if (s.startedAt < course.plan.configuredAt)
          exclusions.push("before-plan");
        firstAttempts.push({
          id: `course:${s.id}:${a.problemId}:first`,
          domain: "course",
          sessionId: s.id,
          problemId: a.problemId,
          sectionId: s.sectionId,
          answeredAt: a.answeredAt,
          completedAt: s.completedAt,
          correct: a.correct,
          independentFirstAttempt: independent,
          eligibleForPlanObservation: independent && !exclusions.length,
          exclusions,
        });
      }
      for (const [index, a] of (s.followUps ?? []).entries())
        if (
          Date.parse(a.answeredAt) >= after &&
          Date.parse(a.answeredAt) <= until
        )
          followUps.push({
            id: `course:${s.id}:${a.problemId}:follow-up:${index}`,
            domain: "course-follow-up",
            sessionId: s.id,
            problemId: a.problemId,
            sectionId: s.sectionId,
            answeredAt: a.answeredAt,
            kind: a.kind,
            correct: a.correct,
            independentFirstAttempt: false,
            exclusions: ["follow-up-not-first-attempt"],
          });
      for (const [index, a] of (s.retry?.attempts ?? []).entries())
        if (
          Date.parse(a.answeredAt) >= after &&
          Date.parse(a.answeredAt) <= until
        )
          followUps.push({
            id: `course:${s.id}:${a.problemId}:retry:${index}`,
            domain: "course-follow-up",
            sessionId: s.id,
            problemId: a.problemId,
            sectionId: s.sectionId,
            answeredAt: a.answeredAt,
            kind: "retry",
            correct: a.correct,
            independentFirstAttempt: false,
            exclusions: ["retry-not-first-attempt"],
          });
    }
  const definitions = state?.explorers?.profile.definitions;
  const explorerCards = Object.entries(definitions?.cards ?? {}).map(
    ([cardId, p]) => ({
      cardId,
      level: p.level,
      due: p.due,
      lastDate: p.lastDate,
      attemptedAt: p.attemptedAt,
      missed: p.missed,
      lastRecall: p.lastRecall ?? null,
      independentFirstAttempt: false as const,
      exclusions: ["summary-only", "date-only", "not-independently-graded"],
    }),
  );
  const explorerDays = (state?.explorers?.completedDays ?? [])
    .filter(
      (d) =>
        Date.parse(d.date + "T23:59:59.999Z") >= after &&
        Date.parse(d.date + "T00:00:00.000Z") <= until,
    )
    .slice(-90)
    .map((d) => ({
      date: d.date,
      unitId: d.unitId,
      sessionId: d.sessionId,
      cardIds: d.cardIds ?? null,
      route: d.route ?? null,
      reviewVariantIdentity: d.reviewVariant ?? null,
      exclusions: ["date-only", "retained-replay-not-first-attempt-evidence"],
    }));
  const fadingConcepts = Object.entries(state?.fading?.concepts ?? {}).map(
    ([conceptId, p]) => ({
      conceptId,
      step: p.step,
      reviewedOn: p.reviewedOn,
      dueOn: p.dueOn,
      reviews: p.reviews,
      lapses: p.lapses,
      storedContentFingerprint: p.digest,
      independentFirstAttempt: false as const,
      exclusions: ["self-rating-summary", "date-only", "not-server-graded"],
    }),
  );
  const legacyAttempts = (state?.missions ?? []).flatMap((s) =>
    s.attempts
      .filter(
        (a) =>
          Date.parse(a.answeredAt) >= after &&
          Date.parse(a.answeredAt) <= until,
      )
      .map((a) => ({
        id: `legacy:${s.id}:${a.problemId}`,
        missionId: s.id,
        problemId: a.problemId,
        conceptId: a.conceptId,
        templateId: a.templateId,
        answeredAt: a.answeredAt,
        correct: a.correct,
        usedHint: a.usedHint,
        independentFirstAttempt: false as const,
        exclusions: ["legacy-observation-not-course-first-attempt"],
      })),
  );
  return {
    sourcePresence: state ? "retained" : "missing",
    storedCoursePlan: course?.plan ?? null,
    firstAttempts,
    followUps,
    legacyAttempts,
    explorerCards,
    explorerDays,
    fadingConcepts,
    activeExplorerSession: definitions?.session
      ? {
          id: definitions.session.id,
          unitId: definitions.session.unit,
          date: definitions.session.date,
          route: definitions.session.route ?? null,
          round: definitions.session.round,
          done: definitions.session.done,
          followUpState: definitions.session.followUp?.state ?? null,
        }
      : null,
    minuteRelearning: state?.fading?.relearn
      ? {
          pending: state.fading.relearn.items.length,
          graded: state.fading.relearn.graded.length,
          independentFirstAttempt: false as const,
          exclusions: [
            "minute-relearning-not-long-term-fsrs",
            "not-first-attempt",
          ],
        }
      : null,
    retention: {
      completeHistoricalCoverage: false,
      courseRetainedSessions: course ? retainedSessions(course).length : 0,
      courseSessionLimit: 30,
      courseRecentAttemptLimit: 100,
      explorerRetainedDays: state?.explorers?.completedDays.length ?? 0,
      explorerDaysReturned: explorerDays.length,
      explorerReturnedDayLimit: 90,
      fadingDayLimit: 400,
    },
    window: { after: observedAfter ?? null, until: now.toISOString() },
  };
}
export type MathOntologyRetainedLearningProjection = ReturnType<
  typeof projectRetainedMathOntologyLearning
>;
