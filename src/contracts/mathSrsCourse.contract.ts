import { z } from "zod";
import { mathSrsJourneySchema } from "./mathSrsJourney.contract";
import {
  dataResponseSchema,
  difficultySchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import {
  prerequisiteContextSchema,
  prerequisiteTeacherEvidenceSchema,
} from "./mathPrerequisite.contract";

export const courseSectionIdSchema = z
  .string()
  .refine((id) => !!getCourseSection(id), "학습할 소단원을 선택해 주세요.");
export const courseDailyGoalSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);
export const coursePlanSchema = z.strictObject({
  startSectionId: courseSectionIdSchema,
  dailyQuestionCount: courseDailyGoalSchema,
  enabled: z.boolean(),
  configuredAt: isoDateTimeSchema,
});
export type CoursePlan = z.infer<typeof coursePlanSchema>;
export const coursePlanInputSchema = coursePlanSchema
  .omit({ configuredAt: true })
  .extend({ expectedRevision: z.number().int().nonnegative() });
export type CoursePlanInput = z.infer<typeof coursePlanInputSchema>;

export const courseSummarySchema = z.strictObject({
  status: z.enum([
    "setup",
    "paused",
    "learning",
    "review",
    "ready",
    "done",
    "complete",
  ]),
  currentSectionId: courseSectionIdSchema.nullable(),
  dueCount: z.number().int().nonnegative(),
  todayAnswered: z.number().int().nonnegative(),
  todayCorrect: z.number().int().nonnegative(),
  todayGoal: courseDailyGoalSchema,
  completedSections: z.number().int().nonnegative(),
  lastPracticedAt: isoDateTimeSchema.nullable(),
  nextReviewAt: isoDateTimeSchema.nullable(),
  recommendation: z
    .strictObject({
      sectionId: courseSectionIdSchema,
      mode: z.enum(["learn", "review", "resume"]),
      reason: z.string(),
    })
    .nullable(),
});
export type CourseSummary = z.infer<typeof courseSummarySchema>;
const solutionSchema = z.strictObject({
  answer: z.string(),
  solution: z.string(),
});
export const coursePublicProblemSchema = z.strictObject({
  id: uuidSchema,
  sectionId: courseSectionIdSchema,
  tier: difficultySchema,
  content: z.string(),
  figureUrl: z.string().nullable(),
  answerChoices: z.array(z.string()).length(4).nullable(),
  interactive: z
    .strictObject({
      kind: z.literal("fraction-parts"),
      denominator: z.number().int().min(2).max(12),
      shape: z.literal("bar"),
    })
    .nullable(),
  input: z.strictObject({
    mode: z.enum(["number", "text", "self-check"]),
    label: z.string(),
    placeholder: z.string(),
    help: z.string(),
  }),
  hint: solutionSchema.nullable(),
  feedback: z.strictObject({ correct: z.boolean() }).nullable(),
  /**
   * After a wrong first answer: `awaiting` a second answer, `correct` on the second
   * try, or the `solution` is open (second miss · gave up · self-check «다시 연습»).
   * `done` once the student pressed «알겠어요» · «다음». Read before the server sends it
   * (plan §3.2 — the reader ships first).
   */
  followUp: z
    .strictObject({
      state: z.enum(["awaiting", "correct", "solution"]),
      done: z.boolean(),
    })
    .nullable()
    .optional(),
});
export type CoursePublicProblem = z.infer<typeof coursePublicProblemSchema>;
export const coursePublicAttemptSchema = z.strictObject({
  problemId: uuidSchema,
  submittedAnswer: z.string(),
  correct: z.boolean(),
  usedHint: z.boolean(),
  selfAssessed: z.boolean(),
  answeredAt: isoDateTimeSchema,
});
export const coursePublicSessionSchema = z.strictObject({
  id: uuidSchema,
  sectionId: courseSectionIdSchema,
  mode: z.enum(["learn", "review"]),
  problems: z.array(coursePublicProblemSchema).length(5),
  attempts: z.array(coursePublicAttemptSchema).max(5),
  retry: z
    .strictObject({
      pendingProblemIds: z.array(uuidSchema).max(5),
      attempts: z.array(coursePublicAttemptSchema),
      completedAt: isoDateTimeSchema.nullable(),
    })
    .nullable(),
  startedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
});
export type CoursePublicSession = z.infer<typeof coursePublicSessionSchema>;
export const courseHintInputSchema = z.strictObject({
  sessionId: uuidSchema,
  problemId: uuidSchema,
});
export type CourseHintInput = z.infer<typeof courseHintInputSchema>;
export const courseAttemptInputSchema = courseHintInputSchema.extend({
  submittedAnswer: z.string().trim().max(2000),
  selfCorrect: z.boolean().optional(),
  giveUp: z.boolean().optional(),
  retryIndex: z.number().int().min(0).optional(),
});
export type CourseAttemptInput = z.infer<typeof courseAttemptInputSchema>;
export const courseStudentStateSchema = z.strictObject({
  journey: mathSrsJourneySchema.optional(),
  prerequisiteContext: prerequisiteContextSchema.optional(),
  student: z.strictObject({
    id: uuidSchema,
    name: z.string(),
    classId: uuidSchema,
    className: z.string(),
  }),
  revision: z.number().int().nonnegative(),
  plan: coursePlanSchema.nullable(),
  summary: courseSummarySchema,
  session: coursePublicSessionSchema.nullable(),
});
export type CourseStudentState = z.infer<typeof courseStudentStateSchema>;
export const courseStudentResponseSchema = dataResponseSchema(
  courseStudentStateSchema,
);
export const courseRosterStudentSchema = courseStudentStateSchema
  .omit({
    student: true,
    session: true,
    journey: true,
    prerequisiteContext: true,
  })
  .extend({
    id: uuidSchema,
    name: z.string(),
    classId: uuidSchema,
    className: z.string(),
    hasAccount: z.boolean(),
    // Enrollment grade; never inferred from the student's personal school grade.
    classGrade: z.string().nullable().optional(),
  });
