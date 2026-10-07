/**
 * 출처 «교과서» · 출처 책/자료 표 · 차시의 학기 칸을 적용한다 (D-161 · 원장님 2026-10-07
 * «근본 해결로 진행할것» · «supabase sql은 적용할거 있으면 npx나 cli 로 적용시켜»).
 *
 *   npx tsx --env-file=.env scripts/qa/apply-source-material-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/qa/apply-source-material-migration.ts --apply
 *
 * 마이그레이션 셋을 **차례대로 한 트랜잭션에** 적용한다:
 *   ① 20261007130000_problem_source_school_textbook — `problem_source` 에 `school_textbook`
 *   ② 20261007130100_source_book_material           — `source_book` · `source_material` · `problem.source_material_id`
 *   ③ 20261007130200_unit_semester                  — `unit.semester` (값은 이 스크립트가 `semesterOfUnit` 으로 채운다)
 *
 * 순서: DB 먼저 · 코드 나중(24번 문서 §6.1). 셋 다 **더하기만** 하므로 옛 코드는 모른 채 돈다. 거꾸로면
 *    새 코드가 `problem.source_material_id` · `unit.semester` 를 불러 문제은행 · 출제가 전부 500 이다(P2022).
 * 🔴 그 뒤에도 순서가 하나 더 있다 — **교과서 문항은 새 코드가 배포된 뒤에 넣는다.** `school_textbook` 을 모르는
 *    옛 Prisma 클라이언트는 그 값을 가진 행을 읽다 죽는다. 이 스크립트는 문항을 넣지 않는다.
 * 본뜬 것: `apply-english-set-meta-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓰고(다른 트랙의 미적용
 * 초안까지 같이 적용한다) **이 셋만** 적용해 `_prisma_migrations` 에 같은 방식으로 기록한다.
 *
 * 무엇을 확인하나:
 *   ⑴ 앞 조건 — 값 · 표 · 칸이 아직 없다 · 기록도 없다
 *   ⑵ enum — `school_textbook` 이 `problem_source` 에 있다
 *   ⑶ 새 표 둘 — 칸의 이름 · 형 · NULL 허용
 *   ⑷ `problem.source_material_id` — uuid · NULL 허용 · 색인 · 외래 키(지울 때 RESTRICT)
 *   ⑸ CHECK 아홉 — 이름과 정의문
 *   ⑹ 권한 — 새 표 둘에 RLS 가 켜져 있고 anon · authenticated 는 아무것도 못 한다
 *   ⑺ 🔴 기존 행 무변경 — 문항 · 차시의 행 수 · 출처별 수가 같고, 새 칸은 전부 NULL(문항)
 *   ⑻ 차시의 학기 — 학년마다 1 · 2 · NULL 의 수. 규칙이 정하는 학년에 NULL 이 0
 *   ⑼ 탐침 — 나쁜 값이 **실제로 거절되는가**(세이브포인트 안에서 넣어 보고 전부 되돌린다 — 가려진 제약은
 *      한 번도 울지 않는다, 20번 문서 2026-10-02)
 *
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. 표 · 칸 · 기록을 지운다.
 *   교과서 문항이나 책 · 자료가 한 줄이라도 있으면 멈춘다(`--drop-rows` 를 줘도 **문항은 안 지운다** — 문항부터 따로 정리).
 *   🔴 enum 값 `school_textbook` 은 못 뺀다(PostgreSQL 에 DROP VALUE 가 없다) — 쓰는 행이 0 이면 해가 없다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { semesterOfUnit } from "../../src/lib/curriculum/unitSemester";
import { isDirectScript } from "../import/isDirectScript";

export const MIGRATIONS = [
  "20261007130000_problem_source_school_textbook",
  "20261007130100_source_book_material",
  "20261007130200_unit_semester",
] as const;
const ENUM_VALUE = "school_textbook";

const BOOK_COLUMNS: Record<string, [string, "YES" | "NO"]> = {
  id: ["uuid", "NO"],
  external_key: ["character varying", "NO"],
  kind: ["character varying", "NO"],
  publisher: ["character varying", "NO"],
  author: ["character varying", "YES"],
  title: ["character varying", "NO"],
  grade: ["character varying", "NO"],
  curriculum: ["character varying", "NO"],
  created_at: ["timestamp without time zone", "NO"],
  updated_at: ["timestamp without time zone", "NO"],
};
const MATERIAL_COLUMNS: Record<string, [string, "YES" | "NO"]> = {
  id: ["uuid", "NO"],
  external_key: ["character varying", "NO"],
  book_id: ["uuid", "NO"],
  kind: ["character varying", "NO"],
  kind_raw: ["character varying", "NO"],
  title: ["character varying", "NO"],
  chapter_no: ["smallint", "YES"],
  middle_no: ["smallint", "YES"],
  section_no: ["smallint", "YES"],
  unit_raw: ["character varying", "YES"],
  semester: ["smallint", "YES"],
  round: ["character varying", "YES"],
  level_raw: ["character varying", "YES"],
  sequence: ["smallint", "YES"],
  source_file: ["character varying", "YES"],
  created_at: ["timestamp without time zone", "NO"],
  updated_at: ["timestamp without time zone", "NO"],
};
/** 표 · 제약 이름 · 정의문에 있어야 할 조각 */
const CHECKS: Array<[string, string, RegExp]> = [
  ["source_book", "source_book_kind_valid", /school_textbook[\s\S]*workbook/],
  ["source_book", "source_book_curriculum_year", /\^\[0-9\]\{4\}\$/],
  ["source_book", "source_book_text_not_blank", /btrim/],
  ["source_material", "source_material_semester_valid", /semester IS NULL/],
  ["source_material", "source_material_round_valid", /중간[\s\S]*기말/],
  [
    "source_material",
    "source_material_numbers_valid",
    /chapter_no IS NOT NULL[\s\S]*middle_no IS NOT NULL/,
  ],
  ["source_material", "source_material_text_not_blank", /btrim/],
  [
    "problem",
    "problem_source_material_matches_source",
    /source_material_id IS NULL[\s\S]*school_textbook[\s\S]*transformed/,
  ],
  ["unit", "unit_semester_valid", /semester IS NULL/],
];
/** `semesterOfUnit` 이 반드시 정하는 학년 — 여기에 NULL 이 남으면 규칙이 그 DB 의 단원 이름을 못 읽은 것이다 */
const DECIDED_GRADES = [
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "공통수학1",
  "공통수학2",
];

