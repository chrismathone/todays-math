import type { CourseSummary } from "@/contracts/mathSrsCourse.contract";
import { kstDateOf } from "@/lib/kstDate";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { mathPrerequisiteEnabled } from "./enabled";
import {
  prerequisiteStep,
  type PrerequisiteBudget,
  type PrerequisiteDecision,
} from "./policy";

/** The course's frozen daily goal; expeditions supply their own remaining budget. */
export function coursePrerequisiteBudget(
  course: StoredCourse,
  now: Date,
): PrerequisiteBudget {
  const today = kstDateOf(now);
  const answered =
    course.activity.find((day) => day.date === today)?.answered ?? 0;
  return {
    answered,
    goal:
      course.dailyGoalSnapshot?.date === today && answered > 0
        ? course.dailyGoalSnapshot.goal
        : (course.plan?.dailyQuestionCount ?? 10),
  };
}

export function coursePrerequisiteDecision(
  course: StoredCourse,
  now: Date,
  budget = coursePrerequisiteBudget(course, now),
): PrerequisiteDecision | null {
  return prerequisiteStep(course, now, mathPrerequisiteEnabled(), budget);
}

export function prerequisiteRecommendation(
  decision: PrerequisiteDecision,
): CourseSummary["recommendation"] {
  return decision.canStart && decision.mode
    ? {
        sectionId: decision.sectionId,
        mode: decision.mode,
        reason: decision.reason,
      }
    : null;
}
