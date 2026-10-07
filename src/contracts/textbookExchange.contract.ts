import { z } from "zod";
import { textbookConceptIntegrationSchema } from "./textbookConcept.contract";
import {
  textbookDialoguePresentationSchema,
  textbookSemanticSchema,
} from "./textbookSemantic.contract";
import {
  textbookCanonicalizationVersion,
  textbookDateSchema,
  textbookHashSchema,
  textbookIdSchema,
  textbookKeySchema,
  textbookRevisionSchema,
  textbookTextSchema,
  textbookTitleSchema,
  textbookVersion,
} from "./textbookPrimitives.contract";

export const textbookLearningStageSchema = z.enum([
  "preparation",
  "worked-example",
  "concept-check",
  "basic",
  "type-practice",
  "application",
  "error-check",
  "written",
  "cumulative-review",
  "unit-assessment",
]);
export const textbookLinkStatusSchema = z.enum([
  "unlinked",
  "candidate",
  "linked",
  "needs-review",
]);
export const textbookSourceRefSchema = z.discriminatedUnion("system", [
  z.strictObject({
    system: z.literal("todays-math"),
    problemId: z.uuid(),
    problemCode: z.string().min(1).max(100),
  }),
  z.strictObject({
    system: z.literal("legacy-studio"),
    legacyId: textbookIdSchema,
  }),
  z.strictObject({
    system: z.literal("studio-authored"),
    localId: textbookIdSchema,
  }),
]);
export const textbookPackagePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (path) =>
      !path.includes("\\") &&
      !path.includes(":") &&
      !path.includes("%") &&
      !/[\x00-\x1f\x7f]/.test(path) &&
      path
        .split("/")
        .every(
          (part) =>
            part.length > 0 &&
            part !== "." &&
            part !== ".." &&
            !/[. ]$/.test(part),
        ),
    "안전한 패키지 상대 경로가 필요합니다.",
  );
export const textbookAssetSchema = z
  .strictObject({
    assetId: textbookIdSchema,
    packagePath: textbookPackagePathSchema,
    mimeType: z.enum([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "font/woff2",
      "font/woff",
      "font/ttf",
    ]),
    sha256: textbookHashSchema,
    widthPx: z.number().int().positive().max(100_000).nullable(),
    heightPx: z.number().int().positive().max(100_000).nullable(),
  })
  .superRefine((asset, ctx) => {
    if ((asset.widthPx === null) !== (asset.heightPx === null))
      ctx.addIssue({
        code: "custom",
        message: "실측 폭과 높이를 함께 지정하세요.",
      });
  });
export const textbookFigureSchema = z.strictObject({
  assetId: textbookIdSchema,
  sha256: textbookHashSchema,
  choiceIndex: z.number().int().min(0).max(100).nullable(),
  sourceWidthMm: z.number().positive().max(1000).nullable(),
  altText: z.string().max(2000).nullable(),
});
export const textbookProblemPayloadSchema = z.strictObject({
  format: z.literal("markdown-latex"),
  content: textbookTextSchema,
  answer: textbookTextSchema,
  solution: textbookTextSchema.nullable(),
  questionType: z.string().max(100).nullable(),
  figures: z.array(textbookFigureSchema).max(200),
});
export const textbookSourceMetadataSchema = z.strictObject({
  unitId: z.uuid().nullable(),
  grade: z.string().max(20).nullable(),
  chapter: z.string().max(200).nullable(),
  section: z.string().max(200).nullable(),
  difficulty: z.string().max(40).nullable(),
  originalScore: z.number().nonnegative().max(10_000).nullable(),
});
/** Raw arrays preserve even malformed alignments; validation separately reports renderability. */
export const textbookRawSourceSchema = z.strictObject({
  figureUrls: z.array(z.string().max(4000)).max(200),
  figureDims: z.array(z.number()).max(400),
  figureSourceMm: z.array(z.number()).max(200),
  choiceFigureIndex: z.array(z.number()).max(200),
  figureSvgAssetId: textbookIdSchema.nullable(),
});
export const textbookProblemSnapshotSchema = z
  .strictObject({
    snapshotId: textbookIdSchema,
    source: textbookSourceRefSchema,
    sourceUpdatedAt: textbookDateSchema.nullable(),
    capturedAt: textbookDateSchema,
    unitId: z.uuid().nullable(),
    familyKey: z.string().max(2000).nullable(),
    difficulty: z.string().max(40).nullable(),
    problemType: z.string().max(100).nullable(),
    payload: textbookProblemPayloadSchema,
    contentHash: textbookHashSchema,
    rawSource: textbookRawSourceSchema.optional(),
    sourceMetadata: textbookSourceMetadataSchema.optional(),
    snapshotHash: textbookHashSchema.optional(),
  })
  .superRefine((snapshot, ctx) => {
    if (
      snapshot.sourceMetadata &&
      (snapshot.unitId !== snapshot.sourceMetadata.unitId ||
        snapshot.difficulty !== snapshot.sourceMetadata.difficulty)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceMetadata"],
        message: "캡처 당시 단원·난도가 스냅샷 메타데이터와 다릅니다.",
      });
    }
  });