const REVERT_SQL = [
  `ALTER TABLE "problem" DROP CONSTRAINT IF EXISTS "problem_source_material_matches_source"`,
  `ALTER TABLE "problem" DROP CONSTRAINT IF EXISTS "problem_source_material_id_fkey"`,
  `DROP INDEX IF EXISTS "problem_source_material_id_idx"`,
  `ALTER TABLE "problem" DROP COLUMN IF EXISTS "source_material_id"`,
  `DROP TABLE IF EXISTS "source_material"`,
  `DROP TABLE IF EXISTS "source_book"`,
  `ALTER TABLE "unit" DROP CONSTRAINT IF EXISTS "unit_semester_valid"`,
  `ALTER TABLE "unit" DROP COLUMN IF EXISTS "semester"`,
  `DELETE FROM "_prisma_migrations" WHERE migration_name IN (${MIGRATIONS.map((m) => `'${m}'`).join(", ")})`,
];

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const DROP_ROWS = process.argv.includes("--drop-rows");

/** 문장을 돌릴 수 있는 것 — 진짜 DB 의 트랜잭션이든, 시험의 메모리 Postgres 든. */
export type Tx = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;
export type Log = (line: string) => void;

/** Prisma 체크섬 = 마이그레이션 파일에서 CR 을 뺀 뒤 sha256 */
function prismaChecksum(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");
}

