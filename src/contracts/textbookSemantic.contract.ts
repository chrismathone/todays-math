import { z } from "zod";
import {
  textbookIdSchema,
  textbookKeySchema,
  textbookTextSchema,
} from "./textbookPrimitives.contract";

/** Independent activities. This vocabulary is shared by the request, manuscript and renderer. */
export const TEXTBOOK_ACTIVITIES = [
  "unitIntro",
  "dialogue",
  "concepts",
  "termRecall",
  "clozeRecall",
  "sentenceRecall",
  "practice",
  "workedExamples",
  "review",
  "assessment",
  "written",
  "rest",
  "cover",
  "learningGuide",
  "learningPlan",
  "questionLog",
  "preparation",
  "errorCheck",
  "tableOfContents",
  "dialogueCheck",
  "conceptStudy",
  "conceptBlankTest",
  "basicCheck",
  "explainActivity",
  "conceptMap",
  "reasoning",
  "conceptIndex",
  "typeIndex",
] as const;
export const textbookActivitySchema = z.enum(TEXTBOOK_ACTIVITIES);

export const textbookDialoguePresentationSchema = z.strictObject({
  kind: z.enum(["speech", "board"]),
  lessonKey: z.string().min(1).max(120),
  lessonTitle: z.string().min(1).max(200),
});

export const textbookSemanticRowSchema = z.strictObject({
  rowKey: textbookKeySchema,
  label: z.string().max(200),
  /** Canonical source text; delimiters are interpreted only by the display adapter. */
  rawText: textbookTextSchema,
  textFormat: z.enum(["markdown", "bank-blank", "v15-tex"]).optional(),
});
export const textbookSemanticSourceSchema = z.strictObject({
  unit: z.string().min(1).max(200),
  page: z.number().int().positive().max(10_000),
  kind: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
  scriptIndex: z.number().int().nonnegative().optional(),
  blockIndex: z.number().int().nonnegative().optional(),
  questionId: z.string().min(1).max(200).optional(),
});
const referenceEntrySchema = z.strictObject({
  key: textbookKeySchema,
  label: z.string().min(1).max(500),
  targetSectionKey: textbookKeySchema.optional(),
  targetUnitKey: textbookKeySchema.optional(),
  targetItemId: textbookIdSchema.optional(),
  targetConceptId: textbookKeySchema.optional(),
  pageLabel: z.string().max(40).optional(),
});
export type TextbookSourceFragment = {
  tag:
    | "div"
    | "section"
    | "span"
    | "p"
    | "h2"
    | "h3"
    | "h4"
    | "strong"
    | "em"
    | "ul"
    | "ol"
    | "li"
    | "table"
    | "thead"
    | "tbody"
    | "tr"
    | "th"
    | "td"
    | "br"
    | "img";
  attributes?: {
    className?: string;
    colSpan?: number;
    rowSpan?: number;
    assetId?: string;
    alt?: string;
  };
  rawText?: string;
  children?: TextbookSourceFragment[];
};
/** Source layout is a bounded allowlist tree, never executable HTML or arbitrary attributes. */
export const textbookSourceFragmentSchema: z.ZodType<TextbookSourceFragment> =
  z.lazy(() =>
    z
      .strictObject({
        tag: z.enum([
          "div",
          "section",
          "span",
          "p",
          "h2",
          "h3",
          "h4",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "br",
          "img",
        ]),
        attributes: z
          .strictObject({
            className: z
              .string()
              .max(500)
              .regex(/^[A-Za-z0-9 _-]*$/)
              .optional(),
            colSpan: z.number().int().min(1).max(20).optional(),
            rowSpan: z.number().int().min(1).max(100).optional(),
            assetId: textbookIdSchema.optional(),
            alt: z.string().max(500).optional(),
          })
          .optional(),
        rawText: textbookTextSchema.optional(),
        children: z.array(textbookSourceFragmentSchema).max(500).optional(),
      })
      .superRefine((fragment, ctx) => {
        if (fragment.tag === "img" && !fragment.attributes?.assetId)
          ctx.addIssue({
            code: "custom",
            path: ["attributes", "assetId"],
            message: "그림은 고정 자산 ID가 필요합니다.",
          });
        if (
          fragment.tag !== "img" &&
          (fragment.attributes?.assetId || fragment.attributes?.alt)
        )
          ctx.addIssue({
            code: "custom",
            path: ["attributes"],
            message: "그림 속성은 img 노드에만 허용됩니다.",
          });
        if (
          fragment.tag === "img" &&
          (fragment.rawText || fragment.children?.length)
        )
          ctx.addIssue({
            code: "custom",
            message: "그림 노드는 본문이나 자식 노드를 갖지 않습니다.",
          });
      }),
  );
