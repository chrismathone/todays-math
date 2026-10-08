// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  quickCreateInputSchema,
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
  type QuickCreateInput,
} from "@/contracts/textbookQuickCreate.contract";
import {
  createQuickTextbook,
  listQuickCreateUnits,
  quickCreateSemester,
  QUICK_CREATE_DIFFICULTIES,
  type QuickCreateDependencies,
} from "@/lib/textbook/server/quickCreate";
import type { TextbookActor } from "@/lib/textbook/access";
import type { TextbookDb, TextbookSql } from "@/lib/textbook/server/sql";
import { getEditionDetail } from "@/lib/textbook/server/editions";
import { putAsset, linkEditionAssets } from "@/lib/textbook/server/blobs";
import { getSection } from "@/lib/textbook/server/sections";
import { conceptIndex } from "@/lib/textbook/server/quickCreate/context";
import { QUESTION_REVISION } from "@/lib/concept-blank/questions";
import { validateTextbookReferences } from "@/lib/textbook/references";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  A4,
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import { sha256 } from "@/lib/textbook/hash.server";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { openTextbookDb, sqlNow, type Db } from "../helpers/textbookPglite";
import {
  insertTeacher,
  insertBankProblem,
  pgliteTextbookDb,
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db, db: TextbookDb, actor: TextbookActor;
const ids = new Map<string, string>();
const supportedSeeds = CURRICULUM_UNITS.filter((u) =>
  /^(초[3-6]|중[1-3])$/.test(u.grade),
);
const seedKey = (u: { grade: string; chapter: string; section: string }) =>
  `${u.grade}::${u.chapter}::${u.section}`;
const e3 = supportedSeeds
  .filter((u) => u.grade === "초3" && quickCreateSemester(u) === 1)
  .slice(0, 3);
const png = tinyPng(30, 40, "portrait");
const portraitId = sha256(png);
const deps: QuickCreateDependencies = {
  loadFigure: async () => png,
  dialogueForSection: vi.fn<
    NonNullable<QuickCreateDependencies["dialogueForSection"]>
  >(async (_key, cast) => ({
    turns: [
      {
        speakerId: cast.teacherId,
        side: "left",
        expression: "neutral",
        portraitAssetId: portraitId,
        mirrorPortrait: false,
        markdown: "준비된 개념 대화입니다.",
      },
    ],
    assets: [
      {
        assetId: portraitId,
        mimeType: "image/png",
        name: "portrait.png",
        widthPx: 30,
        heightPx: 40,
        bytes: png,
      },
    ],
  })),
};
const visualDeps: QuickCreateDependencies = {
  ...deps,
  prepareVisuals: async (tx, scope) => {
    await putAsset(
      tx,
      scope.userId,
      {
        assetId: portraitId,
        mimeType: "image/png",
        name: "story-and-portrait.png",
        widthPx: 30,
        heightPx: 40,
        bytes: png,
      },
      "portrait",
    );
    await linkEditionAssets(tx, scope.editionId, scope.userId, [portraitId]);
    return {
      assetIds: [portraitId],
      dialogueForSection: () => [
        {
          speakerId: scope.cast.teacherId,
          side: "left",
          expression: "neutral",
          portraitAssetId: portraitId,
          mirrorPortrait: false,
          markdown: "준비된 대화",
        },
      ],
      restForUnit: () => ({
        title: "수학 이야기",
        markdown: "같은 크기의 사과 여섯 개를 세 사람이 똑같이 나눕니다.",
        reflectionQuestions: ["한 사람은 몇 개를 받을까요?"],
        imageAssetId: portraitId,
      }),
    };
  },
};
const allOff: QuickCreateComponents = Object.fromEntries(
  Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, false]),
) as QuickCreateComponents;
const components = (overrides: Partial<QuickCreateComponents>) => ({
  ...allOff,
  ...overrides,
});
function input(overrides: Partial<QuickCreateInput> = {}): QuickCreateInput {
  return {
    requestId: randomUUID(),
    schoolLevel: "elementary",
    grade: 3,
    semester: 1,
    startUnitId: ids.get(seedKey(e3[0]))!,
    endUnitId: ids.get(seedKey(e3[2]))!,
    difficulty: "standard",
    problemCountPerUnit: 2,
    includeConcepts: true,
    components: components({ practice: true }),
    ...overrides,
  };
}
interface SourcedProblem {
  content: string;
  answer: string;
  solution: string | null;
  difficulty?: string;
  /** 계산 · 개념 · 활용 · 서술형 — the recorded type axis, not the answer format. */
  problemType?: string;
  questionType?: string | null;
  /** Recorded engine provenance (`elem:` / `mid:`). Absent: the insert trigger makes it solo. */
  familyKey?: string | null;
  reviewStatus?: string;
}
/** A real, distinct question with its recorded family and type (the shared helper has neither). */
async function insertSourced(unitId: string, row: SourcedProblem) {
  const id = randomUUID();
  await pg.query(
    `INSERT INTO "problem" ("id","unit_id","source","difficulty","problem_type","question_type","content","answer","solution",
       "family_key","review_status","direct_use_allowed","pool","updated_at")
     VALUES ($1,$2,'manual',$3::"difficulty",$4,$5,$6,$7,$8,$9,$10::"review_status",true,'shared',$11)`,
    [
      id,
      unitId,
      row.difficulty ?? "기본",
      row.problemType ?? "계산",
      row.questionType ?? null,
      row.content,
      row.answer,
      row.solution,
      row.familyKey ?? null,
      row.reviewStatus ?? "approved",
      sqlNow(),
    ],
  );
  return id;
}
const sum = (a: number, b: number) => ({
  content: `$${a} + ${b}$ 를 계산하시오.`,
  answer: String(a + b),
  solution: `일의 자리부터 차례로 더하면 $${a} + ${b} = ${a + b}$ 이다.`,
});
const product = (a: number, b: number) => ({
  content: `$${a} \\times ${b}$ 를 계산하시오.`,
  answer: String(a * b),
  solution: `$${a}$ 를 $${b}$ 번 더한 값이므로 $${a} \\times ${b} = ${a * b}$ 이다.`,
});
/** x + a = b: one recorded family, solved by the same step. */
const equation = (a: number, b: number) => ({
  content: `$x + ${a} = ${b}$ 일 때, $x$ 의 값을 구하시오.`,
  answer: String(b - a),
  solution: `양변에서 $${a}$ 를 빼면 $x = ${b} - ${a} = ${b - a}$ 이다.`,
});

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  actor = await insertTeacher(pg);
  for (const [index, unit] of supportedSeeds.entries()) {
    const id = randomUUID();
    ids.set(seedKey(unit), id);
    await pg.query(
      `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        `J3${String(1000 + index)}`,
      ],
    );
  }
  for (const unit of e3) {
    const id = ids.get(seedKey(unit))!;
    for (const difficulty of [
      "연산",
      "기본",
      "응용",
      "심화하",
      "심화중",
      "심화상",
    ]) {
      await insertBankProblem(pg, id, {
        difficulty,
        content: `${difficulty} 문제`,
        figureUrls: ["/figures/proof.png"],
        figureDims: [30, 40],
        figureSourceMm: [35],
        choiceFigureIndex: [0],
      });
      await insertBankProblem(pg, id, {
        difficulty,
        content: `${difficulty} 서술형 문제`,
        questionType: "서술형",
      });
    }
    for (const overrides of [
      { reviewStatus: "pending" as const },
      { directUseAllowed: false },
      { pool: "private" as const },
      { answer: MISSING_ANSWER },
    ])
      await insertBankProblem(pg, id, overrides);
    // Standard tier, without figures: one recorded engine pair (same family, type, difficulty
    // and format; different questions, answers and solutions), a word problem and a lone sum.
    const shift = 10 * e3.indexOf(unit);
    await insertSourced(id, {
      ...sum(213 + shift, 325),
      familyKey: "elem:e3-add-three-digit",
    });
    await insertSourced(id, {
      ...sum(416 + shift, 372),
      familyKey: "elem:e3-add-three-digit",
    });
    await insertSourced(id, {
      content: `사과가 $${213 + shift}$개, 배가 $142$개 있습니다. 과일은 모두 몇 개입니까?`,
      answer: `${355 + shift}개`,
      solution: `$${213 + shift} + 142 = ${355 + shift}$ 이므로 모두 $${355 + shift}$개이다.`,
      problemType: "활용",
      difficulty: "응용",
    });
    await insertSourced(id, sum(124 + shift, 231));
  }
}, 120_000);
afterAll(async () => {
  await pg.close();
});

async function saved(result: Awaited<ReturnType<typeof createQuickTextbook>>) {
  const edition = await getEditionDetail(
    db,
    actor,
    result.book.draftEditionId!,
  );
  const sections = await Promise.all(
    edition.outline.flatMap((unit) =>
      unit.sections.map((s) =>
        getSection(db, actor, edition.edition.editionId, s.id),
      ),
    ),
  );
  return {
    edition,
    sections,
    blocks: sections.flatMap((s) => s.section.blocks),
  };
}
async function counts() {
  const [row] = await db.query<{
    books: number;
    editions: number;
    items: number;
    requests: number;
    snapshots: number;
    assets: number;
  }>(`SELECT
    (SELECT count(*)::int FROM "textbook") AS books, (SELECT count(*)::int FROM "textbook_edition") AS editions,
    (SELECT count(*)::int FROM "textbook_item") AS items, (SELECT count(*)::int FROM "textbook_request") AS requests,
    (SELECT count(*)::int FROM "textbook_problem_snapshot") AS snapshots, (SELECT count(*)::int FROM "textbook_asset") AS assets`);
  return row;
}
/** Every placed item with the source row it was captured from, in print order. */
async function placed(editionId: string) {
  return db.query<{
    itemId: string;
    unitId: string;
    stage: string;
    lines: number;
    content: string;
    answer: string;
    solution: string | null;
    familyKey: string | null;
    problemType: string;
    difficulty: string;
    questionType: string | null;
  }>(
    `SELECT i."id" AS "itemId", s."unit_id" AS "unitId", i."learning_stage" AS stage,
            (i."layout" ->> 'preferredWorkLines')::int AS lines, s."payload" ->> 'content' AS content,
            s."payload" ->> 'answer' AS answer, s."payload" ->> 'solution' AS solution, s."family_key" AS "familyKey",
            s."problem_type" AS "problemType", s."difficulty" AS difficulty, s."payload" ->> 'questionType' AS "questionType"
       FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
      WHERE i."edition_id" = $1::uuid ORDER BY i."section_id", i."order_index"`,
    [editionId],
  );
}
/** Example/confirmation links exactly as the writer saved them in the manuscript. */
function exampleGroups(blocks: Awaited<ReturnType<typeof saved>>["blocks"]) {
  const groups = new Map<string, { example: string; confirms: string[] }>();
  for (const block of blocks) {
    const node = block.semantic?.node;
    if (block.kind === "problem" && node?.kind === "exampleGroup")
      groups.set(node.groupId, {
        example: node.exampleItemId,
        confirms: node.confirmItemIds,
      });
  }
  return [...groups.values()];
}
type QuickModel = ReturnType<typeof createTextbookRenderModel>;
type QuickLayout = ReturnType<typeof paginateTextbookSections>;
type Measurement = {
  blockId: string;
  widthMm: number;
  heightMm: number;
  introTextFits?: boolean;
};
/** One fixed height per block: this checks which blocks are placed, never page geometry. */
const mockMeasurements = (model: QuickModel): Measurement[] =>
  model.sections.flatMap((section) =>
    section.blocks.map((block) => ({
      blockId: block.id,
      widthMm: blockWidthMm(model.config, block),
      heightMm: block.kind === "heading" ? 16 : 75,
    })),
  );
/**
 * Everything a pagination got wrong; empty when it is sound.
 *
 * - Every block outside a unit introduction is placed exactly once. Only a section heading may
 *   be placed again, on the pages that continue it, and never twice on one page.
 * - A unit introduction has three alternatives of the same content. Exactly its spread (left on
 *   an even page, right on the next) or exactly its single page is placed.
 * - The single page carries one AUTO_INTRO_SINGLE_PAGE warning, and only for a real reason: an
 *   odd start page, or a spread the measurements do not fit. No other issue is accepted.
 */
function paginationFaults(
  model: QuickModel,
  layout: Pick<QuickLayout, "pages" | "issues">,
  measurements: readonly Measurement[],
): string[] {
  const faults: string[] = [];
  const blocks = model.sections.flatMap((section) => section.blocks);
  const known = new Set(blocks.map((block) => block.id));
  const pagesOf = new Map<string, number[]>();
  for (const page of layout.pages) {
    const onPage = new Set<string>();
    for (const { blockId } of page.blocks) {
      if (!known.has(blockId))
        faults.push(
          `unknown block ${blockId} on page ${page.physicalPageIndex}`,
        );
      if (onPage.has(blockId))
        faults.push(`${blockId} is twice on page ${page.physicalPageIndex}`);
      onPage.add(blockId);
      pagesOf.set(blockId, [
        ...(pagesOf.get(blockId) ?? []),
        page.physicalPageIndex,
      ]);
    }
  }
  for (const block of blocks) {
    if (block.unitIntroPart) continue;
    const count = pagesOf.get(block.id)?.length ?? 0;
    if (count === 0) faults.push(`${block.id} is not placed`);
    else if (count > 1 && block.kind !== "heading")
      faults.push(`${block.id} is placed ${count} times`);
  }
  const size = new Map(measurements.map((m) => [m.blockId, m]));
  const accounted = new Set<QuickLayout["issues"][number]>();
  for (const section of model.sections) {
    const parts = section.blocks.filter((block) => block.unitIntroPart);
    if (!parts.length) continue;
    const where = `${section.unitKey}/${section.sectionKey}`;
    const part = (name: "left" | "right" | "single") =>
      parts.find((block) => block.unitIntroPart === name);
    const pages = (name: "left" | "right" | "single") =>
      pagesOf.get(part(name)?.id ?? "") ?? [];
    const [left, right, single] = [
      pages("left"),
      pages("right"),
      pages("single"),
    ];
    const spread =
      left.length === 1 && right.length === 1 && single.length === 0;
    const alone =
      left.length === 0 && right.length === 0 && single.length === 1;
    if (!spread && !alone)
      faults.push(
        `introduction ${where} is placed as left×${left.length} right×${right.length} single×${single.length}`,
      );
    if (spread && !(left[0] % 2 === 0 && right[0] === left[0] + 1))
      faults.push(
        `introduction ${where} spread is on pages ${left[0]} and ${right[0]}`,
      );
    const warnings = layout.issues.filter(
      (issue) =>
        issue.code === "AUTO_INTRO_SINGLE_PAGE" &&
        issue.path.join("/") ===
          `units/${section.unitKey}/sections/${section.sectionKey}`,
    );
    for (const warning of warnings) accounted.add(warning);
    if (!alone) {
      if (warnings.length)
        faults.push(
          `introduction ${where} has a single-page warning without a single page`,
        );
      continue;
    }
    if (warnings.length !== 1) {
      faults.push(
        `introduction ${where} on one page has ${warnings.length} warnings`,
      );
      continue;
    }
    const [warning] = warnings;
    if (
      warning.severity !== "warning" ||
      warning.physicalPageIndex !== single[0]
    )
      faults.push(
        `introduction ${where} warning is ${warning.severity} for page ${warning.physicalPageIndex}`,
      );
    // The two real reasons, judged from the page number and the measurements given.
    const fits = (name: "left" | "right") => {
      const block = part(name);
      const measured = block && size.get(block.id);
      return (
        !!block &&
        !!measured &&
        Number.isFinite(measured.heightMm) &&
        measured.heightMm > 0 &&
        measured.heightMm <= 254 &&
        measured.introTextFits !== false &&
        Math.abs(measured.widthMm - blockWidthMm(model.config, block)) <=
          A4.toleranceMm
      );
    };
    const oddStart = single[0] % 2 !== 0;
    if (!oddStart && fits("left") && fits("right"))
      faults.push(
        `introduction ${where} is on one page although its spread fits the even page ${single[0]}`,
      );
    if (oddStart !== warning.message.includes("홀수 시작 쪽"))
      faults.push(`introduction ${where} warning states the wrong reason`);
  }
  for (const issue of layout.issues)
    if (!accounted.has(issue))
      faults.push(`unexpected issue ${issue.code}: ${issue.message}`);
  return faults;
}
async function assertPaginates(
  result: Awaited<ReturnType<typeof createQuickTextbook>>,
) {
  const exchange = await assembleExchange(db, result.book.draftEditionId!, {
    exportedAt: new Date().toISOString(),
  });
  for (const variant of ["student", "answers"] as const) {
    const model = createTextbookRenderModel(exchange, variant);
    const measurements = mockMeasurements(model);
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { includeCover: model.config.print.coverMode === "included" },
    );
    expect(layout.pages.length).toBeGreaterThan(0);
    expect(paginationFaults(model, layout, measurements), variant).toEqual([]);
  }
}
describe("quick create curriculum and validation", () => {
  it("scopes every supported seed to exactly one semester", async () => {
    for (const schoolLevel of ["elementary", "middle"] as const)
      for (const grade of schoolLevel === "elementary"
        ? [3, 4, 5, 6]
        : [1, 2, 3]) {
        const expected = supportedSeeds.filter(
          (u) =>
            u.grade === `${schoolLevel === "elementary" ? "초" : "중"}${grade}`,
        );
        const terms = await Promise.all(
          ([1, 2] as const).map((semester) =>
            listQuickCreateUnits(db, { schoolLevel, grade, semester }),
          ),
        );
        expect(terms[0].units.length + terms[1].units.length).toBe(
          expected.length,
        );
        for (const [index, term] of terms.entries())
          expect(term.units.map((u) => u.id)).toEqual(
            expected
              .filter((u) => quickCreateSemester(u) === index + 1)
              .map((u) => ids.get(seedKey(u))),
          );
      }
    expect(
      quickCreateSemester({
        grade: "중1",
        chapter: "5. 기본 도형",
        section: "평행선",
      }),
    ).toBe(2);
    expect(
      quickCreateSemester({
        grade: "중2",
        chapter: "4. 함수",
        section: "함수와 함숫값",
      }),
    ).toBe(1);
    expect(
      quickCreateSemester({
        grade: "중3",
        chapter: "5. 삼각비",
        section: "삼각비의 뜻",
      }),
    ).toBe(2);
    expect(
      quickCreateSemester({
        grade: "초3",
        chapter: "새 단원",
        section: "알 수 없음",
      }),
    ).toBeNull();
  });
  it("rejects unsupported grades, all-off after includeConcepts, bad cast and missing stage quota", () => {
    expect(quickCreateInputSchema.safeParse(input({ grade: 2 })).success).toBe(
      false,
    );
    expect(
      quickCreateInputSchema.safeParse(
        input({ schoolLevel: "middle", grade: 4 }),
      ).success,
    ).toBe(false);
    expect(
      quickCreateInputSchema.safeParse(input({ components: allOff })).success,
    ).toBe(false);
    expect(
      quickCreateInputSchema.safeParse(
        input({
          includeConcepts: false,
          components: components({
            concepts: true,
            termRecall: true,
            clozeRecall: true,
            sentenceRecall: true,
          }),
        }),
      ).success,
    ).toBe(false);
    expect(
      quickCreateInputSchema.safeParse(
        input({
          cast: {
            teacherId: "teacher-f9",
            student1Id: "student-f1",
            student2Id: "student-m1",
          },
        }),
      ).success,
    ).toBe(false);
    expect(
      quickCreateInputSchema.safeParse(
        input({
          problemCountPerUnit: 1,
          components: components({ practice: true, review: true }),
        }),
      ).success,
    ).toBe(false);
  });
  it("includes both endpoints and preserves original figures without changing banks", async () => {
    const beforeBank = await pg.query(
      `SELECT "id","updated_at","content" FROM "problem" ORDER BY "id"`,
    );
    const result = await createQuickTextbook(db, actor, input(), deps);
    expect(result.problemCount).toBe(6);
    expect(result.conceptCount).toBe(0);
    const { edition, sections } = await saved(result);
    expect(edition.outline.flatMap((u) => u.sourceUnitIds)).toEqual(
      e3.map((u) => ids.get(seedKey(u))),
    );
    expect(sections.map((s) => s.section.title)).toEqual(
      e3.map((u) => u.section),
    );
    const exchange = await assembleExchange(db, edition.edition.editionId, {
      exportedAt: new Date().toISOString(),
    });
    expect(exchange.items).toHaveLength(6);
    expect(exchange.snapshots.some((s) => s.payload.figures.length > 0)).toBe(
      true,
    );
    expect(
      exchange.snapshots
        .filter((s) => s.payload.figures.length)
        .every((s) => s.rawSource?.figureSourceMm[0] === 35),
    ).toBe(true);
    expect(
      await pg.query(
        `SELECT "id","updated_at","content" FROM "problem" ORDER BY "id"`,
      ),
    ).toMatchObject({ rows: beforeBank.rows });
  });
  it.each(["basic", "standard", "challenge"] as const)(
    "selects only exact eligible %s tiers",
    async (difficulty) => {
      const result = await createQuickTextbook(
        db,
        actor,
        input({ difficulty }),
        deps,
      );
      const rows = await db.query<{
        difficulty: string;
        reviewStatus: string;
        direct: boolean;
        pool: string;
      }>(
        `SELECT p."difficulty"::text AS difficulty,p."review_status"::text AS "reviewStatus",p."direct_use_allowed" AS direct,p."pool"::text AS pool
      FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id"=i."snapshot_id" JOIN "problem" p ON p."id"=s."problem_id" WHERE i."edition_id"=$1::uuid`,
        [result.book.draftEditionId],
      );
      expect(rows).toHaveLength(6);
      expect(
        rows.every(
          (row) =>
            (
              QUICK_CREATE_DIFFICULTIES[difficulty] as readonly string[]
            ).includes(row.difficulty) &&
            row.reviewStatus === "approved" &&
            row.direct &&
            row.pool === "shared",
        ),
      ).toBe(true);
    },
  );
  it("single-unit range works and wrong/reversed endpoints leave no book", async () => {
    expect(
      (
        await createQuickTextbook(
          db,
          actor,
          input({ endUnitId: input().startUnitId }),
          deps,
        )
      ).problemCount,
    ).toBe(2);
    const before = await counts();
    const otherTerm = supportedSeeds.find(
      (u) => u.grade === "초3" && quickCreateSemester(u) === 2,
    )!;
    for (const overrides of [
      { startUnitId: input().endUnitId, endUnitId: input().startUnitId },
      { endUnitId: ids.get(seedKey(otherTerm))! },
      { endUnitId: randomUUID() },
    ])
      await expect(
        createQuickTextbook(db, actor, input(overrides), deps),
      ).rejects.toThrow();
    expect(await counts()).toEqual(before);
  });
});
describe("quick create component composition", () => {
  it.each(
    Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).filter(
      (key) => key !== "cover",
    ) as Exclude<keyof QuickCreateComponents, "cover">[],
  )("%s alone paginates with either cover choice", async (toggle) => {
    for (const cover of [false, true]) {
      const result = await createQuickTextbook(
        db,
        actor,
        input({ components: components({ [toggle]: true, cover }) }),
        visualDeps,
      );
      await assertPaginates(result);
    }
  });
  it("all components together cover every selected problem group within the shared maximum", async () => {
    const all = Object.fromEntries(
      Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, true]),
    ) as QuickCreateComponents;
    // Seven problem groups share one maximum: a smaller budget is refused, never trimmed silently.
    expect(
      quickCreateInputSchema.safeParse(
        input({ components: all, problemCountPerUnit: 6 }),
      ).success,
    ).toBe(false);
    for (const cover of [false, true]) {
      const result = await createQuickTextbook(
        db,
        actor,
        input({ components: { ...all, cover }, problemCountPerUnit: 8 }),
        visualDeps,
      );
      await assertPaginates(result);
      const exchange = await assembleExchange(db, result.book.draftEditionId!, {
        exportedAt: new Date().toISOString(),
      });
      const indexEntries = exchange.units
        .flatMap((unit) => unit.sections)
        .flatMap((section) => section.blocks)
        .filter((block) => block.semantic?.activity === "conceptIndex")
        .flatMap((block) =>
          block.semantic?.node?.kind === "references"
            ? block.semantic.node.entries
            : [],
        );
      expect(indexEntries.length).toBeGreaterThan(0);
      for (const entry of indexEntries) {
        expect(entry.targetConceptId).toBe(entry.key);
        const owner = exchange.units
          .find((unit) => unit.unitKey === entry.targetUnitKey)
          ?.sections.find(
            (section) => section.sectionKey === entry.targetSectionKey,
          );
        expect(owner?.blocks.some((block) => block.kind === "concept")).toBe(
          true,
        );
      }
      expect(result.problemCount).toBe(24);
      expect(
        result.warnings.filter((warning) => warning.includes("요청한 최대")),
      ).toEqual([]);
      const rows = await placed(result.book.draftEditionId!);
      for (const unit of e3)
        expect(
          rows
            .filter((row) => row.unitId === ids.get(seedKey(unit)))
            .map((row) => row.stage)
            .sort(),
        ).toEqual([
          "application",
          "concept-check",
          "concept-check",
          "cumulative-review",
          "type-practice",
          "unit-assessment",
          "worked-example",
          "written",
        ]);
      // One recorded pair per section: the solved example and a different unsolved question.
      const groups = exampleGroups((await saved(result)).blocks);
      expect(groups).toHaveLength(3);
      for (const group of groups) {
        const example = rows.find((row) => row.itemId === group.example)!;
        expect(group.confirms).toHaveLength(1);
        const confirm = rows.find((row) => row.itemId === group.confirms[0])!;
        expect(example.stage).toBe("worked-example");
        expect(confirm.stage).toBe("concept-check");
        expect(example.familyKey).toBe("elem:e3-add-three-digit");
        expect([
          confirm.familyKey,
          confirm.problemType,
          confirm.difficulty,
          confirm.questionType,
          confirm.unitId,
        ]).toEqual([
          example.familyKey,
          example.problemType,
          example.difficulty,
          example.questionType,
          example.unitId,
        ]);
        expect(confirm.content).not.toBe(example.content);
        expect(confirm.answer).not.toBe(example.answer);
        expect(example.solution?.trim()).toBeTruthy();
        expect(confirm.solution?.trim()).toBeTruthy();
      }
    }
    const seeds = supportedSeeds.filter(
      (unit) => unit.grade === "초3" && quickCreateSemester(unit) === 1,
    );
    const boundary = seeds.findIndex(
      (unit) => unit.chapter !== seeds[0].chapter,
    );
    for (const cover of [false, true])
      await assertPaginates(
        await createQuickTextbook(
          db,
          actor,
          input({
            startUnitId: ids.get(seedKey(seeds[boundary - 1]))!,
            endUnitId: ids.get(seedKey(seeds[boundary]))!,
            components: components({
              unitIntro: true,
              concepts: true,
              termRecall: true,
              clozeRecall: true,
              sentenceRecall: true,
              rest: true,
              cover,
            }),
          }),
          visualDeps,
        ),
      );
  });
  it("composes actual concept bank content for every section of 초3–중3", async () => {
    let total = 0;
    for (const schoolLevel of ["elementary", "middle"] as const)
      for (const grade of schoolLevel === "elementary"
        ? [3, 4, 5, 6]
        : [1, 2, 3])
        for (const semester of [1, 2] as const) {
          const catalog = await listQuickCreateUnits(db, {
            schoolLevel,
            grade,
            semester,
          });
          const result = await createQuickTextbook(
            db,
            actor,
            input({
              schoolLevel,
              grade,
              semester,
              startUnitId: catalog.units[0].id,
              endUnitId: catalog.units.at(-1)!.id,
              components: components({ concepts: true }),
            }),
            deps,
          );
          expect(result.conceptCount).toBe(catalog.units.length);
          total += result.conceptCount;
          await assertPaginates(result);
        }
    expect(total).toBe(supportedSeeds.length);
  }, 120_000);
  it("default components build bank explanations, three independent recall kinds and prepared dialogue", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({ components: undefined }),
      deps,
    );
    const { blocks, sections } = await saved(result);
    expect(result.conceptCount).toBe(3);
    expect(blocks.filter((b) => b.kind === "dialogue")).toHaveLength(3);
    expect(blocks.filter((b) => b.kind === "concept")).toHaveLength(3);
    expect(blocks.filter((b) => b.kind === "concept-recall")).toHaveLength(9);
    expect(
      sections.some((s) => s.section.templateKey === "auto-unit-intro"),
    ).toBe(true);
    const exchange = await assembleExchange(db, result.book.draftEditionId!, {
      exportedAt: new Date().toISOString(),
    });
    expect(
      exchange.conceptIntegration?.concepts.every(
        (c) =>
          c.body.definition.length > 0 &&
          c.blankItems.length > 0 &&
          c.frozen?.entries.length,
      ),
    ).toBe(true);
    expect(exchange.assets.some((a) => a.assetId === portraitId)).toBe(true);
  });
  it.each(["termRecall", "clozeRecall", "sentenceRecall"] as const)(
    "honors independent %s without concept explanation or practice",
    async (toggle) => {
      const result = await createQuickTextbook(
        db,
        actor,
        input({ components: components({ [toggle]: true }) }),
        deps,
      );
      const { blocks, sections } = await saved(result);
      expect(result.problemCount).toBe(0);
      expect(result.conceptCount).toBe(3);
      expect(sections).toHaveLength(3);
      expect(blocks.filter((b) => b.kind === "concept-recall")).toHaveLength(3);
      expect(
        blocks.some((b) => ["concept", "problem", "dialogue"].includes(b.kind)),
      ).toBe(false);
    },
  );
  it("includeConcepts disables the concept family and selected cast reaches prepared dialogue", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({ includeConcepts: false, components: undefined }),
      deps,
    );
    const { blocks } = await saved(result);
    expect(result.conceptCount).toBe(0);
    expect(blocks.every((b) => b.kind === "text" || b.kind === "problem")).toBe(
      true,
    );
    const cast = {
      teacherId: "teacher-m5",
      student1Id: "student-m3",
      student2Id: "student-f2",
    };
    const dialogue = await createQuickTextbook(
      db,
      actor,
      input({ components: components({ dialogue: true }), cast }),
      deps,
    );
    const savedDialogue = await saved(dialogue);
    expect(
      savedDialogue.blocks.some(
        (b) => b.kind === "dialogue" && b.turns[0].speakerId === cast.teacherId,
      ),
    ).toBe(true);
  });
  it("distributes the total quota across all enabled problem stages with actual written sources", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        components: components({
          practice: true,
          review: true,
          assessment: true,
          written: true,
        }),
        problemCountPerUnit: 4,
      }),
      deps,
    );
    expect(result.problemCount).toBe(12);
    const rows = await db.query<{ stage: string; questionType: string }>(
      `SELECT i."learning_stage" AS stage,s."payload" ->> 'questionType' AS "questionType" FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id"=i."snapshot_id" WHERE i."edition_id"=$1::uuid`,
      [result.book.draftEditionId],
    );
    // Practice is saved as type practice; the old catch-all "basic" stage is no longer written.
    for (const stage of [
      "type-practice",
      "cumulative-review",
      "unit-assessment",
      "written",
    ])
      expect(rows.filter((r) => r.stage === stage)).toHaveLength(3);
    expect(rows.filter((r) => r.stage === "basic")).toHaveLength(0);
    expect(
      rows
        .filter((r) => r.stage === "written")
        .every((r) => r.questionType === "서술형"),
    ).toBe(true);
  });
  it("intro-only and rest-only create nonempty native sections without fetching banks or portraits", async () => {
    for (const toggle of ["unitIntro", "rest"] as const) {
      const withStories: QuickCreateDependencies = {
        ...deps,
        prepareVisuals: async (tx, scope) => {
          await putAsset(
            tx,
            scope.userId,
            {
              assetId: portraitId,
              mimeType: "image/png",
              name: "story.png",
              widthPx: 30,
              heightPx: 40,
              bytes: png,
            },
            "image",
          );
          await linkEditionAssets(tx, scope.editionId, scope.userId, [
            portraitId,
          ]);
          return {
            assetIds: [portraitId],
            dialogueForSection: () => [],
            restForUnit: () => ({
              title: "수학 이야기",
              markdown: "세 사람이 사과 여섯 개를 똑같이 나눕니다.",
              reflectionQuestions: ["한 사람은 몇 개를 받을까요?"],
              imageAssetId: portraitId,
            }),
          };
        },
      };
      const result = await createQuickTextbook(
        db,
        actor,
        input({
          includeConcepts: false,
          components: components({ [toggle]: true }),
        }),
        withStories,
      );
      const { sections } = await saved(result);
      expect(result.problemCount).toBe(0);
      expect(result.conceptCount).toBe(0);
      expect(sections).toHaveLength(1);
      expect(sections[0].section.templateKey).toBe(
        toggle === "rest" ? "rest" : "auto-unit-intro",
      );
    }
  });
  it("cover and frontmatter toggles produce independent native content", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        components: components({
          learningGuide: true,
          learningPlan: true,
          questionLog: true,
        }),
        includeConcepts: false,
      }),
      deps,
    );
    const { edition, sections } = await saved(result);
    expect(edition.config.print.coverMode).toBe("separate");
    expect(sections.map((s) => s.section.templateKey)).toEqual([
      "auto-learning-guide",
      "auto-learning-plan",
      "auto-question-log",
    ]);
    const [guide, plan, log] = sections.map((s) => s.section.blocks);
    // The guide explains the selected activities only.
    expect(guide).toHaveLength(1);
    expect(guide[0].semantic?.activity).toBe("learningGuide");
    const guideText = guide[0].kind === "text" ? guide[0].markdown : "";
    expect(guideText).toContain("**학습 계획**");
    expect(guideText).toContain("**질문 기록**");
    for (const unselected of ["개념 대화", "유형 연습", "쉬어가기", "서술형"])
      expect(guideText).not.toContain(unselected);
    // The plan lists every selected section once.
    expect(plan.every((b) => b.semantic?.activity === "learningPlan")).toBe(
      true,
    );
    const planText = plan
      .map((b) => (b.kind === "text" ? b.markdown : ""))
      .join("\n");
    expect(planText.match(/^\| \d+ \|/gm)).toHaveLength(3);
    // The question log is real writing space, not a description of one.
    expect(log).toHaveLength(1);
    expect(log[0].semantic).toMatchObject({
      activity: "questionLog",
      node: { kind: "writing", lines: 4 },
    });
    const covered = await saved(
      await createQuickTextbook(
        db,
        actor,
        input({ components: components({ cover: true, unitIntro: true }) }),
        deps,
      ),
    );
    expect(covered.edition.config.print.coverMode).toBe("included");
  });
  it("preparation uses source prompts and error checking uses bank corrections", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        components: components({ preparation: true, errorCheck: true }),
      }),
      deps,
    );
    const { blocks } = await saved(result);
    expect(result.problemCount).toBe(0);
    expect(
      blocks
        .filter((b) => b.kind === "concept-recall")
        .every((b) => b.kind === "concept-recall" && Boolean(b.conceptKey)),
    ).toBe(true);
    expect(
      blocks.filter(
        (b) => b.kind === "text" && b.markdown.includes("준비 학습"),
      ),
    ).toHaveLength(3);
    expect(
      blocks.filter(
        (b) => b.kind === "concept-recall" && b.markdown.includes("{{"),
      ),
    ).toHaveLength(3);
  });
});
describe("quick create failure and idempotency", () => {
  it("freezes current question payloads and preserves all explanations when a form excludes a core entry", async () => {
    const entries = conceptIndex.get(seedKey(e3[0]))!;
    const before = entries.map((entry) => ({
      entry,
      value: structuredClone(entry),
    }));
    try {
      for (const entry of entries) {
        entry.questionRevision = QUESTION_REVISION;
        entry.bQuestion = {
          prompt: "낱개 $10$개를 십 묶음으로 바꾸면 몇 묶음인가요?",
          answer: "십 한 묶음이다.",
          requiredIdeas: [{ anyOf: ["십 묶음 하나"] }],
        };
        entry.clozeQuestion = {
          sentence: "낱개 $20$개를 십 묶음으로 바꾸면 {$2$}묶음이다.",
          acceptedAnswers: [["$2$"]],
        };
      }
      entries[0].bQuestion = null;
      entries[0].questionExclusions = {
        term: "검증용: B에서 제외하고 C에서 확인한다.",
      };
      const result = await createQuickTextbook(
        db,
        actor,
        input({
          endUnitId: ids.get(seedKey(e3[0]))!,
          components: components({
            concepts: true,
            termRecall: true,
            clozeRecall: true,
            preparation: true,
          }),
        }),
        deps,
      );
      const exchange = await assembleExchange(db, result.book.draftEditionId!, {
        exportedAt: new Date().toISOString(),
      });
      const concept = exchange.conceptIntegration!.concepts[0];
      expect(concept.frozen!.entries.map((row) => row.payload.id)).toEqual(
        entries.map((row) => row.id),
      );
      expect(
        concept
          .frozen!.selection.filter((row) => row.entryId === entries[0].id)
          .map((row) => row.form),
      ).toEqual(["cloze"]);
      expect(concept.frozen!.entries[1]).toMatchObject({
        payload: { bQuestion: entries[1].bQuestion },
      });
      for (const { value } of before)
        expect(concept.body.definition).toContain(
          value.definition.replace(/[{}]/g, ""),
        );
      const student = createTextbookRenderModel(exchange, "student");
      const question = student.sections
        .flatMap((section) => section.blocks)
        .find(
          (block) => block.kind === "recall" && Boolean(block.questionRows),
        )!;
      expect(JSON.stringify(question)).toContain("몇 묶음인가요?");
      expect(JSON.stringify(question)).not.toContain("십 한 묶음이다");
      expect(JSON.stringify(question)).not.toContain("십 묶음 하나");
      const preparation = student.sections
        .flatMap((section) => section.blocks)
        .filter(
          (block) =>
            block.kind === "recall" &&
            block.semantic?.activity === "preparation",
        );
      expect(
        preparation.every(
          (block) => block.kind === "recall" && Boolean(block.questionRows),
        ),
      ).toBe(true);
      expect(JSON.stringify(preparation)).not.toContain("십 한 묶음이다");
      expect(preparation.length).toBeGreaterThan(0);
      const changed = structuredClone(exchange);
      const edited = changed.units
        .flatMap((unit) => unit.sections)
        .flatMap((section) => section.blocks)
        .find((block) => block.semantic?.node?.kind === "conceptQuestions")!;
      if (edited.semantic?.node?.kind !== "conceptQuestions")
        throw new Error("Missing question fixture");
      edited.semantic.node.questions[0].question.answer =
        "고정된 참고 답과 다른 내용";
      expect(
        validateTextbookReferences(changed).map((issue) => issue.code),
      ).toContain("QUESTION_FROZEN");
      const missingKey = seedKey(e3[1]);
      const missingEntries = conceptIndex.get(missingKey)!;
      conceptIndex.delete(missingKey);
      try {
        const practice = await createQuickTextbook(
          db,
          actor,
          input({
            components: components({ practice: true, learningGuide: true }),
          }),
          deps,
        );
        expect(practice.conceptCount).toBe(0);
        expect(practice.problemCount).toBeGreaterThan(0);
        await expect(
          createQuickTextbook(
            db,
            actor,
            input({
              components: components({ termRecall: true, learningGuide: true }),
            }),
            deps,
          ),
        ).rejects.toThrow("서로 다른 질문 판");
      } finally {
        conceptIndex.set(missingKey, missingEntries);
      }
    } finally {
      for (const { entry, value } of before) {
        for (const field of [
          "questionRevision",
          "bQuestion",
          "clozeQuestion",
          "questionExclusions",
        ] as const)
          delete entry[field];
        Object.assign(entry, value);
      }
    }
  });
  it("scopes the idempotency receipt to its authenticated owner", async () => {
    const body = input();
    const first = await createQuickTextbook(db, actor, body, deps);
    const otherActor = await insertTeacher(pg, { name: "다른 교사" });
    const second = await createQuickTextbook(db, otherActor, body, deps);
    expect(second.book.id).not.toBe(first.book.id);
    expect(second.book.ownerId).toBe(otherActor.id);
    expect(first.book.ownerId).toBe(actor.id);
  });
  it("replays exactly after source eligibility/figures change; reused id for new body conflicts", async () => {
    const body = input();
    const first = await createQuickTextbook(db, actor, body, deps);
    const before = await counts();
    const changedDeps = {
      ...deps,
      loadFigure: vi.fn(async () => {
        throw new Error("must not reread");
      }),
    };
    expect(await createQuickTextbook(db, actor, body, changedDeps)).toEqual(
      first,
    );
    expect(changedDeps.loadFigure).not.toHaveBeenCalled();
    expect(await counts()).toEqual(before);
    await expect(
      createQuickTextbook(db, actor, { ...body, title: "새 제목" }, deps),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("missing figures reduce the count to intact alternatives and replay the saved result", async () => {
    // Each section has eight eligible standard questions; the two with figures cannot be frozen.
    const body = input({ problemCountPerUnit: 8 });
    const result = await createQuickTextbook(db, actor, body, {
      ...deps,
      loadFigure: async () => null,
    });
    expect(result.problemCount).toBe(18);
    expect(
      result.warnings.filter((warning) =>
        warning.includes(
          "요청한 최대 8문항 중 출제 가능한 서로 다른 6문항을 넣었습니다.",
        ),
      ),
    ).toHaveLength(3);
    expect(
      result.warnings.filter((warning) =>
        warning.includes("그림 파일을 읽지 못했습니다"),
      ),
    ).toHaveLength(6);
    const exchange = await assembleExchange(db, result.book.draftEditionId!, {
      exportedAt: new Date().toISOString(),
    });
    expect(
      exchange.snapshots.every((s) => s.payload.figures.length === 0),
    ).toBe(true);
    const beforeReplay = await counts();
    expect(await createQuickTextbook(db, actor, body, deps)).toEqual(result);
    expect(await counts()).toEqual(beforeReplay);
  });
  it("capture exclusions are returned as warnings when enough intact alternatives exist", async () => {
    const result = await createQuickTextbook(db, actor, input(), {
      ...deps,
      loadFigure: async () => null,
    });
    expect(result.problemCount).toBe(6);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("late database write failure rolls back receipt, book, edition, assets, sections and snapshots", async () => {
    const before = await counts();
    const body = input();
    const failDb: TextbookDb = {
      ...db,
      transaction: (run) =>
        db.transaction((tx) =>
          run({
            ...tx,
            execute: async (sql, params) => {
              if (sql.includes('INSERT INTO "textbook_item"'))
                throw new Error("injected write failure");
              return tx.execute(sql, params);
            },
          } as TextbookSql),
        ),
    };
    await expect(
      createQuickTextbook(failDb, actor, body, deps),
    ).rejects.toThrow("injected write failure");
    expect(await counts()).toEqual(before);
    expect(
      (await createQuickTextbook(db, actor, body, deps)).problemCount,
    ).toBe(6);
  });
});

describe("quick create adapts to real bank availability", () => {
  const m2 = supportedSeeds.filter(
    (unit) => unit.grade === "중2" && quickCreateSemester(unit) === 1,
  );
  const scope = (start = 0, end = start) => ({
    schoolLevel: "middle" as const,
    grade: 2,
    semester: 1 as const,
    startUnitId: ids.get(seedKey(m2[start]))!,
    endUnitId: ids.get(seedKey(m2[end]))!,
  });

  it("creates all 28 components across eight middle-2 sections with no written candidates", async () => {
    // Per section, eight different standard questions: one recorded pair, one word problem and
    // five lone calculations. Nothing descriptive is eligible in the standard tier.
    for (const [index, unit] of m2.slice(0, 8).entries()) {
      const unitId = ids.get(seedKey(unit))!;
      await insertSourced(unitId, {
        ...equation(3 + index, 11 + 2 * index),
        familyKey: "mid:m2-one-step-equation",
      });
      await insertSourced(unitId, {
        ...equation(5 + index, 17 + 2 * index),
        familyKey: "mid:m2-one-step-equation",
      });
      await insertSourced(unitId, {
        content: `연필 한 자루의 값이 $${300 + 10 * index}$원일 때, 연필 $4$자루의 값을 구하시오.`,
        answer: `${4 * (300 + 10 * index)}원`,
        solution: `$${300 + 10 * index} \\times 4 = ${4 * (300 + 10 * index)}$ 이므로 $${4 * (300 + 10 * index)}$원이다.`,
        problemType: "활용",
        difficulty: "응용",
      });
      for (let k = 0; k < 5; k++)
        await insertSourced(unitId, {
          ...product(index + 2, k + 3),
          questionType: "단답형",
        });
      await insertSourced(unitId, {
        content: `$x + ${index + 1} = ${index + 9}$ 의 풀이 과정을 설명하시오.`,
        answer: "8",
        solution: `양변에서 $${index + 1}$ 을 뺀다.`,
        questionType: "서술형",
        reviewStatus: "pending",
      });
      await insertSourced(unitId, {
        content: `$x + ${index + 2} = ${index + 9}$ 의 풀이 과정을 설명하시오.`,
        answer: "7",
        solution: `양변에서 $${index + 2}$ 를 뺀다.`,
        questionType: "서술형",
        difficulty: "심화상",
      });
    }
    const all = Object.fromEntries(
      Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, true]),
    ) as QuickCreateComponents;
    const body = input({
      ...scope(0, 7),
      components: all,
      problemCountPerUnit: 8,
    });
    const result = await createQuickTextbook(db, actor, body, visualDeps);
    expect(result.problemCount).toBe(64);
    expect(result.conceptCount).toBe(8);
    expect(
      result.warnings.filter((warning) =>
        warning.includes("서술형 1문항 중 0문항을 넣었습니다."),
      ),
    ).toHaveLength(8);
    expect(
      result.warnings.filter((warning) => warning.includes("요청한 최대")),
    ).toEqual([]);
    const { blocks } = await saved(result);
    const rows = await placed(result.book.draftEditionId!);
    const byStage = (stage: string) =>
      rows.filter((row) => row.stage === stage);
    // Per section: the pair, one question for each other group, and the written share goes to
    // the first selected group that still has a different question.
    expect(byStage("written")).toHaveLength(0);
    expect(byStage("basic")).toHaveLength(0);
    expect(byStage("worked-example")).toHaveLength(8);
    expect(byStage("concept-check")).toHaveLength(24);
    expect(byStage("type-practice")).toHaveLength(8);
    expect(byStage("application")).toHaveLength(8);
    expect(byStage("cumulative-review")).toHaveLength(8);
    expect(byStage("unit-assessment")).toHaveLength(8);
    // A calculation is never relabelled as reasoning: only the recorded word problems qualify.
    expect(byStage("application").every((r) => r.problemType === "활용")).toBe(
      true,
    );
    for (const unit of m2.slice(0, 8)) {
      const inUnit = rows.filter(
        (row) => row.unitId === ids.get(seedKey(unit)),
      );
      expect(inUnit).toHaveLength(8);
      expect(new Set(inUnit.map((row) => row.content)).size).toBe(8);
    }
    const groups = exampleGroups(blocks);
    expect(groups).toHaveLength(8);
    for (const group of groups) {
      const example = rows.find((row) => row.itemId === group.example)!;
      const confirm = rows.find((row) => row.itemId === group.confirms[0])!;
      expect(group.confirms).toHaveLength(1);
      expect([example.stage, confirm.stage]).toEqual([
        "worked-example",
        "concept-check",
      ]);
      expect([example.familyKey, confirm.familyKey]).toEqual([
        "mid:m2-one-step-equation",
        "mid:m2-one-step-equation",
      ]);
      expect([
        confirm.problemType,
        confirm.difficulty,
        confirm.questionType,
        confirm.unitId,
      ]).toEqual([
        example.problemType,
        example.difficulty,
        example.questionType,
        example.unitId,
      ]);
      expect(confirm.content).not.toBe(example.content);
      expect(confirm.answer).not.toBe(example.answer);
      expect(example.solution?.trim()).toBeTruthy();
    }
    expect(
      blocks.some(
        (block) => block.kind === "text" && block.markdown === "### 서술형",
      ),
    ).toBe(false);
    expect(await createQuickTextbook(db, actor, body, visualDeps)).toEqual(
      result,
    );
    await assertPaginates(result);
    const catalog = await listQuickCreateUnits(db, {
      schoolLevel: "middle",
      grade: 2,
      semester: 1,
    });
    const first = catalog.units.find((unit) => unit.id === body.startUnitId)!;
    expect(first.availability?.standard).toEqual({ total: 8, written: 0 });
    // The word problem (응용) and the hardest written question.
    expect(first.availability?.challenge).toEqual({ total: 2, written: 1 });
  });

  it("keeps concepts in a section with zero eligible questions, with an honest count", async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        ...scope(8),
        problemCountPerUnit: 8,
        components: components({ concepts: true, practice: true }),
      }),
      deps,
    );
    expect(result.problemCount).toBe(0);
    expect(result.conceptCount).toBe(1);
    expect(result.warnings).toEqual([
      expect.stringContaining("유형 연습 8문항 중 0문항을 넣었습니다."),
      expect.stringContaining(
        "요청한 최대 8문항 중 출제 가능한 서로 다른 0문항을 넣었습니다.",
      ),
    ]);
    const { blocks } = await saved(result);
    expect(blocks.some((block) => block.kind === "concept")).toBe(true);
    expect(
      blocks.some(
        (block) => block.kind === "text" && block.markdown === "### 유형 연습",
      ),
    ).toBe(false);
  });

  it("rolls back an entirely empty problem-only request and can retry after bank availability changes", async () => {
    const body = input({
      ...scope(9),
      problemCountPerUnit: 8,
      components: components({ practice: true }),
    });
    const before = await counts();
    await expect(createQuickTextbook(db, actor, body, deps)).rejects.toThrow(
      "출제 가능한 문항이 없습니다",
    );
    expect(await counts()).toEqual(before);
    await insertBankProblem(pg, body.startUnitId, { questionType: "단답형" });
    const result = await createQuickTextbook(db, actor, body, deps);
    expect(result.problemCount).toBe(1);
    expect(result.warnings).toEqual([
      expect.stringContaining("유형 연습 8문항 중 1문항을 넣었습니다."),
      expect.stringContaining(
        "요청한 최대 8문항 중 출제 가능한 서로 다른 1문항을 넣었습니다.",
      ),
    ]);
  });

  it("written-only requests include only actual written questions and reduce the target", async () => {
    const unitId = ids.get(seedKey(m2[10]))!;
    // Three different short answers and two different written questions.
    for (let index = 0; index < 3; index++)
      await insertSourced(unitId, {
        ...product(index + 2, 7),
        questionType: "단답형",
      });
    for (let index = 0; index < 2; index++)
      await insertSourced(unitId, {
        content: `$x + ${index + 4} = 12$ 의 풀이 과정을 설명하시오.`,
        answer: String(8 - index),
        solution: `양변에서 $${index + 4}$ 를 빼면 $x = ${8 - index}$ 이다.`,
        questionType: "서술형",
      });
    // The same written question again: a repeat is not a third candidate.
    await insertSourced(unitId, {
      content: "$x + 4 = 12$ 의 풀이 과정을 설명하시오.",
      answer: "8",
      solution: "양변에서 $4$ 를 빼면 $x = 8$ 이다.",
      questionType: "서술형",
    });
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        ...scope(10),
        problemCountPerUnit: 8,
        components: components({ written: true }),
      }),
      deps,
    );
    expect(result.problemCount).toBe(2);
    expect(result.warnings).toEqual([
      expect.stringContaining("서술형 8문항 중 2문항을 넣었습니다."),
      expect.stringContaining(
        "요청한 최대 8문항 중 출제 가능한 서로 다른 2문항을 넣었습니다.",
      ),
    ]);
    const rows = await placed(result.book.draftEditionId!);
    expect(rows.map((row) => [row.stage, row.questionType, row.lines])).toEqual(
      [
        ["written", "서술형", 6],
        ["written", "서술형", 6],
      ],
    );
    expect(new Set(rows.map((row) => row.content)).size).toBe(2);
  });
});

