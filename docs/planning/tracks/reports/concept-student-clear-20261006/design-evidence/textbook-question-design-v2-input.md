직전 textbook-question-design 검토의 필수 문제를 수정한 새 버전입니다. 코드만 독립 검토해 결론 agree/revise와 필수 문제를 구분하세요. 도구/편집 금지. 원문 전 ID 내용 승인·전체 은행 인쇄는 진행 중이며 완료라고 주장하지 않습니다.
(1) 모든 블록의 student base projection에서 conceptQuestions 노드를 제거합니다. 별도 questionRows에는 entryId,prompt 두 공개 필드만 명시 복사합니다. teacher만 명시적으로 answer/requiredIdeas를 복사합니다. 다른 블록에 질문 노드가 실리면 계약에서 거절하고, 투영만 직접 호출해도 숨긴 답이 빠집니다.
(2) 교재 소유 strict v1 question vocabulary(기존 prompt,answer,requiredIdeas)를 독립 스키마로 저장합니다. 은행 질문 객체 그대로 spread하지 않습니다. 버전 1의 문구 길이는 기존 textbookTextSchema 상한으로 고정하고 새 생산 질문은 은행 240/160 계약을 통과합니다.
(3) reviewedQuestionMode는 알려진 QUESTION_REVISION 한 판과 B/C의 두 명시 결정을 요구하며 섞임과 unknown 판을 거절합니다. 일부 null인 제외 항목은 선택 형식에서만 거릅니다. 모든 질문이 null이면 해당 활동을 제목으로 fallback하거나 없애지 않고 오류로 돌립니다.
(4) 새 sentenceRecall도 검토한 B 질문으로 출제해 제목만 보고 문장을 추측하는 경로를 없앴습니다. 개념Study는 일반 정의로 유지합니다. A 자유 백지는 단원 전체의 의도적인 자유 회상이며 새 진단 물음과 구분합니다. 신규 C는 명시 문장과 generic 문항 라벨만 사용합니다.
(5) 교재 conceptMap은 실제 가지 지도인 척 하지 않고 ‘단원 개념 확인 모음’으로 표시합니다. 동일한 B 물음의 재확인입니다. 기존 standalone D 지도는 2개의 실제 B물음 가지를 표시합니다. 설명활동 지시문은 물음에 답한 뒤 친구와 비교합니다. 길고 어려운 수학 용어를 무조건 바꾸거나 모든 답에 이유를 강제하지 않습니다.
(6) 새 preparation은 C를 B로 대체하지 않고 같은 B 질문 노드를 사용하며 정확한 entryId·교사 키를 가집니다. 이 활동을 개념 Family에 연결합니다. 아직 배우지 않은 내용은 모르겠다고 적도록 표시합니다. 여기서 정오를 저장하거나 사전 결손 진단으로 간주하지 않습니다.
(7) 생성 때 B노드에 쓰는 질문 entry가 frozen에 같은 canonicalHash로 있는지 검증합니다. 뒤의 memory/additional 질문도 frozen payload를 사용합니다. preparation은 같은 source entries의 내용이고 term 형식도 함께 freeze합니다. 일반 core source 설명과 sourcehash는 B/C필드에 종속시키지 않습니다.
(8) textbookBlockSchema에서 question node가 허용 activity의 sentences concept-recall임을 요구하고 markdown이 각 질문 prompt와 정확히 같은지 검사합니다. UI만 잠그는 방식이 아닙니다. 기존 frozen blocks에는 새 필드를 보충하지 않습니다.
그 밖에 실제 PDF 7학년 표본 학생/교사 14쪽은 이전 구조에서 통과했고 현재 수정 뒤 다시 확인할 예정입니다. 실제 prototype 신뢰도는 전수 내용 승인이 아닙니다. 정합성/호환/답 차단/미완 은행 영향에 집중하세요.
FILE: src/contracts/textbookSemantic.contract.ts
import { z } from "zod";
import {
  textbookIdSchema,
  textbookKeySchema,
  textbookTextSchema,
  textbookHashSchema,
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
  tone: z.enum(["forest", "tree"]).optional(),
  sectionName: z.string().max(200).optional(),
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
    kind: z.literal("conceptQuestions"),
    version: z.literal(1),
    questions: z
      .array(
        z.strictObject({
          entryId: textbookKeySchema,
          // Frozen v1 vocabulary belongs to textbooks, independent of live bank schemas.
          question: z.strictObject({
            prompt: textbookTextSchema,
            answer: textbookTextSchema,
            requiredIdeas: z
              .array(
                z.strictObject({
                  anyOf: z.array(textbookTextSchema).min(1).max(8),
                }),
              )
              .min(1)
              .max(6),
          }),
        }),
      )
      .min(1)
      .max(2),
  }),
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
    strategyKind: z.literal("captured-solution").optional(),
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
    keyPhrase: z.string().max(200).optional(),
    provenance: z
      .strictObject({
        origin: z.literal("bank-derived"),
        sourceHash: textbookHashSchema,
        sourceConceptIds: z.array(textbookKeySchema).max(1657),
        sourceHashes: z.array(textbookHashSchema).max(360),
        editor: z.string().max(200),
        reviewer: z.string().max(200),
        status: z.literal("AI 검수"),
        humanReview: z.literal(false),
      })
      .optional(),
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
    /** Original source's fixed instruction/footer tree; absence stays absent in old editions. */
    sourceFooter: z
      .array(textbookSourceFragmentSchema)
      .min(1)
      .max(50)
      .optional(),
    /** Native question heading children, preserved separately from its immutable prompt. */
    sourceQuestionHeader: z
      .array(textbookSourceFragmentSchema)
      .min(1)
      .max(30)
      .optional(),
    node: textbookSemanticNodeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.node?.kind !== "fragments" &&
      !value.sourceFooter &&
      !value.sourceQuestionHeader
    )
      return;
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
    const fragments = [
      ...(value.node?.kind === "fragments" ? value.node.fragments : []),
      ...(value.sourceFooter ?? []),
      ...(value.sourceQuestionHeader ?? []),
    ];
    if (!walk(fragments, 1))
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

FILE: src/contracts/textbookExchange.contract.ts
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

FILE: src/lib/concept-blank/questions.ts
import type {
  ConceptBlankForm,
  ConceptEntry,
} from "@/contracts/conceptBlank.contract";

export const QUESTION_REVISION = "student-clear-20261006-v1";

/** New authoring accepts a reviewed bank revision; frozen older books bypass this loader. */
export function reviewedQuestionMode(
  entries: readonly ConceptEntry[],
): boolean {
  const revised = entries.some(
    (entry) =>
      entry.questionRevision !== undefined ||
      entry.bQuestion !== undefined ||
      entry.clozeQuestion !== undefined,
  );
  if (!revised) return false;
  for (const entry of entries)
    if (
      entry.questionRevision !== QUESTION_REVISION ||
      entry.bQuestion === undefined ||
      entry.clozeQuestion === undefined
    )
      throw new RangeError(
        `질문 판 또는 형식 결정이 일치하지 않습니다: ${entry.id}`,
      );
  return true;
}

/** 옛 동결 payload는 보충하지 않는다. undefined인 옛 필드와 검토 후 제외한 null을 구별한다. */
export function conceptSupportsForm(
  entry: ConceptEntry,
  form: ConceptBlankForm,
): boolean {
  if (form === "term") return entry.bQuestion !== null;
  if (form === "cloze") return entry.clozeQuestion !== null;
  if (form === "map") return entry.bQuestion !== null;
  if (form === "recall") return !entry.givenCase;
  return form !== "figure";
}

export function termPrompt(entry: ConceptEntry): string {
  if (entry.bQuestion === null)
    throw new RangeError(`개념 질문에서 제외한 항목: ${entry.id}`);
  return entry.bQuestion?.prompt ?? entry.term;
}

export function termAnswer(entry: ConceptEntry): string {
  if (entry.bQuestion === null)
    throw new RangeError(`개념 질문에서 제외한 항목: ${entry.id}`);
  return entry.bQuestion?.answer ?? entry.definition;
}

export function clozeSentence(entry: ConceptEntry): string {
  if (entry.clozeQuestion === null)
    throw new RangeError(`빈칸 문항에서 제외한 항목: ${entry.id}`);
  return entry.clozeQuestion?.sentence ?? entry.definition;
}

/** 교사가 확인하는 의미 기준. 각 줄은 필수 내용이고 한 줄 안의 표현은 대안이다. */
export function termCriteria(entry: ConceptEntry): string[] {
  return (
    entry.bQuestion?.requiredIdeas.map((idea) => idea.anyOf.join(" / ")) ?? []
  );
}

export function clozeAlternatives(entry: ConceptEntry): string[] {
  return (
    entry.clozeQuestion?.acceptedAnswers.flatMap((answers, index) =>
      answers.length > 1 ? [`빈칸 ${index + 1}: ${answers.join(" / ")}`] : [],
    ) ?? []
  );
}

export const MAP_NODES_PER_PAGE = 6;
export const QUESTION_MAP_NODES_PER_PAGE = 2;
export function mapQuestionMode(entries: readonly ConceptEntry[]): boolean {
  const questions = entries.filter((entry) => entry.bQuestion).length;
  if (questions > 0 && questions !== entries.length)
    throw new RangeError(
      "새 질문 지도와 옛 뜻·예 지도를 한 묶음으로 섞을 수 없습니다.",
    );
  return questions > 0;
}

FILE: src/lib/textbook/conceptQuestions.ts
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";

/** New manuscripts freeze the reviewed question and its key together. Old blocks are untouched. */
export function conceptQuestionBlocks(input: {
  entries: readonly ConceptEntry[];
  conceptKey: string;
  activity: Extract<
    TextbookActivity,
    | "termRecall"
    | "sentenceRecall"
    | "explainActivity"
    | "conceptMap"
    | "preparation"
  >;
  title: string;
}): ManuscriptBlock[] {
  if (!reviewedQuestionMode(input.entries))
    throw new Error("새 질문 활동에는 검토된 질문 판이 필요합니다.");
  const questions = input.entries.flatMap((entry) =>
    entry.bQuestion
      ? [
          {
            entryId: entry.id,
            question: {
              prompt: entry.bQuestion.prompt,
              answer: entry.bQuestion.answer,
              requiredIdeas: entry.bQuestion.requiredIdeas.map((idea) => ({
                anyOf: [...idea.anyOf],
              })),
            },
          },
        ]
      : [],
  );
  if (!questions.length)
    throw new Error(
      `${input.title}: 출제 가능한 개념 질문이 없습니다. 다른 활동이나 단원을 선택하세요.`,
    );
  const blocks: ManuscriptBlock[] = [];
  for (let offset = 0; offset < questions.length; offset += 2) {
    const part = questions.slice(offset, offset + 2);
    blocks.push({
      blockId: randomUUID(),
      kind: "concept-recall",
      phase: "sentences",
      markdown: part.map(({ question }) => question.prompt).join("\n\n"),
      showRepetitionChecks: false,
      conceptKey: input.conceptKey,
      semantic: {
        activity: input.activity,
        title: input.title,
        continuation: offset > 0,
        node: { kind: "conceptQuestions", version: 1, questions: part },
      },
    });
  }
  return blocks;
}

