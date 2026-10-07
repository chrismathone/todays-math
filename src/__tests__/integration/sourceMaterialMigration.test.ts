// @vitest-environment node
/**
 * 출처 «교과서» · 출처 책/자료 표 · 차시의 학기 칸(D-161) — 마이그레이션 셋과 적용 도구를 **실제 Postgres 엔진**(PGlite)에서 잰다.
 *
 * 공유 DB 에 대기 전에 여기서 먼저 돈다: 저장소의 마이그레이션을 처음부터 차례로 올린 DB 에, 적용 도구
 * (`scripts/qa/apply-source-material-migration.ts`)가 공유 DB 에서 하는 그대로 — 한 트랜잭션에 셋을 적용하고,
 * 학기를 채우고, 확인하고, 탐침을 넣어 본다.
 *
 * 🔴 Supabase 와 같은 판 · 설정이 아니다(도우미 머리말). «공유 DB 드라이런을 했다»는 뜻이 아니다 — 그것은 도구가 따로 한다.
 * 🔴 PGlite 는 연결이 하나다 — 잠금을 쥔 동안 앱이 기다리는 시간은 여기서 못 잰다.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { buildUnitCodePrefixes } from "@/lib/problemCode";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  applyAll,
  check,
  checkPrecondition,
  loadMigrationFiles,
  MIGRATIONS,
  revertPlan,
  snapshot,
  type Tx,
} from "../../../scripts/qa/apply-source-material-migration";
import {
  migrationDirs,
  openTextbookDb,
  rejected,
  uuid,
  type Db,
} from "../helpers/textbookPglite";

/** 도구가 Prisma 트랜잭션에 하는 두 가지를 PGlite 로 */
function asTx(db: Db): Tx {
  return {
    $queryRawUnsafe: (async (sql: string, ...params: unknown[]) =>
      (await db.query(sql, params)).rows) as Tx["$queryRawUnsafe"],
    $executeRawUnsafe: (async (sql: string, ...params: unknown[]) =>
      (await db.query(sql, params)).affectedRows ??
      0) as Tx["$executeRawUnsafe"],
  };
}

const now = () => new Date().toISOString().replace("T", " ").replace("Z", "");
const quiet = () => {};

