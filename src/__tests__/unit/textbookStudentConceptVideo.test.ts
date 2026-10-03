// @vitest-environment node
/** Runs the real lecture-reference SQL against the complete migration chain. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";
import { textbookConceptSchema } from "@/contracts/textbookConcept.contract";
import { textbookUnitSchema } from "@/contracts/textbookExchange.contract";
import { textbookStudentVideoSchema } from "@/contracts/textbookStudent.contract";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
} from "@/lib/concept-blank/exactPick";
import { conceptContentHash } from "@/lib/textbook/hash.server";
import type { StudentQrTarget } from "@/lib/textbook/studentAccess";
import { studentConceptVideo } from "@/lib/textbook/studentConceptVideo";
import {
  type Db,
  type World,
  draftWithContent,
  finalizePublish,
  openTextbookDb,
  reservePublish,
  runSteps,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import { pgliteTextbookDb } from "../helpers/textbookServerWorld";

let pg: Db;
let world: World;
let other: World;
beforeAll(async () => {
  pg = await openTextbookDb();
  world = await seedWorld(pg);
  other = await seedWorld(pg);
}, 120_000);
afterAll(async () => {
  await pg?.close();
});

type Ref = { lectureId: string; conceptKey?: string };
async function publishedConcept(
  refs: Ref[],
  options: { unitId?: string | null; otherUnitRefs?: Ref[] } = {},
) {
  const draft = await draftWithContent(pg, world);
  const sectionKey = (
    await pg.query<{ section_key: string }>(
      `SELECT "section_key" FROM "textbook_section" WHERE "id" = $1::uuid`,
      [draft.sectionId],
    )
  ).rows[0]!.section_key;
  const blankSectionKey = "중2::유리수와 순환소수::순환소수";
  const concept = textbookConceptSchema.parse({
    conceptKey: draft.conceptKey,
    unitKey: "u1",
    sectionKey,
    title: "순환소수",
    kind: "정의",
    unitId: options.unitId === undefined ? world.unitId : options.unitId,
    body: {
      goal: "순환소수를 설명한다",
      prerequisites: [],
      definition: "고정된 교재 정의",
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: {
      contentHash: "0".repeat(64),
      parserVersion: EXACT_PARSER_VERSION,
      compositionVersion: EXACT_COMPOSITION_VERSION,
      mappingVersion: "1",
      sections: [
        { blankSectionKey, title: "순환소수", unitLabel: "유리수와 순환소수" },
      ],
      entries: [
        {
          entryKind: "concept",
          payload: {
            id: "lecture-frozen-entry",
            section: blankSectionKey,
            term: "순환소수",
            kind: "정의",
            level: "하",
            definition: "일정한 숫자가 {되풀이}되는 소수입니다.",
          },
        },
      ],
      selection: [
        {
          blankSectionKey,
          entryKind: "concept",
          entryId: "lecture-frozen-entry",
          form: "term",
          level: "하",
        },
      ],
      assetHashes: [],
    },
  });
  concept.frozen!.contentHash = conceptContentHash(concept);
  const unit = (unitKey: string, entries: Ref[]) =>
    textbookUnitSchema.parse({
      unitKey,
      title: "개념 단원",
      sourceUnitIds: [world.unitId],
      prerequisites: [],
      goals: [],
      conceptLectureRefs: entries.map((entry) => ({
        lectureId: entry.lectureId,
        conceptKey: entry.conceptKey ?? concept.conceptKey,
      })),
      sections: [],
    });
  await pg.query(
    `UPDATE "textbook_edition" SET "outline" = $2::jsonb WHERE "id" = $1::uuid`,
    [
      draft.editionId,
      JSON.stringify({
        units: [
          unit("u1", refs),
          ...(options.otherUnitRefs ? [unit("u2", options.otherUnitRefs)] : []),
        ],
      }),
    ],
  );
  await pg.query(
    `UPDATE "textbook_concept" SET "unit_id" = $3::uuid, "body" = $4::jsonb, "mapping_version" = '1', "frozen" = $5::jsonb WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text`,
    [
      draft.editionId,
      concept.conceptKey,
      concept.unitId,
      JSON.stringify(concept.body),
      JSON.stringify(concept.frozen),
    ],
  );
  const plan = await reservePublish(pg, draft);
  await runSteps(pg, draft, plan);
  await finalizePublish(pg, draft, plan, ["concept"]);
  const target: StudentQrTarget = {
    qrTargetId: randomUUID(),
    slug: "concept-video-reference-123",
    kind: "concept",
    editionId: draft.editionId,
    ownerId: draft.userId,
    itemId: null,
    snapshotId: null,
    conceptKey: concept.conceptKey,
    sectionId: draft.sectionId,
  };
  return { ...draft, concept, target };
}

async function lecture(
  input: {
    status?: ConceptLectureStatus;
    url?: string | null;
    unitId?: string;
    sortOrder?: number;
  } = {},
) {
  const id = randomUUID();
  await pg.query(
    `INSERT INTO "concept_lecture" ("id", "unit_id", "title", "video_url", "seconds", "sort_order", "status", "disclosure", "source_job_id", "reviewed_at", "created_by_id", "updated_at")
    VALUES ($1::uuid, $2::uuid, '강의 제목', $3::text, 120, $4::int, $5::concept_lecture_status, 'PRIVATE_DISCLOSURE_CANARY', $6::text, $7, $8::uuid, $7)`,
    [
      id,
      input.unitId ?? world.unitId,
      input.url === undefined
        ? "https://www.youtube.com/watch?v=abcdefghijk"
        : input.url,
      input.sortOrder ?? 0,
      input.status ?? "published",
      `PRIVATE_JOB_CANARY-${id}`,
      sqlNow(),
      world.userA,
    ],
  );
  return id;
}

const read = (book: Awaited<ReturnType<typeof publishedConcept>>) =>
  studentConceptVideo(pgliteTextbookDb(pg), book.target, book.concept);
const preparing = {
  state: "preparing",
  providerVideoId: null,
  startSeconds: 0,
  endSeconds: null,
};

describe("교재 개념 영상의 발행본 참조 — 실제 SQL", () => {
  it("없는 참조·초안·보관본·잘못된 URL을 건너뛰고 저장한 순서의 첫 게시 영상을 고른다", async () => {
    const draft = await lecture({ status: "draft", url: null });
    const archived = await lecture({ status: "archived" });
    const invalid = await lecture({
      url: "https://other.example.test/watch?v=abcdefghijk",
    });
    const first = await lecture({
      url: "https://www.youtube.com/watch?v=first000001",
      sortOrder: 900,
    });
    const second = await lecture({
      url: "https://www.youtube.com/watch?v=second00001",
      sortOrder: 0,
    });
    const book = await publishedConcept(
      [randomUUID(), draft, archived, invalid, first, second].map(
        (lectureId) => ({ lectureId }),
      ),
    );
    expect(await read(book)).toEqual({
      state: "ready",
      providerVideoId: "first000001",
      startSeconds: 0,
      endSeconds: null,
    });
  });

  it.each(["unit", "concept", "unreferenced", "edition"] as const)(
    "같은 DB 단원이어도 %s 경계 밖 강의는 자동 연결하지 않는다",
    async (scope) => {
      const id = await lecture();
      const book = await publishedConcept(
        scope === "concept"
          ? [{ lectureId: id, conceptKey: "different-concept" }]
          : [],
        scope === "unit" ? { otherUnitRefs: [{ lectureId: id }] } : {},
      );
      if (scope === "edition")
        await publishedConcept([
          { lectureId: id, conceptKey: book.concept.conceptKey },
        ]);
      expect(await read(book)).toEqual(preparing);
    },
  );

  it("검증된 개념에 DB unitId가 있으면 다른 DB 단원의 명시 참조도 건너뛴다", async () => {
    const wrong = await lecture({
      unitId: other.unitId,
      url: "https://www.youtube.com/watch?v=wrong000001",
    });
    const right = await lecture({
      url: "https://www.youtube.com/watch?v=right000001",
    });
    const onlyWrong = await publishedConcept([{ lectureId: wrong }]);
    expect(await read(onlyWrong)).toEqual(preparing);
    const book = await publishedConcept([
      { lectureId: wrong },
      { lectureId: right },
    ]);
    expect(await read(book)).toMatchObject({
      state: "ready",
      providerVideoId: "right000001",
    });
  });

  it("DB unitId가 없는 개념도 정확한 판본·단원·개념 참조가 있으면 예습을 제공한다", async () => {
    const id = await lecture({ unitId: other.unitId });
    const book = await publishedConcept([{ lectureId: id }], { unitId: null });
    expect(await read(book)).toMatchObject({
      state: "ready",
      providerVideoId: "abcdefghijk",
    });
  });

  it.each([
    { status: "draft" as const, url: null, state: "preparing" },
    {
      status: "archived" as const,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      state: "withdrawn",
    },
    {
      status: "published" as const,
      url: "javascript:alert(1)",
      state: "preparing",
    },
    {
      status: "published" as const,
      url: "https://youtube.com/@channel?v=abcdefghijk",
      state: "preparing",
    },
    {
      status: "published" as const,
      url: "https://youtube.com.evil.test/watch?v=abcdefghijk",
      state: "preparing",
    },
  ])(
    "$status / $url은 ID를 숨기고 $state을 반환한다",
    async ({ status, url, state }) => {
      const book = await publishedConcept([
        { lectureId: await lecture({ status, url }) },
      ]);
      expect(await read(book)).toEqual({
        state,
        providerVideoId: null,
        startSeconds: 0,
        endSeconds: null,
      });
    },
  );

  it("강의가 보관되면 같은 불변 참조로 다시 읽어도 더 이상 게시 ID를 제공하지 않는다", async () => {
    const id = await lecture();
    const book = await publishedConcept([{ lectureId: id }]);
    const outlineBefore = (
      await pg.query(
        `SELECT "outline" FROM "textbook_edition" WHERE "id" = $1::uuid`,
        [book.editionId],
      )
    ).rows;
    expect(await read(book)).toMatchObject({ state: "ready" });
    await pg.query(
      `UPDATE "concept_lecture" SET "status" = 'archived' WHERE "id" = $1::uuid`,
      [id],
    );
    expect(await read(book)).toEqual({
      state: "withdrawn",
      providerVideoId: null,
      startSeconds: 0,
      endSeconds: null,
    });
    expect(
      (
        await pg.query(
          `SELECT "outline" FROM "textbook_edition" WHERE "id" = $1::uuid`,
          [book.editionId],
        )
      ).rows,
    ).toEqual(outlineBefore);
  });

  it("학생 DTO에는 재생 ID만 담고 교사 메타데이터·시청 진도는 읽기만으로 만들거나 바꾸지 않는다", async () => {
    const id = await lecture();
    const book = await publishedConcept([{ lectureId: id }]);
    await pg.query(
      `INSERT INTO "concept_lecture_view" ("student_id", "lecture_id", "max_seconds", "percent", "updated_at") VALUES ($1::uuid, $2::uuid, 17, 14, $3)`,
      [world.studentA, id, sqlNow()],
    );
    const before = (
      await pg.query(
        `SELECT * FROM "concept_lecture_view" ORDER BY "student_id", "lecture_id"`,
      )
    ).rows;
    const srsBefore = (
      await pg.query(`SELECT * FROM "student_srs_state" ORDER BY "student_id"`)
    ).rows;
    const sql = pgliteTextbookDb(pg);
    const execute = vi.fn(async () => {
      throw new Error("Preview reads must not write");
    });
    const dto = await studentConceptVideo(
      { query: sql.query, execute },
      book.target,
      book.concept,
    );
    textbookStudentVideoSchema.parse(dto);
    expect(dto).toEqual({
      state: "ready",
      providerVideoId: "abcdefghijk",
      startSeconds: 0,
      endSeconds: null,
    });
    expect(JSON.stringify(dto)).not.toMatch(
      /PRIVATE_|disclosure|sourceJobId|reviewedAt|watch|completed|percent|videoUrl/,
    );
    expect(
      await studentConceptVideo(
        { query: sql.query, execute },
        book.target,
        book.concept,
      ),
    ).toEqual(dto);
    expect(
      (
        await pg.query(
          `SELECT * FROM "concept_lecture_view" ORDER BY "student_id", "lecture_id"`,
        )
      ).rows,
    ).toEqual(before);
    expect(
      (
        await pg.query(
          `SELECT * FROM "student_srs_state" ORDER BY "student_id"`,
        )
      ).rows,
    ).toEqual(srsBefore);
    expect(execute).not.toHaveBeenCalled();
  });
});
