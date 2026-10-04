import { z } from "zod";
import {
  textbookBookSummarySchema,
  textbookRequestSchema,
} from "./textbook.contract";
import { textbookTitleSchema } from "./textbookPrimitives.contract";

const scopeFields = {
  schoolLevel: z.enum(["elementary", "middle"]),
  grade: z.number().int().min(1).max(6),
  semester: z.union([z.literal(1), z.literal(2)]),
};
function supportedGrade(value: { schoolLevel: string; grade: number }) {
  return value.schoolLevel === "elementary"
    ? value.grade >= 3 && value.grade <= 6
    : value.grade <= 3;
}
export const quickCreateScopeSchema = z
  .strictObject(scopeFields)
  .refine(supportedGrade, {
    path: ["grade"],
    message: "자동 교재는 초3~초6, 중1~중3을 지원합니다.",
  });
export const quickCreateDifficultySchema = z.enum([
  "basic",
  "standard",
  "challenge",
]);
export const DEFAULT_QUICK_CREATE_COMPONENTS = {
  unitIntro: true,
  dialogue: true,
  concepts: true,
  termRecall: true,
  clozeRecall: true,
  sentenceRecall: true,
  practice: true,
  workedExamples: false,
  review: false,
  assessment: false,
  written: false,
  rest: false,
  cover: true,
  learningGuide: false,
  learningPlan: false,
  questionLog: false,
  preparation: false,
  errorCheck: false,
  tableOfContents: false,
  dialogueCheck: false,
  conceptStudy: false,
  conceptBlankTest: false,
  basicCheck: false,
  explainActivity: false,
  conceptMap: false,
  reasoning: false,
  conceptIndex: false,
  typeIndex: false,
} as const;
export const RECOMMENDED_QUICK_CREATE_COMPONENTS = {
  ...DEFAULT_QUICK_CREATE_COMPONENTS,
  workedExamples: true,
  learningGuide: true,
  tableOfContents: true,
  conceptStudy: true,
  termRecall: false,
} as const;
export function minimumQuickCreateProblemCount(components: {
  practice: boolean;
  workedExamples: boolean;
  review: boolean;
  assessment: boolean;
  written: boolean;
  basicCheck: boolean;
  reasoning: boolean;
}): number {
  return Math.max(
    1,
    [
      components.practice,
      components.workedExamples,
      components.review,
      components.assessment,
      components.written,
      components.basicCheck,
      components.reasoning,
    ].filter(Boolean).length + Number(components.workedExamples),
  );
}
export const quickCreateComponentsSchema = z.strictObject({
  unitIntro: z.boolean(),
  dialogue: z.boolean(),
  concepts: z.boolean(),
  termRecall: z.boolean(),
  clozeRecall: z.boolean(),
  sentenceRecall: z.boolean(),
  practice: z.boolean(),
  workedExamples: z.boolean().default(false),
  review: z.boolean(),
  assessment: z.boolean(),
  written: z.boolean(),
  rest: z.boolean().default(false),
  cover: z.boolean().default(true),
  learningGuide: z.boolean().default(false),
  learningPlan: z.boolean().default(false),
  questionLog: z.boolean().default(false),
  preparation: z.boolean().default(false),
  errorCheck: z.boolean().default(false),
  tableOfContents: z.boolean().default(false),
  dialogueCheck: z.boolean().default(false),
  conceptStudy: z.boolean().default(false),
  conceptBlankTest: z.boolean().default(false),
  basicCheck: z.boolean().default(false),
  explainActivity: z.boolean().default(false),
  conceptMap: z.boolean().default(false),
  reasoning: z.boolean().default(false),
  conceptIndex: z.boolean().default(false),
  typeIndex: z.boolean().default(false),
});
export const quickCreateCastSchema = z.strictObject({
  teacherId: z.string().regex(/^teacher-[fm][1-5]$/),
  student1Id: z.string().regex(/^student-[fm][1-5]$/),
  student2Id: z.string().regex(/^student-[fm][1-5]$/),
});
export const quickCreateInputSchema = textbookRequestSchema
  .extend({
    ...scopeFields,
    startUnitId: z.uuid(),
    endUnitId: z.uuid(),
    difficulty: quickCreateDifficultySchema,
    /** Target maximum per curriculum section, shared between enabled problem components. */
    problemCountPerUnit: z.number().int().min(1).max(30),
    includeConcepts: z.boolean(),
    title: textbookTitleSchema
      .transform((title) => title.trim())
      .refine((title) => title.length > 0)
      .optional(),
    components: quickCreateComponentsSchema.optional(),
    cast: quickCreateCastSchema.optional(),
  })
  .refine(supportedGrade, {
    path: ["grade"],
    message: "자동 교재는 초3~중3을 지원합니다.",
  })
  .superRefine((input, ctx) => {
    const components = effectiveQuickCreateComponents(input);
    if (
      !Object.entries(components).some(
        ([key, enabled]) => key !== "cover" && enabled,
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["components"],
        message: "교재 구성요소를 하나 이상 선택하세요.",
      });
    if (components.workedExamples && input.problemCountPerUnit < 2)
      ctx.addIssue({
        code: "custom",
        path: ["problemCountPerUnit"],
        message:
          "대표예제와 확인문제는 한 쌍이므로 문항 수를 2개 이상 선택하세요.",
      });
    else if (
      minimumQuickCreateProblemCount(components) > input.problemCountPerUnit
    )
      ctx.addIssue({
        code: "custom",
        path: ["problemCountPerUnit"],
        message:
          "선택한 문제 활동마다 최소 1문항이 필요하며 대표예제와 확인문제는 2문항으로 셉니다.",
      });
  });
