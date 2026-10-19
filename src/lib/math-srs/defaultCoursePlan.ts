import { bankSectionsForExplorerUnit } from "@/lib/math-explorers/curriculumBridge";
import { kstDateOf } from "@/lib/kstDate";
import { emptyCourseState, setCoursePlan } from "./courseAutomation";
import { COURSE_SECTIONS, getCourseSection } from "./elementary/catalog";
import type { StoredSrsState } from "./serverState";

/** The daily amount of a plan the student did not get from a teacher. */
const DEFAULT_DAILY_QUESTIONS = 10;

/**
 * The first course section of the class grade's current semester (owner, 2026-10-19:
 * «반 학년 + 지금 학기로 시작»). March to August is the first semester; September to
 * February the second — January and February still belong to that class grade.
 * Only the exact labels 초3 ~ 초6 have an elementary course.
 */
export function defaultCourseStartSection(
  classGrade: string | null | undefined,
  now: Date,
): string | null {
  const match = /^초([3-6])$/.exec(classGrade ?? "");
  if (!match) return null;
  const month = Number(kstDateOf(now).slice(5, 7));
  const semester = month >= 3 && month <= 8 ? 1 : 2;
  const grade = Number(match[1]);
  return (
    COURSE_SECTIONS.filter(
      (s) => s.grade === grade && s.semester === semester,
    ).sort((a, b) => a.order - b.order)[0]?.id ?? null
  );
}

/**
 * A student whose course has no plan gets the default one. Reads apply it without saving so the
 * home, the journey and today's plan already show the class grade; a write that starts learning
 * keeps it (its CAS re-runs this on the latest state, so a plan a teacher saved meanwhile wins).
 * A stored explorer goal decides the start, so the expedition and the course do not split.
 * Without a default (no plan needed, or not 초3 ~ 초6) the same state object comes back.
 */
export function withDefaultCoursePlan(
  state: StoredSrsState,
  classGrade: string | null | undefined,
  now: Date,
): StoredSrsState {
  if (state.course?.plan) return state;
  const fallback = defaultCourseStartSection(classGrade, now);
  if (!fallback) return state;
  const goal = state.explorers?.profile.definitions?.goalUnitId;
  const goalSection = goal ? bankSectionsForExplorerUnit(goal)[0] : undefined;
  // A middle goal's bank sections are not elementary course sections.
  const startSectionId =
    goalSection && getCourseSection(goalSection) ? goalSection : fallback;
  return {
    ...state,
    course: setCoursePlan(
      state.course ?? emptyCourseState(),
      {
        startSectionId,
        dailyQuestionCount: DEFAULT_DAILY_QUESTIONS,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    ),
  };
}