export const textbookSemanticNodeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("writing"),
    prompts: z.array(textbookTextSchema).min(1).max(100),
    lines: z.number().int().min(1).max(30),
  }),
  z.strictObject({
    kind: z.literal("board"),
    title: z.string().max(200),
    tex: textbookTextSchema,
    note: textbookTextSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("concept"),
    conceptId: textbookKeySchema,
    title: z.string().max(200),
    rows: z.array(textbookSemanticRowSchema).min(1).max(200),
  }),
  z.strictObject({
    kind: z.literal("rows"),
    rows: z.array(textbookSemanticRowSchema).min(1).max(200),
    groupKey: textbookKeySchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("exampleGroup"),
    groupId: textbookKeySchema,
    title: z.string().max(200),
    strategy: textbookTextSchema,
    exampleItemId: textbookIdSchema,
    confirmItemIds: z.array(textbookIdSchema).min(1).max(20),
  }),
  z.strictObject({
    kind: z.literal("referencePage"),
    referenceKind: z.string().min(1).max(100),
    sourcePage: z.number().int().positive().max(10_000),
  }),
  z.strictObject({
    kind: z.literal("unitIntro"),
    question: textbookTextSchema,
    explanation: textbookTextSchema,
    goals: z.array(textbookTextSchema).max(100),
    path: z.array(textbookTextSchema).max(100),
    check: z.array(textbookTextSchema).max(100),
    dateLabel: z.string().max(200).optional(),
  }),
  z.strictObject({
    kind: z.literal("references"),
    entries: z.array(referenceEntrySchema).max(5000),
  }),
  z.strictObject({
    kind: z.literal("fragments"),
    fragments: z.array(textbookSourceFragmentSchema).min(1).max(500),
  }),
]);

/** Every persisted field is optional: parsing an old edition must not change its manifest hash. */
export const textbookSemanticSchema = z
  .strictObject({
    activity: textbookActivitySchema,
    source: textbookSemanticSourceSchema.optional(),
    title: z.string().max(200).optional(),
    subtitle: z.string().max(500).optional(),
    continuation: z.boolean().optional(),
    node: textbookSemanticNodeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.node?.kind !== "fragments") return;
    let count = 0;
    const walk = (nodes: TextbookSourceFragment[], depth: number): boolean => {
      if (depth > 20) return false;
      for (const node of nodes) {
        if (
          ++count > 3000 ||
          (node.children && !walk(node.children, depth + 1))
        )
          return false;
      }
      return true;
    };
    if (!walk(value.node.fragments, 1))
      ctx.addIssue({
        code: "custom",
        path: ["node", "fragments"],
        message: "원본 구조의 깊이 또는 노드 수가 상한을 넘습니다.",
      });
  });
export type TextbookActivity = z.infer<typeof textbookActivitySchema>;
export type TextbookDialoguePresentation = z.infer<
  typeof textbookDialoguePresentationSchema
>;
export type TextbookSemantic = z.infer<typeof textbookSemanticSchema>;
export type TextbookSemanticRow = z.infer<typeof textbookSemanticRowSchema>;