export type CourseRosterStudent = z.infer<typeof courseRosterStudentSchema>;
export const courseDashboardSchema = z.strictObject({
  management: z
    .strictObject({
      canOpen: z.boolean(),
      isSuperAdmin: z.boolean().optional(),
      branchId: uuidSchema.nullable(),
      branchRole: z.enum(["owner", "manager", "teacher"]).nullable(),
    })
    .optional(),
  classes: z.array(z.strictObject({ id: uuidSchema, name: z.string() })),
  students: z.array(courseRosterStudentSchema),
});
export type CourseDashboard = z.infer<typeof courseDashboardSchema>;
export const courseDashboardResponseSchema = dataResponseSchema(
  courseDashboardSchema,
);
export const courseRosterStudentResponseSchema = dataResponseSchema(
  courseRosterStudentSchema,
);

export const courseSectionReportSchema = z.strictObject({
  sectionId: courseSectionIdSchema,
  completedSessions: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  unaidedCorrect: z.number().int().nonnegative(),
  hinted: z.number().int().nonnegative(),
  selfAssessed: z.number().int().nonnegative(),
  mastery: z.number().min(0).max(100),
  estimatedRecall: z.number().min(0).max(100),
  stabilityDays: z.number().positive(),
  lastReviewedAt: isoDateTimeSchema,
  nextReviewAt: isoDateTimeSchema,
});
export const courseActivityDaySchema = z.strictObject({
  date: z.iso.date(),
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  unaidedCorrect: z.number().int().nonnegative(),
  hinted: z.number().int().nonnegative(),
});
export const courseSessionReportSchema = z.strictObject({
  id: uuidSchema,
  sectionId: courseSectionIdSchema,
  mode: z.enum(["learn", "review"]),
  startedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  answered: z.number().int().min(0).max(5),
  correct: z.number().int().min(0).max(5),
  hinted: z.number().int().min(0).max(5),
});
export const courseRecentAttemptSchema = coursePublicAttemptSchema.extend({
  sessionId: uuidSchema,
  sectionId: courseSectionIdSchema,
  content: z.string(),
  answer: z.string(),
  solution: z.string(),
});
export const courseStudentDetailSchema = z.strictObject({
  student: courseRosterStudentSchema,
  prerequisite: prerequisiteTeacherEvidenceSchema.optional(),
  sections: z.array(courseSectionReportSchema),
  activity: z.array(courseActivityDaySchema),
  recentSessions: z.array(courseSessionReportSchema),
  recentAttempts: z.array(courseRecentAttemptSchema),
});
export type CourseStudentDetail = z.infer<typeof courseStudentDetailSchema>;
export const courseStudentDetailResponseSchema = dataResponseSchema(
  courseStudentDetailSchema,
);
