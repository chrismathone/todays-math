import "server-only";
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import {
  textbookConfigSchema,
  textbookSectionSchema,
  type ManuscriptBlock,
  type TextbookItem,
  type TextbookConfig,
} from "@/contracts/textbookExchange.contract";
import {
  effectiveQuickCreateComponents,
  quickCreateInputSchema,
  quickCreateResultSchema,
  quickCreateScopeSchema,
  type QuickCreateCast,
  type QuickCreateCatalog,
  type QuickCreateInput,
  type QuickCreateResult,
  type QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
import {
  textbookCanonicalizationVersion,
  textbookVersion,
} from "@/contracts/textbookPrimitives.contract";
import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { sectionKeyOf, sectionTitleTex } from "@/lib/concept-blank/sections";
import { classifyFormat } from "@/lib/problem/provenance";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import type { TextbookActor } from "../access";
import { freezeTextbookConcept } from "../concepts";
import { canonicalHash } from "../hash.server";
import {
  captureProblemSnapshot,
  type CapturedSnapshot,
  type FigureLoader,
  type FrozenAsset,
} from "../snapshotFromProblem";
import {
  bookSummary,
  DRAFT_RENDERER_VERSION,
  DRAFT_TEMPLATE_VERSION,
} from "./books";
import { linkEditionAssets, putAsset } from "./blobs";
import type { OutlineUnitMeta } from "./editions";
import { conflict, invalid } from "./errors";
import {
  CAPTURE_MAX_FIGURE_BYTES,
  DEFAULT_ITEM_LAYOUT,
  EDITION_MAX_ITEMS,
  insertSnapshots,
  loadProblemRows,
} from "./items";
import { runOnce } from "./requests";
import { EDITION_MAX_SECTIONS, SECTION_MAX_BYTES } from "./sections";
import { SQL_NOW, type TextbookDb, type TextbookSql, uuidList } from "./sql";

/** Explicit, closed tier sets. A shortage never borrows a different difficulty. */
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
    },
  ) => Promise<{
    assetIds: string[];
    dialogueForSection: (
      sectionKey: string,
    ) => Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"];
    restForUnit: (unit: UnitRow) => {
      title: string;
      markdown: string;
      reflectionQuestions: readonly string[];
      imageAssetId: string;
    };
  }>;
  now?: () => Date;
}
interface UnitRow {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  problemCount: number;
}
const gradeLabel = (scope: QuickCreateScope) =>
  `${scope.schoolLevel === "elementary" ? "초" : "중"}${scope.grade}`;
const keyOf = (unit: Pick<UnitRow, "grade" | "chapter" | "section">) =>
  sectionKeyOf(unit.grade, unit.chapter, unit.section);
const conceptIndex = new Map<string, ConceptEntry[]>();
for (const entry of CONCEPT_BLANK_BANK.concepts) {
  const entries = conceptIndex.get(entry.section) ?? [];
  entries.push(entry);
  conceptIndex.set(entry.section, entries);
}
const seedKeys = new Set(CURRICULUM_UNITS.map(keyOf));
/** Elementary seed chapters encode semester directly. Middle seed chapters 1–4 are algebra;
 * 5 onward are the second-semester geometry/statistics sequence (all three middle grades). */
