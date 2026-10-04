import "server-only";
import { randomUUID } from "node:crypto";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import {
  textbookConfigSchema,
  textbookSectionSchema,
  type ManuscriptBlock,
  type TextbookConfig,
} from "@/contracts/textbookExchange.contract";
import {
  effectiveQuickCreateComponents,
  quickCreateInputSchema,
  quickCreateResultSchema,
  quickCreateScopeSchema,
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
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import { classifyFormat } from "@/lib/problem/provenance";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import type { TextbookActor } from "../access";
import { canonicalHash } from "../hash.server";
import type { FrozenAsset } from "../snapshotFromProblem";
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
  EDITION_MAX_ITEMS,
  insertSnapshots,
  loadProblemRows,
} from "./items";
import { runOnce } from "./requests";
import { EDITION_MAX_SECTIONS, SECTION_MAX_BYTES } from "./sections";
import { SQL_NOW, type TextbookDb, type TextbookSql, uuidList } from "./sql";
import {
  appendConceptAndRecall,
  wantsConceptFamily,
} from "./quickCreate/conceptRecall";
import {
  conceptIndex,
  DEFAULT_QUICK_CREATE_CAST,
  gradeLabel,
  keyOf,
  QUICK_CREATE_DIFFICULTIES,
  type ItemPlan,
  type QuickCreateAssembly,
  type QuickCreateDependencies,
  type QuickCreateLesson,
  type SectionPlan,
  type UnitRow,
} from "./quickCreate/context";
import { prependDialogue } from "./quickCreate/dialogue";
import { appendErrorCheck } from "./quickCreate/errorCheck";
import { appendFrontMatter } from "./quickCreate/frontMatter";
import { appendPreparation } from "./quickCreate/preparation";
import {
  appendProblemStages,
  enabledProblemStages,
  quickCreateItemLayout,
} from "./quickCreate/problemStages";
import { appendRest } from "./quickCreate/rest";
import { appendUnitIntro } from "./quickCreate/unitIntro";

export {
  DEFAULT_QUICK_CREATE_CAST,
  QUICK_CREATE_DIFFICULTIES,
} from "./quickCreate/context";
export type { QuickCreateDependencies } from "./quickCreate/context";

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
  const units = await scopedUnits(sql, scope);
  type Availability = NonNullable<
    QuickCreateCatalog["units"][number]["availability"]
  >;
  const availability = new Map<string, Availability>(
    units.map((unit) => [
      unit.id,
      {
        basic: { total: 0, written: 0 },
        standard: { total: 0, written: 0 },
        challenge: { total: 0, written: 0 },
      },
    ]),
  );
  if (units.length) {
    const rows = await sql.query<{
      unitId: string;
      difficulty: string;
      content: string;
      answer: string;
      questionType: string | null;
      problemType: string | null;
      familyKey: string | null;
    }>(
      `SELECT "unit_id" AS "unitId", "difficulty"::text AS "difficulty", "content", "answer",
      "question_type" AS "questionType", "problem_type"::text AS "problemType", "family_key" AS "familyKey"
      FROM "problem" WHERE "unit_id" IN ${uuidList("$1")} AND "pool"::text = $2::text
      AND "review_status"::text = 'approved' AND "direct_use_allowed" = true AND "answer" <> $3::text`,
      [
        JSON.stringify(units.map((unit) => unit.id)),
        DEFAULT_PROBLEM_POOL,
        MISSING_ANSWER,
      ],
    );
    for (const row of rows) {
      const counts = availability.get(row.unitId)!;
      const written = classifyFormat(row) === "descriptive";
      for (const [difficulty, tiers] of Object.entries(
        QUICK_CREATE_DIFFICULTIES,
      )) {
        if ((tiers as readonly string[]).includes(row.difficulty)) {
          const count = counts[difficulty as keyof Availability];
          count.total += 1;
          if (written) count.written += 1;
        }
      }
    }
  }
  return {
    units: units.map((unit) => ({
      id: unit.id,
      chapter: unit.chapter,
      section: unit.section,
      label: `${unit.chapter} · ${unit.section}`,
      problemCount: unit.problemCount,
      conceptCount: conceptIndex.get(keyOf(unit))?.length ?? 0,
      availability: availability.get(unit.id),
    })),
  };
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
        const wantsConcept = wantsConceptFamily(components);
        const stages = enabledProblemStages(components);
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
            innerMarginMm: 18,
            outerMarginMm: 13,
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
        const ctx: QuickCreateAssembly = {
          tx,
          actor,
          input,
          components,
          deps,
          units,
          visuals,
          stages,
          now,
          sections,
          items,
          concepts,
          assets,
          outline,
          warnings,
          chapter: "",
          unitKey: "",
          addSection: (
            title: string,
            templateKey: string,
            blocks: ManuscriptBlock[],
          ): SectionPlan => {
            const section = {
              id: randomUUID(),
              unitKey: ctx.unitKey,
              sectionKey: `s-${randomUUID()}`,
              title,
              templateKey,
              startPolicy: "continue" as const,
              blocks,
            };
            sections.push(section);
            return section;
          },
        };
        appendFrontMatter(ctx);
        for (const unit of units) {
          if (ctx.chapter !== unit.chapter) {
            if (ctx.chapter) appendRest(ctx);
            ctx.chapter = unit.chapter;
            ctx.unitKey = `u-${unit.id}`;
            outline.push({
              unitKey: ctx.unitKey,
              title: ctx.chapter,
              sourceUnitIds: [],
              prerequisites: [],
              goals: [],
              conceptLectureRefs: [],
            });
            appendUnitIntro(ctx);
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
          const section = ctx.addSection(unit.section, "auto-lesson", []);
          const lesson: QuickCreateLesson = {
            unit,
            section,
            entries: conceptIndex.get(keyOf(unit)) ?? [],
          };
          appendPreparation(ctx, lesson);
          appendErrorCheck(ctx, lesson);
          appendConceptAndRecall(ctx, lesson);
          await prependDialogue(ctx, lesson);
          await appendProblemStages(ctx, lesson);
          if (!section.blocks.length)
            sections.splice(sections.indexOf(section), 1);
        }
        appendRest(ctx);
        if (
          stages.length &&
          !items.length &&
          !wantsConcept &&
          !components.dialogue &&
          !components.preparation &&
          !components.errorCheck
        )
          throw invalid(
            "선택한 범위와 난이도에서 출제 가능한 문항이 없습니다. 난이도나 범위를 바꾸거나 개념 구성을 켜 주세요.",
          );
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
                JSON.stringify(quickCreateItemLayout(item.stage)),
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
