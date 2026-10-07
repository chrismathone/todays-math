학생 질문과 학습 설명의 분리, 새 교재 자동 제작 연결의 독립 설계·코드 검토 요청입니다. 현재 승인된 방식은 Codex·Claude 검토입니다. 새 데이터는 아직 운영 은행에 적용하지 않았고, 이 코드는 별도 통합 트리에 있습니다. 도구/파일 편집 금지. 아래 실제 코드를 읽고 합의 가능 여부와 반드시 고칠 문제를 답해 주세요.
학생이 제목만 보고 뜻을 유추하도록 하지 않습니다. 신규 B는 bQuestion 물음·답·anyOf 기준, C는 별도 sentence/acceptedAnswers를 사용합니다. 기존 동결 payload는 그대로 읽습니다. D 지도는 동일한 B 물음으로 같은 단원의 가지를 확인하며 추가 선수 관계나 새 학습 효과를 주장하지 않습니다. 자동 교재 core ID 순서를 유지하면서 현재 은행 payload로 동결하고, 제외 형식만 거릅니다. 일반 학습 정의·준비 활동·C 빈칸은 별도로 검토한 문장을 쓸 수 있습니다. 신규 conceptQuestions semantic node(version 1)는 B 물음과 키를 함께 동결하며 student 렌더 DTO에서 답과 기준을 지웁니다. 지면은 2개 물음마다 8줄씩, 교사판은 예시답과 확인 기준을 표시합니다. 현재 동일 노드를 설명 활동과 개념 지도 형식에서도 사용합니다. 교재 편집기에 이 노드의 단계와 본문 수정은 잠그며, 새 선택과 새 판본은 별도 작업입니다. SRS 내부는 담당 Claude의 내용 지문 호환 설계 검토 중이고 이 코드에서 수정하지 않습니다.
확인할 것: 기존 동결/키/학생 기록 보존, 새 질문 노드의 명시 판과 활성 범위, 질문 없는 항목을 제목으로 fallback하지 않음, C에 답 제목 노출 없음, 교재 실제 학생/교사 렌더에서 답이 섞이지 않음, 준비 활동의 설명과 문제 조건, 수정 불가능한 본문을 수정 가능하게 속이지 않음, 스키마와 실제 앱 소비처의 누락. actual all-ID final review and all-data print tests are still pending: do not call them complete. 명확한 결론 agree/revise와 필수 수정/선택 제안을 구분하세요.
FILE: src/contracts/textbookSemantic.contract.ts
import { z } from "zod";
import { conceptQuestionSchema } from "./conceptBlank.contract";
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
          question: conceptQuestionSchema,
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

FILE: src/lib/textbook/conceptQuestions.ts
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";