export type QuickCreateComponents = z.infer<typeof quickCreateComponentsSchema>;
export type QuickCreateCast = z.infer<typeof quickCreateCastSchema>;
export type QuickCreateScope = z.infer<typeof quickCreateScopeSchema>;
export type QuickCreateInput = z.input<typeof quickCreateInputSchema>;
export function effectiveQuickCreateComponents(input: {
  includeConcepts: boolean;
  components?: Partial<QuickCreateComponents>;
}): QuickCreateComponents {
  const result = { ...DEFAULT_QUICK_CREATE_COMPONENTS, ...input.components };
  if (!input.includeConcepts) {
    result.dialogue = false;
    result.concepts = false;
    result.termRecall = false;
    result.clozeRecall = false;
    result.sentenceRecall = false;
    result.preparation = false;
    result.errorCheck = false;
    result.dialogueCheck = false;
    result.conceptStudy = false;
    result.conceptBlankTest = false;
    result.basicCheck = false;
    result.explainActivity = false;
    result.conceptMap = false;
    result.conceptIndex = false;
  }
  return result;
}

/** The new UI sends its explicit selections; old API callers keep includeConcepts semantics. */
export function quickCreateSelectionInput(components: QuickCreateComponents) {
  const conceptActivities: (keyof QuickCreateComponents)[] = [
    "dialogue",
    "concepts",
    "termRecall",
    "clozeRecall",
    "sentenceRecall",
    "preparation",
    "errorCheck",
    "dialogueCheck",
    "conceptStudy",
    "conceptBlankTest",
    "basicCheck",
    "explainActivity",
    "conceptMap",
    "conceptIndex",
  ];
  return {
    components,
    includeConcepts: conceptActivities.some((key) => components[key]),
  };
}
export const quickCreateCatalogSchema = z.strictObject({
  units: z
    .array(
      z.strictObject({
        id: z.uuid(),
        chapter: z.string().min(1).max(100),
        section: z.string().min(1).max(100),
        label: z.string().min(1).max(300),
        problemCount: z.number().int().nonnegative(),
        conceptCount: z.number().int().nonnegative(),
        /** Bank eligibility counts; actual printable counts may be lower if figures are missing. */
        availability: z
          .strictObject({
            basic: z.strictObject({
              total: z.number().int().nonnegative(),
              written: z.number().int().nonnegative(),
            }),
            standard: z.strictObject({
              total: z.number().int().nonnegative(),
              written: z.number().int().nonnegative(),
            }),
            challenge: z.strictObject({
              total: z.number().int().nonnegative(),
              written: z.number().int().nonnegative(),
            }),
          })
          .optional(),
      }),
    )
    .max(500),
});
export const quickCreateResultSchema = z.strictObject({
  book: textbookBookSummarySchema,
  problemCount: z.number().int().nonnegative(),
  conceptCount: z.number().int().nonnegative(),
  warnings: z.array(z.string().min(1).max(2000)).max(1000),
});
export type QuickCreateCatalog = z.infer<typeof quickCreateCatalogSchema>;
export type QuickCreateResult = z.infer<typeof quickCreateResultSchema>;