/** 이 셋이 올라가기 **직전**까지의 DB + 교육과정 시드 전부 + 문항 둘(엔진 꼴 · 문제집 꼴) */
async function openBefore(): Promise<{
  db: Db;
  unitId: string;
  manualId: string;
  workbookId: string;
}> {
  const before = migrationDirs()
    .filter((dir) => dir < MIGRATIONS[0])
    .at(-1)!;
  const db = await openTextbookDb({ until: before });
  // 도우미는 파일을 바로 올려서 기록 표가 없다 — Prisma 가 만드는 꼴 그대로 세운다
  await db.exec(`CREATE TABLE "_prisma_migrations" (
    id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz,
    migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
    started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)`);
  const units = buildUnitCodePrefixes(CURRICULUM_UNITS);
  let unitId = "";
  for (const unit of units) {
    const id = uuid();
    if (unit.grade === "중2" && !unitId) unitId = id;
    await db.query(
      `INSERT INTO "unit" ("id", "grade", "chapter", "section", "order_index", "problem_code_prefix") VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        unit.prefix,
      ],
    );
  }
  const insert = async (source: string) => {
    const id = uuid();
    await db.query(
      `INSERT INTO "problem" ("id", "unit_id", "source", "difficulty", "problem_type", "content", "answer", "updated_at")
       VALUES ($1, $2, $3::"problem_source", '기본', '계산', '$1+1$ 의 값을 구하시오.', '$2$', $4)`,
      [id, unitId, source, now()],
    );
    return id;
  };
  return {
    db,
    unitId,
    manualId: await insert("manual"),
    workbookId: await insert("transformed"),
  };
}

describe("출처 책 · 자료 마이그레이션 — 적용 도구가 하는 그대로", () => {
  it("드라이런: 한 트랜잭션에서 적용 · 확인 · 탐침을 다 하고 ROLLBACK 하면 아무것도 남지 않는다", async () => {
    const { db } = await openBefore();
    const tx = asTx(db);
    const files = loadMigrationFiles(quiet);
    await checkPrecondition(tx, quiet);

    const lines: string[] = [];
    await db.exec("BEGIN");
    const before = await snapshot(tx);
    await applyAll(tx, files, quiet);
    await check(tx, before, (line) => lines.push(line));
    await db.exec("ROLLBACK");

    // 확인 줄이 실제로 돌았다(하나도 안 돌고 초록이면 안 된다)
    expect(
      lines.some(
        (line) => line.includes("⑼ 탐침") && line.includes("어긋남 0"),
      ),
    ).toBe(true);
    expect(
      lines.filter((line) => line.includes("✓")).length,
    ).toBeGreaterThanOrEqual(12);
    // 되돌린 뒤 — 앞 조건이 다시 통과한다(값 · 표 · 칸 · 기록이 없다)
    await checkPrecondition(tx, quiet);
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[])`,
      [[...MIGRATIONS]],
    );
    expect(rows[0]!.n).toBe(0);
  }, 120_000);

  describe("적용한 뒤", () => {
    let db: Db;
    let unitId: string;
    let manualId: string;
    const bookId = uuid();
    const materialId = uuid();

    beforeAll(async () => {
      const opened = await openBefore();
      db = opened.db;
      unitId = opened.unitId;
      manualId = opened.manualId;
      const tx = asTx(db);
      await db.exec("BEGIN");
      const before = await snapshot(tx);
      await applyAll(tx, loadMigrationFiles(quiet), quiet);
      await check(tx, before, quiet);
      await db.exec("COMMIT");
      await db.query(
        `INSERT INTO "source_book" (id, external_key, kind, publisher, author, title, grade, curriculum, updated_at)
         VALUES ($1, '2022/천재교육/중2/김동재', 'school_textbook', '천재교육', '김동재', '중학 수학2', '중2', '2022', $2)`,
        [bookId, now()],
      );
      await db.query(
        `INSERT INTO "source_material" (id, external_key, book_id, kind, kind_raw, title, chapter_no, middle_no, section_no, unit_raw, sequence, updated_at)
         VALUES ($1, 'tb-0123456789abcdef', $2, '형성평가', '형성평가', '중_수학2(김동재)_형성평가_1-1-1_1회_문제', 1, 1, 1, '유리수와 순환소수', 1, $3)`,
        [materialId, bookId, now()],
      );
    }, 120_000);

    it("기록 셋이 남는다", async () => {
      const { rows } = await db.query<{ migration_name: string }>(
        `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[]) ORDER BY 1`,
        [[...MIGRATIONS]],
      );
      expect(rows.map((row) => row.migration_name)).toEqual([...MIGRATIONS]);
    });

    it("교과서 문항을 자료에 묶어 넣을 수 있고, 문항 코드도 받는다", async () => {
      const id = uuid();
      const { rows } = await db.query<{ problem_code: string; source: string }>(
        `INSERT INTO "problem" ("id", "unit_id", "source", "difficulty", "problem_type", "content", "answer", "source_material_id", "updated_at")
         VALUES ($1, $2, 'school_textbook', '기본', '계산', '$\\frac{1}{3}$ 을 소수로 나타내시오.', '$0.\\dot{3}$', $3, $4)
         RETURNING "problem_code", "source"::text AS source`,
        [id, unitId, materialId, now()],
      );
      expect(rows[0]!.source).toBe("school_textbook");
      expect(rows[0]!.problem_code).toMatch(/^[A-Z0-9]+-[A-Z]\d{2}-\d{3}$/);
    });

    it("엔진 · 자작 문항에는 자료를 못 붙인다 — 출처가 둘이 되지 않게", async () => {
      const failure = await rejected(
        db.query(`UPDATE "problem" SET source_material_id = $1 WHERE id = $2`, [
          materialId,
          manualId,
        ]),
      );
      expect(failure.message).toContain(
        "problem_source_material_matches_source",
      );
    });

    it("문항이 묶인 자료 · 자료가 딸린 책은 못 지운다", async () => {
      expect(
        (
          await rejected(
            db.query(`DELETE FROM "source_material" WHERE id = $1`, [
              materialId,
            ]),
          )
        ).message,
      ).toContain("problem_source_material_id_fkey");
      expect(
        (
          await rejected(
            db.query(`DELETE FROM "source_book" WHERE id = $1`, [bookId]),
          )
        ).message,
      ).toContain("source_material_book_id_fkey");
    });

    it("브라우저 역할(anon · authenticated)은 새 표를 못 읽는다", async () => {
      for (const role of ["anon", "authenticated"]) {
        for (const table of ["source_book", "source_material"]) {
          await db.exec(`SET ROLE ${role}`);
          const failure = await rejected(
            db.query(`SELECT count(*) FROM "${table}"`),
          ).finally(() => db.exec("RESET ROLE"));
          expect(failure.message, `${role} · ${table}`).toMatch(
            /permission denied/,
          );
        }
      }
    });

    it("차시의 학기가 시드 전부에 규칙대로 들어갔다", async () => {
      const { rows } = await db.query<{
        grade: string;
        s1: number;
        s2: number;
        unknown: number;
      }>(
        `SELECT grade, count(*) FILTER (WHERE semester = 1)::int AS s1, count(*) FILTER (WHERE semester = 2)::int AS s2,
                count(*) FILTER (WHERE semester IS NULL)::int AS unknown FROM "unit" GROUP BY grade`,
      );
      const by = new Map(rows.map((row) => [row.grade, row]));
      expect(by.get("중1")).toMatchObject({ unknown: 0 });
      expect(by.get("중1")!.s1).toBeGreaterThan(0);
      expect(by.get("중1")!.s2).toBeGreaterThan(0);
      expect(by.get("공통수학1")).toMatchObject({ s2: 0, unknown: 0 });
      expect(by.get("공통수학2")).toMatchObject({ s1: 0, unknown: 0 });
      expect(by.get("대수")).toMatchObject({ s1: 0, s2: 0 });
      const { rows: first } = await db.query<{ semester: number }>(
        `SELECT semester FROM "unit" WHERE grade = '중1' AND chapter = '5. 기본 도형' LIMIT 1`,
      );
      expect(first[0]!.semester).toBe(2);
    });

    it("되돌리기는 교과서 문항이 있으면 멈추고, 책 · 자료만 있으면 --drop-rows 를 요구한다", async () => {
      const tx = asTx(db);
      await expect(revertPlan(tx, true, quiet)).rejects.toThrow(
        /문항부터 따로 정리/,
      );
      await db.exec(
        `DELETE FROM "problem" WHERE source::text = 'school_textbook'`,
      );
      await expect(revertPlan(tx, false, quiet)).rejects.toThrow(/--drop-rows/);
      const statements = await revertPlan(tx, true, quiet);
      await db.exec("BEGIN");
      for (const statement of statements) await db.query(statement);
      await db.exec("COMMIT");
      const { rows } = await db.query<{
        book: boolean;
        column: boolean;
        semester: boolean;
      }>(
        `SELECT to_regclass('public.source_book') IS NOT NULL AS book,
                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'problem' AND column_name = 'source_material_id') AS column,
                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit' AND column_name = 'semester') AS semester`,
      );
      expect(rows[0]).toEqual({ book: false, column: false, semester: false });
      // 되돌린 뒤 다시 적용할 수 있다 — enum 값은 남아 있지만(못 뺀다) 그것만으로는 막지 않는다
      await checkPrecondition(tx, quiet);
      await db.exec("BEGIN");
      const before = await snapshot(tx);
      await applyAll(tx, loadMigrationFiles(quiet), quiet);
      await check(tx, before, quiet);
      await db.exec("COMMIT");
    }, 120_000);
  });

  it("파일 그대로(여러 문장을 한 번에) 올려도 같은 꼴이다 — 새 DB 가 마이그레이션 사슬로 서는 길", async () => {
    const db = await openTextbookDb();
    const { rows } = await db.query<{
      value: boolean;
      material: boolean;
      semester: boolean;
    }>(
      `SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'problem_source' AND e.enumlabel = 'school_textbook') AS value,
              to_regclass('public.source_material') IS NOT NULL AS material,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit' AND column_name = 'semester') AS semester`,
    );
    expect(rows[0]).toEqual({ value: true, material: true, semester: true });
  }, 120_000);
});