/** 주석 줄을 빼고 `;` 로 가른다 — `$$ … $$` 안의 `;` 에서는 가르지 않는다. */
export function splitStatements(sql: string): string[] {
  const body = sql
    .replaceAll("\r", "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  for (let i = 0; i < body.length; i += 1) {
    if (body.startsWith("$$", i)) {
      inDollar = !inDollar;
      current += "$$";
      i += 1;
      continue;
    }
    if (body[i] === ";" && !inDollar) {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += body[i];
  }
  if (inDollar) throw new Error("$$ 가 닫히지 않았다");
  if (current.trim()) statements.push(current.trim());
  return statements;
}

class DryRun extends Error {}

async function one<T>(tx: Tx, sql: string, ...params: unknown[]): Promise<T> {
  const rows = (await tx.$queryRawUnsafe(sql, ...params)) as T[];
  return rows[0];
}

async function tableExists(tx: Tx, name: string): Promise<boolean> {
  return (
    await one<{ found: boolean }>(
      tx,
      `SELECT to_regclass($1) IS NOT NULL AS found`,
      `public.${name}`,
    )
  ).found;
}

async function columnExists(
  tx: Tx,
  table: string,
  column: string,
): Promise<boolean> {
  return (
    await one<{ found: boolean }>(
      tx,
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS found`,
      table,
      column,
    )
  ).found;
}

async function enumHasValue(tx: Tx): Promise<boolean> {
  return (
    await one<{ found: boolean }>(
      tx,
      `SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'problem_source' AND e.enumlabel = $1) AS found`,
      ENUM_VALUE,
    )
  ).found;
}

export type Snapshot = { problems: number; units: number; bySource: string };

export async function snapshot(tx: Tx): Promise<Snapshot> {
  const { n: problems } = await one<{ n: number }>(
    tx,
    `SELECT count(*)::int AS n FROM "problem"`,
  );
  const { n: units } = await one<{ n: number }>(
    tx,
    `SELECT count(*)::int AS n FROM "unit"`,
  );
  const rows = (await tx.$queryRawUnsafe(
    `SELECT source::text AS source, count(*)::int AS n FROM "problem" GROUP BY 1 ORDER BY 1`,
  )) as Array<{ source: string; n: number }>;
  return {
    problems,
    units,
    bySource: rows.map((r) => `${r.source} ${r.n}`).join(" · "),
  };
}

async function recorded(tx: Tx): Promise<string[]> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[])`,
    [...MIGRATIONS],
  )) as Array<{ migration_name: string }>;
  return rows.map((r) => r.migration_name);
}

/** ⑴ 앞 조건 */
export async function checkPrecondition(
  tx: Tx,
  log: Log = console.log,
): Promise<void> {
  const state = {
    enum: await enumHasValue(tx),
    book: await tableExists(tx, "source_book"),
    material: await tableExists(tx, "source_material"),
    problemColumn: await columnExists(tx, "problem", "source_material_id"),
    unitColumn: await columnExists(tx, "unit", "semester"),
  };
  log(`  ⑴ 앞 조건 — ${JSON.stringify(state)}`);
  // enum 값만 있는 것은 «되돌린 뒤»의 정상 꼴이다(값은 못 뺀다) — 그것만으로는 막지 않는다
  const present = Object.entries(state).filter(
    ([name, has]) => has && name !== "enum",
  );
  if (present.length > 0)
    throw new Error(
      `이미 있는 것이 있다(${present.map(([name]) => name).join(", ")}) — 기록 없이 누가 만들었는지 먼저 확인할 것`,
    );
}