/** New manuscripts freeze the reviewed question and its key together. Old blocks are untouched. */
export function conceptQuestionBlocks(input: {
  entries: readonly ConceptEntry[];
  conceptKey: string;
  activity: TextbookActivity;
  title: string;
}): ManuscriptBlock[] {
  const questions = input.entries.flatMap((entry) =>
    entry.bQuestion ? [{ entryId: entry.id, question: entry.bQuestion }] : [],
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
  const forms: NonNullable<TextbookConcept["blankForms"]> = [];
  if (components.termRecall) forms.push("term");
  if (components.clozeRecall) forms.push("cloze");
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
  if (components.termRecall && entries.some((entry) => entry.questionRevision))
    section.blocks.push(
      ...conceptQuestionBlocks({
        entries,
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
      conceptKey: concept.conceptKey,
      components,
    }),
  );
  section.blocks.push(
    ...additionalConceptActivities({
      entries,
      sectionKey: keyOf(unit),
      conceptKey: concept.conceptKey,
      components,
    }),
  );
}

FILE: src/lib/textbook/server/quickCreate/context.ts
import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type {
  ManuscriptBlock,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import type {
  quickCreateInputSchema,
  QuickCreateCast,
  QuickCreateComponents,
  QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
import { TEXTBOOK_CORE_BANK } from "../../coreConceptBank";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { sectionKeyOf } from "@/lib/concept-blank/sections";
import type { TextbookActor } from "../../access";
import type {
  CapturedSnapshot,
  FigureLoader,
  FrozenAsset,
} from "../../snapshotFromProblem";
import type { OutlineUnitMeta } from "../editions";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";
import type { TextbookSql } from "../sql";

/** Explicit, closed tier sets. A shortage reduces the count, never borrows a different difficulty. */
export const QUICK_CREATE_DIFFICULTIES = {
  basic: ["연산", "기본"],
  standard: ["기본", "응용"],
  challenge: ["응용", "심화하", "심화중", "심화상"],
} as const;
export const DEFAULT_QUICK_CREATE_CAST: QuickCreateCast = {
  teacherId: "teacher-f1",
  student1Id: "student-f1",
  student2Id: "student-m1",
};
export interface QuickCreateDependencies {
  loadFigure: FigureLoader;
  dialogueForSection?: (
    sectionKey: string,
    cast: QuickCreateCast,
  ) => Promise<{
    turns: Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"];
    assets: FrozenAsset[];
  }>;
  prepareVisuals?: (
    tx: TextbookSql,
    input: {
      userId: string;
      editionId: string;
      cast: QuickCreateCast;
      units: readonly UnitRow[];
      dialogue: boolean;
      rest: boolean;
      semester: 1 | 2;
    },
  ) => Promise<{
    assetIds: string[];
    dialogueForSection: (
      sectionKey: string,
    ) => Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"];
    warnings?: readonly string[];
    restForUnit: (unit: UnitRow) => {
      title: string;
      markdown: string;
      reflectionQuestions: readonly string[];
      imageAssetId: string;
    } | null;
  }>;
  now?: () => Date;
}
export interface UnitRow {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  problemCount: number;
}
export const gradeLabel = (scope: QuickCreateScope) =>
  `${scope.schoolLevel === "elementary" ? "초" : "중"}${scope.grade}`;
export const keyOf = (unit: Pick<UnitRow, "grade" | "chapter" | "section">) =>
  sectionKeyOf(unit.grade, unit.chapter, unit.section);
export const conceptIndex = new Map<string, ConceptEntry[]>();
const currentConceptById = new Map(
  CONCEPT_BLANK_BANK.concepts.map((entry) => [entry.id, entry]),
);
// Core IDs and their order define the lesson. Question-bearing snapshots must use
// the same current payload as freezeTextbookConcept, rather than the raw source shard.
for (const source of TEXTBOOK_CORE_BANK.concepts) {
  const entry = currentConceptById.get(source.id);
  if (!entry || entry.section !== source.section)
    throw new Error(`교재의 핵심 개념을 찾을 수 없습니다: ${source.id}`);
  const entries = conceptIndex.get(entry.section) ?? [];
  entries.push(entry);
  conceptIndex.set(entry.section, entries);
}
export const text = (markdown: string): ManuscriptBlock => ({
  blockId: randomUUID(),
  kind: "text",
  markdown,
});
export const plainDefinition = (entry: ConceptEntry) =>
  splitBlankSentence(entry.definition)
    .map((piece) => piece.text)
    .join("");
export interface SectionPlan {
  id: string;
  unitKey: string;
  sectionKey: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  blocks: ManuscriptBlock[];
}
export interface ItemPlan {
  id: string;
  unitKey: string;
  sectionId: string;
  stage: TextbookItem["learningStage"];
  snapshot: CapturedSnapshot;
  orderIndex: number;
  conceptKeys: string[];
}

/** The validated request: schema defaults applied, title trimmed. */
export type QuickCreateRequest = z.output<typeof quickCreateInputSchema>;
export type QuickCreateVisuals = Awaited<
  ReturnType<NonNullable<QuickCreateDependencies["prepareVisuals"]>>
>;
export interface QuickCreateStage {
  enabled: boolean;
  activity: TextbookActivity;
  stage: TextbookItem["learningStage"];
  title: string;
}

/**
 * What one quick-create transaction assembles before anything but the book and edition rows is
 * written. Stage modules append to these collections in call order; `quickCreate.ts` validates
 * and persists them. `chapter` and `unitKey` are the cursor: where the next section is filed.
 */
export interface QuickCreateAssembly {
  readonly tx: TextbookSql;
  readonly actor: TextbookActor;
  readonly input: QuickCreateRequest;
  readonly components: QuickCreateComponents;
  readonly deps: QuickCreateDependencies;
  readonly units: readonly UnitRow[];
  readonly visuals: QuickCreateVisuals | undefined;
  readonly stages: readonly QuickCreateStage[];
  /** ISO time of this request, shared by every review stamp. */
  readonly now: string;
  readonly sections: SectionPlan[];
  readonly items: ItemPlan[];
  readonly concepts: TextbookConcept[];
  readonly assets: Map<
    string,
    { asset: FrozenAsset; kind: "figure" | "portrait" }
  >;
  readonly outline: OutlineUnitMeta[];
  readonly warnings: string[];
  chapter: string;
  unitKey: string;
  /**
   * Appends a section under the current `unitKey`; ids are drawn after `blocks` is built.
   * A closure, not a method: stage modules destructure it.
   */
  readonly addSection: (
    title: string,
    templateKey: string,
    blocks: ManuscriptBlock[],
  ) => SectionPlan;
}
/** One curriculum section and the lesson section its components are appended to. */
export interface QuickCreateLesson {
  unit: UnitRow;
  section: SectionPlan;
  entries: ConceptEntry[];
}

FILE: src/lib/textbook/server/quickCreate/preparation.ts
import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { invalid } from "../errors";
import { activityText } from "../quickCreateRecovery";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
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
    if (entries.some((entry) => entry.questionRevision)) {
      const prompts = entries.flatMap((entry) => {
        if (entry.bQuestion) return [entry.bQuestion.prompt];
        if (entry.clozeQuestion)
          return [
            splitBlankSentence(entry.clozeQuestion.sentence)
              .map((piece) => (piece.kind === "key" ? "□" : piece.text))
              .join(""),
          ];
        return [];
      });
      if (!prompts.length)
        throw invalid(
          `${unit.section}: 준비 학습에 사용할 확인 문항이 없습니다.`,
        );
      for (let offset = 0; offset < prompts.length; offset += 2)
        section.blocks.push(
          activityText(
            "preparation",
            "준비 학습",
            "아래 물음을 읽고, 지금 알고 있는 내용으로 답해 보세요. 아직 배우지 않은 내용은 ‘아직 모르겠어요’라고 적어도 됩니다.",
            {
              kind: "writing",
              prompts: prompts.slice(offset, offset + 2),
              lines: 8,
            },
          ),
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
  if (semantic?.node?.kind === "conceptQuestions") {
    const title = labelHtml(semantic.title ?? "개념 질문");
    const tasks = semantic.node.questions
      .map(({ entryId, question }) => {
        const body = revealed(recall)
          ? `<div class="tb-recall-text">${md(question.answer)}${question.requiredIdeas.length ? `<p>확인할 내용</p><ul>${question.requiredIdeas.map((idea) => `<li>${md(idea.anyOf.join(" / "))}</li>`).join("")}</ul>` : ""}</div>`
          : writingLines(8, "물음에 대한 답 쓰기");
        return `<div class="tb-question-task" data-question-id="${esc(entryId)}"><div class="tb-recall-text">${md(question.prompt)}</div>${body}</div>`;
      })
      .join("");
    return `<section class="tb-recall tb-concept-questions" data-activity="${esc(semantic.activity)}" data-question-version="1"><div class="tb-recall-checkbar"><b>${title}${recall.continuation ? " · 계속" : ""}</b>${NAME_DATE}</div><p>각 물음을 읽고 답을 쓰세요.</p>${tasks}</section>`;
  }
  if (semantic?.activity === "errorCheck") return errorCheckHtml(recall);
  if (semantic?.activity === "termRecall") return termRecallHtml(recall);
  const node = semantic?.node;
  if (node?.kind === "rows" || node?.kind === "concept")
    return memoryHtml(recall, node);
  return legacyHtml(recall);
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
                  ...(b.semantic ? { semantic: b.semantic } : {}),
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
                          semantic: {
                            ...b.semantic!,
                            node:
                              variant === "answers"
                                ? questionNode
                                : {
                                    ...questionNode,
                                    questions: questionNode.questions.map(
                                      ({ entryId, question }) => ({
                                        entryId,
                                        question: {
                                          ...question,
                                          answer: "",
                                          requiredIdeas: [],
                                        },
                                      }),
                                    ),
                                  },
                          },
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
      const rows = conceptMemoryRows(input.entries, option.phase);
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
      entries.some((entry) => entry.questionRevision)
    ) {
      blocks.push(
        ...conceptQuestionBlocks({
          entries,
          conceptKey: input.conceptKey,
          activity: scaffold.activity,
          title: scaffold.title,
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
    sentenceRecall: "용어를 보고 개념 문장을 쓰세요.",
    conceptBlankTest: "책을 덮고 기억한 개념을 스스로 정리하세요.",
    basicCheck: "짧은 문제로 개념을 바로 적용해 보세요.",
    workedExamples: "예제 풀이를 읽은 뒤 확인 문제를 스스로 푸세요.",
    practice: "유형별 문제를 풀고 사용한 방법을 설명하세요.",
    written: "생각한 순서와 계산 근거를 함께 쓰세요.",
    explainActivity: "짝에게 설명하고 질문에 답하세요.",
    conceptMap: "개념 사이의 관계를 자신의 말로 연결하세요.",
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
