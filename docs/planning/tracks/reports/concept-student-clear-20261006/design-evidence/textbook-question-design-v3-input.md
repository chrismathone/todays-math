학생 질문/새 교재 질문 경로 v3 독립 검토입니다. 앞의 v2 R1~R4를 해결한 아래 실제 코드를 읽어 결론 agree/revise, 남은 필수 문제만 구체적으로 답하세요. 도구/파일 편집 금지. 학생 실험/전수 내용 승인/전체 운영 적용으로 주장하지 않습니다.
R1: pure selection helper conceptMemoryRows는 제외 항목을 걸러 [] 재고를 반환할 수 있으나, 선택된 C activity builder memoryActivityBlocks는 질문 판에서 결과가 빈 경우 오류입니다. mapQuestionMode는 null 제외 항목이 직접 들어오면 거절합니다. 실제 standalone compose/exactPick은 먼저 conceptSupportsForm(map)로 제외를 거르고 빈 지도는 생성하지 않습니다. 질문이 없는 때 뜻·예로 되돌리지 않습니다.
R2: factory는 B만이 아니라 forms중 어떤 선택 형식을 지원하는 모든 source entry가 frozen에 동일 canonicalHash로 존재하는지 검사합니다. B/C 필드가 떨어지면 해시가 달라 실패합니다. preparation을 family에 포함해 B를 함께 동결하며 원고에 만든 질문과 source의 같은 데이터임을 뒤의 freeze 단계가 검증합니다. reference validator는 더 엄격하게 모든 question node entryId/question이 실제 frozen B payload/term selection과 같은지도 검증합니다. 질문 노드의 교사 답을 은행 키와 다르게 편집/가져와도 거절합니다. 일반 학습/자유백지만 고르면 새 판은 recall 참조로 고정해 B/C 전부 제외여도 학습 설명을 보존합니다.
R3: 새 questionRows와 C question-cloze.v1 그룹의 heading/phase labels는 실제 저장한 title/subtitle를 사용합니다. 옛 MEMORY_COPY는 오래된 자료에서 유지합니다. 학습 안내는 선택한 단원들의 mode를 확인하고 새 질문 모드/옛 활동 안내를 따로 생성하며 mixed mode는 거절합니다. 같은 물음의 반복, C 빈칸 과제, 아직 배우지 않은 preparation 안내를 일치시켰고 모든 B답에 이유를 강제하지 않습니다. standalone D는 실제 가지 지도, 자동교재 conceptMap은 정직하게 단원 개념 확인 모음입니다.
R4: 같은 B를 연습에서 재사용하는 선택을 금지하지 않고, sentenceRecall/설명활동/단원확인 지면 자체에 앞에서 같은 물음을 풀었다면 다시 답해 확인한다고 명시합니다. preparation은 현재 아는 내용 확인이며 아직 배우지 않은 내용은 모르겠다고 쓸 수 있습니다. 단계·새 학습효과·기억강도 상승 등 실제 증거 없는 효과는 주장하지 않습니다. 반복 연습을 여러활동으로 선택하는 것은 사용자가 승인한 출제 흐름입니다.
기존 학생 Render DTO는 모두 node를 지우고 questionRows에는 entryId/prompt만 복사합니다. v1 교재 노드 스키마는 은행 스키마와 독립이며 prompt/answer/requiredIdeas 세 필드만 복사합니다. 블록 스키마가 허용 activity/sentences/markdown 일치를 검사합니다. UI 직접 질문 편집은 잠가 두었으며 서버에서도 실제 frozen payload와 다르면 오류입니다. 질문과 보통 학습 설명은 분리합니다. 전 ID 최종 질문 직접 읽기와 실제 전체 데이터 인쇄는 진행 중입니다.
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
  if (entries.some((entry) => entry.bQuestion === null))
    throw new RangeError("개념 지도에서 제외한 항목이 포함돼 있습니다.");
  const questions = entries.filter((entry) => entry.bQuestion).length;
  if (questions > 0 && questions !== entries.length)
    throw new RangeError(
      "새 질문 지도와 옛 뜻·예 지도를 한 묶음으로 섞을 수 없습니다.",
    );
  return questions > 0;
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

