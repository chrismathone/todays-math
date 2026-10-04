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
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import { sha256 } from "@/lib/textbook/hash.server";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { openTextbookDb, type Db } from "../helpers/textbookPglite";
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
async function assertPaginates(
  result: Awaited<ReturnType<typeof createQuickTextbook>>,
) {
  const exchange = await assembleExchange(db, result.book.draftEditionId!, {
    exportedAt: new Date().toISOString(),
  });
  for (const variant of ["student", "answers"] as const) {
    const model = createTextbookRenderModel(exchange, variant);
    const measurements = model.sections.flatMap((section) =>
      section.blocks.map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(model.config, block),
        heightMm: block.kind === "heading" ? 16 : 75,
      })),
    );
    const layout = paginateTextbookSections(
      model.sections,
      measurements,
      model.config,
      { includeCover: model.config.print.coverMode === "included" },
    );
    expect(layout.pages.length).toBeGreaterThan(0);
    expect(layout.issues).toEqual([]);
    expect(
      layout.pages.flatMap((page) => page.blocks.map((block) => block.blockId)),
    ).toHaveLength(measurements.length);
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
  it("all components together and multiple chapter intros paginate without parity repair", async () => {
    const all = Object.fromEntries(
      Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, true]),
    ) as QuickCreateComponents;
    for (const cover of [false, true])
      await assertPaginates(
        await createQuickTextbook(
          db,
          actor,
          input({ components: { ...all, cover }, problemCountPerUnit: 5 }),
          visualDeps,
        ),
      );
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
    for (const stage of [
      "basic",
      "cumulative-review",
      "unit-assessment",
      "written",
    ])
      expect(rows.filter((r) => r.stage === stage)).toHaveLength(3);
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
      "learning-guide",
      "learning-plan",
      "question-log",
    ]);
    expect(
      sections.every((s) =>
        s.section.blocks.some(
          (b) => b.kind === "text" && b.markdown.length > 100,
        ),
      ),
    ).toBe(true);
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
    const body = input({ problemCountPerUnit: 4 });
    const result = await createQuickTextbook(db, actor, body, {
      ...deps,
      loadFigure: async () => null,
    });
    expect(result.problemCount).toBe(6);
    expect(
      result.warnings.filter((warning) => warning.includes("요청한 4문항")),
    ).toHaveLength(3);
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

  it("creates all 18 components across eight middle-2 sections with no written candidates", async () => {
    for (const unit of m2.slice(0, 8)) {
      const unitId = ids.get(seedKey(unit))!;
      for (let index = 0; index < 8; index++)
        await insertBankProblem(pg, unitId, {
          questionType: "단답형",
          difficulty: "기본",
        });
      await insertBankProblem(pg, unitId, {
        questionType: "서술형",
        reviewStatus: "pending",
      });
      await insertBankProblem(pg, unitId, {
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
        warning.includes("서술형 1문항 중 0문항"),
      ),
    ).toHaveLength(8);
    const { blocks } = await saved(result);
    const exchange = await assembleExchange(db, result.book.draftEditionId!, {
      exportedAt: new Date().toISOString(),
    });
    expect(
      exchange.items.filter((item) => item.learningStage === "written"),
    ).toHaveLength(0);
    expect(
      exchange.items.filter((item) => item.learningStage === "basic"),
    ).toHaveLength(16);
    expect(
      exchange.items.filter((item) => item.learningStage === "worked-example"),
    ).toHaveLength(16);
    expect(
      exchange.items.filter(
        (item) => item.learningStage === "cumulative-review",
      ),
    ).toHaveLength(16);
    expect(
      exchange.items.filter((item) => item.learningStage === "unit-assessment"),
    ).toHaveLength(16);
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
    expect(first.availability?.challenge).toEqual({ total: 1, written: 1 });
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
      expect.stringContaining("출제 가능한 0문항"),
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
    expect(result.warnings).toEqual([expect.stringContaining("요청한 8문항")]);
  });

  it("written-only requests include only actual written questions and reduce the target", async () => {
    const unitId = ids.get(seedKey(m2[10]))!;
    for (let index = 0; index < 3; index++)
      await insertBankProblem(pg, unitId, { questionType: "단답형" });
    for (let index = 0; index < 2; index++)
      await insertBankProblem(pg, unitId, { questionType: "서술형" });
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
      expect.stringContaining("출제 가능한 2문항"),
    ]);
    const exchange = await assembleExchange(db, result.book.draftEditionId!, {
      exportedAt: new Date().toISOString(),
    });
    expect(
      exchange.items.every((item) => item.learningStage === "written"),
    ).toBe(true);
  });
});