export const textbookItemLayoutSchema = z
  .strictObject({
    columnSpan: z.union([z.literal(1), z.literal(2)]),
    minWorkLines: z.number().int().min(0).max(100),
    preferredWorkLines: z.number().int().min(0).max(100),
    maxWorkLines: z.number().int().min(0).max(100),
    keepTogether: z.boolean(),
  })
  .refine(
    (layout) =>
      layout.minWorkLines <= layout.preferredWorkLines &&
      layout.preferredWorkLines <= layout.maxWorkLines,
    "최소 풀이선 ≤ 선호 풀이선 ≤ 최대 풀이선이어야 합니다.",
  );
export const textbookItemSchema = z.strictObject({
  itemId: textbookIdSchema,
  editionId: textbookIdSchema,
  snapshotId: textbookIdSchema,
  linkStatus: textbookLinkStatusSchema,
  sourceTestId: z.uuid().nullable(),
  sourceTestProblemId: z.uuid().nullable(),
  unitKey: textbookKeySchema,
  sectionKey: textbookKeySchema,
  learningStage: textbookLearningStageSchema,
  displayNumber: z.string().min(1).max(40),
  orderIndex: z.number().int().nonnegative().max(100_000),
  layout: textbookItemLayoutSchema,
  qrTargetId: textbookIdSchema.nullable(),
  conceptKeys: z.array(textbookKeySchema).max(100).optional(),
  videoRequired: z.boolean().optional(),
});
export const textbookConfigSchema = z
  .strictObject({
    bookId: textbookIdSchema,
    schoolLevel: z.enum(["elementary", "middle", "high"]),
    grade: z.number().int().min(1).max(6),
    semester: z.union([z.literal(1), z.literal(2)]),
    volume: z.number().int().min(1).max(100),
    volumeCount: z.number().int().min(1).max(100),
    displayCode: z.string().min(1).max(40),
    title: textbookTitleSchema,
    curriculumVersion: z.string().min(1).max(80),
    mode: z.enum(["integrated", "concept", "practice"]),
    pageBudget: z.strictObject({
      target: z.number().int().min(1).max(5000),
      tolerance: z.number().int().min(0).max(1000),
      strict: z.boolean(),
    }),
    print: z.strictObject({
      paper: z.literal("A4"),
      innerMarginMm: z.number().min(8).max(40),
      outerMarginMm: z.number().min(8).max(40),
      sectionStart: z.literal("even-left"),
      coverMode: z.enum(["included", "separate"]),
      firstPhysicalPageIndex: z.number().int().min(1).max(1000),
    }),
    videoPolicy: z.enum(["required", "optional"]),
    // Absence means closed. An explicit assignment and this policy are both required by the QR reader.
    studentSolutionPolicy: z.enum(["never", "assigned"]).optional(),
  })
  .superRefine((config, ctx) => {
    if (config.volume > config.volumeCount)
      ctx.addIssue({
        code: "custom",
        path: ["volume"],
        message: "권 번호가 전체 권 수보다 클 수 없습니다.",
      });
    if (config.schoolLevel !== "elementary" && config.grade > 3)
      ctx.addIssue({
        code: "custom",
        path: ["grade"],
        message: "중·고등학교 학년은 1~3입니다.",
      });
  });
