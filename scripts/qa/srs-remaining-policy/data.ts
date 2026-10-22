import {
  createExplorerState,
  explorerView,
  applyExplorerAction,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionQuestionId,
  definitionNeedsRead,
  definitionOptions,
} from "@/lib/math-explorers/definition-cards";
import { explorerTeacherDetail } from "@/lib/math-explorers/teacherSummary";
import {
  courseSummary,
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
} from "@/lib/math-srs/courseAutomation";
import type { CourseStudentDetail } from "@/contracts/mathSrsCourse.contract";
import {
  courseDashboardResponseSchema,
  courseStudentDetailResponseSchema,
} from "@/contracts/mathSrsCourse.contract";
import { explorerTeacherStudentResponseSchema } from "@/contracts/mathExplorersTeacher.contract";
export const today = "2026-10-22";
export const studentId = "11111111-1111-4111-8111-111111111111";
export const classId = "22222222-2222-4222-8222-222222222222";
const now = new Date(`${today}T03:00:00Z`);
export let explorer = createExplorerState(studentId, 5);
explorer = applyExplorerAction(
  explorer,
  { type: "start", route: "unit", unitId: "g5-estimate" },
  today,
  crypto.randomUUID(),
).state;
for (let i = 0; i < 80; i++) {
  const session = explorer.profile.definitions!.session!;
  if (session.done) break;
  const questionId = definitionQuestionId(session);
  if (definitionNeedsRead(explorer.profile, session)) {
    explorer = applyExplorerAction(
      explorer,
      { type: "read", questionId },
      today,
      crypto.randomUUID(),
    ).state;
    continue;
  }
  const task = session.queue[session.index];
  const card = definitionCard(task.cardId);
  const correct =
    task.kind === 0
      ? [0, 1]
      : task.kind === 1
        ? card.examples.flatMap((example, i) => (example.yes ? [i] : []))
        : [Number(card.truth)];
  const order = definitionOptions(session, task);
  explorer = applyExplorerAction(
    explorer,
    {
      type: "answer",
      questionId,
      choiceIds: correct.map((id) => order.indexOf(id)),
    },
    today,
    crypto.randomUUID(),
  ).state;
}
let course = startAutomaticCourse(
  setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 5,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  ),
  now,
  71,
  () => crypto.randomUUID(),
);
const session = course.learner.session!;
for (const p of session.problems)
  course = submitCourseAttempt(
    course,
    { sessionId: session.id, problemId: p.id, submittedAnswer: p.answer },
    now,
  );
export const learner = {
  id: studentId,
  name: "로컬 검증",
  classId,
  className: "초5 검증반",
  classGrade: "초5",
  hasAccount: true,
  revision: 1,
  plan: course.plan!,
  summary: courseSummary(course, now),
};
export const otherStudentId = "44444444-4444-4444-8444-444444444444";
const otherLearner = {
  ...learner,
  id: otherStudentId,
  name: "다음 학생",
  summary: courseSummary(
    setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "5-2-1-1",
        dailyQuestionCount: 5,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    ),
    now,
  ),
};
export const dashboard = courseDashboardResponseSchema.parse({
  data: {
    management: { canOpen: true, branchId: null, branchRole: null },
    classes: [{ id: classId, name: learner.className }],
    students: [learner, otherLearner],
  },
});
export function courseDetail(mode: string, id = studentId) {
  const detail: CourseStudentDetail = {
    student: id === studentId ? learner : otherLearner,
    sections: [],
    activity:
      mode === "explorer-only" || id !== studentId ? [] : course.activity,
    recentSessions: [],
    recentAttempts: [],
  };
  return courseStudentDetailResponseSchema.parse({ data: detail });
}
export function explorerDetail(mode: string, id = studentId) {
  return explorerTeacherStudentResponseSchema.parse({
    data: {
      student: {
        id,
        name: id === studentId ? learner.name : otherLearner.name,
        classId,
        className: learner.className,
        hasAccount: true,
      },
      today,
      policy: 2,
      detail: explorerTeacherDetail(
        mode === "course-only" || id !== studentId
          ? null
          : { explorers: explorer },
        today,
      ),
    },
  });
}
export const studentState = {
  ...explorerView(explorer, today),
  student: { id: studentId, name: learner.name, className: learner.className },
  revision: 1,
  feedback: null,
};