FILE: src/lib/textbook/conceptRows.ts
import {
  splitBlankSentence,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";
import {
  clozeSentence,
  conceptSupportsForm,
} from "@/lib/concept-blank/questions";

export function definitionText(entry: ConceptEntry): string {
  return splitBlankSentence(entry.definition)
    .map((piece) => piece.text)
    .join("");
}

/** One immutable master list, shared by all three memory phases. */
export function conceptMemoryRows(
  entries: readonly ConceptEntry[],
  phase: "study" | "keywords" | "sentences" = "study",
): TextbookSemanticRow[] {
  reviewedQuestionMode(entries);
  const selected =
    phase === "keywords"
      ? entries.filter((entry) => conceptSupportsForm(entry, "cloze"))
      : entries;
  return selected.map((entry, index) => ({
    rowKey: `${entry.id}.definition`,
    label:
      phase === "keywords" && entry.clozeQuestion
        ? `문항 ${index + 1}`
        : entry.term,
    rawText: phase === "keywords" ? clozeSentence(entry) : entry.definition,
    textFormat: "bank-blank",
  }));
}

export function memoryRowMarkdown(
  row: TextbookSemanticRow,
  phase: "study" | "keywords" | "sentences",
): string {
  const pieces =
    row.textFormat === "bank-blank"
      ? splitBlankSentence(row.rawText)
      : [{ kind: "text", text: row.rawText }];
  const plain = pieces.map((piece) => piece.text).join("");
  if (phase === "sentences") return `**${row.label}**\n\n{{${plain}}}`;
  if (phase === "keywords")
    return `**${row.label}**\n\n${pieces.map((piece) => (piece.kind === "key" ? `[[${piece.text}]]` : piece.text)).join("")}`;
  return `**${row.label}**\n\n${plain}`;
}

const definitionLabels: Record<string, string> = {
  정의: "뜻",
  개념: "뜻",
  성질: "성질",
  방법: "방법",
  공식: "공식",
  법칙: "법칙",
  정리: "정리",
  단위: "단위",
  기호: "기호",
  용어: "뜻",
};

/** Recover the original card boundary from a frozen automatic draft without rewriting it. */
export function frozenConceptGroups(concept: TextbookConcept) {
  if (!concept.mappingVersion.startsWith("quick-create.unit-triple."))
    return [];
  const entries =
    concept.frozen?.entries.flatMap((entry) =>
      entry.entryKind === "concept" ? [entry.payload] : [],
    ) ?? [];
  // An edited definition remains authoritative; do not replace a teacher's edits with bank text.
  if (
    !entries.length ||
    concept.body.definition !== entries.map(definitionText).join("\n\n")
  )
    return [];
  return entries.map((entry) => ({
    conceptId: entry.id,
    title: entry.term,
    rows: [
      {
        rowKey: `${entry.id}.definition`,
        label: definitionLabels[entry.kind] ?? entry.kind,
        rawText: definitionText(entry),
        textFormat: "markdown" as const,
      },
      ...(entry.example
        ? [
            {
              rowKey: `${entry.id}.example`,
              label: "예",
              rawText: `${entry.example.prompt}\n\n${entry.example.answer}`,
              textFormat: "markdown" as const,
            },
          ]
        : []),
    ],
    body: {
      ...concept.body,
      goal: "",
      prerequisites: [],
      definition: definitionText(entry),
      conditions: null,
      examples: entry.example
        ? [`${entry.example.prompt}\n\n${entry.example.answer}`]
        : [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
  }));
}

FILE: src/lib/textbook/server/quickCreate/conceptRecall.ts
import "server-only";
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";
import { conceptSupportsForm } from "@/lib/concept-blank/questions";
import type { TextbookActor } from "../../access";
import { freezeTextbookConcept } from "../../concepts";
import { canonicalHash } from "../../hash.server";
import { invalid } from "../errors";
import { QUICK_CREATE_CORE_MAPPING_VERSION } from "../../coreConceptBank";
import { conceptQuestionBlocks } from "../../conceptQuestions";
import {
  additionalConceptActivities,
  memoryActivityBlocks,
} from "../quickCreateRecovery";
import {
  keyOf,
  plainDefinition,
  type QuickCreateAssembly,
  type QuickCreateLesson,
  type UnitRow,
} from "./context";

/** Any of these needs the section's frozen concept row, even when no concept block is printed. */
export const wantsConceptFamily = (components: QuickCreateComponents) =>
  components.preparation ||
  components.concepts ||
  components.termRecall ||
  components.clozeRecall ||
  components.sentenceRecall ||
  components.errorCheck ||
  components.conceptStudy ||
  components.dialogueCheck ||
  components.conceptBlankTest ||
  components.explainActivity ||
  components.conceptMap;
function conceptFor(
  unit: UnitRow,
  unitKey: string,
  sectionKey: string,
  entries: ConceptEntry[],
  actor: TextbookActor,
  now: string,
  forms: TextbookConcept["blankForms"],
) {
  const concept = textbookConceptSchema.parse({
    conceptKey: `concept-${unit.id}`,
    unitKey,
    sectionKey,
    title: unit.section,
    kind: entries[0].kind,
    unitId: unit.id,
    body: {
      goal: `${sectionTitleTex(unit.section)}의 뜻과 적용 방법을 설명할 수 있습니다.`,
      prerequisites: [],
      definition: entries.map(plainDefinition).join("\n\n"),
      conditions: null,
      examples: entries.flatMap((entry) =>
        entry.example
          ? [`${entry.example.prompt} → ${entry.example.answer}`]
          : [],
      ),
      counterexamples: [],
      misconceptions: [],
      explainPrompt: "배운 개념을 자신의 말로 설명해 보세요.",
    },
    blankItems: entries
      .filter((entry) =>
        forms?.some((form) => conceptSupportsForm(entry, form)),
      )
      .map((entry) => ({
        blankSectionKey: keyOf(unit),
        entryKind: "concept",
        entryId: entry.id,
        review: {
          status: "confirmed",
          candidateRule: "unit-triple",
          reviewedBy: actor.id,
          reviewedAt: now,
          targetHash: canonicalHash(entry),
        },
      })),
    blankForms: forms,
    links: [],
    mappingVersion: QUICK_CREATE_CORE_MAPPING_VERSION,
    derivedFromConceptKey: null,
    frozen: null,
  });
  return freezeTextbookConcept(concept);
}

export function appendConceptAndRecall(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): void {
  const { components, actor, now, concepts, unitKey } = ctx;
  const { unit, section, entries } = lesson;
  if (!wantsConceptFamily(components)) return;
  if (!entries.length)
    throw invalid(`${unit.section}: 준비된 개념 설명이 없습니다.`);
  const questionMode = reviewedQuestionMode(entries);
  const forms: NonNullable<TextbookConcept["blankForms"]> = [];
  if (components.termRecall) forms.push("term");
  if (components.clozeRecall) forms.push("cloze");
  if (
    questionMode &&
    !forms.includes("term") &&
    (components.sentenceRecall ||
      components.explainActivity ||
      components.conceptMap ||
      components.preparation)
  )
    forms.push("term");
  if (!forms.length) forms.push("term");
  const concept = conceptFor(
    unit,
    unitKey,
    section.sectionKey,
    entries,
    actor,
    now,
    forms,
  );
  concepts.push(concept);
  const frozenEntries = concept.frozen!.entries.flatMap((row) =>
    row.entryKind === "concept" ? [row.payload] : [],
  );
  for (const entry of entries.filter((row) => row.bQuestion))
    if (
      forms.includes("term") &&
      !frozenEntries.some(
        (row) =>
          row.id === entry.id && canonicalHash(row) === canonicalHash(entry),
      )
    )
      throw invalid(`질문과 고정한 개념 내용이 일치하지 않습니다: ${entry.id}`);
  if (components.concepts)
    section.blocks.push({
      blockId: randomUUID(),
      kind: "concept",
      conceptKey: concept.conceptKey,
      semantic: { activity: "concepts", title: "개념 이해" },
    });
  const recall = (
    title: string,
    phase: "keywords" | "sentences",
    markdown: string,
  ) =>
    section.blocks.push({
      blockId: randomUUID(),
      kind: "concept-recall",
      phase,
      markdown,
      showRepetitionChecks: false,
      conceptKey: concept.conceptKey,
      semantic: { activity: "termRecall", title },
    });
  if (components.termRecall && questionMode)
    section.blocks.push(
      ...conceptQuestionBlocks({
        entries: frozenEntries,
        conceptKey: concept.conceptKey,
        activity: "termRecall",
        title: "개념 질문",
      }),
    );
  else if (components.termRecall)
    recall(
      "용어 백지",
      "keywords",
      entries
        .map((entry) => `[[${entry.term}]]: ${plainDefinition(entry)}`)
        .join("\n\n"),
    );
  section.blocks.push(
    ...memoryActivityBlocks({
      entries,
      questionEntries: frozenEntries,
      conceptKey: concept.conceptKey,
      components,
    }),
  );
  section.blocks.push(
    ...additionalConceptActivities({
      entries,
      questionEntries: frozenEntries,
      sectionKey: keyOf(unit),
      conceptKey: concept.conceptKey,
      components,
    }),
  );
}

FILE: src/lib/textbook/server/quickCreate/preparation.ts
import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { invalid } from "../errors";
import { activityText } from "../quickCreateRecovery";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";
import { conceptQuestionBlocks } from "../../conceptQuestions";
import { type QuickCreateAssembly, type QuickCreateLesson } from "./context";

export function appendPreparation(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): void {
  const { components } = ctx;
  const { unit, section, entries } = lesson;
  if (components.preparation) {
    if (!entries.length)
      throw invalid(`${unit.section}: 준비 학습에 사용할 개념이 없습니다.`);
    if (reviewedQuestionMode(entries)) {
      section.blocks.push(
        ...conceptQuestionBlocks({
          entries,
          conceptKey: `concept-${unit.id}`,
          activity: "preparation",
          title: "준비 학습",
        }),
      );
      return;
    }
    section.blocks.push(
      activityText(
        "preparation",
        "준비 학습",
        `### 준비 학습\n\n오늘의 목표: ${sectionTitleTex(unit.section)}의 뜻과 적용 방법을 설명하기.\n\n${entries.map((entry) => `- **${entry.term}**에 대해 이미 알고 있는 뜻이나 조건을 적어 보세요.`).join("\n")}\n\n${entries.flatMap((entry) => (entry.example ? [`- ${entry.example.prompt}`] : [])).join("\n")}`,
      ),
    );
  }
}

FILE: src/lib/textbook/server/quickCreateRecovery.ts
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import type {
  TextbookActivity,
  TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import { conceptMemoryRows, memoryRowMarkdown } from "../conceptRows";
import { conceptScriptFor } from "../conceptScripts";
import { ACTIVITY_LABELS } from "../activities";
import { conceptQuestionBlocks } from "../conceptQuestions";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";

export function activityText(
  activity: TextbookActivity,
  title: string,
  markdown: string,
  node?: TextbookSemantic["node"],
): ManuscriptBlock {
  return {
    blockId: randomUUID(),
    kind: "text",
    markdown,
    semantic: { activity, title, ...(node ? { node } : {}) },
  };
}
export function writingActivity(
  activity: TextbookActivity,
  title: string,
  prompts: string[],
  lines: number,
): ManuscriptBlock {
  return activityText(activity, title, prompts.join("\n\n"), {
    kind: "writing",
    prompts,
    lines,
  });
}

/** Selected phases use identical source rows and identical eight-row partitions. */
export function memoryActivityBlocks(input: {
  entries: readonly ConceptEntry[];
  questionEntries?: readonly ConceptEntry[];
  conceptKey: string;
  components: QuickCreateComponents;
}): ManuscriptBlock[] {
  const phases = [
    {
      enabled: input.components.conceptStudy,
      activity: "conceptStudy",
      title: "개념 학습",
      phase: "study",
    },
    {
      enabled: input.components.clozeRecall,
      activity: "clozeRecall",
      title: "핵심어 빈칸",
      phase: "keywords",
    },
    {
      enabled: input.components.sentenceRecall,
      activity: "sentenceRecall",
      title: "통문장 개념 암기",
      phase: "sentences",
    },
  ] as const;
  return phases
    .filter((option) => option.enabled)
    .flatMap((option) => {
      if (option.phase === "sentences" && reviewedQuestionMode(input.entries))
        return conceptQuestionBlocks({
          entries: input.questionEntries ?? input.entries,
          conceptKey: input.conceptKey,
          activity: "sentenceRecall",
          title: "책 없이 답 쓰기",
        });
      const rows = conceptMemoryRows(
        option.phase === "keywords"
          ? (input.questionEntries ?? input.entries)
          : input.entries,
        option.phase,
      );
      const blocks: ManuscriptBlock[] = [];
      for (let offset = 0; offset < rows.length; offset += 8) {
        const part = rows.slice(offset, offset + 8);
        blocks.push({
          blockId: randomUUID(),
          kind: "concept-recall",
          conceptKey: input.conceptKey,
          phase: option.phase,
          markdown: part
            .map((row) => memoryRowMarkdown(row, option.phase))
            .join("\n\n"),
          showRepetitionChecks: option.phase === "study",
          semantic: {
            activity: option.activity,
            title: option.title,
            continuation: offset > 0,
            node: {
              kind: "rows",
              groupKey: `${input.conceptKey}.memory-${offset / 8}`,
              rows: part,
            },
          },
        });
      }
      return blocks;
    });
}

export function additionalConceptActivities(input: {
  entries: readonly ConceptEntry[];
  questionEntries?: readonly ConceptEntry[];
  sectionKey: string;
  conceptKey: string;
  components: QuickCreateComponents;
}): ManuscriptBlock[] {
  const { entries, components } = input;
  const blocks: ManuscriptBlock[] = [];
  if (components.dialogueCheck) {
    const script = conceptScriptFor(input.sectionKey);
    const questions =
      script?.dialogue
        .filter((turn) => turn.purpose === "check-question")
        .map((turn) => turn.markdown) ?? [];
    if (!questions.length)
      throw new Error(`대화 읽기 확인 원고가 없습니다: ${input.sectionKey}`);
    for (let offset = 0; offset < questions.length; offset += 3)
      blocks.push(
        writingActivity(
          "dialogueCheck",
          "대화 읽기 확인",
          [
            "수업을 떠올리며 물음에 답하고, 그렇게 생각한 이유를 쓰세요.",
            ...questions.slice(offset, offset + 3),
          ],
          4,
        ),
      );
  }
  // Versioned rows opt NEW bank activities into native scaffolds. Saved writing
  // nodes and source fragments retain their original render paths and bytes.
  const rows = conceptMemoryRows(entries);
  const scaffolds = [
    {
      activity: "conceptBlankTest",
      title: "자유 개념 백지",
      size: 4,
      instruction:
        "책을 보지 않고 기억나는 개념을 정리하세요. 각 정의에 알맞은 예를 쓰세요.",
    },
    {
      activity: "explainActivity",
      title: "설명 활동",
      size: 2,
      instruction: "예를 들어 설명한 뒤, 친구의 질문에 답하세요.",
    },
    {
      activity: "conceptMap",
      title: "개념 지도",
      size: 4,
      instruction:
        "각 개념의 정의와 예를 쓰고, 직접 설명할 수 있는 관계를 정리하세요.",
    },
  ] as const;
  for (const scaffold of scaffolds) {
    if (!components[scaffold.activity]) continue;
    if (
      scaffold.activity !== "conceptBlankTest" &&
      reviewedQuestionMode(entries)
    ) {
      blocks.push(
        ...conceptQuestionBlocks({
          entries: input.questionEntries ?? entries,
          conceptKey: input.conceptKey,
          activity: scaffold.activity,
          title:
            scaffold.activity === "conceptMap"
              ? "단원 개념 확인 모음"
              : scaffold.title,
        }),
      );
      continue;
    }
    for (let offset = 0; offset < rows.length; offset += scaffold.size) {
      const block = activityText(
        scaffold.activity,
        scaffold.title,
        scaffold.instruction,
        {
          kind: "rows",
          groupKey: `bank-activity.v1.${scaffold.activity}.${offset / scaffold.size}`,
          rows: rows.slice(offset, offset + scaffold.size),
        },
      );
      block.semantic!.continuation = offset > 0;
      blocks.push(block);
    }
  }
  return blocks;
}

export { ACTIVITY_LABELS } from "../activities";
export function selectedLearningGuide(
  components: QuickCreateComponents,
): ManuscriptBlock[] {
  const instructions: Partial<Record<TextbookActivity, string>> = {
    unitIntro: "단원 질문과 목표를 읽고 궁금한 점을 기록하세요.",
    dialogue: "선생님과 학생의 대화를 읽고 판서의 뜻을 설명하세요.",
    concepts: "개념의 뜻·조건·예를 함께 확인하세요.",
    dialogueCheck: "대화를 떠올리며 핵심 물음에 답하세요.",
    conceptStudy: "개념표를 읽고 1~4회 반복한 것을 표시하세요.",
    termRecall: "물음을 읽고 답과 이유를 쓰세요.",
    clozeRecall: "문장을 읽고 빈칸에 알맞은 내용을 쓰세요.",
    sentenceRecall: "책을 보지 않고 물음에 대한 답을 떠올려 쓰세요.",
    conceptBlankTest: "책을 덮고 기억한 개념을 스스로 정리하세요.",
    basicCheck: "짧은 문제로 개념을 바로 적용해 보세요.",
    workedExamples: "예제 풀이를 읽은 뒤 확인 문제를 스스로 푸세요.",
    practice: "유형별 문제를 풀고 사용한 방법을 설명하세요.",
    written: "생각한 순서와 계산 근거를 함께 쓰세요.",
    explainActivity: "물음에 답한 뒤 친구와 답을 비교해 보세요.",
    conceptMap: "같은 단원의 개념 질문을 묶어서 확인하세요.",
    reasoning: "판단의 근거를 쓰고 다른 방법과 비교하세요.",
    errorCheck: "문장의 옳고 그름과 이유를 설명하세요.",
    review: "앞에서 배운 내용을 다시 꺼내 풀어 보세요.",
    assessment: "도움 없이 풀고 다시 공부할 부분을 찾으세요.",
    rest: "이야기를 읽고 함께 생각할 질문을 나누세요.",
    preparation: "준비 물음에 답하고 아직 모르는 부분을 표시하세요.",
    learningPlan: "학습할 날과 공부한 날을 기록하세요.",
    questionLog: "막힌 부분과 시도한 방법을 질문으로 남기세요.",
  };
  return [
    activityText(
      "learningGuide",
      "학습 안내",
      Object.entries(instructions)
        .filter(([key]) => components[key as TextbookActivity])
        .map(
          ([key, value], index) =>
            `${index + 1}. **${ACTIVITY_LABELS[key as TextbookActivity]}** · ${value}`,
        )
        .join("\n\n") || "선택한 활동을 진행하고 궁금한 점을 기록하세요.",
    ),
  ];
}

export function referenceActivityBlocks(
  activity: "tableOfContents" | "conceptIndex" | "typeIndex",
  entries: Extract<
    NonNullable<TextbookSemantic["node"]>,
    { kind: "references" }
  >["entries"],
): ManuscriptBlock[] {
  const blocks: ManuscriptBlock[] = [];
  for (let offset = 0; offset < entries.length; offset += 18)
    blocks.push(
      activityText(
        activity,
        ACTIVITY_LABELS[activity],
        ACTIVITY_LABELS[activity],
        { kind: "references", entries: entries.slice(offset, offset + 18) },
      ),
    );
  return blocks;
}

FILE: src/lib/textbook/render/model.ts
import type {
  AssetRef,
  FigureRef,
  TextbookConfig,
  TextbookExchange,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import type { TextbookConceptBody } from "@/contracts/textbookConcept.contract";
import type {
  TextbookDialoguePresentation,
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import {
  recallPieces,
  splitRecallMarkdown,
  splitTextbookMarkdown,
  type RecallPiece,
} from "./markdown";
import { answerCaseLayout, type AnswerPlacement } from "./answerLayout";
import { splitConceptBody } from "./conceptParts";
import { projectEditorialSection } from "./editorialProjection";
import { frozenConceptGroups } from "../conceptRows";
import { memoryRowMarkdown } from "../conceptRows";
import { recallDisplayRows, type RecallDisplayRow } from "./blocks/recall";

export {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "./versions";
export type TextbookVariant = "student" | "answers";
export type TextbookEditorialStage =
  | "opening"
  | "concept"
  | "recall"
  | "basic"
  | "practice"
  | "application"
  | "review"
  | "guide"
  | "unit"
  | "rest";
type BlockBase = {
  id: string;
  sourceBlockId: string;
  unitKey: string;
  sectionKey: string;
  editorialStage?: TextbookEditorialStage;
  startNewPage?: boolean;
  unitNumber?: number;
  semantic?: TextbookSemantic;
  progressSteps?: readonly { activity: string; label: string }[];
  relativePageIndex?: number;
  dialogueSizePt?: number;
  dialogueGapMm?: number;
  dialogueTopMm?: number;
  dialogueLesson?: { lessonKey: string; lessonTitle: string };
  dialogueGuide?: string;
  measurementMinHeightMm?: number;
  /** Pagination moves this block to the page of the row after it when that row leaves its page. */
  keepWithNext?: boolean;
  unitIntroPart?: "left" | "right" | "single";
  exampleGroupNumber?: number;
  exampleConfirmIndex?: number;
  dialogueScriptTotal?: number;
  memoryContinuationTitle?: string;
  continuedPage?: boolean;
  sourceQuestionHeadHeightMm?: number;
  sourceQuestionPromptMinHeightMm?: number;
  sourceQuestionMainMinHeightMm?: number;
  sourceWorkLines?: number;
  sourceWorkMarginTopMm?: number;
  sourceQuestionMinHeightMm?: number;
};
export type RenderBlock = BlockBase &
  (
    | {
        kind: "unit-intro";
        title: string;
        goals: string[];
        prerequisites: string[];
      }
    | {
        kind: "heading";
        title: string;
        subtitle?: string;
        stageNumber?: string;
      }
    | { kind: "text"; markdown: string }
    | { kind: "image"; assetId: string; caption: string | null }
    | {
        kind: "dialogue";
        speakerId: string;
        side: "left" | "right";
        expression: string;
        portraitAssetId: string;
        mirrorPortrait: boolean;
        markdown: string;
        presentation?: TextbookDialoguePresentation;
        speakerName?: string;
      }
    | {
        kind: "concept";
        conceptKey: string;
        title: string;
        body: TextbookConceptBody;
        continuation?: boolean;
        qr: RenderQr | null;
        ordinal?: number;
      }
    | {
        kind: "recall";
        phase: "study" | "keywords" | "sentences";
        pieces: RecallPiece[];
        repetitionChecks: boolean;
        continuation?: boolean;
        lastPart?: boolean;
        answersVisible?: boolean;
        memoryPhases?: readonly ("study" | "keywords" | "sentences")[];
        displayRows?: RecallDisplayRow[];
        rowHeightsMm?: Readonly<Record<string, number>>;
        questionRows?: {
          entryId: string;
          prompt: string;
          answer?: string;
          requiredIdeas?: { anyOf: string[] }[];
        }[];
      }
    | {
        kind: "problem";
        itemId: string;
        displayNumber: string;
        content: string;
        figures: FigureRef[];
        questionType: string | null;
        learningStage?: TextbookItem["learningStage"];
        layout: TextbookItem["layout"];
        qr: RenderQr | null;
        sourcePageLabel: string | null;
        answer?: string;
        solution?: string | null;
        /** Answer variant only: the answer stands beside the question (see answerLayout). */
        answerPlacement?: AnswerPlacement;
        publicWorkedExample?: { answer: string; solution: string | null };
      }
  );
export interface RenderQr {
  id: string;
  url: string;
}
export interface RenderSection {
  unitKey: string;
  sectionKey: string;
  unitTitle: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  editorialStage?: TextbookEditorialStage;
  blocks: RenderBlock[];
}
export interface TextbookRenderModel {
  title: string;
  editionId: string;
  config: TextbookConfig;
  variant: TextbookVariant;
  sections: RenderSection[];
  assets: AssetRef[];
}

/** Native concept pages. Their container sets its children 2.6mm apart (see contentCss). */
const NATIVE_CONCEPT_KINDS = ["concept1", "concept2", "concept3"];
/**
 * Answer variant only. The authored body of a native concept page ends with the «CHECK»
 * subheading of the questions that follow it. In the answer book those questions are taller and
 * may leave the page, so the subheading becomes a block of its own that pagination keeps with
 * them. The fragments are the manuscript's own objects in their order; nothing is rewritten.
 * Body and subheading stand 2.6mm apart either way: that is the gap of the page's container and
 * the distance pagination puts between two blocks of a concept page.
 */
function closingCheckHeading(
  semantic: TextbookSemantic | undefined,
  nextKind: string | undefined,
):
  | { body: TextbookSourceFragment[]; heading: TextbookSourceFragment }
  | undefined {
  const node = semantic?.node;
  if (
    node?.kind !== "fragments" ||
    nextKind !== "problem" ||
    !NATIVE_CONCEPT_KINDS.includes(semantic?.source?.kind ?? "")
  )
    return undefined;
  const heading = node.fragments.at(-1);
  return heading?.attributes?.className?.split(/\s+/).includes("subheading")
    ? { body: node.fragments.slice(0, -1), heading }
    : undefined;
}

/** Allowlist projection: exercise answers/solutions and teacher source data never enter student render DTOs. */
export function createTextbookRenderModel(
  exchange: TextbookExchange,
  variant: TextbookVariant,
): TextbookRenderModel {
  const items = new Map(exchange.items.map((i) => [i.itemId, i]));
  const snapshots = new Map(exchange.snapshots.map((s) => [s.snapshotId, s]));
  const concepts = new Map(
    (exchange.conceptIntegration?.concepts ?? []).map((c) => [c.conceptKey, c]),
  );
  const qrs = new Map(exchange.qrTargets.map((q) => [q.qrTargetId, q]));
  const conceptQrs = new Map(
    (exchange.conceptQrTargets ?? []).map((q) => [q.conceptKey, q]),
  );
  const pages = new Map(
    exchange.pageMap.map((p) => [p.itemId, p.printedPageLabel]),
  );
  const memoryPhases = [
    ...new Set(
      exchange.units.flatMap((unit) =>
        unit.sections.flatMap((section) =>
          section.blocks.flatMap((block) =>
            block.kind === "concept-recall" &&
            ["conceptStudy", "clozeRecall", "sentenceRecall"].includes(
              block.semantic?.activity ?? "",
            )
              ? [block.phase]
              : [],
          ),
        ),
      ),
    ),
  ];
  let conceptOrdinal = 0;
  const model: TextbookRenderModel = {
    title: exchange.config.title,
    editionId: exchange.edition.editionId,
    config: exchange.config,
    variant,
    assets: exchange.assets,
    sections: exchange.units.flatMap((u) =>
      u.sections.map((s): RenderSection =>
        projectEditorialSection(
          {
            unitKey: u.unitKey,
            sectionKey: s.sectionKey,
            unitTitle: u.title,
            title: s.title,
            // Earlier quick-create drafts used "basic" for every lesson. Their frozen
            // concept provenance identifies them without rewriting the saved manuscript.
            templateKey:
              s.templateKey === "basic" &&
              s.blocks.some(
                (b) =>
                  b.kind === "concept" &&
                  concepts.get(b.conceptKey)?.mappingVersion ===
                    "quick-create.unit-triple.v1",
              )
                ? "auto-lesson"
                : s.templateKey,
            startPolicy: s.startPolicy,
            blocks: [
              ...(s.templateKey === "unit-intro"
                ? [
                    {
                      id: `generated-intro:${u.unitKey}:${s.sectionKey}`,
                      sourceBlockId: "unit-intro",
                      unitKey: u.unitKey,
                      sectionKey: s.sectionKey,
                      kind: "unit-intro" as const,
                      unitNumber: exchange.units.indexOf(u) + 1,
                      title: u.title,
                      goals: u.goals,
                      prerequisites: u.prerequisites,
                    },
                  ]
                : []),
              {
                id: `generated-heading:${u.unitKey}:${s.sectionKey}`,
                sourceBlockId: "section-heading",
                unitKey: u.unitKey,
                sectionKey: s.sectionKey,
                kind: "heading",
                unitNumber:
                  exchange.units
                    .filter((candidate) =>
                      candidate.sections.some(
                        (section) =>
                          section.templateKey === "auto-unit-intro" ||
                          section.templateKey.startsWith("auto-lesson") ||
                          section.blocks.some(
                            (block) => block.kind === "concept",
                          ),
                      ),
                    )
                    .indexOf(u) + 1,
                title: s.title,
              },
              ...s.blocks.flatMap((b): RenderBlock[] => {
                const base: BlockBase = {
                  id: b.blockId,
                  sourceBlockId: b.blockId,
                  unitKey: u.unitKey,
                  sectionKey: s.sectionKey,
                  ...(b.semantic
                    ? {
                        semantic:
                          variant === "student" &&
                          b.semantic.node?.kind === "conceptQuestions"
                            ? { ...b.semantic, node: undefined }
                            : b.semantic,
                      }
                    : {}),
                };
                switch (b.kind) {
                  case "text": {
                    const check =
                      variant === "answers"
                        ? closingCheckHeading(
                            b.semantic,
                            s.blocks[s.blocks.indexOf(b) + 1]?.kind,
                          )
                        : undefined;
                    if (check) {
                      // A body that is nothing but the subheading stays one block.
                      if (!check.body.length)
                        return [
                          {
                            ...base,
                            kind: "text",
                            markdown: b.markdown,
                            keepWithNext: true,
                          },
                        ];
                      // The page-end note stays with the body.
                      const semantic: TextbookSemantic = {
                        ...b.semantic!,
                        node: { kind: "fragments", fragments: [check.heading] },
                      };
                      delete semantic.sourceFooter;
                      return [
                        {
                          ...base,
                          kind: "text",
                          markdown: b.markdown,
                          semantic: {
                            ...b.semantic!,
                            node: { kind: "fragments", fragments: check.body },
                          },
                        },
                        {
                          ...base,
                          id: `${b.blockId}.subheading`,
                          kind: "text",
                          markdown: "",
                          keepWithNext: true,
                          semantic,
                        },
                      ];
                    }
                    const parts = b.semantic?.node
                      ? [b.markdown]
                      : splitTextbookMarkdown(b.markdown);
                    return parts.map((markdown, i) => ({
                      ...base,
                      id:
                        parts.length === 1
                          ? b.blockId
                          : `${b.blockId}.part-${i}`,
                      kind: "text",
                      markdown,
                    }));
                  }
                  case "image":
                    return [
                      {
                        ...base,
                        kind: "image",
                        assetId: b.assetId,
                        caption: b.caption,
                      },
                    ];
                  case "dialogue":
                    return b.turns.map((turn, i) => ({
                      ...base,
                      ...turn,
                      id: `${b.blockId}.turn-${i}`,
                      kind: "dialogue",
                      ...(b.semantic?.source?.kind === "opening" &&
                      turn.speakerId.includes("teacher-")
                        ? { speakerName: "선생님" }
                        : {}),
                    }));
                  case "concept-recall": {
                    const questionNode = b.semantic?.node;
                    if (questionNode?.kind === "conceptQuestions") {
                      return [
                        {
                          ...base,
                          kind: "recall",
                          phase: b.phase,
                          questionRows: questionNode.questions.map(
                            ({ entryId, question }) =>
                              variant === "student"
                                ? { entryId, prompt: question.prompt }
                                : {
                                    entryId,
                                    prompt: question.prompt,
                                    answer: question.answer,
                                    requiredIdeas: question.requiredIdeas.map(
                                      (idea) => ({ anyOf: [...idea.anyOf] }),
                                    ),
                                  },
                          ),
                          answersVisible: variant === "answers",
                          pieces: [],
                          repetitionChecks: false,
                          continuation: b.semantic?.continuation,
                          lastPart: true,
                        },
                      ];
                    }
                    const phase = variant === "answers" ? "study" : b.phase;
                    const node = b.semantic?.node;
                    const rows =
                      node?.kind === "rows" || node?.kind === "concept"
                        ? node.rows
                        : null;
                    const edited =
                      rows?.every((row) => row.textFormat === "bank-blank") &&
                      rows
                        .map((row) => memoryRowMarkdown(row, b.phase))
                        .join("\n\n") !== b.markdown;
                    if (rows && !edited) {
                      const hidden =
                        variant === "student" && b.phase !== "study";
                      const safeNode = hidden
                        ? {
                            ...node!,
                            rows: rows.map((row) => ({ ...row, rawText: "" })),
                          }
                        : node;
                      const previous = s.blocks[s.blocks.indexOf(b) - 1];
                      return [
                        {
                          ...base,
                          kind: "recall",
                          phase: b.phase,
                          semantic: { ...b.semantic!, node: safeNode },
                          answersVisible: variant === "answers",
                          memoryPhases,
                          displayRows: recallDisplayRows(
                            rows,
                            b.phase,
                            variant === "answers",
                          ),
                          // Structured rows are validated/projected by their own format parser.
                          // TeX braces are not legacy recall delimiters.
                          pieces: [],
                          continuation:
                            b.semantic?.continuation ??
                            (previous?.kind === "concept-recall" &&
                              previous.semantic?.activity ===
                                b.semantic?.activity),
                          memoryContinuationTitle: s.title,
                          lastPart: true,
                          repetitionChecks:
                            b.phase === "study" && b.showRepetitionChecks,
                        },
                      ];
                    }
                    recallPieces(b.markdown, phase);
                    const parts = splitRecallMarkdown(b.markdown);
                    return parts.map((markdown, i) => ({
                      ...base,
                      ...(edited
                        ? { semantic: { ...b.semantic!, node: undefined } }
                        : {}),
                      id:
                        parts.length === 1
                          ? b.blockId
                          : `${b.blockId}.part-${i}`,
                      kind: "recall",
                      phase: b.phase,
                      answersVisible: variant === "answers",
                      continuation: i > 0,
                      lastPart: i === parts.length - 1,
                      pieces: recallPieces(
                        markdown,
                        /\[\[|\{\{/.test(markdown) ? phase : "study",
                      ),
                      repetitionChecks:
                        b.phase === "study" &&
                        b.showRepetitionChecks &&
                        i === parts.length - 1,
                    }));
                  }
                  case "concept": {
                    const c = concepts.get(b.conceptKey);
                    if (!c) throw new Error(`Missing concept ${b.conceptKey}`);
                    const qr = conceptQrs.get(c.conceptKey);
                    const groups = frozenConceptGroups(c);
                    const parts = groups.length
                      ? groups.map((group) => group.body)
                      : splitConceptBody(c.body);
                    // Frozen groups are distinct concept cards. A split authored body is
                    // one concept continued over several blocks, with one printed number.
                    const bodyOrdinal = groups.length
                      ? undefined
                      : ++conceptOrdinal;
                    return parts.map((body, i) => ({
                      ...base,
                      id:
                        parts.length === 1
                          ? b.blockId
                          : `${b.blockId}.part-${i}`,
                      kind: "concept",
                      ordinal: groups.length ? ++conceptOrdinal : bodyOrdinal,
                      conceptKey: c.conceptKey,
                      title: groups[i]?.title ?? c.title,
                      body,
                      ...(groups[i]
                        ? {
                            semantic: {
                              activity: "concepts" as const,
                              node: {
                                kind: "concept" as const,
                                conceptId: groups[i].conceptId,
                                title: groups[i].title,
                                rows: groups[i].rows,
                              },
                            },
                          }
                        : {}),
                      continuation: !groups.length && i > 0,
                      qr:
                        qr && i === parts.length - 1
                          ? { id: qr.qrTargetId, url: qr.url }
                          : null,
                    }));
                  }
                  case "problem": {
                    const item = items.get(b.itemId);
                    if (!item) throw new Error(`Missing item ${b.itemId}`);
                    const snapshot = snapshots.get(item.snapshotId);
                    if (!snapshot)
                      throw new Error(`Missing snapshot ${item.snapshotId}`);
                    const qr = item.qrTargetId
                      ? qrs.get(item.qrTargetId)
                      : undefined;
                    const payload = snapshot.payload;
                    // The answer book is paginated on its own: an ordinary one-column problem
                    // takes the whole row there, its answer beside the question. The student
                    // variant and the saved layout are not touched.
                    const answerCase =
                      variant === "answers"
                        ? answerCaseLayout(item.layout, b.semantic)
                        : undefined;
                    return [
                      {
                        ...base,
                        kind: "problem",
                        itemId: item.itemId,
                        displayNumber: item.displayNumber,
                        content: payload.content,
                        figures: payload.figures,
                        questionType: payload.questionType,
                        learningStage: item.learningStage,
                        layout: answerCase?.layout ?? item.layout,
                        ...(answerCase?.placement
                          ? { answerPlacement: answerCase.placement }
                          : {}),
                        qr: qr ? { id: qr.qrTargetId, url: qr.url } : null,
                        sourcePageLabel: pages.get(item.itemId) ?? null,
                        ...(variant === "answers"
                          ? {
                              answer: payload.answer,
                              solution: payload.solution,
                            }
                          : item.learningStage === "worked-example"
                            ? {
                                publicWorkedExample: {
                                  answer: payload.answer,
                                  solution: payload.solution,
                                },
                              }
                            : {}),
                      },
                    ];
                  }
                }
              }),
            ],
          },
          [
            ...new Set(
              u.sections.flatMap((section) =>
                section.blocks.flatMap((block) =>
                  block.semantic ? [block.semantic.activity] : [],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  };
  const scriptTotals = new Map<string, number>();
  for (const block of model.sections.flatMap((section) => section.blocks)) {
    const source = block.semantic?.source;
    if (source?.kind === "opening" && source.scriptIndex)
      scriptTotals.set(
        source.unit,
        Math.max(scriptTotals.get(source.unit) ?? 0, source.scriptIndex),
      );
  }
  for (const block of model.sections.flatMap((section) => section.blocks)) {
    const source = block.semantic?.source;
    if (source?.kind === "opening")
      block.dialogueScriptTotal = scriptTotals.get(source.unit);
  }
  return model;
}

FILE: src/lib/textbook/render/blocks/recall.ts
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import type { EditorialBlock } from "../editorial";
import {
  escapeHtml as esc,
  renderTextbookMarkdown as md,
  renderTextbookLabel as labelHtml,
} from "../markdown";
import { displayStyleMath } from "./dialogue";

export type RecallPhase = "study" | "keywords" | "sentences";
/** Writing lines are 7mm apart everywhere; a memory row is a whole number of them tall. */
export const RECALL_LINE_PITCH_MM = 7;
/** Top and bottom padding of a row: sheets written from the bank, and original v15 pages. */
export const RECALL_ROW_PADDING_MM = { bank: 2.2, source: 3 } as const;
/**
 * A sheet converted from an original page carries these on its section and on every row
 * (`.tb-memory-row-source[data-row-origin="source"]`). Sheets written from the bank carry neither.
 */
export const RECALL_SOURCE_CLASS = "tb-memory-source";

type RecallBlock = Extract<EditorialBlock, { kind: "recall" }> & {
  /** `variant === "answers"`. Absent: inferred from the legacy pieces (see `revealed`). */
  answersVisible?: boolean;
  /** Enabled memory phases in book order; the tab strip never names a phase outside it. */
  memoryPhases?: readonly RecallPhase[];
  /** Measured common height per rowKey: the maximum over the three phases. */
  rowHeightsMm?: Readonly<Record<string, number>>;
  /** Page index within the phase, for the QA page-partition check. */
  relativePageIndex?: number;
  /**
   * Rows the model already projected for this variant with `recallDisplayRows`. When present
   * they are printed as given and the node's `rawText` (stripped for students) is never read.
   */
  displayRows?: readonly RecallDisplayRow[];
  /** The lesson a continued bank block belongs to; printed with "계속" in its reserved bar. */
  memoryContinuationTitle?: string;
};

export type RecallDisplayPiece =
  | { kind: "text"; markdown: string }
  | { kind: "key"; markdown: string }
  | { kind: "blank"; widthEm: number };
export interface RecallDisplayRow {
  rowKey: string;
  label: string;
  pieces: RecallDisplayPiece[];
  /** The whole body is withheld (student sentence writing). */
  hidden: boolean;
  /** Common height in line pitches: one pure function of the row, identical in every phase. */
  lines: number;
}

/** v15 source math `[[tex]]` as Markdown math. The TeX bytes are copied, never rewritten. */
export function v15TexToMarkdown(raw: string): string {
  return raw.replace(/\[\[([\s\S]*?)\]\]/g, (_, tex: string) => `$${tex}$`);
}

type CanonicalPiece = { kind: "text" | "key"; markdown: string };
/** `{{key}}` outside math. Braces inside `[[tex]]` belong to TeX (`\frac{1}{\sqrt{2}}`). */
function v15Pieces(raw: string): CanonicalPiece[] {
  const pieces: CanonicalPiece[] = [];
  let text = "";
  let key: string | null = null;
  const flush = () => {
    if (text) pieces.push({ kind: "text", markdown: v15TexToMarkdown(text) });
    text = "";
  };
  for (let at = 0; at < raw.length;) {
    if (raw.startsWith("[[", at)) {
      const close = raw.indexOf("]]", at + 2);
      const end = close < 0 ? raw.length : close + 2;
      if (key === null) text += raw.slice(at, end);
      else key += raw.slice(at, end);
      at = end;
    } else if (key === null && raw.startsWith("{{", at)) {
      flush();
      key = "";
      at += 2;
    } else if (key !== null && raw.startsWith("}}", at)) {
      pieces.push({ kind: "key", markdown: v15TexToMarkdown(key) });
      key = null;
      at += 2;
    } else {
      if (key === null) text += raw[at];
      else key += raw[at];
      at += 1;
    }
  }
  // An unclosed key stays hidden material: it is never demoted to public text.
  if (key !== null)
    pieces.push({ kind: "key", markdown: v15TexToMarkdown(key) });
  flush();
  return pieces;
}
function canonicalPieces(row: TextbookSemanticRow): CanonicalPiece[] {
  if (row.textFormat === "v15-tex") return v15Pieces(row.rawText);
  if (row.textFormat === "bank-blank")
    return splitBlankSentence(row.rawText).map((piece) => ({
      kind: piece.kind === "key" ? "key" : "text",
      markdown: piece.text,
    }));
  return [{ kind: "text", markdown: row.rawText }];
}

/** Printed advance in em. Math is counted by its symbols, not its commands. */
function advanceEm(markdown: string): number {
  let units = 0;
  const count = (text: string, scale: number) => {
    for (const ch of text)
      units +=
        scale * (/\s/.test(ch) ? 0.3 : ch.charCodeAt(0) < 0x2e80 ? 0.56 : 1);
  };
  let at = 0;
  for (const match of markdown.matchAll(/\$([^$]*)\$/g)) {
    count(markdown.slice(at, match.index), 1);
    count(
      match[1].replace(/\\[a-zA-Z]+/g, "0").replace(/[{}^_\\&]/g, ""),
      1.05,
    );
    at = match.index! + match[0].length;
  }
  count(markdown.slice(at).replace(/[*_`]/g, ""), 1);
  return units;
}
/** A blank keeps the length of what it hides, never the text. */
const blankWidthEm = (markdown: string) =>
  Math.round(Math.min(40, Math.max(2, advanceEm(markdown) + 0.6)) * 10) / 10;
/** Body column of a full-width sheet at 8.3pt holds about this many em before wrapping. */
const ROW_WRAP_EM = 44;

/**
 * The variant-safe display of the common rows. With `reveal` false the keyword and sentence
 * text is dropped here, so nothing downstream can paint or serialize it.
 */
export function recallDisplayRows(
  rows: readonly TextbookSemanticRow[],
  phase: RecallPhase,
  reveal: boolean,
): RecallDisplayRow[] {
  return rows.map((row) => {
    const source = canonicalPieces(row);
    const lines = Math.max(
      1,
      Math.ceil(
        advanceEm(source.map((p) => p.markdown).join("")) / ROW_WRAP_EM,
      ),
    );
    const base = { rowKey: row.rowKey, label: row.label, lines };
    if (phase === "sentences" && !reveal)
      return { ...base, pieces: [], hidden: true };
    return {
      ...base,
      hidden: false,
      pieces: source.map((piece): RecallDisplayPiece => {
        if (piece.kind === "text" || phase !== "keywords")
          return { kind: "text", markdown: piece.markdown };
        return reveal
          ? { kind: "key", markdown: piece.markdown }
          : { kind: "blank", widthEm: blankWidthEm(piece.markdown) };
      }),
    };
  });
}

/**
 * The common row heights for `rowHeightsMm`: measure every `[data-row-key]` row in all enabled
 * phases without heights, then give each key its tallest measurement (rounded up to 0.1mm).
 */
export function commonRecallRowHeights(
  measured: ReadonlyArray<{ rowKey: string; heightMm: number }>,
): Record<string, number> {
  const heights: Record<string, number> = {};
  for (const { rowKey, heightMm } of measured)
    heights[rowKey] = Math.max(
      heights[rowKey] ?? 0,
      Math.ceil(heightMm * 10 - 1e-6) / 10,
    );
  return heights;
}

/** Private-use markers survive Markdown and are swapped for markup afterwards. */
const MARK = String.fromCharCode(0xe000);
const OPEN = String.fromCharCode(0xe001);
const CLOSE = String.fromCharCode(0xe002);
const keywordBlank = (widthEm: number) =>
  `<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="빈칸" style="width:${widthEm}em"></span>`;
const SEAM = String.fromCharCode(0xe003);
/**
 * The pieces of one row, typeset as one Markdown source. A key that is a formula may touch the
 * formula after it (`{$50$}$\%$`); joined bare, the two `$` would open display math. A seam
 * between such pieces keeps them two inline formulas and is taken out of the typeset HTML, so
 * the formulas still touch on the page. The stored text and the pieces are not changed.
 */
export function typesetRecallPieces(
  parts: readonly string[],
  typeset: (markdown: string) => string,
): string {
  let markdown = "";
  for (const part of parts) {
    if (markdown.endsWith("$") && part.startsWith("$")) markdown += SEAM;
    markdown += part;
  }
  return typeset(markdown).replaceAll(SEAM, "");
}
const writingLines = (count: number, label: string) =>
  `<span class="tb-blank tb-blank-sentence" data-writing-space="sentence" role="textbox" aria-label="${label}">${'<span class="tb-write-line"></span>'.repeat(count)}</span>`;
/** The original sentence sheet: one rule under the space the hidden sentence would take. */
const writingRule = (label: string) =>
  `<span class="tb-blank tb-blank-sentence tb-blank-rule" data-writing-space="sentence" role="textbox" aria-label="${label}"><span class="tb-write-line"></span></span>`;

/**
 * `source`: the row is an original v15 row. Its formulas are set in display style as they are
 * typeset (the stored text keeps its TeX), and a hidden sentence short of two 7mm lines is one rule.
 */
function rowBodyHtml(
  row: RecallDisplayRow,
  lines: number,
  source = false,
): string {
  if (row.hidden)
    return source && lines < 2
      ? writingRule("문장으로 개념 쓰기")
      : writingLines(lines, "문장으로 개념 쓰기");
  const blanks: number[] = [];
  const parts = row.pieces.map((piece) => {
    if (piece.kind === "text") return piece.markdown;
    if (piece.kind === "key") return `${OPEN}${piece.markdown}${CLOSE}`;
    blanks.push(piece.widthEm);
    return MARK;
  });
  let blank = 0;
  return typesetRecallPieces(parts, (markdown) =>
    md(source ? displayStyleMath(markdown) : markdown),
  )
    .replaceAll(MARK, () => keywordBlank(blanks[blank++]))
    .replaceAll(OPEN, '<span class="tb-memory-key">')
    .replaceAll(CLOSE, "</span>");
}

const PHASES: Record<
  RecallPhase,
  { title: string; subtitle: string; ask: string }
> = {
  study: {
    title: "개념학습",
    subtitle: "정의와 성질을 읽고 예를 들어 설명하시오.",
    ask: "정의와 성질을 확인하시오.",
  },
  keywords: {
    title: "빈칸개념암기",
    subtitle: "빈칸에 알맞은 용어와 식을 쓰시오.",
    ask: "빈칸에 알맞은 내용을 쓰시오.",
  },
  sentences: {
    title: "통문장개념암기",
    subtitle: "책을 보지 않고 각 항목을 문장으로 쓰시오.",
    ask: "각 항목의 내용을 문장으로 쓰시오.",
  },
};
const NAME_DATE = "<span>이름 __________　날짜 __________</span>";
const ROUNDS =
  '<span class="tb-memory-rounds" aria-label="학습 반복 확인">1회<i></i>2회<i></i>3회<i></i>4회<i></i></span>';

/**
 * Whether hidden text may be printed. The model's flag decides; the study sheet hides nothing.
 * Without the flag only a whole block whose legacy pieces show no blank is taken as the answer
 * variant. A paragraph part of a split block is never evidence: its label paragraph has no
 * blank of its own in either variant, so guessing there would print a student's answers.
 */
function revealed(block: RecallBlock): boolean {
  if (block.answersVisible !== undefined) return block.answersVisible;
  if (block.phase === "study") return true;
  return (
    !block.continuation &&
    block.lastPart !== false &&
    block.pieces.length > 0 &&
    !block.pieces.some((p) => p.kind === "blank")
  );
}

/**
 * Rows the model projected are printed as given. A block explicitly marked as the student
 * variant still loses anything a projection should not have carried into it.
 */
function projectedRows(block: RecallBlock): RecallDisplayRow[] | undefined {
  const rows = block.displayRows;
  if (!rows) return undefined;
  if (block.answersVisible !== false || block.phase === "study")
    return [...rows];
  return rows.map((row) =>
    block.phase === "sentences"
      ? { ...row, pieces: [], hidden: true }
      : {
          ...row,
          pieces: row.pieces.map((piece): RecallDisplayPiece =>
            piece.kind === "key"
              ? { kind: "blank", widthEm: blankWidthEm(piece.markdown) }
              : piece,
          ),
        },
  );
}

/** An authored code such as C03 is printed as written; identifiers are never mined for digits. */
function conceptCode(conceptId: string): string {
  return /^[A-Za-z]{1,3}\d{1,3}$/.test(conceptId) ? conceptId : "";
}

/** Study, keyword and sentence sheets over one immutable row list. */
function memoryHtml(
  block: RecallBlock,
  node: Extract<
    NonNullable<NonNullable<RecallBlock["semantic"]>["node"]>,
    { kind: "rows" | "concept" }
  >,
): string {
  const phase = block.phase;
  const rows =
    projectedRows(block) ??
    recallDisplayRows(node.rows, phase, revealed(block));
  const conceptId = node.kind === "concept" ? node.conceptId : "";
  const group =
    node.kind === "concept" ? node.conceptId : (node.groupKey ?? "");
  const phases = block.memoryPhases ?? [];
  const continuation = block.continuation || block.semantic?.continuation;
  const tabs =
    phases.length > 1 && phases.includes(phase)
      ? `<div class="tb-recall-phases" aria-label="개념 정리 순서">${phases.map((p, i) => `<span${p === phase ? ' class="tb-recall-active" aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${PHASES[p].title}</span>`).join("")}</div>`
      : "";
  const intro = continuation
    ? ""
    : `${tabs}<div class="tb-recall-checkbar"><b>${PHASES[phase].ask}</b>${NAME_DATE}</div>`;
  // Only the study sheet is repeated four times.
  const rounds = phase === "study" && block.repetitionChecks ? ROUNDS : "";
  const code = node.kind === "concept" ? conceptCode(node.conceptId) : "";
  // An original v15 page: its own row geometry and display-style formulas (see the content CSS).
  const origin = block.semantic!.source;
  // A continued bank block has no concept name and no instruction of its own. It says what it
  // continues in the bar it reserves anyway, in every phase, so the bar keeps one height.
  const continued =
    continuation && !origin
      ? `<span class="tb-memory-continuation" data-continuation>${block.memoryContinuationTitle ? `<span class="tb-memory-continuation-title">${labelHtml(block.memoryContinuationTitle)}</span>` : ""}<small>계속</small></span>`
      : "";
  const title =
    node.kind === "concept"
      ? `<header class="tb-memory-title" data-anchor="memory-title">${code ? `<span class="tb-memory-code">${esc(code)}</span>` : ""}<b>${labelHtml(node.title)}</b>${rounds}</header>`
      : // Rows without a concept name keep the same bar in every phase, so the first row starts
        // at one height. Only the study sheet prints the repetition marks in it.
        `<header class="tb-memory-title tb-memory-title-bare" data-anchor="memory-title">${continued}${rounds}</header>`;
  const page =
    block.relativePageIndex === undefined
      ? ""
      : ` data-relative-page-index="${block.relativePageIndex}"`;
  const padding = RECALL_ROW_PADDING_MM[origin ? "source" : "bank"];
  const body = rows
    .map((row) => {
      const measured = block.rowHeightsMm?.[row.rowKey];
      // A measured row holds as many whole 7mm lines as fit above its padding. An unmeasured
      // source row keeps its natural height: the rule spans the estimated lines of its text.
      const lines =
        measured === undefined
          ? row.lines
          : Math.max(
              1,
              Math.floor((measured - padding) / RECALL_LINE_PITCH_MM),
            );
      const written = origin && measured === undefined ? 1 : lines;
      return `<div class="tb-memory-row${origin ? " tb-memory-row-source" : ""}${measured === undefined ? "" : " tb-memory-row-measured"}" data-row-key="${esc(row.rowKey)}" data-row-group="${esc(group)}" data-concept-id="${esc(conceptId)}" data-phase="${phase}"${origin ? ' data-row-origin="source"' : ""}${page} style="--tb-row-lines:${lines}${measured === undefined ? "" : `;height:${measured}mm`}"><div class="tb-memory-label" data-anchor="row-label">${labelHtml(row.label)}</div><div class="tb-memory-body" data-anchor="row-body">${rowBodyHtml(row, written, !!origin)}</div></div>`;
    })
    .join("");
  return `<section class="tb-recall tb-memory${origin ? ` ${RECALL_SOURCE_CLASS}` : ""}${continuation ? " tb-recall-continuation" : ""}" data-phase="${phase}" data-activity="${block.semantic!.activity}" data-row-group="${esc(group)}"${conceptId ? ` data-concept-id="${esc(conceptId)}"` : ""}${origin ? ` data-memory-origin="source" data-source-kind="${esc(origin.kind)}"` : ""}>${intro}${title}<div class="tb-memory-rows">${body}</div></section>`;
}

const recallTextHtml = (markdown: string) =>
  `${/^\s/.test(markdown) ? " " : ""}${md(markdown)}${/\s$/.test(markdown) ? " " : ""}`;

/** Statements judged true or false with a reason: its own instruction, never the memory tabs. */
function errorCheckHtml(block: RecallBlock): string {
  const instruction = block.continuation
    ? ""
    : `<div class="tb-recall-checkbar tb-activity-instruction"><b>문장이 옳으면 ○, 틀리면 ×에 표시하고 그 이유를 쓰시오.</b>${NAME_DATE}</div>`;
  const items: string[] = [];
  let statement = "";
  const close = (answer: string) => {
    if (statement.trim() || answer)
      items.push(
        `<div class="tb-error-item"><div class="tb-error-statement">${md(statement.trim())}</div>${answer}</div>`,
      );
    statement = "";
  };
  for (const piece of block.pieces) {
    if (piece.kind === "text") statement += piece.markdown;
    else
      close(
        `<div class="tb-error-answer"><span class="tb-error-ox" role="group" aria-label="옳음 또는 틀림 표시"><i>○</i><i>×</i></span>${writingLines(2, "이유 쓰기")}</div>`,
      );
  }
  close("");
  return `<section class="tb-recall tb-error-check${block.continuation ? " tb-recall-continuation" : ""}" data-activity="errorCheck" data-phase="${block.phase}">${instruction}<div class="tb-error-items">${items.join("")}</div></section>`;
}

/** A definition is read and its term is written: its own instruction, never the memory tabs. */
function termRecallHtml(block: RecallBlock): string {
  const instruction = block.continuation
    ? ""
    : `<div class="tb-recall-checkbar tb-activity-instruction"><b>뜻을 읽고 알맞은 용어를 쓰시오.</b>${NAME_DATE}</div>`;
  const node = block.semantic?.node;
  let rows: string;
  if (node?.kind === "rows") {
    const reveal = revealed(block);
    rows = recallDisplayRows(node.rows, "study", true)
      .map((row) => {
        const term = reveal
          ? `<span class="tb-memory-key">${labelHtml(row.label)}</span>`
          : keywordBlank(
              Math.round(
                Math.min(40, Math.max(4, advanceEm(row.label) + 1)) * 10,
              ) / 10,
            );
        return `<div class="tb-term-row" data-row-key="${esc(row.rowKey)}"><div class="tb-term-name">${term}</div><div class="tb-term-definition">${rowBodyHtml(row, row.lines)}</div></div>`;
      })
      .join("");
  } else {
    // Legacy grammar: each hidden term opens a row and the text after it is its definition.
    const parts: string[] = [];
    let term = "";
    let definition = "";
    const close = () => {
      if (term || definition.trim())
        parts.push(
          `<div class="tb-term-row"><div class="tb-term-name">${term}</div><div class="tb-term-definition">${md(definition.replace(/^\s*:\s*/, "").trim())}</div></div>`,
        );
      term = "";
      definition = "";
    };
    for (const piece of block.pieces) {
      if (piece.kind === "blank") {
        close();
        term =
          '<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="용어 쓰기"></span>';
      } else definition += piece.markdown;
    }
    close();
    rows = parts.join("");
  }
  return `<section class="tb-recall tb-term-recall${block.continuation ? " tb-recall-continuation" : ""}" data-activity="termRecall" data-phase="${block.phase}">${instruction}<div class="tb-term-rows">${rows}</div></section>`;
}

/** Manuscripts saved before semantic metadata: the paragraph sheet, with ruled writing space. */
function legacyHtml(block: RecallBlock): string {
  const introduction = block.continuation
    ? ""
    : `<div class="tb-recall-phases" aria-label="개념 정리 순서">${(
        Object.keys(PHASES) as RecallPhase[]
      )
        .map(
          (phase, i) =>
            `<span${phase === block.phase ? ' class="tb-recall-active" aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${PHASES[phase].title}</span>`,
        )
        .join(
          "",
        )}</div><div class="tb-recall-checkbar"><b>${PHASES[block.phase].subtitle}</b>${NAME_DATE}</div>`;
  return `<section class="tb-recall${block.continuation ? " tb-recall-continuation" : ""}" data-phase="${block.phase}">${introduction}<div class="tb-recall-content">${block.pieces.map((p) => (p.kind === "blank" ? (p.scope === "sentence" ? writingLines(3, "문장으로 개념 쓰기") : '<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="빈칸"></span>') : `<div class="tb-recall-text">${recallTextHtml(p.markdown)}</div>`)).join("")}</div>${block.repetitionChecks ? '<div class="tb-repetition" aria-label="학습 반복 확인">1회 ○　2회 ○　3회 ○　4회 ○</div>' : ""}${block.lastPart === false ? "" : `<p class="tb-study-footer">${block.phase === "study" ? "조건과 예를 함께 확인한다." : "이 단원의 개념학습으로 채점한다."}</p>`}</section>`;
}

export function renderRecallHtml(
  block: Extract<EditorialBlock, { kind: "recall" }>,
): string {
  const recall: RecallBlock = block;
  const semantic = recall.semantic;
  if (recall.questionRows) {
    const title = labelHtml(semantic?.title ?? "개념 질문");
    const tasks = recall.questionRows
      .map(({ entryId, prompt, answer, requiredIdeas }) => {
        const body = revealed(recall)
          ? `<div class="tb-recall-text"><p>참고 답</p>${md(answer ?? "")}${requiredIdeas?.length ? `<p>확인할 내용 · 한 항목 안의 표현은 대안입니다.</p><ul>${requiredIdeas.map((idea) => `<li>${md(idea.anyOf.join(" / "))}</li>`).join("")}</ul>` : ""}</div>`
          : writingLines(8, "물음에 대한 답 쓰기");
        return `<div class="tb-question-task" data-question-id="${esc(entryId)}"><div class="tb-recall-text">${md(prompt)}</div>${body}</div>`;
      })
      .join("");
    const instruction =
      semantic?.activity === "explainActivity"
        ? "각 물음에 답한 뒤 친구와 답을 비교해 보세요."
        : semantic?.activity === "conceptMap"
          ? "같은 단원의 개념을 묶었습니다. 각 물음을 읽고 답을 쓰세요."
          : semantic?.activity === "preparation"
            ? "지금 알고 있는 내용으로 답해 보세요. 아직 배우지 않았다면 ‘아직 모르겠어요’라고 적어도 됩니다."
            : "각 물음을 읽고 책 없이 답을 떠올려 쓰세요.";
    return `<section class="tb-recall tb-concept-questions" data-activity="${esc(semantic?.activity ?? "termRecall")}" data-question-version="1"><div class="tb-recall-checkbar"><b>${title}${recall.continuation ? " · 계속" : ""}</b>${NAME_DATE}</div>${recall.continuation ? "" : `<p>${instruction}</p>`}${tasks}</section>`;
  }
  if (semantic?.activity === "errorCheck") return errorCheckHtml(recall);
  if (semantic?.activity === "termRecall") return termRecallHtml(recall);
  const node = semantic?.node;
  if (node?.kind === "rows" || node?.kind === "concept")
    return memoryHtml(recall, node);
  return legacyHtml(recall);
}

FILE: src/lib/textbook/render/editorialProjection.ts
import type {
  RenderBlock,
  RenderSection,
  TextbookEditorialStage,
} from "./model";
import { ACTIVITY_LABELS } from "../activities";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";

const ACTIVITY_STAGE: Record<TextbookActivity, TextbookEditorialStage> = {
  cover: "guide",
  unitIntro: "unit",
  dialogue: "opening",
  concepts: "concept",
  termRecall: "recall",
  conceptStudy: "recall",
  clozeRecall: "recall",
  sentenceRecall: "recall",
  practice: "practice",
  workedExamples: "practice",
  review: "review",
  assessment: "application",
  written: "application",
  rest: "rest",
  learningGuide: "guide",
  learningPlan: "guide",
  questionLog: "guide",
  preparation: "basic",
  errorCheck: "application",
  tableOfContents: "guide",
  dialogueCheck: "basic",
  conceptBlankTest: "recall",
  basicCheck: "basic",
  explainActivity: "application",
  conceptMap: "recall",
  reasoning: "application",
  conceptIndex: "guide",
  typeIndex: "guide",
};
const MEMORY_COPY = {
  conceptStudy: ["개념학습", "정의와 성질을 읽고 예를 들어 설명하시오."],
  clozeRecall: ["빈칸개념암기", "빈칸에 알맞은 용어와 식을 쓰시오."],
  sentenceRecall: [
    "통문장개념암기",
    "책을 보지 않고 각 항목을 문장으로 쓰시오.",
  ],
} as const;

function semanticProjection(
  section: RenderSection,
  enabledActivities?: readonly TextbookActivity[],
): RenderSection {
  const source = section.blocks.filter(
    (block) => block.sourceBlockId !== "section-heading",
  );
  const steps = [
    ...new Set(
      source.flatMap((block) =>
        block.semantic ? [block.semantic.activity] : [],
      ),
    ),
  ].map((activity) => ({ activity, label: ACTIVITY_LABELS[activity] }));
  const enabled = enabledActivities ?? steps.map((step) => step.activity);
  const phases = enabled
    .filter((activity) => Object.hasOwn(MEMORY_COPY, activity))
    .map((activity) => ({
      activity,
      label: MEMORY_COPY[activity as keyof typeof MEMORY_COPY][0],
    }));
  const majorSteps = (
    [
      ["concept", "개념 이해"],
      ["recall", "개념 정리"],
      ["basic", "기본 확인"],
      ["practice", "유형 연습"],
      ["application", "설명·적용"],
      ["review", "다시 꺼내기"],
    ] as const
  )
    .filter(([stage]) =>
      enabled.some((activity) => ACTIVITY_STAGE[activity] === stage),
    )
    .map(([activity, label]) => ({ activity, label }));
  const blocks: RenderBlock[] = [];
  let current: TextbookActivity | undefined;
  let lessonTitle = "";
  let exampleGroupNumber = 0;
  for (const block of source) {
    const semantic = block.semantic;
    const activity = semantic?.activity ?? current;
    const stage = activity ? ACTIVITY_STAGE[activity] : "guide";
    if (
      semantic?.node?.kind === "unitIntro" &&
      section.templateKey === "auto-unit-intro" &&
      block.kind === "text"
    ) {
      for (const part of ["left", "right", "single"] as const)
        blocks.push({
          ...block,
          id: `${block.id}.intro-${part}`,
          unitIntroPart: part,
          unitNumber: section.blocks.find((candidate) => candidate.unitNumber)
            ?.unitNumber,
          editorialStage: "unit",
        });
      current = activity;
      continue;
    }
    if (activity && activity !== current) {
      const memory = Object.hasOwn(MEMORY_COPY, activity)
        ? MEMORY_COPY[activity as keyof typeof MEMORY_COPY]
        : undefined;
      const skip =
        section.templateKey.startsWith("reference-unitSpread") ||
        section.templateKey === "auto-unit-intro";
      if (!skip)
        blocks.push({
          id: `${block.id}.activity-heading`,
          sourceBlockId: block.sourceBlockId,
          unitKey: section.unitKey,
          sectionKey: section.sectionKey,
          kind: "heading",
          editorialStage: stage,
          semantic: { ...semantic!, node: undefined },
          title:
            activity === "dialogue"
              ? "단원을 여는 수업"
              : block.kind === "recall" && block.questionRows
                ? (semantic.title ?? "개념 질문")
                : (memory?.[0] ??
                  (section.templateKey.startsWith("reference-")
                    ? section.title
                    : ACTIVITY_LABELS[activity])),
          subtitle:
            activity === "dialogue" && block.kind === "dialogue"
              ? semantic?.source
                ? (semantic.title ?? section.title)
                : (block.presentation?.lessonTitle ?? section.title)
              : (memory?.[1] ??
                (semantic?.source ? (semantic.subtitle ?? "") : section.title)),
          stageNumber: String(
            semantic?.source?.scriptIndex ??
              (memory
                ? ["conceptStudy", "clozeRecall", "sentenceRecall"].indexOf(
                    activity,
                  ) + 1
                : (section.blocks.find((candidate) => candidate.unitNumber)
                    ?.unitNumber ??
                  steps.findIndex((step) => step.activity === activity) + 1)),
          ).padStart(2, "0"),
          progressSteps:
            activity === "dialogue" || stage === "guide"
              ? []
              : memory
                ? phases
                : majorSteps,
          unitNumber: section.blocks.find((candidate) => candidate.unitNumber)
            ?.unitNumber,
          startNewPage: blocks.length > 0,
        });
      if (
        activity === "dialogue" &&
        (semantic?.source?.scriptIndex === 1 || !semantic?.source)
      )
        blocks.push({
          id: `${block.id}.dialogue-guide`,
          sourceBlockId: block.sourceBlockId,
          kind: "text",
          markdown: "",
          unitKey: section.unitKey,
          sectionKey: section.sectionKey,
          editorialStage: "opening",
          dialogueGuide: semantic?.source
            ? "민서와 지호의 대화를 읽으며, 선생님의 질문에 먼저 답해 보시오."
            : "학생들의 대화를 읽으며, 선생님의 질문에 먼저 답해 보시오.",
        });
      current = activity;
    }
    if (
      block.kind === "text" &&
      !semantic?.node &&
      /^#{1,6}\s+[^\n]+\s*$/.test(block.markdown)
    )
      continue;
    if (
      block.kind === "dialogue" &&
      block.presentation?.lessonTitle !== lessonTitle
    ) {
      if (lessonTitle && block.presentation)
        blocks.push({
          id: `${block.id}.lesson-title`,
          sourceBlockId: block.sourceBlockId,
          unitKey: block.unitKey,
          sectionKey: block.sectionKey,
          kind: "text",
          markdown: block.presentation.lessonTitle,
          editorialStage: "opening",
          dialogueLesson: {
            lessonKey: block.presentation.lessonKey,
            lessonTitle: block.presentation.lessonTitle,
          },
        });
      lessonTitle = block.presentation?.lessonTitle ?? "";
    }
    blocks.push({
      ...block,
      editorialStage: stage,
      ...(semantic?.node?.kind === "exampleGroup" && block.kind === "text"
        ? { exampleGroupNumber: ++exampleGroupNumber }
        : {}),
      ...(semantic?.node?.kind === "exampleGroup" && block.kind === "problem"
        ? {
            exampleConfirmIndex: semantic.node.confirmItemIds.indexOf(
              block.itemId,
            ),
          }
        : {}),
      ...(block.kind === "recall" && Object.hasOwn(MEMORY_COPY, activity ?? "")
        ? { memoryPhases: [] }
        : {}),
    });
  }
  return { ...section, blocks, editorialStage: blocks[0]?.editorialStage };
}

const labels: Record<TextbookEditorialStage, string> = {
  opening: "단원을 여는 수업",
  concept: "개념 이해",
  recall: "개념 정리",
  basic: "기본 확인",
  practice: "예제로 익히기",
  application: "설명·적용",
  review: "다시 꺼내기",
  guide: "학습 안내",
  unit: "이번 단원에서 무엇을 배우게 될까?",
  rest: "쉬어가기",
};

function titleStage(title: string): TextbookEditorialStage | undefined {
  if (/준비 학습|선수 개념|기본 확인/.test(title)) return "basic";
  if (/오류 점검|서술형|단원 평가|설명·적용/.test(title)) return "application";
  if (/용어 백지|핵심어 빈칸|문장 백지|개념 정리/.test(title)) return "recall";
  if (/유형 연습|대표예제|예제로 익히기/.test(title)) return "practice";
  if (/누적 복습|다시 꺼내기/.test(title)) return "review";
  return undefined;
}

function blockStage(
  block: RenderBlock,
  current: TextbookEditorialStage,
): TextbookEditorialStage {
  if (block.kind === "dialogue") return "opening";
  if (block.kind === "concept") return "concept";
  if (block.kind === "recall")
    return current === "application" ? current : "recall";
  if (block.kind === "problem") {
    switch (block.learningStage) {
      case "worked-example":
      case "type-practice":
      case "basic":
        return "practice";
      case "cumulative-review":
        return "review";
      case "written":
      case "unit-assessment":
      case "application":
      case "error-check":
        return "application";
      case "preparation":
      case "concept-check":
        return "basic";
    }
  }
  if (block.kind === "text") {
    const heading = /^#{1,6}\s+([^\n]+)/.exec(block.markdown)?.[1];
    return (heading && titleStage(heading)) || current;
  }
  return current;
}

/** Editorial metadata affects only the render projection, never saved manuscript bytes. */
export function projectEditorialSection(
  section: RenderSection,
  enabledActivities?: readonly TextbookActivity[],
): RenderSection {
  if (
    section.blocks.some((block) => block.semantic) &&
    (section.templateKey.startsWith("auto-") ||
      section.templateKey.startsWith("reference-"))
  )
    return semanticProjection(section, enabledActivities);
  if (section.templateKey !== "auto-lesson") {
    const editorialStage =
      section.templateKey === "rest"
        ? "rest"
        : section.templateKey.includes("unit-intro")
          ? "unit"
          : section.templateKey.startsWith("auto-")
            ? "guide"
            : undefined;
    return editorialStage
      ? {
          ...section,
          editorialStage,
          blocks: section.blocks.map((block) => ({
            ...block,
            editorialStage,
            ...(block.kind === "heading" && editorialStage === "unit"
              ? {
                  title: section.unitTitle,
                  subtitle: "개념을 읽고, 풀이를 설명하다",
                }
              : {}),
          })),
        }
      : section;
  }

  const source = section.blocks;
  let stage: TextbookEditorialStage = "concept";
  const first = source.find((block) => block.kind !== "heading");
  if (first) stage = blockStage(first, stage);
  const blocks: RenderBlock[] = [];
  const heading = (
    sourceBlock: RenderBlock,
    title: string,
    nextStage: TextbookEditorialStage,
    keepId = false,
  ) => {
    blocks.push({
      id: keepId ? sourceBlock.id : `${sourceBlock.id}.editorial-heading`,
      sourceBlockId: sourceBlock.sourceBlockId,
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      kind: "heading",
      title,
      subtitle: section.title,
      stageNumber: {
        opening: "01",
        concept: "01",
        recall: "02",
        basic: "03",
        practice: "04",
        application: "05",
        review: "06",
        guide: "00",
        unit: "01",
        rest: "",
      }[nextStage],
      unitNumber: source.find((block) => block.unitNumber)?.unitNumber,
      editorialStage: nextStage,
      startNewPage: blocks.length > 0,
    });
    stage = nextStage;
  };

  for (const block of source) {
    if (block.kind === "heading" && blocks.length === 0) {
      if (
        first?.kind === "text" &&
        /^#{1,6}\s+([^\n]+)\s*$/.test(first.markdown) &&
        titleStage(first.markdown)
      )
        continue;
      heading(block, labels[stage], stage, true);
      continue;
    }
    const nextStage = blockStage(block, stage);
    const title =
      block.kind === "text"
        ? /^#{1,6}\s+([^\n]+)\s*$/.exec(block.markdown)
        : null;
    if (title && titleStage(title[1])) {
      heading(block, title[1], nextStage, true);
      continue;
    }
    if (nextStage !== stage) heading(block, labels[nextStage], nextStage);
    blocks.push({ ...block, editorialStage: nextStage });
  }
  return { ...section, editorialStage: blocks[0]?.editorialStage, blocks };
}

FILE: src/__tests__/unit/textbookStudentQuestions.test.ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { textbookBlockSchema } from "@/contracts/textbookExchange.contract";
import { conceptQuestionBlocks } from "@/lib/textbook/conceptQuestions";
import { QUESTION_REVISION, reviewedQuestionMode } from "@/lib/concept-blank/questions";
import { conceptMemoryRows } from "@/lib/textbook/conceptRows";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import { textbookFixture } from "../helpers/textbookFixture";

const entry: ConceptEntry = {
  id: "e3-question-fixture",
  section: "초3::1-1 덧셈과 뺄셈::받아올림이 있는 덧셈",
  level: "중",
  term: "낱개 묶기",
  kind: "방법",
  definition: "낱개 $10$개는 십 {1}개와 같다.",
  questionRevision: QUESTION_REVISION,
  bQuestion: {
    prompt: "낱개 $10$개를 십 묶음으로 바꾸면 몇 묶음인가요?",
    answer: "십 한 묶음이다.",
    requiredIdeas: [{ anyOf: ["십 묶음 하나"] }],
  },
  clozeQuestion: {
    sentence: "낱개 $20$개를 십 묶음으로 바꾸면 {$2$}묶음이다.",
    acceptedAnswers: [["$2$", "두"]],
  },
};
const resources = { assetUrl: () => "", qrDataUrl: () => "" };

describe("reviewed questions in new automatic textbooks", () => {
  it("rejects incompatible revisions, mixed source payloads and false manuscript edits", () => {
    expect(() => reviewedQuestionMode([{ ...entry, questionRevision: "unreviewed-v2" }])).toThrow("질문 판");
    const legacy = { ...entry };
    delete legacy.questionRevision;
    delete legacy.bQuestion;
    delete legacy.clozeQuestion;
    expect(() => reviewedQuestionMode([entry, legacy])).toThrow("질문 판");
    const block = conceptQuestionBlocks({ entries: [entry], conceptKey: "test", activity: "termRecall", title: "개념 질문" })[0];
    expect(textbookBlockSchema.safeParse({ ...block, markdown: "지면에 반영되지 않을 수정" }).success).toBe(false);
    expect(textbookBlockSchema.safeParse({ ...block, kind: "text" }).success).toBe(false);
    expect(textbookBlockSchema.safeParse({ ...block, phase: "study" }).success).toBe(false);
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].blocks = [{
      blockId: block.blockId, kind: "text", markdown: "허용되지 않는 구조를 투영만 검증한다.", semantic: block.semantic,
    }];
    const student = JSON.stringify(createTextbookRenderModel(exchange, "student"));
    expect(student).not.toContain("십 한 묶음이다");
    expect(student).not.toContain("십 묶음 하나");
  });
  it.each(["termRecall", "explainActivity", "conceptMap"] as const)(
    "%s freezes an explicit question and removes the key before a student model exists",
    (activity) => {
      const exchange = textbookFixture(1, 0);
      const blocks = conceptQuestionBlocks({
        entries: [entry],
        conceptKey: "test-concept",
        activity,
        title: "개념 질문",
      });
      expect(textbookBlockSchema.safeParse(blocks[0]).success).toBe(true);
      exchange.units[0].sections[0].blocks = blocks;
      const student = createTextbookRenderModel(exchange, "student");
      const serialized = JSON.stringify(student);
      expect(serialized).toContain("몇 묶음인가요?");
      expect(serialized).not.toContain(entry.bQuestion!.answer);
      expect(serialized).not.toContain("십 묶음 하나");
      const block = student.sections[0].blocks.find(
        (row) => row.kind === "recall",
      )!;
      const studentHtml = renderBlockHtml(block, resources);
      expect(studentHtml).toContain("몇 묶음인가요?");
      expect(studentHtml).toContain("물음에 대한 답 쓰기");
      expect(studentHtml).not.toContain("십 한 묶음이다");
      const teacher = createTextbookRenderModel(exchange, "answers");
      const teacherHtml = teacher.sections[0].blocks
        .map((row) => renderBlockHtml(row, resources))
        .join("");
      expect(teacherHtml).toContain("십 한 묶음이다.");
      expect(teacherHtml).toContain("십 묶음 하나");
      expect(exchange.units[0].sections[0].blocks).toEqual(blocks);
    },
  );

  it("uses the independently reviewed C sentence while study and full recall retain the explanation", () => {
    expect(conceptMemoryRows([entry], "keywords")[0]).toMatchObject({
      label: "문항 1",
      rawText: entry.clozeQuestion!.sentence,
    });
    expect(conceptMemoryRows([entry], "study")[0].rawText).toBe(
      entry.definition,
    );
    expect(conceptMemoryRows([entry], "sentences")[0].rawText).toBe(
      entry.definition,
    );
    const excluded = { ...entry, bQuestion: null, clozeQuestion: null };
    expect(conceptMemoryRows([excluded], "keywords")).toEqual([]);
    expect(() =>
      conceptQuestionBlocks({
        entries: [excluded],
        conceptKey: "test",
        activity: "termRecall",
        title: "개념 질문",
      }),
    ).toThrow("출제 가능한");
    expect(conceptMemoryRows([excluded], "study")).toHaveLength(1);
  });

  it("leaves legacy frozen learning rows on their original definition and label", () => {
    const {
      questionRevision: _r,
      bQuestion: _b,
      clozeQuestion: _c,
      ...legacy
    } = entry;
    expect(conceptMemoryRows([legacy], "keywords")).toEqual(
      conceptMemoryRows([legacy], "study"),
    );
  });
});