export function quickCreateSemester(
  unit: Pick<UnitRow, "grade" | "chapter" | "section">,
): 1 | 2 | null {
  if (!seedKeys.has(keyOf(unit))) return null;
  if (/^초[3-6]$/.test(unit.grade)) {
    const prefix = /^([12])-\d+\s/.exec(unit.chapter);
    return prefix ? (Number(prefix[1]) as 1 | 2) : null;
  }
  if (/^중[1-3]$/.test(unit.grade)) {
    const chapter = /^(\d+)\.\s/.exec(unit.chapter);
    return chapter ? (Number(chapter[1]) <= 4 ? 1 : 2) : null;
  }
  return null;
}
async function scopedUnits(
  sql: TextbookSql,
  scope: QuickCreateScope,
  lock = false,
): Promise<UnitRow[]> {
  const rows = await sql.query<UnitRow>(
    `SELECT u."id", u."grade", u."chapter", u."section", u."order_index" AS "orderIndex",
      (SELECT count(*)::int FROM "problem" p WHERE p."unit_id" = u."id" AND p."pool"::text = $2::text
       AND p."review_status"::text = 'approved' AND p."direct_use_allowed" = true AND p."answer" <> $3::text) AS "problemCount"
     FROM "unit" u WHERE u."grade" = $1::text ORDER BY u."order_index", u."id"${lock ? " FOR SHARE OF u" : ""}`,
    [gradeLabel(scope), DEFAULT_PROBLEM_POOL, MISSING_ANSWER],
  );
  return rows.filter((unit) => quickCreateSemester(unit) === scope.semester);
}
export async function listQuickCreateUnits(
  sql: TextbookSql,
  input: QuickCreateScope,
): Promise<QuickCreateCatalog> {
  const scope = quickCreateScopeSchema.parse(input);
  return {
    units: (await scopedUnits(sql, scope)).map((unit) => ({
      id: unit.id,
      chapter: unit.chapter,
      section: unit.section,
      label: `${unit.chapter} · ${unit.section}`,
      problemCount: unit.problemCount,
      conceptCount: conceptIndex.get(keyOf(unit))?.length ?? 0,
    })),
  };
}
const text = (markdown: string): ManuscriptBlock => ({
  blockId: randomUUID(),
  kind: "text",
  markdown,
});
const plainDefinition = (entry: ConceptEntry) =>
  splitBlankSentence(entry.definition)
    .map((piece) => piece.text)
    .join("");
interface SectionPlan {
  id: string;
  unitKey: string;
  sectionKey: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  blocks: ManuscriptBlock[];
}
interface ItemPlan {
  id: string;
  unitKey: string;
  sectionId: string;
  stage: TextbookItem["learningStage"];
  snapshot: CapturedSnapshot;
  orderIndex: number;
  conceptKeys: string[];
}
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
      definition: entries
        .map((entry) => `**${entry.term}**: ${plainDefinition(entry)}`)
        .join("\n\n"),
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
    blankItems: entries.map((entry) => ({
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
    mappingVersion: "quick-create.unit-triple.v1",
    derivedFromConceptKey: null,
    frozen: null,
  });
  return freezeTextbookConcept(concept);
}

/** One transaction owns the receipt and every native row. Failed captures/SQL writes roll back
 * the receipt as well; a retry can succeed, and completed retries don't touch mutable banks. */