/** Legacy phases share definition rows; new questions have their own frozen rows and groups. */
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
      const questionMode = reviewedQuestionMode(input.entries);
      if (option.phase === "keywords" && questionMode && !rows.length)
        throw new Error(
          "빈칸 문항: 출제 가능한 문항이 없습니다. 다른 활동이나 단원을 선택하세요.",
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
            title:
              option.phase === "keywords" && questionMode
                ? "빈칸 문항"
                : option.title,
            ...(option.phase === "keywords" && questionMode
              ? { subtitle: "문장을 읽고 빈칸에 알맞은 내용을 쓰세요." }
              : {}),
            continuation: offset > 0,
            node: {
              kind: "rows",
              groupKey:
                option.phase === "keywords" && questionMode
                  ? `${input.conceptKey}.question-cloze.v1.${offset / 8}`
                  : `${input.conceptKey}.memory-${offset / 8}`,
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
  questionMode = false,
): ManuscriptBlock[] {
  const instructions: Partial<Record<TextbookActivity, string>> = {
    unitIntro: "단원 질문과 목표를 읽고 궁금한 점을 기록하세요.",
    dialogue: "선생님과 학생의 대화를 읽고 판서의 뜻을 설명하세요.",
    concepts: "개념의 뜻·조건·예를 함께 확인하세요.",
    dialogueCheck: "대화를 떠올리며 핵심 물음에 답하세요.",
    conceptStudy: "개념표를 읽고 1~4회 반복한 것을 표시하세요.",
    termRecall: questionMode
      ? "물음을 읽고 요구한 내용에 답하세요."
      : "뜻을 보고 용어를 떠올리세요.",
    clozeRecall: questionMode
      ? "문장을 읽고 빈칸에 알맞은 내용을 쓰세요."
      : "같은 개념표의 핵심어 빈칸을 채우세요.",
    sentenceRecall: questionMode
      ? "같은 물음을 앞에서 풀었다면 책 없이 다시 답해 보세요."
      : "용어를 보고 개념 문장을 쓰세요.",
    conceptBlankTest: "책을 덮고 기억한 개념을 스스로 정리하세요.",
    basicCheck: "짧은 문제로 개념을 바로 적용해 보세요.",
    workedExamples: "예제 풀이를 읽은 뒤 확인 문제를 스스로 푸세요.",
    practice: "유형별 문제를 풀고 사용한 방법을 설명하세요.",
    written: "생각한 순서와 계산 근거를 함께 쓰세요.",
    explainActivity: questionMode
      ? "같은 물음에 다시 답한 뒤 친구와 답을 비교해 보세요."
      : "짝에게 설명하고 질문에 답하세요.",
    conceptMap: questionMode
      ? "같은 단원의 물음을 묶어 다시 확인하세요."
      : "개념 사이의 관계를 자신의 말로 연결하세요.",
    reasoning: "판단의 근거를 쓰고 다른 방법과 비교하세요.",
    errorCheck: "문장의 옳고 그름과 이유를 설명하세요.",
    review: "앞에서 배운 내용을 다시 꺼내 풀어 보세요.",
    assessment: "도움 없이 풀고 다시 공부할 부분을 찾으세요.",
    rest: "이야기를 읽고 함께 생각할 질문을 나누세요.",
    preparation: questionMode
      ? "지금 알고 있는 내용으로 답해 보세요. 아직 배우지 않았다면 ‘아직 모르겠어요’라고 적어도 됩니다."
      : "오늘 배울 개념에 대해 이미 아는 것을 적으세요.",
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
            `${index + 1}. **${questionMode ? (({ termRecall: "개념 질문", sentenceRecall: "책 없이 답 쓰기", conceptMap: "단원 개념 확인 모음" } as Partial<Record<TextbookActivity, string>>)[key as TextbookActivity] ?? ACTIVITY_LABELS[key as TextbookActivity]) : ACTIVITY_LABELS[key as TextbookActivity]}** · ${value}`,
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

FILE: src/lib/textbook/server/quickCreate/frontMatter.ts
import "server-only";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import {
  activityText,
  selectedLearningGuide,
  writingActivity,
} from "../quickCreateRecovery";
import { conceptIndex, keyOf, type QuickCreateAssembly } from "./context";
import { reviewedQuestionMode } from "@/lib/concept-blank/questions";
import { invalid } from "../errors";

/** Learning guide, plan and question log, filed under their own outline unit. */
export function appendFrontMatter(ctx: QuickCreateAssembly): void {
  const { components, units, outline, addSection } = ctx;
  const questionModes = new Set(
    units.map((unit) =>
      reviewedQuestionMode(conceptIndex.get(keyOf(unit)) ?? []),
    ),
  );
  if (questionModes.size > 1)
    throw invalid(
      "서로 다른 질문 판의 단원을 한 자동 교재로 만들 수 없습니다.",
    );
  if (
    components.learningGuide ||
    components.learningPlan ||
    components.questionLog ||
    components.tableOfContents
  ) {
    const unitKey = (ctx.unitKey = "front-matter");
    outline.push({
      unitKey,
      title: "교재 사용 안내",
      sourceUnitIds: [],
      prerequisites: [],
      goals: [],
      conceptLectureRefs: [],
    });
    if (components.learningGuide)
      addSection(
        "학습 안내",
        "auto-learning-guide",
        selectedLearningGuide(components, questionModes.has(true)),
      );
    if (components.learningPlan) {
      const blocks = [];
      for (let offset = 0; offset < units.length; offset += 10)
        blocks.push(
          activityText(
            "learningPlan",
            "학습 계획",
            "| 차례 | 학습할 소단원 | 학습 예정일 | 학습한 날 | 스스로 설명 |\n|---|---|---|---|---|\n" +
              units
                .slice(offset, offset + 10)
                .map(
                  (unit, index) =>
                    `| ${offset + index + 1} | ${sectionTitleTex(unit.section)} |　　　　 |　　　　 | □ |`,
                )
                .join("\n"),
          ),
        );
      addSection("학습 계획", "auto-learning-plan", blocks);
    }
    if (components.questionLog)
      addSection("질문 기록", "auto-question-log", [
        writingActivity(
          "questionLog",
          "질문 기록",
          [
            "소단원·문항 번호와 막힌 부분을 적으세요.",
            "시도한 방법과 물어볼 질문을 구체적으로 적으세요.",
            "설명을 들은 뒤 새로 알게 된 이유를 자신의 말로 적으세요.",
          ],
          4,
        ),
      ]);
  }
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
  if (!forms.length) forms.push(questionMode ? "recall" : "term");
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
  for (const entry of entries.filter((row) =>
    forms.some((form) => conceptSupportsForm(row, form)),
  ))
    if (
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
  const questionCopy = new Map(
    source.flatMap((block) =>
      block.kind === "recall" &&
      (block.questionRows ||
        (block.semantic?.node?.kind === "rows" &&
          block.semantic.node.groupKey?.includes(".question-cloze.v1."))) &&
      block.semantic
        ? [
            [
              block.semantic.activity,
              {
                title: block.semantic.title ?? "개념 질문",
                subtitle: block.semantic.subtitle ?? section.title,
              },
            ] as const,
          ]
        : [],
    ),
  );
  const steps = [
    ...new Set(
      source.flatMap((block) =>
        block.semantic ? [block.semantic.activity] : [],
      ),
    ),
  ].map((activity) => ({
    activity,
    label: questionCopy.get(activity)?.title ?? ACTIVITY_LABELS[activity],
  }));
  const enabled = enabledActivities ?? steps.map((step) => step.activity);
  const phases = enabled
    .filter((activity) => Object.hasOwn(MEMORY_COPY, activity))
    .map((activity) => ({
      activity,
      label:
        questionCopy.get(activity)?.title ??
        MEMORY_COPY[activity as keyof typeof MEMORY_COPY][0],
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
              : questionCopy.has(activity)
                ? questionCopy.get(activity)!.title
                : (memory?.[0] ??
                  (section.templateKey.startsWith("reference-")
                    ? section.title
                    : ACTIVITY_LABELS[activity])),
          subtitle:
            activity === "dialogue" && block.kind === "dialogue"
              ? semantic?.source
                ? (semantic.title ?? section.title)
                : (block.presentation?.lessonTitle ?? section.title)
              : questionCopy.has(activity)
                ? questionCopy.get(activity)!.subtitle
                : (memory?.[1] ??
                  (semantic?.source
                    ? (semantic.subtitle ?? "")
                    : section.title)),
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
        ? "앞에서 풀었던 물음이라면 다시 답한 뒤 친구와 답을 비교해 보세요."
        : semantic?.activity === "conceptMap"
          ? "같은 단원의 물음을 묶었습니다. 다른 활동에서 풀었다면 다시 답을 써서 확인하세요."
          : semantic?.activity === "preparation"
            ? "지금 알고 있는 내용으로 답해 보세요. 아직 배우지 않았다면 ‘아직 모르겠어요’라고 적어도 됩니다."
            : semantic?.activity === "sentenceRecall"
              ? "앞에서 같은 물음을 풀었다면 책 없이 다시 답해 보세요."
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

FILE: src/lib/textbook/references.ts
import {
  textbookExchangeSchema,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import { checkChoiceFigureIndex } from "@/lib/problem/choiceFigureIndex";
import { semanticFragmentAssetIds } from "./semanticAssets";
import { canonicalJson } from "./canonical";

export interface ReferenceOptions {
  mode?: "draft" | "archive" | "publish";
  officialOrigin?: string;
  requirePageMap?: boolean;
}

/** Pure structural and cross-reference checks; never resolves IDs against active database rows. */
export function validateTextbookReferences(
  input: TextbookExchange,
  options: ReferenceOptions = {},
): TextbookIssue[] {
  const parsed = textbookExchangeSchema.safeParse(input);
  if (!parsed.success)
    return parsed.error.issues.map((i) => ({
      code: "SCHEMA",
      severity: "error",
      message: i.message,
      path: i.path.map((p) => (typeof p === "number" ? p : String(p))),
    }));
  const e = parsed.data,
    issues: TextbookIssue[] = [];
  const publish = options.mode === "publish";
  const add = (
    code: string,
    message: string,
    path: (string | number)[],
    severity: TextbookIssue["severity"] = "error",
  ) => issues.push({ code, message, path, severity });
  const unique = <T>(
    values: readonly T[],
    key: (v: T) => string,
    path: string,
  ): Map<string, T> => {
    const map = new Map<string, T>();
    values.forEach((v, i) => {
      const k = key(v);
      if (map.has(k)) add("DUPLICATE_ID", `중복 식별자: ${k}`, [path, i]);
      else map.set(k, v);
    });
    return map;
  };
  const assets = unique(e.assets, (a) => a.assetId, "assets");
  unique(
    e.assets,
    (a) => a.packagePath.normalize("NFC").toLowerCase(),
    "assets",
  );
  const snapshots = unique(e.snapshots, (s) => s.snapshotId, "snapshots");
  const items = unique(e.items, (i) => i.itemId, "items");
  const units = unique(e.units, (u) => u.unitKey, "units");
  const concepts = unique(
    e.conceptIntegration?.concepts ?? [],
    (c) => c.conceptKey,
    "conceptIntegration",
  );
  const pair = (u: string, s: string) => JSON.stringify([u, s]);
  const sections = new Set<string>(),
    blockIds = new Set<string>(),
    usedItems = new Set<string>();
  const itemOrder: string[] = [];
  const image = (id: string, path: (string | number)[], hash?: string) => {
    const a = assets.get(id);
    if (!a) add("MISSING_ASSET", `자산을 찾을 수 없습니다: ${id}`, path);
    else {
      if (!a.mimeType.startsWith("image/"))
        add("ASSET_ROLE", "그림에는 이미지 자산이 필요합니다.", path);
      if (hash && hash !== a.sha256)
        add("FIGURE_HASH", "그림과 자산의 바이트 해시가 다릅니다.", path);
    }
  };
  e.units.forEach((u, ui) =>
    u.sections.forEach((s, si) => {
      const location = ["units", ui, "sections", si] as (string | number)[];
      const key = pair(u.unitKey, s.sectionKey);
      if (sections.has(key))
        add(
          "DUPLICATE_SECTION",
          "같은 단원 안에 구획 키가 중복됩니다.",
          location,
        );
      sections.add(key);
      s.blocks.forEach((b, bi) => {
        const p = [...location, "blocks", bi];
        if (blockIds.has(b.blockId))
          add("DUPLICATE_BLOCK", `중복 블록 ID: ${b.blockId}`, p);
        blockIds.add(b.blockId);
        if (b.kind === "problem") {
          const item = items.get(b.itemId);
          if (!item)
            add("MISSING_ITEM", `문항 배치를 찾을 수 없습니다: ${b.itemId}`, p);
          else if (
            item.unitKey !== u.unitKey ||
            item.sectionKey !== s.sectionKey
          )
            add("ITEM_SECTION", "문항 배치와 블록의 단원·구획이 다릅니다.", p);
          if (usedItems.has(b.itemId))
            add(
              "ITEM_REUSED",
              "같은 문항 배치 ID는 한 번만 참조하세요. 반복 문제는 새 itemId를 사용하세요.",
              p,
            );
          usedItems.add(b.itemId);
          itemOrder.push(b.itemId);
        } else if (b.kind === "image") image(b.assetId, p);
        else if (b.kind === "dialogue")
          b.turns.forEach((turn, i) =>
            image(turn.portraitAssetId, [...p, "turns", i]),
          );
        else if (b.kind === "concept" || b.kind === "concept-recall") {
          // Early automatic error-check blocks omitted their key. Accept only
          // their unambiguous same-section prepared concept, keeping raw bytes intact.
          const legacy =
            b.kind === "concept-recall" &&
            !b.conceptKey &&
            b.phase === "sentences" &&
            /^\d+\.\s/.test(b.markdown) &&
            /\{\{(?:옳음|틀림):/.test(b.markdown)
              ? [...concepts.values()].filter(
                  (c) =>
                    c.unitKey === u.unitKey &&
                    c.sectionKey === s.sectionKey &&
                    c.mappingVersion === "quick-create.unit-triple.v1",
                )
              : [];
          const c = b.conceptKey
            ? concepts.get(b.conceptKey)
            : legacy.length === 1
              ? legacy[0]
              : undefined;
          if (!c && (b.kind === "concept" || b.conceptKey || publish))
            add(
              "MISSING_CONCEPT",
              "개념 블록에 정확한 개념 연결이 필요합니다.",
              p,
            );
          if (
            c &&
            (c.unitKey !== u.unitKey ||
              (c.sectionKey !== null && c.sectionKey !== s.sectionKey))
          )
            add("CONCEPT_SECTION", "개념과 블록의 단원·구획이 다릅니다.", p);
          if (b.semantic?.node?.kind === "conceptQuestions")
            for (const row of b.semantic.node.questions) {
              const frozen = c?.frozen?.entries.find(
                (entry) =>
                  entry.entryKind === "concept" &&
                  entry.payload.id === row.entryId,
              );
              const question =
                frozen?.entryKind === "concept"
                  ? frozen.payload.bQuestion
                  : undefined;
              if (
                !question ||
                canonicalJson(row.question) !==
                  canonicalJson({
                    prompt: question.prompt,
                    answer: question.answer,
                    requiredIdeas: question.requiredIdeas,
                  }) ||
                !c?.frozen?.selection.some(
                  (pick) =>
                    pick.entryId === row.entryId && pick.form === "term",
                )
              )
                add(
                  "QUESTION_FROZEN",
                  "질문과 참고 답이 고정한 개념 문항과 일치하지 않습니다.",
                  p,
                );
            }
        }
        for (const assetId of semanticFragmentAssetIds(b.semantic))
          image(assetId, [...p, "semantic", "node"]);
      });
      if (publish && !s.blocks.length)
        add("EMPTY_SECTION", "발행할 구획에 원고를 입력하세요.", location);
    }),
  );
  e.snapshots.forEach((s, i) => {
    const p = ["snapshots", i];
    const mappedChoices = new Set<number>();
    s.payload.figures.forEach((f, fi) => {
      image(f.assetId, [...p, "payload", "figures", fi], f.sha256);
      if (f.choiceIndex === null)
        add(
          "FIGURE_CHOICE_UNKNOWN",
          "그림의 본문·보기 대응 정보가 없습니다. 보기 번호를 추정하지 않고 원본 순서의 별도 그림으로 표시합니다.",
          [...p, "payload", "figures", fi],
          "warning",
        );
      else if (f.choiceIndex > 0) {
        if (mappedChoices.has(f.choiceIndex))
          add(
            "FIGURE_CHOICE_DUPLICATE",
            `여러 그림이 같은 ${f.choiceIndex}번 보기를 가리킵니다. 원본 대응을 확인하세요.`,
            [...p, "payload", "figures", fi],
          );
        mappedChoices.add(f.choiceIndex);
      }
    });
    if (s.rawSource) {
      const raw = s.rawSource,
        count = raw.figureUrls.length;
      for (const [name, array, multiplier] of [
        ["figureDims", raw.figureDims, 2],
        ["figureSourceMm", raw.figureSourceMm, 1],
      ] as const) {
        if (
          array.length &&
          (array.length !== count * multiplier ||
            array.some((n) => !Number.isFinite(n) || n <= 0))
        )
          add(
            "RAW_FIGURE_ALIGNMENT",
            `원본 ${name} 배열을 보존했으나 대응·치수가 잘못되어 조판할 수 없습니다.`,
            [...p, "rawSource", name],
          );
      }
      // [] means unknown. A malformed explicit map must not become publishable
      // merely because capture preserved it and projected its links to null.
      if (raw.choiceFigureIndex.length) {
        const mapping = checkChoiceFigureIndex(count, raw.choiceFigureIndex);
        if (!mapping.ok)
          add(
            "RAW_FIGURE_ALIGNMENT",
            `원본 choiceFigureIndex 배열의 대응이 잘못되었습니다: ${mapping.reason}. 원본 배열은 보존합니다.`,
            [...p, "rawSource", "choiceFigureIndex"],
          );
      }
      if (raw.figureSvgAssetId) {
        image(raw.figureSvgAssetId, [...p, "rawSource", "figureSvgAssetId"]);
        if (!s.payload.figures.some((f) => f.assetId === raw.figureSvgAssetId))
          add("RAW_SVG_REF", "원본 SVG가 고정 그림 목록에 없습니다.", [
            ...p,
            "rawSource",
            "figureSvgAssetId",
          ]);
        if (assets.get(raw.figureSvgAssetId)?.mimeType !== "image/svg+xml")
          add("SVG_MIME", "원본 SVG에는 SVG 자산이 필요합니다.", p);
      }
    }
    if (publish && (!s.snapshotHash || !s.rawSource || !s.sourceMetadata))
      add(
        "SNAPSHOT_EXTENSION_REQUIRED",
        "이전 스냅샷은 원본·메타데이터·스냅샷 해시를 확인한 후 발행하세요.",
        p,
      );
  });
  const order = new Set<number>();
  let previous = -1;
  itemOrder.forEach((id) => {
    const item = items.get(id);
    if (!item) return;
    if (item.orderIndex <= previous || order.has(item.orderIndex))
      add("ITEM_ORDER", "원고의 문제 순서와 orderIndex가 다릅니다.", [
        "items",
        id,
      ]);
    order.add(item.orderIndex);
    previous = item.orderIndex;
  });
  e.items.forEach((item, i) => {
    const p = ["items", i],
      s = snapshots.get(item.snapshotId);
    if (item.editionId !== e.edition.editionId)
      add("EDITION_MISMATCH", "다른 판본의 문항입니다.", p);
    if (!s)
      add(
        "MISSING_SNAPSHOT",
        `스냅샷을 찾을 수 없습니다: ${item.snapshotId}`,
        p,
      );
    if (!sections.has(pair(item.unitKey, item.sectionKey)))
      add("MISSING_SECTION", "문항의 단원·구획이 없습니다.", p);
    if (!usedItems.has(item.itemId))
      add("UNPLACED_ITEM", "원고에 배치되지 않은 문항입니다.", p);
    if (item.linkStatus === "linked" && s?.source.system !== "todays-math")
      add("LINKED_SOURCE", "연결 문항에는 실제 문제은행 원본이 필요합니다.", p);
    if (publish && item.linkStatus !== "linked")
      add("UNLINKED_ITEM", "문항 연결을 확인한 후 발행하세요.", p);
    const seen = new Set<string>();
    for (const key of item.conceptKeys ?? []) {
      const c = concepts.get(key);
      if (seen.has(key) || !c || c.unitKey !== item.unitKey)
        add(
          "ITEM_CONCEPT",
          "문항의 개념 연결이 없거나 중복되거나 다른 단원입니다.",
          p,
        );
      seen.add(key);
    }
    if (
      publish &&
      (item.videoRequired ?? e.config.videoPolicy === "required") &&
      !e.videoBindings.some(
        (b) =>
          b.snapshotId === item.snapshotId &&
          b.status === "published" &&
          b.reviewedAgainstHash === s?.contentHash,
      )
    )
      add("VIDEO_REQUIRED", "이 스냅샷으로 검수·게시한 영상이 필요합니다.", p);
  });
  for (const [i, c] of (e.conceptIntegration?.concepts ?? []).entries()) {
    const p = ["conceptIntegration", "concepts", i];
    if (
      !units.has(c.unitKey) ||
      (c.sectionKey !== null && !sections.has(pair(c.unitKey, c.sectionKey)))
    )
      add("CONCEPT_LOCATION", "개념의 단원·구획이 없습니다.", p);
    if (c.derivedFromConceptKey === c.conceptKey)
      add("CONCEPT_DERIVATION", "개념은 자기 자신에서 파생될 수 없습니다.", p);
    if (
      publish &&
      (!c.frozen ||
        c.blankItems.some((b) => b.review.status !== "confirmed") ||
        c.links.some((l) => l.review.status !== "confirmed"))
    )
      add(
        "CONCEPT_UNCONFIRMED",
        "개념의 정확한 연결 검수와 내용 고정이 필요합니다.",
        p,
      );
    if (c.frozen) {
      if (c.mappingVersion !== c.frozen.mappingVersion)
        add(
          "CONCEPT_MAPPING_VERSION",
          "원고와 고정 개념의 매핑 버전이 다릅니다.",
          p,
        );
      try {
        composeFrozenTextbookBlank(c.frozen);
      } catch (error) {
        add(
          "CONCEPT_SELECTION",
          error instanceof Error ? error.message : "고정 선택 오류",
          p,
        );
      }
      const refs = new Set(
        c.blankItems.map(
          (b) => `${b.entryKind}:${b.entryId}:${b.blankSectionKey}`,
        ),
      );
      for (const entry of c.frozen.entries)
        if (
          !refs.has(
            `${entry.entryKind}:${entry.payload.id}:${entry.payload.section}`,
          )
        )
          add(
            "CONCEPT_ENTRY_REF",
            "고정 항목에 대응하는 검수 연결이 없습니다.",
            p,
          );
      c.frozen.assetHashes.forEach((a) => image(a.assetId, p, a.sha256));
    }
  }
  const qrTargets = [...e.qrTargets, ...(e.conceptQrTargets ?? [])];
  unique(qrTargets, (q) => q.qrTargetId, "qrTargets");
  unique(qrTargets, (q) => q.slug, "qrTargets");
  unique(qrTargets, (q) => q.url, "qrTargets");
  const qrItems = new Set<string>();
  qrTargets.forEach((q, i) => {
    const p = ["qrTargets", i],
      url = new URL(q.url);
    if (q.editionId !== e.edition.editionId)
      add("QR_EDITION", "QR 판본이 다릅니다.", p);
    if (
      url.pathname !== `/q/${q.slug}` ||
      /^(localhost|127\.|\[::1\])/.test(url.hostname)
    )
      add("QR_URL", "QR에는 영구 서버 대상 주소가 필요합니다.", p);
    if (
      publish &&
      (!options.officialOrigin || url.origin !== options.officialOrigin)
    )
      add("QR_ORIGIN", "공식 서비스 origin의 예약 QR만 발행할 수 있습니다.", p);
    if ("itemId" in q) {
      const item = items.get(q.itemId);
      if (!item || item.qrTargetId !== q.qrTargetId || qrItems.has(q.itemId))
        add("QR_ITEM", "QR과 문항의 상호 참조가 없거나 중복됩니다.", p);
      qrItems.add(q.itemId);
    } else if (!concepts.has(q.conceptKey))
      add("QR_CONCEPT", "QR 개념이 없습니다.", p);
  });
  e.items.forEach((item, i) => {
    if (
      (publish || item.qrTargetId) &&
      !e.qrTargets.some(
        (q) => q.qrTargetId === item.qrTargetId && q.itemId === item.itemId,
      )
    )
      add("MISSING_QR", "문항의 예약 QR 대상이 없습니다.", ["items", i]);
  });
  unique(e.videoBindings, (b) => b.bindingId, "videoBindings");
  e.videoBindings.forEach((b, i) => {
    const s = snapshots.get(b.snapshotId);
    if (!s)
      add("VIDEO_SNAPSHOT", "영상 검수 스냅샷이 없습니다.", [
        "videoBindings",
        i,
      ]);
    else if (
      b.status === "published" &&
      b.reviewedAgainstHash !== s.contentHash
    )
      add("VIDEO_HASH", "영상이 현재 스냅샷 내용으로 검수되지 않았습니다.", [
        "videoBindings",
        i,
      ]);
  });
  const placed = new Set<string>();
  e.pageMap.forEach((p, i) => {
    if (!items.has(p.itemId) || placed.has(p.itemId))
      add("PAGE_ITEM", "쪽 지도에 없는 문항 또는 중복 배치가 있습니다.", [
        "pageMap",
        i,
      ]);
    placed.add(p.itemId);
    if (p.physicalPageIndex < e.config.print.firstPhysicalPageIndex)
      add("PAGE_RANGE", "쪽 지도가 본문 시작 면보다 앞입니다.", ["pageMap", i]);
  });
  if (options.requirePageMap ?? publish)
    e.items.forEach((item, i) => {
      if (!placed.has(item.itemId))
        add("MISSING_PAGE", "실제 조판 쪽 지도에 문항이 없습니다.", [
          "items",
          i,
        ]);
    });
  if (publish && !e.canonicalizationVersion)
    add("CANONICAL_VERSION", "발행 전에 canonicalization 버전을 명시하세요.", [
      "canonicalizationVersion",
    ]);
  return issues;
}

FILE: src/__tests__/unit/textbookStudentQuestions.test.ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { textbookBlockSchema } from "@/contracts/textbookExchange.contract";
import { conceptQuestionBlocks } from "@/lib/textbook/conceptQuestions";
import {
  QUESTION_REVISION,
  reviewedQuestionMode,
  mapQuestionMode,
} from "@/lib/concept-blank/questions";
import {
  memoryActivityBlocks,
  selectedLearningGuide,
} from "@/lib/textbook/server/quickCreateRecovery";
import { DEFAULT_QUICK_CREATE_COMPONENTS } from "@/contracts/textbookQuickCreate.contract";
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
    expect(() =>
      reviewedQuestionMode([{ ...entry, questionRevision: "unreviewed-v2" }]),
    ).toThrow("질문 판");
    const legacy = { ...entry };
    delete legacy.questionRevision;
    delete legacy.bQuestion;
    delete legacy.clozeQuestion;
    expect(() => reviewedQuestionMode([entry, legacy])).toThrow("질문 판");
    const block = conceptQuestionBlocks({
      entries: [entry],
      conceptKey: "test",
      activity: "termRecall",
      title: "개념 질문",
    })[0];
    expect(
      textbookBlockSchema.safeParse({
        ...block,
        markdown: "지면에 반영되지 않을 수정",
      }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({ ...block, kind: "text" }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({ ...block, phase: "study" }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({
        ...block,
        semantic: { ...block.semantic, activity: "concepts" },
      }).success,
    ).toBe(false);
    const wrongText = {
      blockId: block.blockId,
      kind: "text",
      markdown: block.kind === "concept-recall" ? block.markdown : "",
      semantic: block.semantic,
    };
    expect(textbookBlockSchema.safeParse(wrongText).success).toBe(false);
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].blocks = [
      {
        blockId: block.blockId,
        kind: "text",
        markdown: "허용되지 않는 구조를 투영만 검증한다.",
        semantic: block.semantic,
      },
    ];
    const student = JSON.stringify(
      createTextbookRenderModel(exchange, "student"),
    );
    expect(student).not.toContain("십 한 묶음이다");
    expect(student).not.toContain("십 묶음 하나");
  });
  it.each([
    "termRecall",
    "sentenceRecall",
    "explainActivity",
    "conceptMap",
    "preparation",
  ] as const)(
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
    expect(() => mapQuestionMode([excluded])).toThrow("제외한");
    expect(() =>
      memoryActivityBlocks({
        entries: [excluded],
        conceptKey: "test",
        components: {
          ...DEFAULT_QUICK_CREATE_COMPONENTS,
          conceptStudy: false,
          sentenceRecall: false,
          clozeRecall: true,
        },
      }),
    ).toThrow("빈칸 문항");
    const guide = JSON.stringify(
      selectedLearningGuide(
        { ...DEFAULT_QUICK_CREATE_COMPONENTS, conceptMap: true },
        true,
      ),
    );
    expect(guide).not.toContain("답과 이유를 쓰세요");
    expect(guide).toContain("단원 개념 확인 모음");
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
