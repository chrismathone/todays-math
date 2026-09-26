import { z } from "zod";
import type { MathSrsJourney } from "@/contracts/mathSrsJourney.contract";
import { kstDateOf } from "@/lib/kstDate";
import { CONCEPTS } from "./concepts";
import { courseSummary } from "./courseAutomation";
import { COURSE_SECTIONS, getCourseSection } from "./elementary/catalog";
import { CONCEPT_IDS } from "./types";
import type { StoredSrsState } from "./serverState";

const referenceSchema = z.strictObject({
  id: z.uuid(),
  unitIds: z.array(z.string().min(1)).min(1).max(20),
  problemIds: z.array(z.uuid()).min(1).max(20),
});
const daySchema = z.strictObject({
  date: z.iso.date(),
  goal: z.number().int().min(1).max(500),
  answered: z.number().int().nonnegative(),
  completedAt: z.iso.datetime().nullable(),
  references: z.array(referenceSchema),
});
/** Permanent compact metadata, independent of the bounded detailed history. */
export const storedDailyJourneySchema = z
  .strictObject({
    elementary: z.array(daySchema),
    middle: z.array(daySchema),
  })
  .superRefine((ledger, ctx) => {
    for (const kind of ["elementary", "middle"] as const) {
      const dates = new Set<string>();
      for (const day of ledger[kind]) {
        if (dates.has(day.date) || (day.completedAt && day.answered < day.goal))
          ctx.addIssue({
            code: "custom",
            message: "학습 일차 기록이 올바르지 않습니다.",
          });
        dates.add(day.date);
        if (
          day.references.some(
            (ref) =>
              ref.unitIds.length !== ref.problemIds.length ||
              ref.unitIds.some((id) =>
                kind === "elementary"
                  ? !getCourseSection(id)
                  : !CONCEPT_IDS.includes(id as (typeof CONCEPT_IDS)[number]),
              ),
          )
        )
          ctx.addIssue({
            code: "custom",
            message: "학습 일차의 단원 기록이 올바르지 않습니다.",
          });
      }
    }
  });
export type StoredDailyJourney = z.infer<typeof storedDailyJourneySchema>;
export type JourneyKind = keyof StoredDailyJourney;
export type StoredJourneyDay = StoredDailyJourney[JourneyKind][number];

function collect(
  state: StoredSrsState,
  ledger: StoredDailyJourney,
): StoredDailyJourney {
  const result: StoredDailyJourney = {
    elementary: ledger.elementary.map((day) => ({
      ...day,
      references: [...day.references],
    })),
    middle: ledger.middle.map((day) => ({
      ...day,
      references: [...day.references],
    })),
  };
  const course = state.course;
  const sessions = course
    ? [
        ...course.history.map((entry) => entry.session),
        ...(course.learner.session ? [course.learner.session] : []),
      ]
    : [];
  for (const session of sessions) {
    for (const date of new Set(
      session.attempts.map((a) => kstDateOf(new Date(a.answeredAt))),
    )) {
      let day = result.elementary.find((entry) => entry.date === date);
      if (!day) {
        day = {
          date,
          goal:
            course!.dailyGoalSnapshot?.date === date
              ? course!.dailyGoalSnapshot.goal
              : (course!.plan?.dailyQuestionCount ?? 10),
          answered: 0,
          completedAt: null,
          references: [],
        };
        result.elementary.push(day);
      }
      const attempts = session.attempts.filter(
        (a) => kstDateOf(new Date(a.answeredAt)) === date,
      );
      const ref = {
        id: session.id,
        unitIds: attempts.map(() => session.sectionId),
        problemIds: attempts.map((a) => a.problemId),
      };
      const index = day.references.findIndex(
        (entry) => entry.id === session.id,
      );
      if (index < 0) day.references.push(ref);
      else day.references[index] = ref;
      day.answered = Math.max(
        day.answered,
        course!.activity.find((a) => a.date === date)?.answered ?? 0,
      );
    }
  }
  for (const mission of state.missions) {
    if (!mission.attempts.length) continue;
    let day = result.middle.find((entry) => entry.date === mission.date);
    if (!day) {
      day = {
        date: mission.date,
        goal: 12,
        answered: 0,
        completedAt: null,
        references: [],
      };
      result.middle.push(day);
    }
    const ref = {
      id: mission.id,
      unitIds: mission.attempts.map((a) => a.conceptId),
      problemIds: mission.attempts.map((a) => a.problemId),
    };
    const index = day.references.findIndex((entry) => entry.id === mission.id);
    if (index < 0) day.references.push(ref);
    else day.references[index] = ref;
    day.answered = Math.max(
      day.answered,
      day.references.reduce(
        (count, entry) => count + entry.problemIds.length,
        0,
      ),
    );
  }
  for (const kind of ["elementary", "middle"] as const) {
    for (const day of result[kind]) {
      if (day.completedAt || day.answered < day.goal || !day.references.length)
        continue;
      const completedTimes = day.references.map((ref) => {
        if (kind === "elementary") {
          const session = sessions.find((entry) => entry.id === ref.id);
          if (
            !session?.completedAt ||
            (session.retry && !session.retry.completedAt)
          )
            return null;
          return session.retry?.completedAt ?? session.completedAt;
        }
        const mission = state.missions.find((entry) => entry.id === ref.id);
        if (
          !mission?.completedAt ||
          mission.attempts.some(
            (a) =>
              !a.correct &&
              !mission.resolvedRetryProblemIds?.includes(a.problemId),
          )
        )
          return null;
        return mission.retryCompletedAt ?? mission.completedAt;
      });
      // Missing archived details never certify a previously incomplete day.
      if (completedTimes.every((time): time is string => time !== null))
        day.completedAt = completedTimes.sort().at(-1)!;
    }
    result[kind].sort((a, b) => a.date.localeCompare(b.date));
  }
  return result;
}