export const textbookDialogueTurnSchema = z.strictObject({
  speakerId: textbookIdSchema,
  side: z.enum(["left", "right"]),
  expression: z.enum(["neutral", "question", "thinking", "aha"]),
  portraitAssetId: textbookIdSchema,
  mirrorPortrait: z.boolean(),
  markdown: textbookTextSchema,
  presentation: textbookDialoguePresentationSchema.optional(),
});
export const textbookBlockSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("text"),
      markdown: textbookTextSchema,
      semantic: textbookSemanticSchema.optional(),
    }),
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("problem"),
      itemId: textbookIdSchema,
      semantic: textbookSemanticSchema.optional(),
    }),
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("image"),
      assetId: textbookIdSchema,
      caption: z.string().max(2000).nullable(),
      semantic: textbookSemanticSchema.optional(),
    }),
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("dialogue"),
      turns: z.array(textbookDialogueTurnSchema).min(1).max(200),
      semantic: textbookSemanticSchema.optional(),
    }),
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("concept"),
      conceptKey: textbookKeySchema,
      semantic: textbookSemanticSchema.optional(),
    }),
    z.strictObject({
      blockId: textbookIdSchema,
      kind: z.literal("concept-recall"),
      phase: z.enum(["study", "keywords", "sentences"]),
      markdown: textbookTextSchema,
      showRepetitionChecks: z.boolean(),
      conceptKey: textbookKeySchema.optional(),
      semantic: textbookSemanticSchema.optional(),
    }),
  ])
  .superRefine((block, ctx) => {
    if (block.semantic?.node?.kind === "conceptQuestions") {
      const node = block.semantic.node;
      if (
        block.kind !== "concept-recall" ||
        block.phase !== "sentences" ||
        ![
          "termRecall",
          "sentenceRecall",
          "explainActivity",
          "conceptMap",
          "preparation",
        ].includes(block.semantic.activity)
      )
        ctx.addIssue({
          code: "custom",
          message:
            "개념 질문은 해당 질문 활동의 문장 회상 블록에만 사용합니다.",
        });
      if (
        block.kind === "concept-recall" &&
        block.markdown !==
          node.questions.map(({ question }) => question.prompt).join("\n\n")
      )
        ctx.addIssue({
          code: "custom",
          path: ["markdown"],
          message: "질문 본문과 고정한 물음이 일치하지 않습니다.",
        });
    }
    if (
      block.kind === "concept-recall" &&
      block.phase !== "study" &&
      block.showRepetitionChecks
    )
      ctx.addIssue({
        code: "custom",
        path: ["showRepetitionChecks"],
        message: "핵심어·문장 단계에는 반복 확인란을 표시하지 않습니다.",
      });
  });
/**
 * 구획 정답 메모 — 교사만 보는 구획 단위 자유 글이다. 문항 정답(`ProblemPayload.answer`)과 다르다.
 * 🔴 없으면 **칸을 뺀다.** 빈 글 · null · 파싱 기본값을 두지 않는다 — manifest 가 `units` 를 통째로 해시하므로
 *    빈 값을 실으면 이미 발행한 판본의 해시가 달라진다. 학생 지면 · 학생 응답에는 싣지 않는다.
 */
