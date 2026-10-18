// @vitest-environment node
/**
 * 성적표 확정 마이그레이션(`20261018150000_exam_report_confirmation`)의 불변식을 **실제 Postgres 엔진**(PGlite)에서 잰다.
 * 공유 DB 에는 발행본 · 채점 기록이 아직 0건이라 거기서는 트리거를 못 잰다 — 여기서 잰다.
 * 🔴 Supabase 와 같은 판 · 설정이 아니다. 공유 DB 드라이런은 `scripts/qa/apply-exam-report-migration.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fakeHash,
  openTextbookDb,
  rejected,
  seedWorld,
  uuid,
  type Db,
  type World,
} from "../helpers/textbookPglite";

let db: Db;
let world: World;
let unitId: string;

beforeAll(async () => {
  db = await openTextbookDb();
  world = await seedWorld(db);
  unitId = world.unitId;
}, 120_000);
afterAll(async () => {
  await db?.close();
});

async function chain() {
  const publication = uuid();
  const test = uuid();
  const result = uuid();
  await db.query(
    `INSERT INTO "exam_publication" (id, user_id, branch_id, document_id, source_revision, title, test_date, payload, content_hash, request_id)
     VALUES ($1, $2, $3, 'doc', 1, '10월 월말평가', '2026-10-24', '{}'::jsonb, $4, $5)`,
    [publication, world.userA, world.branchId, fakeHash(publication), uuid()],
  );
  await db.query(
    `INSERT INTO "test" (id, user_id, class_id, test_type, range_end_unit_id, test_date, publication_id)
     VALUES ($1, $2, $3, 'daily', $4, '2026-10-24', $5)`,
    [test, world.userA, world.classA, unitId, publication],
  );
  await db.query(
    `INSERT INTO "test_result" (id, test_id, student_id, score) VALUES ($1, $2, $3, 80)`,
    [result, test, world.studentA],
  );
  const report = uuid();
  await db.query(
    `INSERT INTO "exam_report_draft" (id, publication_id, test_id, student_id, user_id, branch_id, teacher_note)
     VALUES ($1, $2, $3, $4, $5, $6, '처음 문장')`,
    [report, publication, test, world.studentA, world.userA, world.branchId],
  );
  return { publication, test, result, report };
}

async function draft(id: string) {
  const { rows } = await db.query<{
    revision: number;
    state: string;
    confirmed_artifact_id: string | null;
  }>(
    `SELECT revision, state, confirmed_artifact_id FROM "exam_report_draft" WHERE id = $1`,
    [id],
  );
  return rows[0]!;
}

async function confirm(report: string, result: string, revision: number) {
  const artifact = uuid();
  await db.query(
    `INSERT INTO "exam_report_artifact" (id, report_id, revision, source_result_id, confirmed_by, layout_version, source_digest, snapshot, pdf_path, pdf_sha256, pdf_size)
     VALUES ($1, $2, $3, $4, $5, 'h1-v1', $6, '{}'::jsonb, $7, $8, 1234)`,
    [
      artifact,
      report,
      revision,
      result,
      world.userA,
      fakeHash(`d${artifact}`),
      `${report}/${artifact}.pdf`,
      fakeHash(`p${artifact}`),
    ],
  );
  await db.query(
    `UPDATE "exam_report_draft" SET state = 'confirmed', confirmed_artifact_id = $2 WHERE id = $1`,
    [report, artifact],
  );
  return artifact;
}

describe("성적표 확정 표", () => {
  it("문장을 고치면 새 판 · 초안이 되고 확정이 풀린다 — 확정 자체는 판을 올리지 않는다", async () => {
    const { report, result } = await chain();
    await db.query(
      `UPDATE "exam_report_draft" SET teacher_note = '고친 문장' WHERE id = $1`,
      [report],
    );
    expect(await draft(report)).toEqual({
      revision: 2,
      state: "draft",
      confirmed_artifact_id: null,
    });
    const artifact = await confirm(report, result, 2);
    expect(await draft(report)).toEqual({
      revision: 2,
      state: "confirmed",
      confirmed_artifact_id: artifact,
    });
    await db.query(
      `UPDATE "exam_report_draft" SET options = '{"format":"M1"}'::jsonb WHERE id = $1`,
      [report],
    );
    expect(await draft(report)).toEqual({
      revision: 3,
      state: "draft",
      confirmed_artifact_id: null,
    });
    // 옛 보관본은 이력으로 남는다
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "exam_report_artifact" WHERE report_id = $1`,
      [report],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("보관본은 고치거나 지울 수 없다", async () => {
    const { report, result } = await chain();
    const artifact = await confirm(report, result, 1);
    expect(
      (
        await rejected(
          db.query(
            `UPDATE "exam_report_artifact" SET pdf_size = 99 WHERE id = $1`,
            [artifact],
          ),
        )
      ).message,
    ).toContain("수정하거나 지울 수 없습니다");
    expect(
      (
        await rejected(
          db.query(`DELETE FROM "exam_report_artifact" WHERE id = $1`, [
            artifact,
          ]),
        )
      ).message,
    ).toContain("수정하거나 지울 수 없습니다");
  });

  it("다른 성적표의 보관본을 가리키거나, 보관본 없이 확정할 수 없다", async () => {
    const a = await chain();
    const b = await chain();
    const artifactA = await confirm(a.report, a.result, 1);
    expect(
      (
        await rejected(
          db.query(
            `UPDATE "exam_report_draft" SET state = 'confirmed', confirmed_artifact_id = $2 WHERE id = $1`,
            [b.report, artifactA],
          ),
        )
      ).message,
    ).toContain("exam_report_draft_confirmed_artifact_fkey");
    expect(
      (
        await rejected(
          db.query(
            `UPDATE "exam_report_draft" SET state = 'confirmed' WHERE id = $1`,
            [b.report],
          ),
        )
      ).message,
    ).toContain("exam_report_draft_confirmed_check");
  });

  it("같은 발행본 · 학생은 한 줄 · 같은 판 보관본은 하나 · 형식이 틀린 경로 · 긴 문장은 막는다", async () => {
    const { publication, test, report, result } = await chain();
    expect(
      (
        await rejected(
          db.query(
            `INSERT INTO "exam_report_draft" (publication_id, test_id, student_id, user_id) VALUES ($1, $2, $3, $4)`,
            [publication, test, world.studentA, world.userA],
          ),
        )
      ).message,
    ).toContain("exam_report_draft_publication_id_student_id_key");
    await confirm(report, result, 1);
    expect(
      (await rejected(confirm(report, result, 1))).message,
    ).toContain("exam_report_artifact_report_id_revision_key");
    expect(
      (
        await rejected(
          db.query(
            `INSERT INTO "exam_report_artifact" (report_id, revision, source_result_id, confirmed_by, layout_version, source_digest, snapshot, pdf_path, pdf_sha256, pdf_size)
             VALUES ($1, 9, $2, $3, 'v', $4, '{}'::jsonb, '../etc/passwd', $4, 10)`,
            [report, result, world.userA, fakeHash("x")],
          ),
        )
      ).message,
    ).toContain("exam_report_artifact_pdf_path_check");
    expect(
      (
        await rejected(
          db.query(
            `UPDATE "exam_report_draft" SET teacher_note = $2 WHERE id = $1`,
            [report, "가".repeat(1001)],
          ),
        )
      ).message,
    ).toContain("exam_report_draft_note_check");
  });

  it("성적표가 있는 학생은 지워지지 않는다 — 학생 삭제의 «기록이 있어 못 지움»과 같은 규칙", async () => {
    const { report } = await chain();
    expect(report).toBeTruthy();
    const { code } = await rejected(
      db.query(`DELETE FROM "student" WHERE id = $1`, [world.studentA]),
    );
    // ON DELETE RESTRICT 는 23001 — 학생 삭제 라우트의 isRetainedRelationError 가 «기록이 있어 못 지움»(409)으로 읽는다.
    expect(code).toBe("23001");
  });

  it("RLS 를 켜고 브라우저 역할의 권한을 걷었다", async () => {
    const { rows: rls } = await db.query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relname IN ('exam_report_draft','exam_report_artifact') AND relrowsecurity ORDER BY relname`,
    );
    expect(rls.map((r) => r.relname)).toEqual([
      "exam_report_artifact",
      "exam_report_draft",
    ]);
    const { rows: grants } = await db.query(
      `SELECT grantee FROM information_schema.role_table_grants
        WHERE table_name IN ('exam_report_draft','exam_report_artifact') AND grantee IN ('anon','authenticated','PUBLIC')`,
    );
    expect(grants).toEqual([]);
  });
});
