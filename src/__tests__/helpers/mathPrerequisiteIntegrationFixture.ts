import { randomUUID } from "node:crypto";
import {
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import { exposedContents } from "@/lib/math-prerequisite/evidence";
import { supplySafeSession } from "@/lib/math-prerequisite/supply";

export function finishPrerequisiteFixture(
  initial: StoredCourse,
  at: Date,
  wrong = 0,
): StoredCourse {
  let course = initial;
  while (!course.learner.session!.completedAt) {
    const session = course.learner.session!;
    const index = session.attempts.length;
    const problem = session.problems[index];
    const submittedAnswer =
      index < wrong
        ? problem.answerChoices!.find(
            (choice) => gradeCourseAnswer(problem, choice) === false,
          )!
        : problem.answer;
    course = submitCourseAttempt(
      course,
      {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer,
      },
      at,
    );
  }
  while (
    course.learner.session!.retry &&
    !course.learner.session!.retry!.completedAt
  ) {
    const session = course.learner.session!;
    course = submitCourseAttempt(
      course,
      {
        sessionId: session.id,
        problemId: session.retry!.pendingProblemIds[0],
        submittedAnswer: "",
        giveUp: true,
        retryIndex: session.retry!.attempts.length,
      },
      at,
    );
  }
  return storedCourseSchema.parse(course);
}

export function fixtureSession(
  course: StoredCourse,
  sectionId: string,
  mode: "learn" | "review",
  at: Date,
  key: string,
): StoredCourse {
  const supplied = supplySafeSession({
    sectionId,
    mode,
    now: at,
    key,
    avoid: exposedContents(course),
  });
  if (!supplied.ok) throw new Error(`Fixture supply exhausted: ${sectionId}`);
  return startRecommendedCourse(
    course,
    {
      sectionId,
      mode,
      reason: "격리 검증 fixture",
    },
    at,
    supplied.seed,
    randomUUID,
    [],
    {
      ...supplied,
      sectionId,
      mode,
    },
  );
}

/** Real first-pass learn + review failures, separated in time and content. */
export function failedTargetCourse(
  now: Date,
  goal: 5 | 10 | 15 | 20 = 10,
  target = "5-2-2-1",
): StoredCourse {
  const day = 86_400_000;
  let course = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: target,
      dailyQuestionCount: goal,
      enabled: true,
      expectedRevision: 0,
    },
    new Date(now.getTime() - 7 * day),
  );
  for (const [index, mode] of ["learn", "review"].entries()) {
    const at = new Date(now.getTime() - (5 - index * 3) * day);
    course = fixtureSession(
      course,
      target,
      mode as "learn" | "review",
      at,
      `fixture-target-${index}-${target}`,
    );
    course = finishPrerequisiteFixture(course, at, 2);
  }
  return course;
}