export const textbookTeacherAnswerSchema = textbookTextSchema.refine(
  (value) => value.trim().length > 0,
  "구획 정답 메모가 비어 있습니다. 비우려면 칸을 빼 주세요.",
);
export const textbookSectionSchema = z.strictObject({
  sectionKey: textbookKeySchema,
  title: textbookTitleSchema,
  templateKey: textbookIdSchema,
  startPolicy: z.enum(["even-left", "continue"]),
  blocks: z.array(textbookBlockSchema).max(5000),
  teacherAnswer: textbookTeacherAnswerSchema.optional(),
});
export const textbookUnitSchema = z.strictObject({
  unitKey: textbookKeySchema,
  title: textbookTitleSchema,
  sourceUnitIds: z.array(z.uuid()).max(200),
  prerequisites: z.array(z.string().max(2000)).max(100),
  goals: z.array(z.string().max(2000)).max(100),
  conceptLectureRefs: z
    .array(
      z.strictObject({ lectureId: z.uuid(), conceptKey: textbookKeySchema }),
    )
    .max(100),
  sections: z.array(textbookSectionSchema).max(500),
});
export const textbookQrUrlSchema = z
  .url()
  .max(2000)
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  }, "QR은 자격증명·쿼리 없는 영구 HTTPS 주소여야 합니다.");
const qrFields = {
  qrTargetId: textbookIdSchema,
  editionId: textbookIdSchema,
  slug: z
    .string()
    .min(16)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  url: textbookQrUrlSchema,
};
export const textbookQrTargetSchema = z.strictObject({
  ...qrFields,
  itemId: textbookIdSchema,
});
export const textbookConceptQrTargetSchema = z.strictObject({
  ...qrFields,
  conceptKey: textbookKeySchema,
});
export const textbookVideoBindingSchema = z
  .strictObject({
    bindingId: textbookIdSchema,
    snapshotId: textbookIdSchema,
    videoId: textbookIdSchema,
    status: z.enum(["draft", "review", "published", "withdrawn"]),
    startSeconds: z.number().nonnegative().max(86_400),
    endSeconds: z.number().positive().max(86_400).nullable(),
    reviewedAgainstHash: textbookHashSchema.nullable(),
  })
  .superRefine((binding, ctx) => {
    if (
      binding.endSeconds !== null &&
      binding.endSeconds <= binding.startSeconds
    )
      ctx.addIssue({
        code: "custom",
        path: ["endSeconds"],
        message: "종료 시점은 시작 시점 뒤여야 합니다.",
      });
    if (binding.status === "published" && !binding.reviewedAgainstHash)
      ctx.addIssue({
        code: "custom",
        path: ["reviewedAgainstHash"],
        message: "게시하려면 문항 내용 검수가 필요합니다.",
      });
  });
export const textbookPagePlacementSchema = z.strictObject({
  itemId: textbookIdSchema,
  physicalPageIndex: z.number().int().positive().max(10_000),
  printedPageLabel: z.string().max(40),
  column: z.union([z.literal(1), z.literal(2)]),
});
export const textbookEditionSchema = z.strictObject({
  editionId: textbookIdSchema,
  label: z.string().min(1).max(40),
  status: z.enum(["draft", "published", "retired"]),
  revision: textbookRevisionSchema,
  publishedAt: textbookDateSchema.nullable(),
  manifestHash: textbookHashSchema.nullable(),
});
export const textbookExchangeSchema = z.strictObject({
  schemaVersion: z.literal(textbookVersion),
  exportedAt: textbookDateSchema,
  canonicalizationVersion: z
    .literal(textbookCanonicalizationVersion)
    .optional(),
  config: textbookConfigSchema,
  edition: textbookEditionSchema,
  units: z.array(textbookUnitSchema).max(500),
  snapshots: z.array(textbookProblemSnapshotSchema).max(10_000),
  items: z.array(textbookItemSchema).max(10_000),
  assets: z.array(textbookAssetSchema).max(20_000),
  qrTargets: z.array(textbookQrTargetSchema).max(10_000),
  videoBindings: z.array(textbookVideoBindingSchema).max(20_000),
  pageMap: z.array(textbookPagePlacementSchema).max(20_000),
  rendererVersion: z.string().min(1).max(80),
  templateVersion: z.string().min(1).max(80),
  conceptIntegration: textbookConceptIntegrationSchema.optional(),
  conceptQrTargets: z.array(textbookConceptQrTargetSchema).max(5000).optional(),
});
export type TextbookExchange = z.infer<typeof textbookExchangeSchema>;
export type TextbookConfig = z.infer<typeof textbookConfigSchema>;
export type ProblemSourceRef = z.infer<typeof textbookSourceRefSchema>;
export type ProblemPayload = z.infer<typeof textbookProblemPayloadSchema>;
export type ProblemSnapshot = z.infer<typeof textbookProblemSnapshotSchema>;
export type AssetRef = z.infer<typeof textbookAssetSchema>;
export type FigureRef = z.infer<typeof textbookFigureSchema>;
export type TextbookItem = z.infer<typeof textbookItemSchema>;
export type ManuscriptBlock = z.infer<typeof textbookBlockSchema>;
export type Section = z.infer<typeof textbookSectionSchema>;
export type UnitManuscript = z.infer<typeof textbookUnitSchema>;
export type QrTarget = z.infer<typeof textbookQrTargetSchema>;
export type ConceptQrTarget = z.infer<typeof textbookConceptQrTargetSchema>;
export type ProblemVideoBinding = z.infer<typeof textbookVideoBindingSchema>;
export type PagePlacement = z.infer<typeof textbookPagePlacementSchema>;
