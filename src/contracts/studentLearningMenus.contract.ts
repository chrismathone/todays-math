import { z } from "zod";

/** Exploration and its collection are always available. Extra modules require a manager's grant. */
export const STUDENT_OPTIONAL_MENUS = [
  "lectures",
  "textbook",
  "english-listening",
] as const;
export const studentOptionalMenuSchema = z.enum(STUDENT_OPTIONAL_MENUS);
export type StudentOptionalMenu = z.infer<typeof studentOptionalMenuSchema>;

export const studentLearningMenusSchema = z
  .array(studentOptionalMenuSchema)
  .max(STUDENT_OPTIONAL_MENUS.length)
  .refine(
    (menus) => new Set(menus).size === menus.length,
    "같은 메뉴를 두 번 선택할 수 없습니다.",
  );

export const studentLearningMenuLabels: Record<StudentOptionalMenu, string> = {
  lectures: "강의",
  textbook: "교재 QR 학습",
  "english-listening": "영어 듣기",
};

export const storedStudentLearningMenusSchema = z.strictObject({
  version: z.literal(1),
  enabled: studentLearningMenusSchema,
});

export const studentLearningMenusRequestSchema = z.strictObject({
  enabled: studentLearningMenusSchema,
});

export const studentLearningMenusResponseSchema = z.strictObject({
  data: z.strictObject({
    enabled: studentLearningMenusSchema,
    canManage: z.boolean(),
    updatedAt: z.iso.datetime({ offset: true }).nullable(),
  }),
});
export type StudentLearningMenusPanel = z.infer<
  typeof studentLearningMenusResponseSchema
>["data"];

export const DEFAULT_STUDENT_LEARNING_MENUS: readonly StudentOptionalMenu[] =
  Object.freeze([]);