/** Run before AND after a mutation: the goal in effect before learning is immutable. */
export function updateDailyJourney(
  previous: StoredSrsState,
  next: StoredSrsState,
): StoredSrsState {
  const before = collect(
    previous,
    previous.dailyJourney ?? { elementary: [], middle: [] },
  );
  return { ...next, dailyJourney: collect(next, before) };
}

/** Legacy records gain only days that can be proven complete from retained attempts. */
export function dailyJourneyLedger(state: StoredSrsState): StoredDailyJourney {
  return collect(state, state.dailyJourney ?? { elementary: [], middle: [] });
}

function unitLabel(kind: JourneyKind, unitId: string) {
  if (kind === "middle")
    return {
      title: CONCEPTS.find((c) => c.id === unitId)?.title ?? "일차방정식",
      subtitle: "중1 · 일차방정식",
    };
  const section = getCourseSection(unitId);
  return section
    ? {
        title: section.title,
        subtitle: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
      }
    : { title: "수학 복습", subtitle: "초등 복습" };
}

export function dailyJourneyDto(
  state: StoredSrsState,
  kind: JourneyKind,
  now: Date,
): MathSrsJourney {
  const ledger = dailyJourneyLedger(state)[kind];
  const today = kstDateOf(now);
  const current = ledger.find((day) => day.date === today);
  const days = ledger
    .filter((day) => day.completedAt)
    .map((day) => {
      const units = [...new Set(day.references.flatMap((ref) => ref.unitIds))];
      const label = unitLabel(kind, units[0]);
      return {
        id: `${kind}:${day.date}`,
        date: day.date,
        completedAt: day.completedAt!,
        title:
          units.length > 1
            ? `${label.title} 외 ${units.length - 1}개 단원`
            : label.title,
        subtitle: label.subtitle,
        reviewCount: day.references.reduce(
          (count, ref) => count + ref.problemIds.length,
          0,
        ),
      };
    });
  const todayComplete = days.some(
    (day) =>
      day.date === today || kstDateOf(new Date(day.completedAt)) === today,
  );
  let todayAnswered = current?.answered ?? 0;
  let todayGoal =
    current?.goal ??
    (kind === "middle" ? 12 : (state.course?.plan?.dailyQuestionCount ?? 10));
  let upcoming: MathSrsJourney["upcoming"];
  if (kind === "elementary") {
    const summary = state.course ? courseSummary(state.course, now) : null;
    const start =
      summary?.recommendation?.sectionId ??
      summary?.currentSectionId ??
      state.course?.plan?.startSectionId ??
      COURSE_SECTIONS[0].id;
    const firstIndex = COURSE_SECTIONS.findIndex(
      (section) => section.id === start,
    );
    upcoming = COURSE_SECTIONS.slice(Math.max(0, firstIndex))
      .filter(
        (section, index) =>
          index === 0 ||
          !state.course?.completedSectionIds.includes(section.id),
      )
      .map((section) => unitLabel(kind, section.id));
    if (!current) todayAnswered = summary?.todayAnswered ?? 0;
  } else {
    const pending = state.missions.find(
      (mission) =>
        !mission.completedAt ||
        mission.attempts.some(
          (a) =>
            !a.correct &&
            !mission.resolvedRetryProblemIds?.includes(a.problemId),
        ),
    );
    if (pending) {
      todayAnswered = pending.attempts.length;
      todayGoal = 12;
    }
    const firstConcept =
      pending?.problems[pending.attempts.length]?.conceptId ??
      pending?.problems[0]?.conceptId;
    const firstIndex = Math.max(
      0,
      CONCEPTS.findIndex((c) => c.id === firstConcept),
    );
    upcoming = Array.from({ length: 12 }, (_, index) =>
      unitLabel(kind, CONCEPTS[(firstIndex + index) % CONCEPTS.length].id),
    );
  }
  return {
    completedDays: days.length,
    todayComplete,
    todayAnswered,
    todayGoal,
    days,
    upcoming,
  };
}

export function findJourneyDay(
  state: StoredSrsState,
  kind: JourneyKind,
  dayId: string,
): StoredJourneyDay | undefined {
  return dailyJourneyLedger(state)[kind].find(
    (day) => `${kind}:${day.date}` === dayId && day.completedAt !== null,
  );
}
