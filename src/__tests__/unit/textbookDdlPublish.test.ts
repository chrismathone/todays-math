// @vitest-environment node
/**
 * 교재 표 — 발행본의 불변 · 집계 revision · «상태 칸만 바꾼 발행» 거절 (PGlite, 실제 마이그레이션 사슬).
 *
 * 여기 시험은 **거절돼야 하는 문장을 실제로 던진다.** 통과해야 하는 길(발행 확정의 문장 차례 · 발행 → 종료)도 같이 본다 —
 * 전부 막는 트리거는 거절 시험만으로는 초록이다.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type Db,
  type World,
  TEXTBOOK_TABLES,
  draftWithContent,
  fakeHash,
  finalizePublish,
  insertBlob,
  insertBook,
  insertConcept,
  insertEdition,
  insertItem,
  insertQr,
  insertSection,
  insertSnapshot,
  openTextbookDb,
  publishedEdition,
  rejected,
  reservePublish,
  revisionOf,
  runSteps,
  seedWorld,
  sqlNow,
  statusOf,
  uuid,
} from "../helpers/textbookPglite";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await openTextbookDb();
  world = await seedWorld(db);
}, 120_000);
afterAll(async () => {
  await db.close();
});

describe("표 · RLS · 권한", () => {
  it("전용 표 20개가 생기고 그 밖의 textbook 표는 없다", async () => {
    const { rows } = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'textbook%' ORDER BY 1`,
    );
    expect(rows.map((r) => r.table_name)).toEqual([...TEXTBOOK_TABLES].sort());
  });

  it("20개 전부 RLS 가 켜져 있고 정책은 하나도 없다", async () => {
    const { rows } = await db.query<{ relname: string; on: boolean }>(
      `SELECT relname, relrowsecurity AS on FROM pg_class
        WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace AND relname LIKE 'textbook%'`,
    );
    expect(rows).toHaveLength(20);
    expect(rows.filter((r) => !r.on)).toEqual([]);
    const policies = await db.query(
      `SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'textbook%'`,
    );
    expect(policies.rows).toEqual([]);
  });

  it("anon · authenticated · PUBLIC 은 어느 표에도 권한이 없다 (기본 권한이 다 주어도 걷는다)", async () => {
    // 하네스가 «새 표는 anon · authenticated 에 다 준다»를 걸어 두었다 — 걷지 않았다면 여기 남는다
    const { rows } = await db.query<{ grantee: string; table_name: string }>(
      `SELECT grantee, table_name FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name LIKE 'textbook%'
          AND grantee IN ('anon', 'authenticated', 'PUBLIC')`,
    );
    expect(rows).toEqual([]);
    // 대조군: 하네스의 «새 표는 다 준다»가 살아 있다 — 지금 만든 표에 그 기본 권한이 실제로 붙는다(REVOKE 시험이 헛돌지 않는다).
    // 🔴 기존 표를 대조군으로 삼지 않는다 — `app_setting` 을 쓰다가, 그 표가 서버 전용이 된 날
    //    (2026-10-07 `…022000_app_setting_server_only`) 제품은 멀쩡한데 이 시험만 빨개졌다.
    await db.query(`CREATE TABLE "grant_control_probe" ("id" integer)`);
    try {
      const control = await db.query(
        `SELECT 1 FROM information_schema.role_table_grants
          WHERE table_schema = 'public' AND table_name = 'grant_control_probe' AND grantee = 'anon'`,
      );
      expect(control.rows.length).toBeGreaterThan(0);
    } finally {
      await db.query(`DROP TABLE "grant_control_probe"`);
    }
  });

  it("시각 기본값은 세션 시간대에 기대지 않는다 — 전부 UTC 로 적는다", async () => {
    const defaults = await db.query<{
      table_name: string;
      column_name: string;
      column_default: string;
    }>(
      `SELECT table_name, column_name, column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name LIKE 'textbook%'
          AND data_type LIKE 'timestamp%' AND column_default IS NOT NULL`,
    );
    expect(defaults.rows.length).toBeGreaterThanOrEqual(17);
    expect(
      defaults.rows.filter(
        (row) => !/AT TIME ZONE 'UTC'/i.test(row.column_default),
      ),
    ).toEqual([]);

    // 서울 시간대의 세션에서 기본값으로 넣어도 UTC 벽시계가 적힌다(9시간 밀리지 않는다)
    await db.query(`SET TIME ZONE 'Asia/Seoul'`);
    try {
      const { bookId } = await insertBook(db, world.userA);
      const { rows } = await db.query<{ drift: number }>(
        `SELECT abs(extract(epoch FROM ("created_at" - (now() AT TIME ZONE 'UTC'))))::float8 AS drift
           FROM "textbook" WHERE "id" = $1`,
        [bookId],
      );
      expect(rows[0]!.drift).toBeLessThan(60);
    } finally {
      await db.query(`SET TIME ZONE 'UTC'`);
    }
  });

  it("트리거 함수는 search_path 를 고정한다", async () => {
    const { rows } = await db.query<{
      proname: string;
      config: string[] | null;
    }>(
      `SELECT proname, proconfig AS config FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'textbook\\_%'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(16);
    expect(
      rows.filter((r) => !r.config?.some((c) => c.startsWith("search_path="))),
    ).toEqual([]);
  });
});

describe("초안은 책마다 하나", () => {
  it("같은 책에 둘째 초안을 넣지 못한다", async () => {
    const draft = await insertBook(db, world.userA);
    const error = await rejected(
      insertEdition(db, {
        bookId: draft.bookId,
        editionId: uuid(),
        userId: world.userA,
        ordinal: 2,
      }),
    );
    expect(error.code).toBe("23505");
    expect(error.message).toContain("textbook_edition_one_draft");
  });

  it("발행한 뒤에는 새 초안을 하나 더 만들 수 있다", async () => {
    const published = await publishedEdition(db, world);
    await insertEdition(db, {
      bookId: published.bookId,
      editionId: uuid(),
      userId: world.userA,
      ordinal: 2,
    });
    const { rows } = await db.query<{ status: string }>(
      `SELECT "status" FROM "textbook_edition" WHERE "textbook_id" = $1 ORDER BY "ordinal"`,
      [published.bookId],
    );
    expect(rows.map((r) => r.status)).toEqual(["published", "draft"]);
  });

  it("판본의 주인이 책의 주인과 다르면 넣지 못한다", async () => {
    const error = await rejected(
      insertBook(db, world.userA, { editionUserId: world.userB }),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain(
      "textbook_edition_textbook_id_user_id_fkey",
    );
  });
});

describe("집계 revision 은 DB 가 올린다", () => {
  it("자식을 쓴 문장마다 1씩 오른다 — 구획 · 배치 · 개념 · 자산 색인", async () => {
    const draft = await insertBook(db, world.userA);
    expect(await revisionOf(db, draft.editionId)).toBe(1);
    const sectionId = await insertSection(db, draft.editionId);
    expect(await revisionOf(db, draft.editionId)).toBe(2);
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: draft.editionId,
    });
    // 확정본은 판본 밖의 것이다 — 올리지 않는다
    expect(await revisionOf(db, draft.editionId)).toBe(2);
    const itemId = await insertItem(db, {
      editionId: draft.editionId,
      userId: world.userA,
      snapshotId: snapshot.id,
      sectionId,
    });
    expect(await revisionOf(db, draft.editionId)).toBe(3);
    await insertConcept(db, draft.editionId);
    expect(await revisionOf(db, draft.editionId)).toBe(4);
    await db.query(
      `UPDATE "textbook_item" SET "order_index" = 3 WHERE "id" = $1`,
      [itemId],
    );
    expect(await revisionOf(db, draft.editionId)).toBe(5);
    await db.query(`DELETE FROM "textbook_item" WHERE "id" = $1`, [itemId]);
    expect(await revisionOf(db, draft.editionId)).toBe(6);
  });

  it("CAS 가 빗나간 저장(0행)은 올리지 않는다", async () => {
    const draft = await insertBook(db, world.userA);
    const sectionId = await insertSection(db, draft.editionId);
    const before = await revisionOf(db, draft.editionId);
    const stale = await db.query(
      `UPDATE "textbook_section" SET "content" = '{"blocks": [1]}'::jsonb, "revision" = "revision" + 1
        WHERE "id" = $1 AND "revision" = 99`,
      [sectionId],
    );
    expect(stale.affectedRows).toBe(0);
    expect(await revisionOf(db, draft.editionId)).toBe(before);
  });

  it("revision 을 뒤로 돌리지 못한다", async () => {
    const draft = await insertBook(db, world.userA);
    await insertSection(db, draft.editionId);
    const error = await rejected(
      db.query(`UPDATE "textbook_edition" SET "revision" = 1 WHERE "id" = $1`, [
        draft.editionId,
      ]),
    );
    expect(error.message).toContain("revision cannot go backwards");
  });

  it("초안 판본을 지우면 자식이 같이 지워진다 (CASCADE 안에서 트리거가 막지 않는다)", async () => {
    const draft = await draftWithContent(db, world);
    await db.query(`DELETE FROM "textbook_edition" WHERE "id" = $1`, [
      draft.editionId,
    ]);
    for (const table of [
      "textbook_section",
      "textbook_item",
      "textbook_concept",
      "textbook_edition_asset",
    ]) {
      const { rows } = await db.query(
        `SELECT 1 FROM "${table}" WHERE "edition_id" = $1`,
        [draft.editionId],
      );
      expect(rows, table).toEqual([]);
    }
    // 확정본과 자산은 판본 밖의 것이라 남는다
    const kept = await db.query(
      `SELECT 1 FROM "textbook_problem_snapshot" WHERE "id" = $1`,
      [draft.snapshotId],
    );
    expect(kept.rows).toHaveLength(1);
  });

  it("QR 을 예약한 초안은 지워지지 않는다", async () => {
    const draft = await draftWithContent(db, world);
    await insertQr(db, { editionId: draft.editionId, itemId: draft.itemId });
    const error = await rejected(
      db.query(`DELETE FROM "textbook_edition" WHERE "id" = $1`, [
        draft.editionId,
      ]),
    );
    // RESTRICT 가 막으면 23001(restrict_violation)이다
    expect(error.code).toBe("23001");
    expect(error.message).toContain("textbook_qr_target");
    expect(await statusOf(db, draft.editionId)).toBe("draft");
  });
});

describe("발행 확정 — 통과하는 길", () => {
  it("자식을 먼저 쓰고 상태를 마지막에 바꾸면 발행된다", async () => {
    const published = await publishedEdition(db, world);
    expect(await statusOf(db, published.editionId)).toBe("published");
    const { rows } = await db.query<{ state: string }>(
      `SELECT "state" FROM "textbook_qr_target" WHERE "id" = $1`,
      [published.plan.qrId],
    );
    expect(rows[0]!.state).toBe("active");
    const request = await db.query<{ state: string }>(
      `SELECT "state" FROM "textbook_request" WHERE "request_id" = $1`,
      [published.plan.requestId],
    );
    expect(request.rows[0]!.state).toBe("done");
  });

  it("발행 → 종료는 된다. 종료 뒤에는 아무것도 못 바꾼다", async () => {
    const published = await publishedEdition(db, world);
    await db.query(
      `UPDATE "textbook_edition" SET "status" = 'retired', "retired_at" = $2, "updated_at" = $2 WHERE "id" = $1`,
      [published.editionId, sqlNow()],
    );
    expect(await statusOf(db, published.editionId)).toBe("retired");
    const back = await rejected(
      db.query(
        `UPDATE "textbook_edition" SET "status" = 'published', "retired_at" = NULL WHERE "id" = $1`,
        [published.editionId],
      ),
    );
    expect(back.message).toContain("retired edition");
    const again = await rejected(
      db.query(
        `UPDATE "textbook_edition" SET "retired_at" = $2 WHERE "id" = $1`,
        [published.editionId, "2030-01-01 00:00:00"],
      ),
    );
    expect(again.message).toContain("retired edition");
  });
});

describe("상태 칸만 바꿔서는 발행되지 않는다", () => {
  const flip = (editionId: string) =>
    db.query(
      `UPDATE "textbook_edition" SET "status" = 'published', "published_at" = $2, "manifest_hash" = $3 WHERE "id" = $1`,
      [editionId, sqlNow(), fakeHash(editionId)],
    );

  it("서버 발행 작업이 없으면 거절", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(flip(draft.editionId));
    expect(error.message).toContain("no completed server publish job");
    expect(await statusOf(db, draft.editionId)).toBe("draft");
  });

  it("조판 걸음이 하나라도 안 끝났으면 거절", async () => {
    const draft = await draftWithContent(db, world);
    await reservePublish(db, draft);
    const error = await rejected(flip(draft.editionId));
    expect(error.message).toContain("no completed server publish job");
  });

  it("걸음의 종류는 넷뿐이다 — 조판 · 합치기 · 펼침면 · 단일 HTML. 그 밖의 종류는 거절", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    const add = (idx: number, kind: string) =>
      db.query(
        `INSERT INTO "textbook_publish_step" ("user_id", "request_id", "idx", "kind", "view", "section_ids", "updated_at")
         VALUES ($1, $2, $3, $4, 'student', '[]'::jsonb, $5)`,
        [draft.userId, plan.requestId, idx, kind, sqlNow()],
      );
    for (const [at, kind] of ["render", "merge", "spread", "offline"].entries())
      await add(10 + at, kind);
    const error = await rejected(add(20, "upload"));
    expect(error.code).toBe("23514");
    expect(error.message).toContain("textbook_publish_step_kind_check");
    // 늘어난 걸음이 안 끝났으면 발행되지 않는다 — 종류가 무엇이든 «전부 끝»을 본다
    await runSteps(db, draft, plan);
    expect((await rejected(flip(draft.editionId))).message).toContain(
      "no completed server publish job",
    );
  });

  it("걸음이 없는 발행 요청으로는 거절", async () => {
    const draft = await draftWithContent(db, world);
    await db.query(
      `INSERT INTO "textbook_request" ("user_id", "request_id", "operation", "edition_id", "state", "base_revision", "body_hash", "updated_at")
       VALUES ($1, $2, 'publish', $3, 'open', 1, $4, $5)`,
      [world.userA, uuid(), draft.editionId, fakeHash("x"), sqlNow()],
    );
    const error = await rejected(flip(draft.editionId));
    expect(error.message).toContain("no completed server publish job");
  });

  it.each([
    ["artifacts", "missing published artifacts"],
    ["pages", "unlinked or unpaged"],
    ["qr", "reserved QR targets"],
    ["concept", "concepts that are not frozen"],
  ] as const)("확정에서 %s 를 빼면 거절", async (skip, message) => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    await runSteps(db, draft, plan);
    const error = await rejected(finalizePublish(db, draft, plan, [skip]));
    expect(error.message).toContain(message);
    // 트랜잭션이 통째로 되돌아간다 — 반쯤 발행된 판본이 남지 않는다
    expect(await statusOf(db, draft.editionId)).toBe("draft");
    const artifacts = await db.query(
      `SELECT 1 FROM "textbook_artifact" WHERE "edition_id" = $1`,
      [draft.editionId],
    );
    expect(artifacts.rows).toEqual([]);
  });

  it("연결 안 된 배치가 놓여 있으면 거절", async () => {
    const draft = await draftWithContent(db, world);
    const local = await insertSnapshot(db, {
      userId: world.userA,
      problem: null,
    });
    await insertItem(db, {
      editionId: draft.editionId,
      userId: world.userA,
      snapshotId: local.id,
      sectionId: draft.sectionId,
      linkStatus: "unlinked",
    });
    const plan = await reservePublish(db, draft);
    await runSteps(db, draft, plan);
    const error = await rejected(finalizePublish(db, draft, plan));
    expect(error.message).toContain("unlinked or unpaged");
  });

  it("초안을 곧장 종료로 보내지 못한다", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_edition" SET "status" = 'retired', "retired_at" = $2 WHERE "id" = $1`,
        [draft.editionId, sqlNow()],
      ),
    );
    expect(error.message).toContain("cannot be retired");
  });
});

describe("발행본과 그 자식은 못 고친다", () => {
  let published: Awaited<ReturnType<typeof publishedEdition>>;
  beforeAll(async () => {
    published = await publishedEdition(db, world);
  });

  const statements: Array<[string, () => Promise<unknown>]> = [
    [
      "구획 내용 UPDATE",
      () =>
        db.query(
          `UPDATE "textbook_section" SET "content" = '{"blocks": [1]}'::jsonb WHERE "id" = $1`,
          [published.sectionId],
        ),
    ],
    [
      "구획 DELETE",
      () =>
        db.query(`DELETE FROM "textbook_section" WHERE "id" = $1`, [
          published.sectionId,
        ]),
    ],
    ["구획 INSERT", () => insertSection(db, published.editionId)],
    [
      "배치 UPDATE",
      () =>
        db.query(
          `UPDATE "textbook_item" SET "layout" = '{"columnSpan": 2}'::jsonb WHERE "id" = $1`,
          [published.itemId],
        ),
    ],
    [
      "배치를 구획 밖으로",
      () =>
        db.query(
          `UPDATE "textbook_item" SET "section_id" = NULL WHERE "id" = $1`,
          [published.itemId],
        ),
    ],
    [
      "배치 INSERT",
      () =>
        insertItem(db, {
          editionId: published.editionId,
          userId: world.userA,
          snapshotId: published.snapshotId,
          sectionId: published.sectionId,
        }),
    ],
    [
      "개념 UPDATE",
      () =>
        db.query(
          `UPDATE "textbook_concept" SET "body" = '{"goal": "x"}'::jsonb WHERE "edition_id" = $1`,
          [published.editionId],
        ),
    ],
    [
      "개념의 굳은 내용 지우기",
      () =>
        db.query(
          `UPDATE "textbook_concept" SET "frozen" = NULL WHERE "edition_id" = $1`,
          [published.editionId],
        ),
    ],
    ["개념 INSERT", () => insertConcept(db, published.editionId)],
    [
      "자산 색인 DELETE",
      () =>
        db.query(
          `DELETE FROM "textbook_edition_asset" WHERE "edition_id" = $1`,
          [published.editionId],
        ),
    ],
    [
      "산출물 UPDATE",
      () =>
        db.query(
          `UPDATE "textbook_artifact" SET "page_count" = 99 WHERE "edition_id" = $1`,
          [published.editionId],
        ),
    ],
    [
      "산출물 DELETE",
      () =>
        db.query(`DELETE FROM "textbook_artifact" WHERE "edition_id" = $1`, [
          published.editionId,
        ]),
    ],
  ];

  it.each(statements)("%s 거절", async (_name, run) => {
    const before = await revisionOf(db, published.editionId);
    const error = await rejected(run());
    expect(error.code).toBe("23514");
    expect(error.message).toMatch(/textbook: edition .* is published/);
    expect(await revisionOf(db, published.editionId)).toBe(before);
  });

  it("산출물 INSERT 거절", async () => {
    const sha = await insertBlob(db, Buffer.from("late"));
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_artifact" ("id", "edition_id", "kind", "mime_type", "sha256", "byte_size")
         VALUES ($1, $2, 'mapping-csv', 'text/csv', $3, 4)`,
        [uuid(), published.editionId, sha],
      ),
    );
    expect(error.message).toMatch(/is published/);
  });

  it.each([
    ["config", `"config" = '{"title": "바꿈"}'::jsonb`],
    ["outline", `"outline" = '{"units": [1]}'::jsonb`],
    ["label", `"label" = '몰래'`],
    ["manifest_hash", `"manifest_hash" = '${"0".repeat(64)}'`],
    ["revision", `"revision" = "revision" + 1`],
    ["renderer_version", `"renderer_version" = 'r2'`],
    ["published_at", `"published_at" = '2030-01-01 00:00:00'`],
  ])("판본의 %s 를 못 바꾼다", async (_column, set) => {
    const error = await rejected(
      db.query(`UPDATE "textbook_edition" SET ${set} WHERE "id" = $1`, [
        published.editionId,
      ]),
    );
    expect(error.message).toContain("is immutable");
  });

  it("초안으로 되돌리지 못한다 · 지우지 못한다", async () => {
    const back = await rejected(
      db.query(
        `UPDATE "textbook_edition" SET "status" = 'draft', "published_at" = NULL, "manifest_hash" = NULL WHERE "id" = $1`,
        [published.editionId],
      ),
    );
    expect(back.message).toContain("is immutable");
    const gone = await rejected(
      db.query(`DELETE FROM "textbook_edition" WHERE "id" = $1`, [
        published.editionId,
      ]),
    );
    expect(gone.message).toContain("cannot be deleted");
  });

  it("자식을 다른 판본으로 옮기지 못한다 (초안끼리도)", async () => {
    const a = await draftWithContent(db, world);
    const b = await insertBook(db, world.userA);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_section" SET "edition_id" = $2 WHERE "id" = $1`,
        [a.sectionId, b.editionId],
      ),
    );
    expect(error.message).toContain("cannot move between editions");
  });
});

describe("저장과 발행 확정이 엇갈릴 때 (문장의 차례)", () => {
  it("예약 뒤에 저장이 끼어들면 확정이 낡은 revision 을 보고 멈춘다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    await runSteps(db, draft, plan);
    // 예약 · 조판은 집계 revision 을 건드리지 않는다
    expect(await revisionOf(db, draft.editionId)).toBe(plan.baseRevision);
    await db.query(
      `UPDATE "textbook_section" SET "content" = '{"blocks": [{"late": true}]}'::jsonb, "revision" = "revision" + 1 WHERE "id" = $1`,
      [draft.sectionId],
    );
    expect(await revisionOf(db, draft.editionId)).toBe(plan.baseRevision + 1);
    await expect(finalizePublish(db, draft, plan)).rejects.toThrow(
      "REVISION_MISMATCH",
    );
    expect(await statusOf(db, draft.editionId)).toBe("draft");
  });

  it("확정이 먼저 끝나면 뒤늦은 저장은 DB 에서 거절된다 — 조판한 PDF 와 다른 내용이 발행본에 남지 않는다", async () => {
    const published = await publishedEdition(db, world);
    const before = await db.query<{ content: unknown }>(
      `SELECT "content" FROM "textbook_section" WHERE "id" = $1`,
      [published.sectionId],
    );
    const error = await rejected(
      db.query(
        `UPDATE "textbook_section" SET "content" = '{"blocks": [{"late": true}]}'::jsonb, "revision" = "revision" + 1
          WHERE "id" = $1 AND "revision" = 1`,
        [published.sectionId],
      ),
    );
    expect(error.message).toMatch(/is published/);
    const after = await db.query<{ content: unknown }>(
      `SELECT "content" FROM "textbook_section" WHERE "id" = $1`,
      [published.sectionId],
    );
    expect(after.rows[0]!.content).toEqual(before.rows[0]!.content);
  });

  it("앱이 revision 을 안 올려도 확정은 그 저장을 본다 (올리는 것이 DB 다)", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    await runSteps(db, draft, plan);
    // 판본 행을 건드리지 않는 «버릇 나쁜» 저장 — 배치 하나의 풀이선만 바꾼다
    await db.query(
      `UPDATE "textbook_item" SET "layout" = '{"minWorkLines": 9}'::jsonb WHERE "id" = $1`,
      [draft.itemId],
    );
    await expect(finalizePublish(db, draft, plan)).rejects.toThrow(
      "REVISION_MISMATCH",
    );
  });
});