async function checkColumns(
  tx: Tx,
  table: string,
  expected: Record<string, [string, "YES" | "NO"]>,
  log: Log,
) {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    table,
  )) as Array<{ column_name: string; data_type: string; is_nullable: string }>;
  const got = new Map(
    rows.map((r) => [r.column_name, [r.data_type, r.is_nullable] as const]),
  );
  const wrong: string[] = [];
  for (const [name, [type, nullable]] of Object.entries(expected)) {
    const have = got.get(name);
    if (!have) wrong.push(`${name} 없음`);
    else if (have[0] !== type || have[1] !== nullable)
      wrong.push(`${name} ${have[0]}/${have[1]}`);
  }
  for (const name of got.keys())
    if (!(name in expected)) wrong.push(`${name} 예상 밖`);
  log(
    `  ⑶ ${table} — ${rows.length}칸${wrong.length ? ` · 어긋남: ${wrong.join(", ")}` : " · 이름 · 형 · NULL 허용 모두 맞음"}`,
  );
  if (wrong.length) throw new Error(`${table} 의 칸이 기대와 다르다`);
}

/** 세이브포인트 안에서 한 문장을 돌려 보고 되돌린다. 거절됐으면 그 오류 글을, 통과했으면 null 을 돌려준다. */
async function probe(tx: Tx, statements: string[]): Promise<string | null> {
  await tx.$executeRawUnsafe(`SAVEPOINT probe`);
  let rejected: string | null = null;
  try {
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  } catch (error) {
    rejected = String((error as { message?: string }).message ?? error);
  }
  await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT probe`);
  await tx.$executeRawUnsafe(`RELEASE SAVEPOINT probe`);
  return rejected;
}

const BOOK = (
  id: string,
  kind: string,
  curriculum: string,
  publisher = "탐침",
) =>
  `INSERT INTO "source_book" (id, external_key, kind, publisher, title, grade, curriculum, updated_at)
   VALUES ('${id}', 'probe/${id}', '${kind}', '${publisher}', '탐침', '중1', '${curriculum}', now())`;
const MATERIAL = (
  id: string,
  bookId: string,
  extra: Record<string, string | number> = {},
) => {
  const columns = Object.keys(extra);
  return `INSERT INTO "source_material" (id, external_key, book_id, kind, kind_raw, title, updated_at${columns.map((c) => `, ${c}`).join("")})
   VALUES ('${id}', 'probe/${id}', '${bookId}', '탐침', '탐침', '탐침', now()${columns
     .map(
       (c) => `, ${typeof extra[c] === "number" ? extra[c] : `'${extra[c]}'`}`,
     )
     .join("")})`;
};
const B1 = "00000000-0000-4000-8000-0000000000b1";
const M1 = "00000000-0000-4000-8000-0000000000a1";

/** ⑼ 나쁜 값이 실제로 거절되는가 — 전부 세이브포인트 안이라 한 줄도 남지 않는다 */
async function probes(tx: Tx, log: Log): Promise<void> {
  const cases: Array<{
    name: string;
    statements: string[];
    expect: RegExp | null;
  }> = [
    {
      name: "바른 책 · 자료는 들어간다",
      statements: [
        BOOK(B1, "school_textbook", "2022"),
        MATERIAL(M1, B1, {
          chapter_no: 1,
          middle_no: 2,
          section_no: 3,
          semester: 1,
          round: "중간",
          sequence: 1,
        }),
      ],
      expect: null,
    },
    {
      name: "책의 갈래가 둘 밖이면 거절",
      statements: [BOOK(B1, "textbook", "2022")],
      expect: /source_book_kind_valid/,
    },
    {
      name: "교육과정이 연도 네 자리가 아니면 거절",
      statements: [BOOK(B1, "workbook", "22개정")],
      expect: /source_book_curriculum_year/,
    },
    {
      name: "출판사가 빈 글자면 거절",
      statements: [BOOK(B1, "workbook", "2022", " ")],
      expect: /source_book_text_not_blank/,
    },
    {
      name: "같은 열쇠의 책은 두 번 못 넣는다",
      statements: [
        BOOK(B1, "workbook", "2022"),
        BOOK(B1.replace(/b1$/, "b2"), "workbook", "2022").replace(
          `probe/${B1.replace(/b1$/, "b2")}`,
          `probe/${B1}`,
        ),
      ],
      expect: /source_book_external_key_key|23505/,
    }, // Prisma 는 겹침 오류에 제약 이름 대신 SQLSTATE 만 싣는다
    {
      name: "자료의 학기가 3 이면 거절",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1, { semester: 3 }),
      ],
      expect: /source_material_semester_valid/,
    },
    {
      name: "자료의 회차가 «중간 · 기말» 밖이면 거절",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1, { round: "모의" }),
      ],
      expect: /source_material_round_valid/,
    },
    {
      name: "중단원 없이 소단원 번호만 있으면 거절",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1, { chapter_no: 1, section_no: 2 }),
      ],
      expect: /source_material_numbers_valid/,
    },
    {
      name: "없는 책을 가리키는 자료는 거절",
      statements: [MATERIAL(M1, B1)],
      expect: /source_material_book_id_fkey/,
    },
    {
      name: "자료가 딸린 책은 못 지운다",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1),
        `DELETE FROM "source_book" WHERE id = '${B1}'`,
      ],
      expect: /source_material_book_id_fkey/,
    },
    {
      name: "차시의 학기가 3 이면 거절",
      statements: [
        `UPDATE "unit" SET semester = 3 WHERE id = (SELECT id FROM "unit" ORDER BY order_index LIMIT 1)`,
      ],
      expect: /unit_semester_valid/,
    },
    {
      name: "엔진 · 자작 문항에는 자료를 못 붙인다",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1),
        `UPDATE "problem" SET source_material_id = '${M1}' WHERE id = (SELECT id FROM "problem" WHERE source = 'manual' LIMIT 1)`,
      ],
      expect: /problem_source_material_matches_source/,
    },
    {
      name: "문항이 묶인 자료는 못 지운다",
      statements: [
        BOOK(B1, "workbook", "2022"),
        MATERIAL(M1, B1),
        `UPDATE "problem" SET source_material_id = '${M1}' WHERE id = (SELECT id FROM "problem" WHERE source = 'transformed' LIMIT 1)`,
        `DELETE FROM "source_material" WHERE id = '${M1}'`,
      ],
      expect: /problem_source_material_id_fkey/,
    },
  ];
  const { n: transformed } = await one<{ n: number }>(
    tx,
    `SELECT count(*)::int AS n FROM "problem" WHERE source = 'transformed'`,
  );
  let failed = 0;
  for (const c of cases) {
    if (c.name === "문항이 묶인 자료는 못 지운다" && transformed === 0) {
      log(`     – ${c.name}: 건너뜀(문제집 문항이 없어 묶어 볼 행이 없다)`);
      continue;
    }
    const rejected = await probe(tx, c.statements);
    const ok =
      c.expect === null
        ? rejected === null
        : rejected !== null && c.expect.test(rejected);
    if (!ok) failed += 1;
    log(
      `     ${ok ? "✓" : "✗"} ${c.name}${ok ? "" : ` — ${rejected === null ? "통과해 버렸다" : rejected.slice(0, 200)}`}`,
    );
  }
  const left = await one<{ n: number }>(
    tx,
    `SELECT (SELECT count(*) FROM "source_book")::int + (SELECT count(*) FROM "source_material")::int AS n`,
  );
  log(`  ⑼ 탐침 ${cases.length}개 · 어긋남 ${failed} · 남은 탐침 행 ${left.n}`);
  if (failed > 0 || left.n !== 0) throw new Error("탐침이 기대와 다르다");
}

/** ③ 뒤 — 차시의 학기를 채운다. 돌려주는 것은 (학년, 대단원) 묶음의 수. */
export async function backfillSemesters(tx: Tx): Promise<number> {
  const groups = (await tx.$queryRawUnsafe(
    `SELECT DISTINCT grade, chapter FROM "unit"`,
  )) as Array<{ grade: string; chapter: string }>;
  const decided = groups
    .map((group) => ({
      ...group,
      semester: semesterOfUnit(group.grade, group.chapter),
    }))
    .filter(
      (group): group is { grade: string; chapter: string; semester: 1 | 2 } =>
        group.semester !== null,
    );
  if (decided.length === 0) return 0;
  // 한 문장으로 — `unit` 잠금을 쥔 채 묶음마다 왕복하지 않게
  await tx.$executeRawUnsafe(
    `UPDATE "unit" u SET semester = v.semester
       FROM unnest($1::text[], $2::text[], $3::smallint[]) AS v(grade, chapter, semester)
      WHERE u.grade = v.grade AND u.chapter = v.chapter`,
    decided.map((g) => g.grade),
    decided.map((g) => g.chapter),
    decided.map((g) => g.semester),
  );
  return decided.length;
}

/** ⑵~⑼ — 적용한 트랜잭션 안에서 */
export async function check(
  tx: Tx,
  before: Snapshot,
  log: Log = console.log,
): Promise<void> {
  const hasValue = await enumHasValue(tx);
  log(
    `  ⑵ enum problem_source 에 ${ENUM_VALUE} — ${hasValue ? "있다" : "없다"}`,
  );
  if (!hasValue) throw new Error("enum 값이 안 들어갔다");

  await checkColumns(tx, "source_book", BOOK_COLUMNS, log);
  await checkColumns(tx, "source_material", MATERIAL_COLUMNS, log);

  const column = await one<
    { data_type: string; is_nullable: string } | undefined
  >(
    tx,
    `SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'problem' AND column_name = 'source_material_id'`,
  );
  const index = await one<{ indexdef: string } | undefined>(
    tx,
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'problem_source_material_id_idx'`,
  );
  const fk = await one<{ def: string } | undefined>(
    tx,
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'problem_source_material_id_fkey'`,
  );
  log(
    `  ⑷ problem.source_material_id — ${column ? `${column.data_type}/${column.is_nullable}` : "없다"} · 색인 ${index ? "있음" : "없음"} · ${fk?.def ?? "외래 키 없음"}`,
  );
  if (
    !column ||
    column.data_type !== "uuid" ||
    column.is_nullable !== "YES" ||
    !index ||
    !fk ||
    !/ON DELETE RESTRICT/.test(fk.def)
  )
    throw new Error("problem.source_material_id 가 기대와 다르다");

  let badChecks = 0;
  for (const [table, name, pattern] of CHECKS) {
    const row = await one<{ def: string } | undefined>(
      tx,
      `SELECT pg_get_constraintdef(k.oid) AS def FROM pg_constraint k
        WHERE k.conrelid = $1::regclass AND k.conname = $2 AND k.contype = 'c'`,
      `public.${table}`,
      name,
    );
    if (!row || !pattern.test(row.def)) {
      badChecks += 1;
      log(`     ✗ ${name} — ${row?.def ?? "없다"}`);
    }
  }
  log(`  ⑸ CHECK ${CHECKS.length}개 · 어긋남 ${badChecks}`);
  if (badChecks > 0) throw new Error("CHECK 가 기대와 다르다");

  const rls = (await tx.$queryRawUnsafe(
    `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('source_book', 'source_material') ORDER BY 1`,
  )) as Array<{ relname: string; relrowsecurity: boolean }>;
  const grants = (await tx.$queryRawUnsafe(
    `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name IN ('source_book', 'source_material') AND grantee IN ('anon', 'authenticated', 'PUBLIC')`,
  )) as Array<{ grantee: string; table_name: string; privilege_type: string }>;
  log(
    `  ⑹ RLS ${rls.map((r) => `${r.relname}=${r.relrowsecurity}`).join(" · ")} · anon/authenticated/PUBLIC 권한 ${grants.length}건`,
  );
  if (
    rls.length !== 2 ||
    rls.some((r) => !r.relrowsecurity) ||
    grants.length !== 0
  )
    throw new Error("새 표의 권한이 기대와 다르다");

  const after = await snapshot(tx);
  const { n: linked } = await one<{ n: number }>(
    tx,
    `SELECT count(*)::int AS n FROM "problem" WHERE source_material_id IS NOT NULL`,
  );
  log(
    `  ⑺ 문항 ${before.problems} → ${after.problems} · 차시 ${before.units} → ${after.units} · 자료가 붙은 문항 ${linked}`,
  );
  log(`     출처별 — 전: ${before.bySource}`);
  log(`     출처별 — 후: ${after.bySource}`);
  if (
    after.problems !== before.problems ||
    after.units !== before.units ||
    after.bySource !== before.bySource ||
    linked !== 0
  )
    throw new Error("기존 행이 바뀌었다");

  const semesters = (await tx.$queryRawUnsafe(
    `SELECT grade, count(*) FILTER (WHERE semester = 1)::int AS s1, count(*) FILTER (WHERE semester = 2)::int AS s2,
            count(*) FILTER (WHERE semester IS NULL)::int AS unknown, min(order_index)::int AS first
       FROM "unit" GROUP BY grade ORDER BY min(order_index)`,
  )) as Array<{ grade: string; s1: number; s2: number; unknown: number }>;
  log(
    `  ⑻ 차시의 학기(1학기/2학기/모름) — ${semesters.map((s) => `${s.grade} ${s.s1}/${s.s2}/${s.unknown}`).join(" · ")}`,
  );
  const holes = semesters.filter(
    (s) => DECIDED_GRADES.includes(s.grade) && s.unknown > 0,
  );
  if (holes.length > 0)
    throw new Error(
      `학기를 못 정한 차시가 있다: ${holes.map((h) => `${h.grade} ${h.unknown}`).join(", ")}`,
    );
  // 차례가 뒤로 가는데 학기가 앞으로 돌아오면 규칙이 틀린 것이다
  const { n: backwards } = await one<{ n: number }>(
    tx,
    `SELECT count(*)::int AS n FROM "unit" a JOIN "unit" b ON a.grade = b.grade AND a.order_index < b.order_index
      WHERE a.semester = 2 AND b.semester = 1`,
  );
  log(`     2학기 차시 뒤에 1학기 차시가 오는 쌍 ${backwards}`);
  if (backwards > 0) throw new Error("학기가 차례를 거스른다");

  await probes(tx, log);
}

/** ①②③ 을 적용하고 기록한 뒤 학기를 채운다 — **한 트랜잭션 안에서** 불러야 한다. */
export async function applyAll(
  tx: Tx,
  files: MigrationFile[],
  log: Log = console.log,
): Promise<void> {
  for (const file of files) {
    for (const stmt of file.statements) await tx.$executeRawUnsafe(stmt);
    await tx.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
      file.checksum,
      file.name,
    );
  }
  const groups = await backfillSemesters(tx);
  log(`  적용됨 · 학기를 채운 (학년, 대단원) 묶음 ${groups}. 확인:`);
}

export type MigrationFile = {
  name: string;
  checksum: string;
  statements: string[];
};

export function loadMigrationFiles(log: Log = console.log): MigrationFile[] {
  return MIGRATIONS.map((name) => {
    const path = `prisma/migrations/${name}/migration.sql`;
    const raw = readFileSync(path, "utf8");
    const statements = splitStatements(raw);
    log(
      `${path} — 문장 ${statements.length}개 · 체크섬 ${prismaChecksum(raw)}`,
    );
    return { name, checksum: prismaChecksum(raw), statements };
  });
}

/** 되돌려도 되는가 — 교과서 문항 · 자료가 붙은 문항이 있으면 던진다. 돌려주는 것은 지울 문장들. */
export async function revertPlan(
  tx: Tx,
  dropRows: boolean,
  log: Log = console.log,
): Promise<string[]> {
  const counts = {
    textbookProblems: 0,
    linkedProblems: 0,
    books: 0,
    materials: 0,
  };
  if (await enumHasValue(tx))
    counts.textbookProblems = (
      await one<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM "problem" WHERE source::text = $1`,
        ENUM_VALUE,
      )
    ).n;
  if (await columnExists(tx, "problem", "source_material_id"))
    counts.linkedProblems = (
      await one<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM "problem" WHERE source_material_id IS NOT NULL`,
      )
    ).n;
  if (await tableExists(tx, "source_book"))
    counts.books = (
      await one<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM "source_book"`,
      )
    ).n;
  if (await tableExists(tx, "source_material"))
    counts.materials = (
      await one<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM "source_material"`,
      )
    ).n;
  log(`  ${JSON.stringify(counts)}`);
  if (counts.textbookProblems > 0 || counts.linkedProblems > 0)
    throw new Error(
      "교과서 문항 · 자료가 붙은 문항이 있다 — 문항부터 따로 정리한다. 멈춘다.",
    );
  if ((counts.books > 0 || counts.materials > 0) && !dropRows)
    throw new Error(
      "책 · 자료가 기록돼 있다 — 지워도 되면 --drop-rows 를 같이 준다. 멈춘다.",
    );
  return REVERT_SQL;
}

async function revert(prisma: PrismaClient): Promise<void> {
  const statements = await revertPlan(prisma, DROP_ROWS);
  console.log(
    `되돌리기: ${statements.length}문장 (enum 값 ${ENUM_VALUE} 은 남는다 — 못 뺀다)`,
  );
  if (!APPLY) {
    console.log(
      "드라이런이다. 실제로 되돌리려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
    );
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
      for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
  console.log("되돌렸다.");
}

async function main(prisma: PrismaClient) {
  if (REVERT) return await revert(prisma);

  const files = loadMigrationFiles();
  const already = await recorded(prisma);
  if (already.length === MIGRATIONS.length) {
    const present =
      (await enumHasValue(prisma)) &&
      (await tableExists(prisma, "source_material")) &&
      (await columnExists(prisma, "unit", "semester"));
    if (!present)
      throw new Error(
        "기록은 있는데 실제 값 · 표 · 칸이 없다 — _prisma_migrations 와 DB 가 어긋났다. 먼저 확인할 것",
      );
    console.log(
      "이미 적용돼 있다(기록 · 값 · 표 · 칸 모두 있음). 아무것도 하지 않는다.",
    );
    return;
  }
  if (already.length > 0)
    throw new Error(
      `셋 중 일부만 기록돼 있다(${already.join(", ")}) — 먼저 확인할 것`,
    );
  await checkPrecondition(prisma);

  const started = Date.now();
  await prisma
    .$transaction(
      async (tx) => {
        // 칸을 더할 때 problem · unit 에 짧은 잠금이 선다 — 앱이 쓰는 중이면 10초에서 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const before = await snapshot(tx);
        await applyAll(tx, files);
        await check(tx, before);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 180_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log("드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:");
        console.log(
          "  ALLOW_SHARED_IMPORT=1 npx tsx --env-file=.env scripts/qa/apply-source-material-migration.ts --apply",
        );
        return;
      }
      throw error;
    });
  console.log(`  트랜잭션 ${((Date.now() - started) / 1000).toFixed(1)}초`);

  if (APPLY) console.log("적용 완료.");
}

if (isDirectScript(import.meta.url)) {
  if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
    console.error(
      "공유 DB 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.",
    );
    process.exit(1);
  }
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
