// @vitest-environment node
/**
 * 적용기(`scripts/qa/apply-textbook-studio-migration.ts`)의 문장 분할 — `$$` 본문 · 따옴표 · 주석 안의 `;` 를 끊지 않는가.
 *
 * 적용기는 Prisma 로 한 문장씩 보낸다. 분할이 함수 본문을 반으로 자르면 적용이 중간에 죽고, 문장을 하나 흘리면
 * 조용히 «덜 적용된» DB 가 된다. 그래서 **통째로 적용한 DB 와 문장씩 적용한 DB 의 목록이 같은지**를 실제 엔진에서 견준다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { splitSqlStatements } from "../../../scripts/qa/textbook-sql-statements";
import {
  type Db,
  migrationDirs,
  openTextbookDb,
} from "../helpers/textbookPglite";

const TEXTBOOK = migrationDirs().filter((dir) => dir.includes("textbook"));
// 뒤늦게 추가된 교재 권한 변경도 선행 지점 제약을 거친 실제 순서에서 비교한다.
const APPLY = migrationDirs().filter(
  (dir) => dir >= TEXTBOOK[0]! && dir <= TEXTBOOK.at(-1)!,
);
// 이후 과목의 마이그레이션이 추가돼도 준비 DB는 첫 교재 마이그레이션 직전에서 멈춘다.
// 마지막 비교재 마이그레이션까지 열면 교재 DDL도 이미 적용되어 아래에서 중복 실행된다.
const BEFORE = migrationDirs()
  .filter((dir) => dir < TEXTBOOK[0]!)
  .at(-1)!;
const read = (dir: string) =>
  readFileSync(
    path.join(process.cwd(), "prisma", "migrations", dir, "migration.sql"),
    "utf8",
  ).replaceAll("\r", "");

describe("문장 분할", () => {
  it("달러 따옴표 · 글자 따옴표 · 주석 안의 세미콜론에서 끊지 않는다", () => {
    const sql = `
      -- 주석; 안의 세미콜론
      CREATE TABLE "a" ("x" TEXT DEFAULT 'semi;colon', "y" TEXT DEFAULT 'it''s;');
      /* 블록; 주석 */
      CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'a; b';
        RETURN NEW;
      END;
      $$;
      DO $body$ BEGIN PERFORM 1; END; $body$;
      COMMENT ON TABLE "a" IS 'x' ;
    `;
    const statements = splitSqlStatements(sql);
    expect(statements).toHaveLength(4);
    expect(statements[0]).toContain(`'semi;colon'`);
    expect(statements[0]).toContain(`'it''s;'`);
    expect(statements[1]).toMatch(/^CREATE FUNCTION[\s\S]*END;\s*\$\$$/);
    expect(statements[2]).toMatch(/^DO \$body\$[\s\S]*\$body\$$/);
    expect(statements.join("\n")).not.toContain("주석");
  });

  it("닫히지 않은 본문 · 따옴표는 조용히 넘기지 않고 던진다", () => {
    expect(() =>
      splitSqlStatements(`CREATE FUNCTION f() AS $$ BEGIN END;`),
    ).toThrow();
    expect(() => splitSqlStatements(`SELECT 'open`)).toThrow();
  });

  it("교재 마이그레이션을 문장으로 나눈다 — 함수 본문은 한 문장이다", () => {
    const studio = splitSqlStatements(read(TEXTBOOK[0]!));
    expect(studio.filter((s) => s.startsWith("CREATE TABLE"))).toHaveLength(20);
    expect(studio.filter((s) => s.startsWith("CREATE TRIGGER"))).toHaveLength(
      35,
    );
    const functions = studio.filter((s) => s.startsWith("CREATE FUNCTION"));
    expect(functions).toHaveLength(17);
    expect(functions.every((s) => s.endsWith("$$"))).toBe(true);
    expect(studio.filter((s) => s.startsWith("DO $$"))).toHaveLength(1);
  });
});

describe("문장씩 적용한 DB 는 통째로 적용한 DB 와 같다", () => {
  let whole: Db;
  let split: Db;

  beforeAll(async () => {
    whole = await openTextbookDb({ until: BEFORE });
    split = await openTextbookDb({ until: BEFORE });
    for (const dir of APPLY) {
      await whole.exec(read(dir));
      // 적용기와 같은 길: 한 트랜잭션 안에서 문장 하나씩
      await split.transaction(async (tx) => {
        for (const statement of splitSqlStatements(read(dir)))
          await tx.query(statement);
      });
    }
  }, 180_000);
  afterAll(async () => {
    await whole.close();
    await split.close();
  });

  const CATALOG: Record<string, string> = {
    columns: `SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns
               WHERE table_schema = 'public' ORDER BY 1, 2`,
    constraints: `SELECT conrelid::regclass::text AS t, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
                   WHERE connamespace = 'public'::regnamespace ORDER BY 1, 2`,
    indexes: `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`,
    triggers: `SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid) AS def FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                WHERE NOT t.tgisinternal ORDER BY 1, 2`,
    functions: `SELECT proname, md5(prosrc) AS body, proconfig::text AS config FROM pg_proc
                 WHERE pronamespace = 'public'::regnamespace ORDER BY 1, 2`,
    rls: `SELECT relname, relrowsecurity FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace ORDER BY 1`,
    grants: `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
              WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC') ORDER BY 1, 2, 3`,
  };

  it.each(Object.keys(CATALOG))("%s 가 같다", async (key) => {
    const [a, b] = [
      await whole.query(CATALOG[key]!),
      await split.query(CATALOG[key]!),
    ];
    expect(b.rows).toEqual(a.rows);
    expect(a.rows.length).toBeGreaterThan(0);
  });
});