describe("the pagination check refuses what it must not accept", () => {
  let model: QuickModel;
  let measurements: Measurement[];
  /** The book starts at the given page: an even start prints the spread, an odd one the single page. */
  const layoutFrom = (
    firstPhysicalPageIndex: number,
    sizes: Measurement[] = measurements,
  ) =>
    paginateTextbookSections(model.sections, sizes, model.config, {
      firstPhysicalPageIndex,
    });
  const introPart = (name: "left" | "right" | "single") =>
    model.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.unitIntroPart === name)!;
  const pageOf = (layout: QuickLayout, blockId: string) =>
    layout.pages.find((page) =>
      page.blocks.some((block) => block.blockId === blockId),
    )!;
  const faults = (
    layout: Pick<QuickLayout, "pages" | "issues">,
    sizes: Measurement[] = measurements,
  ) => paginationFaults(model, layout, sizes);

  beforeAll(async () => {
    const result = await createQuickTextbook(
      db,
      actor,
      input({
        components: components({
          unitIntro: true,
          practice: true,
          cover: false,
        }),
      }),
      visualDeps,
    );
    const exchange = await assembleExchange(db, result.book.draftEditionId!, {
      exportedAt: new Date().toISOString(),
    });
    model = createTextbookRenderModel(exchange, "student");
    measurements = mockMeasurements(model);
  });

  it("accepts the spread on an even start and the single page on an odd start", () => {
    const even = layoutFrom(2);
    expect(even.issues).toEqual([]);
    expect(pageOf(even, introPart("left").id).physicalPageIndex).toBe(2);
    expect(pageOf(even, introPart("right").id).physicalPageIndex).toBe(3);
    expect(faults(even)).toEqual([]);

    const odd = layoutFrom(1);
    expect(odd.issues.map((issue) => issue.code)).toEqual([
      "AUTO_INTRO_SINGLE_PAGE",
    ]);
    expect(pageOf(odd, introPart("single").id).physicalPageIndex).toBe(1);
    expect(faults(odd)).toEqual([]);
  });

  it("accepts the single page on an even start only when the measured spread does not fit", () => {
    // Two ways a measured spread does not fit: a part taller than the page, and a part whose
    // text was measured as not fitting its slot.
    for (const [side, unfit] of [
      ["left", { heightMm: 300 }],
      ["right", { introTextFits: false }],
    ] as const) {
      const sizes = measurements.map((m) =>
        m.blockId === introPart(side).id ? { ...m, ...unfit } : m,
      );
      const layout = layoutFrom(2, sizes);
      expect(pageOf(layout, introPart("single").id).physicalPageIndex).toBe(2);
      expect(layout.issues).toHaveLength(1);
      expect(layout.issues[0].message).not.toContain("홀수 시작 쪽");
      expect(faults(layout, sizes)).toEqual([]);
      // The same layout judged against measurements that do fit has no reason for one page.
      expect(faults(layout)).toEqual([
        expect.stringContaining("although its spread fits the even page 2"),
      ]);
    }
  });

  it("reports a block that is missing, placed twice, or unknown", () => {
    const sound = layoutFrom(2);
    const problem = model.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.kind === "problem")!;
    const home = sound.pages.findIndex((page) =>
      page.blocks.some((block) => block.blockId === problem.id),
    );
    const placement = sound.pages[home].blocks.find(
      (block) => block.blockId === problem.id,
    )!;

    const missing = structuredClone(sound);
    missing.pages[home].blocks = missing.pages[home].blocks.filter(
      (block) => block.blockId !== problem.id,
    );
    expect(faults(missing)).toEqual([`${problem.id} is not placed`]);

    const elsewhere = structuredClone(sound);
    elsewhere.pages[home === 0 ? 1 : 0].blocks.push(placement);
    expect(faults(elsewhere)).toEqual([`${problem.id} is placed 2 times`]);

    const samePage = structuredClone(sound);
    samePage.pages[home].blocks.push(placement);
    expect(faults(samePage)).toEqual([
      `${problem.id} is twice on page ${sound.pages[home].physicalPageIndex}`,
      `${problem.id} is placed 2 times`,
    ]);

    const unknown = structuredClone(sound);
    unknown.pages[home].blocks.push({ ...placement, blockId: "no-such-block" });
    expect(faults(unknown)).toEqual([
      `unknown block no-such-block on page ${sound.pages[home].physicalPageIndex}`,
    ]);
  });

  it("lets a section heading repeat on another page, but not on its own page", () => {
    const sound = layoutFrom(2);
    const heading = model.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.kind === "heading" && !block.unitIntroPart)!;
    const home = sound.pages.findIndex((page) =>
      page.blocks.some((block) => block.blockId === heading.id),
    );
    const placement = sound.pages[home].blocks.find(
      (block) => block.blockId === heading.id,
    )!;
    const repeated = structuredClone(sound);
    repeated.pages[home === 0 ? 1 : 0].blocks.push(placement);
    expect(faults(repeated)).toEqual([]);
    const doubled = structuredClone(sound);
    doubled.pages[home].blocks.push(placement);
    expect(faults(doubled)).toEqual([
      `${heading.id} is twice on page ${sound.pages[home].physicalPageIndex}`,
    ]);
  });

  it("reports an introduction that is neither exactly its spread nor exactly its single page", () => {
    const spread = layoutFrom(2);
    const single = layoutFrom(1);
    const singlePlacement = pageOf(single, introPart("single").id).blocks[0];

    // All three alternatives at once.
    const all = structuredClone(spread);
    all.pages[all.pages.length - 1].blocks.push(singlePlacement);
    expect(faults(all)).toEqual([
      expect.stringContaining("is placed as left×1 right×1 single×1"),
    ]);

    // Half a spread.
    const half = structuredClone(spread);
    const rightPage = half.pages.find((page) =>
      page.blocks.some((block) => block.blockId === introPart("right").id),
    )!;
    rightPage.blocks = [];
    expect(faults(half)).toEqual([
      expect.stringContaining("is placed as left×1 right×0 single×0"),
    ]);

    // No alternative at all.
    const none = structuredClone(single);
    none.pages = none.pages.filter(
      (page) =>
        !page.blocks.some((block) => block.blockId === introPart("single").id),
    );
    expect(faults(none)).toEqual([
      expect.stringContaining("is placed as left×0 right×0 single×0"),
      expect.stringContaining("single-page warning without a single page"),
    ]);

    // A spread that starts on an odd page.
    const shifted = structuredClone(spread);
    for (const page of shifted.pages) page.physicalPageIndex += 1;
    expect(faults(shifted)).toEqual([
      expect.stringContaining("spread is on pages 3 and 4"),
    ]);
  });

  it("reports a single-page warning that is absent, unearned, misstated or unrelated", () => {
    const spread = layoutFrom(2);
    const single = layoutFrom(1);
    const [warning] = single.issues;

    const silent = structuredClone(single);
    silent.issues = [];
    expect(faults(silent)).toEqual([
      expect.stringContaining("on one page has 0 warnings"),
    ]);

    const unearned = structuredClone(spread);
    unearned.issues = [warning];
    expect(faults(unearned)).toEqual([
      expect.stringContaining("single-page warning without a single page"),
    ]);

    const misstated = structuredClone(single);
    misstated.issues = [
      { ...warning, message: "두 쪽 도입의 측정 공간이 부족합니다." },
    ];
    expect(faults(misstated)).toEqual([
      expect.stringContaining("warning states the wrong reason"),
    ]);

    const elsewhere = structuredClone(single);
    elsewhere.issues = [
      { ...warning, path: ["units", "other-unit", "sections", "other"] },
    ];
    expect(faults(elsewhere)).toEqual([
      expect.stringContaining("on one page has 0 warnings"),
      expect.stringContaining("unexpected issue AUTO_INTRO_SINGLE_PAGE"),
    ]);

    for (const sound of [spread, single]) {
      const noisy = structuredClone(sound);
      noisy.issues = [
        ...noisy.issues,
        {
          code: "PAGE_BUDGET",
          severity: "warning",
          path: [],
          message: "쪽 수 예산을 넘었습니다.",
        },
      ];
      expect(faults(noisy)).toEqual([
        "unexpected issue PAGE_BUDGET: 쪽 수 예산을 넘었습니다.",
      ]);
    }
  });
});
