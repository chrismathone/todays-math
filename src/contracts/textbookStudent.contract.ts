import { z } from "zod";
import {
  textbookIdSchema,
  textbookKeySchema,
  textbookDateSchema,
  textbookFormSchema,
  textbookTitleSchema,
  textbookHashSchema,
} from "./textbookPrimitives.contract";

/** Student questions are built on the server. No teacher payload, key text or hidden answers. */
export const textbookStudentBlankSchema = z.strictObject({
  form: z.enum(["recall", "term", "cloze"]),
  prompts: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(160),
        label: z.string().max(300),
        pieces: z
          .array(
            z.discriminatedUnion("kind", [
              z.strictObject({
                kind: z.literal("text"),
                text: z.string().max(10_000),
              }),
              z.strictObject({
                kind: z.literal("blank"),
                index: z.number().int().nonnegative(),
              }),
            ]),
          )
          .max(200),
      }),
    )
    .max(2000),
});
export const textbookReviewAccessSchema = z.strictObject({
  available: z.boolean(),
  reasonCode: z.string().max(100).nullable(),
});
export const textbookReviewStartSchema = z
  .strictObject({
    status: z.enum(["started", "resumed", "deferred", "unavailable"]),
    reasonCode: z.string().max(100).nullable(),
    replayed: z.boolean(),
    href: z.literal("/learn?view=collection").nullable(),
  })
  .superRefine((result, ctx) => {
    if (result.status === "started" && result.replayed)
      ctx.addIssue({
        code: "custom",
        path: ["replayed"],
        message: "재시도 응답을 새 활동 시작으로 표시할 수 없습니다.",
      });
    if (
      result.status === "unavailable" &&
      (!result.reasonCode || result.href !== null)
    )
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "복습을 열 수 없는 이유가 필요하며 시작 링크는 없어야 합니다.",
      });
  });
export const textbookStudentConceptSchema = z.strictObject({
  editionId: z.uuid(),
  conceptKey: textbookKeySchema,
  title: textbookTitleSchema,
  frozenHash: textbookHashSchema,
  blanks: z.array(textbookStudentBlankSchema).max(3),
  paperForms: z.array(z.enum(["map", "figure"])).max(2),
  reviewAccess: textbookReviewAccessSchema,
});
const studentAttemptFields = {
  attemptId: z.uuid(),
  form: textbookFormSchema,
  submittedAt: textbookDateSchema,
  reviewStatus: z.enum(["pending", "checked", "needs-review"]),
};
export const textbookStudentAttemptSchema = z.discriminatedUnion("channel", [
  z.strictObject({
    ...studentAttemptFields,
    channel: z.literal("student-text"),
    response: z.string().max(20_000),
  }),
  z.strictObject({
    ...studentAttemptFields,
    channel: z.literal("teacher-observed"),
    response: z.null(),
  }),
]);
export const textbookStudentAssetSchema = z.strictObject({
  assetId: textbookIdSchema,
  url: z
    .string()
    .regex(
      /^\/api\/learn\/textbook\/q\/[A-Za-z0-9_-]+\/assets\/[A-Za-z0-9_-]+$/,
    ),
  widthPx: z.number().int().positive().nullable(),
  heightPx: z.number().int().positive().nullable(),
  choiceIndex: z.number().int().nonnegative().nullable(),
  sourceWidthMm: z.number().positive().nullable(),
  altText: z.string().max(2000).nullable(),
});
export const textbookStudentVideoSchema = z
  .discriminatedUnion("state", [
    z.strictObject({
      state: z.literal("ready"),
      providerVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      startSeconds: z.number().nonnegative(),
      endSeconds: z.number().positive().nullable(),
    }),
    z.strictObject({
      state: z.literal("preparing"),
      providerVideoId: z.null(),
      startSeconds: z.literal(0),
      endSeconds: z.null(),
    }),
    z.strictObject({
      state: z.literal("withdrawn"),
      providerVideoId: z.null(),
      startSeconds: z.literal(0),
      endSeconds: z.null(),
    }),
  ])
  .refine(
    (video) =>
      video.endSeconds === null || video.endSeconds > video.startSeconds,
    "종료 시점은 시작 뒤여야 합니다.",
  );
/** Assigned QR solution access is explicit and distinct from answerless blank activities. */
export const textbookStudentQrSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("problem"),
    editionId: z.uuid(),
    itemId: z.uuid(),
    title: textbookTitleSchema,
    displayNumber: z.string().max(40),
    content: z.string().max(100_000),
    answer: z.string().max(100_000),
    solution: z.string().max(100_000).nullable(),
    figures: z.array(textbookStudentAssetSchema).max(200),
    video: textbookStudentVideoSchema,
    concepts: z
      .array(
        z.strictObject({
          conceptKey: textbookKeySchema,
          title: textbookTitleSchema,
        }),
      )
      .max(100),
  }),
  z.strictObject({
    kind: z.literal("concept"),
    concept: textbookStudentConceptSchema,
    video: textbookStudentVideoSchema,
  }),
]);
export type TextbookStudentConcept = z.infer<
  typeof textbookStudentConceptSchema
>;
export type TextbookStudentBlank = z.infer<typeof textbookStudentBlankSchema>;
export type TextbookStudentQr = z.infer<typeof textbookStudentQrSchema>;
export type TextbookReviewStart = z.infer<typeof textbookReviewStartSchema>;