export async function createQuickTextbook(
  db: TextbookDb,
  actor: TextbookActor,
  raw: QuickCreateInput,
  deps: QuickCreateDependencies,
): Promise<QuickCreateResult> {
  const input = quickCreateInputSchema.parse(raw);
  const components = effectiveQuickCreateComponents(input);
  return db.transaction(async (tx) => {
    const { result } = await runOnce(
      tx,
      {
        userId: actor.id,
        requestId: input.requestId,
        operation: "textbook-quick-create",
        bodyHash: canonicalHash(JSON.parse(JSON.stringify(input))),
      },
      async () => {
        const scope = quickCreateScopeSchema.parse({
          schoolLevel: input.schoolLevel,
          grade: input.grade,
          semester: input.semester,
        });
        const catalog = await scopedUnits(tx, scope, true);
        const start = catalog.findIndex(
          (unit) => unit.id === input.startUnitId,
        );
        const end = catalog.findIndex((unit) => unit.id === input.endUnitId);
        if (start < 0 || end < 0)
          throw invalid("시작·끝 단원은 선택한 학년과 학기에 속해야 합니다.");
        if (start > end)
          throw invalid("끝 단원은 시작 단원보다 앞설 수 없습니다.");
        const units = catalog.slice(start, end + 1);
        const wantsConcept =
          components.concepts ||
          components.termRecall ||
          components.clozeRecall ||
          components.sentenceRecall;
        const stageOptions: Array<{
          enabled: boolean;
          stage: TextbookItem["learningStage"];
          title: string;
        }> = [
          { enabled: components.practice, stage: "basic", title: "유형 연습" },
          {
            enabled: components.review,
            stage: "cumulative-review",
            title: "누적 복습",
          },
          {
            enabled: components.assessment,
            stage: "unit-assessment",
            title: "단원 평가",
          },
          { enabled: components.written, stage: "written", title: "서술형" },
        ];
        const stages = stageOptions.filter((stage) => stage.enabled);
        if (
          stages.length &&
          units.length * input.problemCountPerUnit > EDITION_MAX_ITEMS
        )
          throw invalid(
            `한 교재의 문항은 ${EDITION_MAX_ITEMS}개까지입니다. 범위나 문항 수를 줄여 주세요.`,
          );
        const bookId = randomUUID(),
          editionId = randomUUID();
        const title =
          input.title ?? `${gradeLabel(scope)} ${input.semester}학기 자동 교재`;
        const config: TextbookConfig = textbookConfigSchema.parse({
          bookId,
          schoolLevel: scope.schoolLevel,
          grade: scope.grade,
          semester: scope.semester,
          volume: 1,
          volumeCount: 1,
          displayCode: `${gradeLabel(scope)}-${scope.semester}`,
          title,
          curriculumVersion: "2022",
          mode:
            wantsConcept || components.dialogue
              ? stages.length
                ? "integrated"
                : "concept"
              : "practice",
          pageBudget: {
            target: Math.min(5000, Math.max(12, units.length * 6)),
            tolerance: 100,
            strict: false,
          },
          print: {
            paper: "A4",
            innerMarginMm: 20,
            outerMarginMm: 15,
            sectionStart: "even-left",
            coverMode: components.cover ? "included" : "separate",
            firstPhysicalPageIndex: 1,
          },
          videoPolicy: "optional",
          studentSolutionPolicy: "never",
        });
        await tx.execute(
          `INSERT INTO "textbook" ("id", "user_id", "school_level", "grade", "semester", "volume", "volume_count", "display_code", "title", "updated_at")
        VALUES ($1::uuid,$2::uuid,$3::text,$4::int,$5::int,1,1,$6::text,$7::text,${SQL_NOW})`,
          [
            bookId,
            actor.id,
            scope.schoolLevel,
            scope.grade,
            scope.semester,
            config.displayCode,
            title,
          ],
        );
        await tx.execute(
          `INSERT INTO "textbook_edition" ("id","textbook_id","user_id","ordinal","label","schema_version","c14n_version","config","outline","renderer_version","template_version","updated_at")
        VALUES ($1::uuid,$2::uuid,$3::uuid,1,'1판',$4::text,$5::text,$6::jsonb,'{"units":[]}'::jsonb,$7::text,$8::text,${SQL_NOW})`,
          [
            editionId,
            bookId,
            actor.id,
            textbookVersion,
            textbookCanonicalizationVersion,
            JSON.stringify(config),
            DRAFT_RENDERER_VERSION,
            DRAFT_TEMPLATE_VERSION,
          ],
        );
        const visuals =
          components.dialogue || components.rest
            ? await deps.prepareVisuals?.(tx, {
                userId: actor.id,
                editionId,
                cast: input.cast ?? DEFAULT_QUICK_CREATE_CAST,
                units,
                dialogue: components.dialogue,
                rest: components.rest,
              })
            : undefined;
        const sections: SectionPlan[] = [],
          items: ItemPlan[] = [],
          concepts: TextbookConcept[] = [];
        const assets = new Map<
          string,
          { asset: FrozenAsset; kind: "figure" | "portrait" }
        >();
        const outline: OutlineUnitMeta[] = [];
        const warnings: string[] = [];
        const now = (deps.now?.() ?? new Date()).toISOString();
        let chapter = "",
          unitKey = "";
        const addSection = (
          title: string,
          templateKey: string,
          blocks: ManuscriptBlock[],
        ): SectionPlan => {
          const section = {
            id: randomUUID(),
            unitKey,
            sectionKey: `s-${randomUUID()}`,
            title,
            templateKey,
            startPolicy: "continue" as const,
            blocks,
          };
          sections.push(section);
          return section;
        };
        const addRest = () => {
          if (components.rest) {
            const unit = units.find((u) => u.chapter === chapter)!;
            const story = visuals?.restForUnit(unit);
            if (!story)
              throw invalid("쉬어가기 이야기와 그림을 준비하지 못했습니다.");
            const restSection = addSection(
              `쉬어가기 · ${story.title}`,
              "rest",
              [
                {
                  blockId: randomUUID(),
                  kind: "image",
                  assetId: story.imageAssetId,
                  caption: story.title,
                },
                text(story.markdown),
                text(
                  `### 함께 생각해요\n\n${story.reflectionQuestions.map((question) => `- ${question}`).join("\n")}`,
                ),
              ],
            );
            restSection.startPolicy = "continue";
          }
        };
        if (
          components.learningGuide ||
          components.learningPlan ||
          components.questionLog
        ) {
          unitKey = "front-matter";
          outline.push({
            unitKey,
            title: "교재 사용 안내",
            sourceUnitIds: [],
            prerequisites: [],
            goals: [],
            conceptLectureRefs: [],
          });
          if (components.learningGuide)
            addSection("학습 안내", "learning-guide", [
              text(
                "### 나의 학습 순서\n\n1. 소단원 제목을 읽고 오늘 배울 내용을 말해 봅니다.\n2. 선택한 개념 대화와 설명을 읽으며 뜻과 조건을 확인합니다.\n3. 백지 활동은 답을 가리고 자신의 말로 씁니다.\n4. 문제를 푼 뒤 풀이 과정을 비교하고 질문을 남깁니다.\n5. 다음 학습 전에 잘 설명하지 못한 내용을 다시 확인합니다.\n\n빈칸의 개수나 정답 속도보다, 이유를 설명할 수 있는지 확인하세요.",
              ),
            ]);
          if (components.learningPlan)
            addSection("학습 계획", "learning-plan", [
              text(
                "| 차례 | 학습할 소단원 | 학습 예정일 | 학습한 날 | 스스로 설명 |\n|---|---|---|---|---|\n" +
                  units
                    .map(
                      (unit, index) =>
                        `| ${index + 1} | ${sectionTitleTex(unit.section)} |　　　　 |　　　　 | □ |`,
                    )
                    .join("\n"),
              ),
            ]);
          if (components.questionLog)
            addSection("질문 기록", "question-log", [
              text(
                "### 질문을 구체적으로 남겨요\n\n| 소단원·문항 번호 | 막힌 부분과 시도한 방법 | 물어볼 질문 | 알게 된 이유 |\n|---|---|---|---|\n" +
                  Array.from(
                    { length: 8 },
                    () => "|　　　　　 |　　　　　 |　　　　　 |　　　　　 |",
                  ).join("\n") +
                  "\n\n설명을 들은 뒤에는 답을 옮겨 쓰는 대신, 무엇을 바꾸어 생각했는지 기록하세요.",
              ),
            ]);
        }
        for (const unit of units) {
          if (chapter !== unit.chapter) {
            if (chapter) addRest();
            chapter = unit.chapter;
            unitKey = `u-${unit.id}`;
            outline.push({
              unitKey,
              title: chapter,
              sourceUnitIds: [],
              prerequisites: [],
              goals: [],
              conceptLectureRefs: [],
            });
            if (components.unitIntro)
              addSection("단원 소개", "auto-unit-intro", [
                text(
                  `### ${chapter}의 학습 목표와 순서\n\n${units
                    .filter((row) => row.chapter === chapter)
                    .map(
                      (row, index) =>
                        `${index + 1}. ${sectionTitleTex(row.section)}`,
                    )
                    .join(
                      "\n",
                    )}\n\n학습 전에 각 소단원에서 이미 알고 있는 내용과 궁금한 점을 적어 보세요. 학습을 마친 뒤에는 처음의 질문으로 돌아와, 뜻과 조건을 자신의 말로 설명할 수 있는지 확인하세요.`,
                ),
              ]);
          }
          const meta = outline.at(-1)!;
          meta.sourceUnitIds.push(unit.id);
          meta.goals.push(sectionTitleTex(unit.section));
          if (
            !wantsConcept &&
            !components.dialogue &&
            !components.preparation &&
            !components.errorCheck &&
            !stages.length
          )
            continue;
          const section = addSection(unit.section, "basic", []);
          const entries = conceptIndex.get(keyOf(unit)) ?? [];
          if (components.preparation) {
            if (!entries.length)
              throw invalid(
                `${unit.section}: 준비 학습에 사용할 개념이 없습니다.`,
              );
            section.blocks.push(
              text(
                `### 준비 학습\n\n오늘의 목표: ${sectionTitleTex(unit.section)}의 뜻과 적용 방법을 설명하기.\n\n${entries.map((entry) => `- **${entry.term}**에 대해 이미 알고 있는 뜻이나 조건을 적어 보세요.`).join("\n")}\n\n${entries.flatMap((entry) => (entry.example ? [`- ${entry.example.prompt}`] : [])).join("\n")}`,
              ),
            );
          }
          if (components.errorCheck) {
            const checks = CONCEPT_BLANK_BANK.ox.filter(
              (entry) => entry.section === keyOf(unit),
            );
            if (!checks.length)
              throw invalid(
                `${unit.section}: 준비된 오류 점검 문장이 없습니다.`,
              );
            section.blocks.push(
              text(
                "### 오류 점검 · 문장의 옳고 그름을 판단하고 이유를 설명하세요.",
              ),
              {
                blockId: randomUUID(),
                kind: "concept-recall",
                phase: "sentences",
                showRepetitionChecks: false,
                markdown: checks
                  .slice(0, 3)
                  .map(
                    (entry, index) =>
                      `${index + 1}. ${entry.statement}\n\n{{${entry.answer ? "옳음" : "틀림"}: ${entry.why}}}`,
                  )
                  .join("\n\n"),
              },
            );
          }
          if (wantsConcept) {
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
              });
            const recall = (
              title: string,
              phase: "keywords" | "sentences",
              markdown: string,
            ) =>
              section.blocks.push(text(`### ${title}`), {
                blockId: randomUUID(),
                kind: "concept-recall",
                phase,
                markdown,
                showRepetitionChecks: false,
                conceptKey: concept.conceptKey,
              });
            if (components.termRecall)
              recall(
                "용어 백지",
                "keywords",
                entries
                  .map(
                    (entry) => `[[${entry.term}]]: ${plainDefinition(entry)}`,
                  )
                  .join("\n\n"),
              );
            if (components.clozeRecall)
              recall(
                "핵심어 빈칸",
                "keywords",
                entries
                  .map(
                    (entry) =>
                      `**${entry.term}**: ${splitBlankSentence(entry.definition)
                        .map((p) =>
                          p.kind === "key" ? `[[${p.text}]]` : p.text,
                        )
                        .join("")}`,
                  )
                  .join("\n\n"),
              );
            if (components.sentenceRecall)
              recall(
                "문장 백지",
                "sentences",
                entries
                  .map(
                    (entry) =>
                      `**${entry.term}**\n\n{{${plainDefinition(entry)}}}`,
                  )
                  .join("\n\n"),
              );
          }
          if (components.dialogue) {
            const dialogue = visuals
              ? { turns: visuals.dialogueForSection(keyOf(unit)), assets: [] }
              : await deps.dialogueForSection?.(
                  keyOf(unit),
                  input.cast ?? DEFAULT_QUICK_CREATE_CAST,
                );
            if (!dialogue)
              throw invalid("준비된 개념 대화와 등장인물을 읽지 못했습니다.");
            if (!dialogue.turns.length)
              throw invalid(`${unit.section}: 준비된 개념 대화가 없습니다.`);
            for (const asset of dialogue.assets)
              assets.set(asset.assetId, { asset, kind: "portrait" });
            if (
              dialogue.turns.some(
                (turn) =>
                  !assets.has(turn.portraitAssetId) &&
                  !visuals?.assetIds.includes(turn.portraitAssetId),
              )
            )
              throw invalid("개념 대화의 인물 그림을 읽지 못했습니다.");
            section.blocks.unshift({
              blockId: randomUUID(),
              kind: "dialogue",
              turns: dialogue.turns,
            });
          }
          if (stages.length) {
            const ids = await tx.query<{ id: string }>(
              `SELECT "id" FROM "problem" WHERE "unit_id" = $1::uuid AND "difficulty"::text IN
             (SELECT value FROM jsonb_array_elements_text($2::jsonb)) AND "pool"::text = $3::text
             AND "review_status"::text = 'approved' AND "direct_use_allowed" = true AND "answer" <> $4::text
             ORDER BY "problem_code", "id"`,
              [
                unit.id,
                JSON.stringify(QUICK_CREATE_DIFFICULTIES[input.difficulty]),
                DEFAULT_PROBLEM_POOL,
                MISSING_ANSWER,
              ],
            );
            const rows = [
              ...(
                await loadProblemRows(
                  tx,
                  ids.map((row) => row.id),
                )
              ).values(),
            ];
            const byId = new Map(rows.map((row) => [row.id, row]));
            const ordered = ids
              .map((row) => byId.get(row.id)!)
              .filter((row) => row && !problemIneligibleReason(row));
            const captured: Array<{
              snapshot: CapturedSnapshot;
              written: boolean;
            }> = [];
            // Reserve written candidates first; otherwise earlier components can consume them.
            const wantedWritten = stages.findIndex(
              (stage) => stage.stage === "written",
            );
            const quota = (index: number) =>
              Math.floor(input.problemCountPerUnit / stages.length) +
              (index < input.problemCountPerUnit % stages.length ? 1 : 0);
            const writtenQuota = wantedWritten < 0 ? 0 : quota(wantedWritten);
            const candidates = writtenQuota
              ? [...ordered].sort(
                  (a, b) =>
                    Number(classifyFormat(b) === "descriptive") -
                    Number(classifyFormat(a) === "descriptive"),
                )
              : ordered;
            for (const row of candidates) {
              const written = classifyFormat(row) === "descriptive";
              if (
                captured.length >= input.problemCountPerUnit &&
                captured.filter((entry) => entry.written).length >= writtenQuota
              )
                break;
              const outcome = await captureProblemSnapshot(
                row,
                deps.loadFigure,
              );
              if (!outcome.ok) {
                warnings.push(`${row.problemCode}: ${outcome.reason}`);
                continue;
              }
              captured.push({ snapshot: outcome.snapshot, written });
            }
            if (
              captured.length < input.problemCountPerUnit ||
              captured.filter((entry) => entry.written).length < writtenQuota
            )
              throw invalid(
                `${unit.section}: 선택한 난이도의 출제 가능한 문항이 부족합니다${writtenQuota ? "(서술형 포함)" : ""}. 필요한 문항: ${input.problemCountPerUnit}개.`,
              );
            const writtenEntries = captured
              .filter((entry) => entry.written)
              .slice(0, writtenQuota);
            const reserved = new Set(
              writtenEntries.map((entry) => entry.snapshot.source.problemId),
            );
            const otherEntries = captured.filter(
              (entry) => !reserved.has(entry.snapshot.source.problemId),
            );
            for (const [index, stage] of stages.entries()) {
              const selected =
                stage.stage === "written"
                  ? writtenEntries
                  : otherEntries.splice(0, quota(index));
              section.blocks.push(text(`### ${stage.title}`));
              for (const entry of selected) {
                const item: ItemPlan = {
                  id: randomUUID(),
                  unitKey,
                  sectionId: section.id,
                  stage: stage.stage,
                  snapshot: entry.snapshot,
                  orderIndex: items.filter((i) => i.sectionId === section.id)
                    .length,
                  conceptKeys: concepts
                    .filter((c) => c.unitId === unit.id)
                    .map((c) => c.conceptKey),
                };
                items.push(item);
                section.blocks.push({
                  blockId: randomUUID(),
                  kind: "problem",
                  itemId: item.id,
                });
                for (const asset of entry.snapshot.assets)
                  assets.set(asset.assetId, { asset, kind: "figure" });
              }
            }
          }
        }
        addRest();
        if (!sections.length) throw invalid("교재에 넣을 구성요소가 없습니다.");
        if (sections.length > EDITION_MAX_SECTIONS)
          throw invalid(
            `교재 구획은 ${EDITION_MAX_SECTIONS}개까지입니다. 범위를 줄여 주세요.`,
          );
        if (
          [...assets.values()].reduce(
            (sum, entry) => sum + entry.asset.bytes.byteLength,
            0,
          ) > CAPTURE_MAX_FIGURE_BYTES
        )
          throw invalid("교재 그림 용량이 너무 큽니다. 범위를 줄여 주세요.");
        for (const section of sections) {
          textbookSectionSchema.parse({
            sectionKey: section.sectionKey,
            title: section.title,
            templateKey: section.templateKey,
            startPolicy: section.startPolicy,
            blocks: section.blocks,
          });
          if (
            Buffer.byteLength(JSON.stringify({ blocks: section.blocks })) >
            SECTION_MAX_BYTES
          )
            throw invalid("소단원의 원고가 너무 큽니다.");
        }
        await tx.execute(
          `UPDATE "textbook_edition" SET "outline"=$2::jsonb,"updated_at"=${SQL_NOW} WHERE "id"=$1::uuid`,
          [editionId, JSON.stringify({ units: outline })],
        );
        for (const asset of assets.values())
          await putAsset(tx, actor.id, asset.asset, asset.kind);
        await linkEditionAssets(tx, editionId, actor.id, [...assets.keys()]);
        for (const [index, section] of sections.entries())
          await tx.execute(
            `INSERT INTO "textbook_section" ("id","edition_id","unit_key","section_key","order_index","title","template_key","start_policy","content","updated_at")
        VALUES ($1::uuid,$2::uuid,$3::text,$4::text,$5::int,$6::text,$7::text,$8::text,$9::jsonb,${SQL_NOW})`,
            [
              section.id,
              editionId,
              section.unitKey,
              section.sectionKey,
              index,
              section.title,
              section.templateKey,
              section.startPolicy,
              JSON.stringify({ blocks: section.blocks }),
            ],
          );
        for (const concept of concepts)
          await tx.execute(
            `INSERT INTO "textbook_concept" ("edition_id","concept_key","unit_key","section_id","title","kind","unit_id","body","blank_items","blank_forms","links","mapping_version","frozen","updated_at")
        VALUES ($1::uuid,$2::text,$3::text,$4::uuid,$5::text,$6::text,$7::uuid,$8::jsonb,$9::jsonb,$10::jsonb,'[]'::jsonb,$11::text,$12::jsonb,${SQL_NOW})`,
            [
              editionId,
              concept.conceptKey,
              concept.unitKey,
              sections.find((s) => s.sectionKey === concept.sectionKey)!.id,
              concept.title,
              concept.kind,
              concept.unitId,
              JSON.stringify(concept.body),
              JSON.stringify(concept.blankItems),
              JSON.stringify(concept.blankForms),
              concept.mappingVersion,
              JSON.stringify(concept.frozen),
            ],
          );
        if (items.length) {
          const snapshots = await insertSnapshots(
            tx,
            actor.id,
            items.map((item) => item.snapshot),
          );
          // Locks protect the final eligibility decision against concurrent bank moderation.
          await tx.query(
            `SELECT "id" FROM "problem" WHERE "id" IN ${uuidList("$1")} FOR SHARE`,
            [
              JSON.stringify(
                items.map((item) => item.snapshot.source.problemId),
              ),
            ],
          );
          const live = await loadProblemRows(
            tx,
            items.map((item) => item.snapshot.source.problemId),
          );
          for (const item of items) {
            const row = live.get(item.snapshot.source.problemId);
            if (
              !row ||
              problemIneligibleReason(row) ||
              row.unitId !== item.snapshot.unitId ||
              row.difficulty !== item.snapshot.difficulty ||
              row.updatedAt !== item.snapshot.sourceUpdatedAt
            )
              throw conflict(
                "그사이 원본 문항이 바뀌었습니다. 다시 시도해 주세요.",
              );
          }
          for (const item of items)
            await tx.execute(
              `INSERT INTO "textbook_item" ("id","edition_id","user_id","snapshot_id","link_status","unit_key","section_id","learning_stage","order_index","layout","concept_keys","display_number","updated_at")
          VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,'linked',$5::text,$6::uuid,$7::text,$8::int,$9::jsonb,$10::jsonb,$11::text,${SQL_NOW})`,
              [
                item.id,
                editionId,
                actor.id,
                snapshots.get(item.snapshot.snapshotHash)!,
                item.unitKey,
                item.sectionId,
                item.stage,
                item.orderIndex,
                JSON.stringify(
                  item.stage === "written"
                    ? {
                        ...DEFAULT_ITEM_LAYOUT,
                        minWorkLines: 4,
                        preferredWorkLines: 6,
                        maxWorkLines: 10,
                      }
                    : DEFAULT_ITEM_LAYOUT,
                ),
                JSON.stringify(item.conceptKeys),
                String(item.orderIndex + 1),
              ],
            );
        }
        return quickCreateResultSchema.parse({
          book: await bookSummary(tx, actor, bookId),
          problemCount: items.length,
          conceptCount: concepts.length,
          warnings,
        });
      },
    );
    return quickCreateResultSchema.parse(result);
  });
}
