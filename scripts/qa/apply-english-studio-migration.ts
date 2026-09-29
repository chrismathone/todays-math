/**
 * 오늘의 영어 표 셋 마이그레이션(`20260930120000_english_studio`)을 적용한다 (D-148 · 25 §2 · §7).
 *
 *   npx tsx scripts/qa/apply-english-studio-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-english-studio-migration.ts --apply
 *
 * 🔴 **이 워크트리(english-base)는 드라이런조차 돌리지 않았다** — 브리프 «DB 에 닿지 않는다(드라이런도)», `.env` 도 없다.
 *    드라이런·적용은 **리드가 병합 뒤 main 에서** 원장님께 여쭌 뒤 한다(25 §7 ①).
 * 순서: DB 먼저 · 코드 나중(24번 문서 §6.1). 새 표만 더하므로 옛 코드는 이 표를 모른다 — 다만 새 코드(영어 API)가
 *    표 없는 DB 에 먼저 나가면 영어 메뉴의 모든 요청이 500(P2021)이다. 그래서 순서를 지킨다.
 *
 * 본뜬 것: `scripts/qa/apply-error-log-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙이 남긴 미적용 마이그레이션 — 예: 지점 분리 `20260921120000_tenant_wall_expand` — 까지 같이 적용한다).
 * **이 마이그레이션 하나만** 적용하고 `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `user` 표가 있다(FK 가 설 곳), 세 표가 아직 없다
 *   ⑵ 표·칸 — `english_exam` 9칸 · `english_material` 8칸 · `english_question_set` 10칸, 형과 NULL 허용
 *   ⑶ FK — `english_exam.user_id → user(id)` **CASCADE** · `english_material.exam_id → english_exam(id)` **CASCADE**
 *          · `english_question_set.exam_id → english_exam(id)` **CASCADE**
 *   ⑷ 색인 — (user_id, created_at) · (exam_id, created_at) · (exam_id, updated_at)
 *   ⑸ CHECK — grade · types 배열 · 자료 본문(bytes 또는 content) · size ≥ 0 · status · source · questions 배열 · revision ≥ 1 (여덟)
 *          — 이름만이 아니라 **정의문**(`pg_get_constraintdef`)을 본다: 값 목록은 계약 상수(ENGLISH_GRADES ·
 *          ENGLISH_SET_STATUSES · ENGLISH_SET_SOURCES)와 집합으로 같아야 하고, 식은 기대 모양과 맞아야 한다(검토 D)
 *   ⑹ RLS — 세 표 모두 켜짐(Supabase 공개 API 로 새지 않게)
 *   ⑺ 🔴 기존 표 무변경 — 적용 전후 `user` 행 수가 같다
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. 세 표와 기록 한 줄을 지운다.
 * 시험·자료·세트 행이 있으면 `--drop-rows` 를 같이 줘야 지운다(원장님이 등록한 자료를 모르고 날리지 않게).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import {
  ENGLISH_GRADES,
  ENGLISH_SET_SOURCES,
  ENGLISH_SET_STATUSES,
} from "@/contracts/english.contract";

const MIGRATION_NAME = "20260930120000_english_studio";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const TABLES = ["english_exam", "english_material", "english_question_set"];
/** 표 3 · 색인 3 · FK 3 · CHECK 8 · RLS 3 */
const EXPECTED_STATEMENTS = 20;

const EXPECTED_COLUMNS: Record<
  string,
  Record<string, [string, "YES" | "NO"]>
> = {
  english_exam: {
    id: ["uuid", "NO"],
    user_id: ["uuid", "NO"],
    school: ["character varying", "NO"],
    grade: ["character varying", "NO"],
    title: ["character varying", "NO"],
    exam_date: ["date", "YES"],
    types: ["jsonb", "NO"],
    created_at: ["timestamp without time zone", "NO"],
    updated_at: ["timestamp without time zone", "NO"],
  },
  english_material: {
    id: ["uuid", "NO"],
    exam_id: ["uuid", "NO"],
    name: ["character varying", "NO"],
    mime_type: ["character varying", "NO"],
    size: ["integer", "NO"],
    bytes: ["bytea", "YES"],
    content: ["text", "YES"],
    created_at: ["timestamp without time zone", "NO"],
  },
  english_question_set: {
    id: ["uuid", "NO"],
    exam_id: ["uuid", "NO"],
    title: ["character varying", "NO"],
    status: ["character varying", "NO"],
    source: ["character varying", "NO"],
    passage: ["text", "NO"],
    questions: ["jsonb", "NO"],
    revision: ["integer", "NO"],
    created_at: ["timestamp without time zone", "NO"],
    updated_at: ["timestamp without time zone", "NO"],
  },
};
const EXPECTED_FKS: Record<
  string,
  { table: string; target: string; onDelete: string }
> = {
  english_exam_user_id_fkey: {
    table: "english_exam",
    target: "user",
    onDelete: "c",
  },
  english_material_exam_id_fkey: {
    table: "english_material",
    target: "english_exam",
    onDelete: "c",
  },
  english_question_set_exam_id_fkey: {
    table: "english_question_set",
    target: "english_exam",
    onDelete: "c",
  },
};
const EXPECTED_INDEXES: Record<string, string[]> = {
  english_exam: ["english_exam_user_id_created_at_idx"],
  english_material: ["english_material_exam_id_created_at_idx"],
  english_question_set: ["english_question_set_exam_id_updated_at_idx"],
};
type CheckVerdict = (def: string) => string | null;

/**
 * `IN ('a', 'b')` 는 PG 가 `= ANY ((ARRAY['a'::character varying, …])::text[])` 로 다시 적는다 —
 * 따옴표 값만 뽑아 **집합**으로 견준다(순서 무관 · 빠짐도 남음도 잡는다).
 */
function quotedValues(def: string): string[] {
  return [...def.matchAll(/'((?:[^']|'')*)'::(?:character varying|text)/g)].map(
    (m) => m[1]!.replaceAll("''", "'"),
  );
}
const valueList =
  (column: string, values: readonly string[]): CheckVerdict =>
  (def) => {
    if (!def.includes(column)) return `${column} 칸을 안 본다`;
    const found = [...new Set(quotedValues(def))].sort().join("|");
    const want = [...values].sort().join("|");
    return found === want ? null : `값 목록이 다르다: [${found}] ≠ [${want}]`;
  };
const pattern =
  (re: RegExp): CheckVerdict =>
  (def) =>
    re.test(def) ? null : `식이 ${re} 와 맞지 않는다`;

/** 표별 CHECK — 이름 → 정의문 판정(검토 D: 이름만 세면 식이 틀려도 초록) */
const EXPECTED_CHECKS: Record<string, Record<string, CheckVerdict>> = {
  english_exam: {
    english_exam_grade_check: valueList("grade", ENGLISH_GRADES),
    english_exam_types_array: pattern(/jsonb_typeof\(types\) = 'array'/),
  },
  english_material: {
    english_material_has_body: pattern(
      /bytes IS NOT NULL[\s\S]*OR[\s\S]*content IS NOT NULL/,
    ),
    english_material_size_nonnegative: pattern(/size >= 0/),
  },
  english_question_set: {
    english_question_set_status_check: valueList(
      "status",
      ENGLISH_SET_STATUSES,
    ),
    english_question_set_source_check: valueList("source", ENGLISH_SET_SOURCES),
    english_question_set_questions_array: pattern(
      /jsonb_typeof\(questions\) = 'array'/,
    ),
    english_question_set_positive_revision: pattern(/revision >= 1/),
  },
};

const REVERT_SQL = `
DROP TABLE IF EXISTS "english_question_set";
DROP TABLE IF EXISTS "english_material";
DROP TABLE IF EXISTS "english_exam";
DELETE FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}';
`;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const DROP_ROWS = process.argv.includes("--drop-rows");

if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
type Tx = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

/** Prisma 체크섬 = 마이그레이션 파일에서 CR 을 뺀 뒤 sha256 (apply-problem-code-migration.ts 에서 실측). */
function prismaChecksum(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");
}

/** 주석을 걷고 `;` 로 나눈다. 이 파일에는 함수 본문($$)이 없고 문자열 안에 `;` 도 없어 단순 분할로 충분하다. */
function splitStatements(sql: string): string[] {
  if (sql.includes("$$"))
    throw new Error("$$ 본문이 있다 — 단순 분할로는 안 된다");
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

class DryRun extends Error {}

async function tableExists(tx: Tx, name: string): Promise<boolean> {
  const [{ found }] = (await tx.$queryRawUnsafe(
    `SELECT to_regclass($1) IS NOT NULL AS found`,
    `public.${name}`,
  )) as Array<{ found: boolean }>;
  return found;
}

async function userCount(tx: Tx): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "user"`,
  )) as Array<{ n: number }>;
  return n;
}

/** ⑴ 앞 조건 */
async function checkPrecondition(): Promise<void> {
  const user = await tableExists(prisma, "user");
  const present: string[] = [];
  for (const table of TABLES)
    if (await tableExists(prisma, table)) present.push(table);
  console.log(
    `  ⑴ 앞 조건 — user 표 ${user ? "있음" : "없음"} · 영어 표 ${present.length ? `이미 있음(${present.join(", ")})` : "셋 다 없음"}`,
  );
  if (!user) throw new Error("user 표가 없다 — FK 가 설 곳이 없다");
  if (present.length)
    throw new Error(
      "표가 이미 있다 — 기록 없이 누가 만들었는지 먼저 확인할 것",
    );
}

/** ⑵~⑺ — 적용한 트랜잭션 안에서 읽기만 한다. */
async function check(tx: Tx, usersBefore: number): Promise<void> {
  for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
    const columns = (await tx.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1`,
      table,
    )) as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>;
    console.log(`  ⑵ ${table} — ${columns.length}칸`);
    if (columns.length !== Object.keys(expected).length)
      throw new Error(`${table} 칸 수가 다르다: ${columns.length}`);
    for (const column of columns) {
      const want = expected[column.column_name];
      if (!want)
        throw new Error(`${table}.${column.column_name} 는 모르는 칸이다`);
      if (column.data_type !== want[0] || column.is_nullable !== want[1])
        throw new Error(
          `${table}.${column.column_name} — ${column.data_type}/${column.is_nullable} ≠ ${want[0]}/${want[1]}`,
        );
    }
  }
  for (const [name, want] of Object.entries(EXPECTED_FKS)) {
    const [fk] = (await tx.$queryRawUnsafe(
      `SELECT c.conrelid::regclass::text AS source, c.confrelid::regclass::text AS target,
              c.confdeltype AS on_delete
         FROM pg_constraint c WHERE c.conname = $1 AND c.contype = 'f'`,
      name,
    )) as Array<{ source: string; target: string; on_delete: string }>;
    console.log(
      `  ⑶ FK ${name} — ${fk ? `${fk.source} → ${fk.target} · ON DELETE ${fk.on_delete === "c" ? "CASCADE" : fk.on_delete === "n" ? "SET NULL" : fk.on_delete}` : "없다"}`,
    );
    if (!fk) throw new Error(`${name} 가 없다`);
    if (
      fk.source.replaceAll('"', "") !== want.table ||
      fk.target.replaceAll('"', "") !== want.target
    )
      throw new Error(
        `${name} 가 다른 표를 잇는다: ${fk.source} → ${fk.target}`,
      );
    // 🔴 CASCADE 가 아니면 계정·시험을 지울 때 딸린 자료·세트가 고아로 남거나 삭제가 FK 에 막힌다(25 §2)
    if (fk.on_delete !== want.onDelete)
      throw new Error(`${name} 의 ON DELETE 가 다르다: ${fk.on_delete}`);
  }
  for (const [table, wanted] of Object.entries(EXPECTED_INDEXES)) {
    const indexes = (await tx.$queryRawUnsafe(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`,
      table,
    )) as Array<{ indexname: string }>;
    const names = new Set(indexes.map((i) => i.indexname));
    console.log(`  ⑷ ${table} 색인 — ${[...names].sort().join(", ")}`);
    for (const name of wanted)
      if (!names.has(name)) throw new Error(`${name} 가 없다`);
  }
  for (const [table, wanted] of Object.entries(EXPECTED_CHECKS)) {
    const checks = (await tx.$queryRawUnsafe(
      `SELECT k.conname, pg_get_constraintdef(k.oid) AS def FROM pg_constraint k
        WHERE k.conrelid = $1::regclass AND k.contype = 'c'`,
      `public.${table}`,
    )) as Array<{ conname: string; def: string }>;
    const defs = new Map(checks.map((c) => [c.conname, c.def]));
    console.log(`  ⑸ ${table} CHECK — ${[...defs.keys()].sort().join(", ")}`);
    for (const [name, verify] of Object.entries(wanted)) {
      const def = defs.get(name);
      if (def === undefined) throw new Error(`CHECK ${name} 가 없다`);
      const why = verify(def);
      if (why)
        throw new Error(
          `CHECK ${name} 의 정의문이 기대와 다르다 — ${why}\n    ${def}`,
        );
    }
  }
  const rls = (await tx.$queryRawUnsafe(
    `SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('english_exam', 'english_material', 'english_question_set') AND relkind = 'r'`,
  )) as Array<{ relname: string; relrowsecurity: boolean }>;
  console.log(
    `  ⑹ RLS — ${rls.map((r) => `${r.relname} ${r.relrowsecurity ? "켜짐" : "꺼짐"}`).join(" · ")}`,
  );
  if (rls.length !== TABLES.length || rls.some((r) => !r.relrowsecurity))
    throw new Error("RLS 가 켜지지 않은 표가 있다");
  const usersAfter = await userCount(tx);
  console.log(`  ⑺ user ${usersBefore}행 → ${usersAfter}행 (같아야 한다)`);
  if (usersAfter !== usersBefore) throw new Error("user 행 수가 바뀌었다");
}

async function revert(): Promise<void> {
  let rows = 0;
  for (const table of TABLES) {
    if (!(await tableExists(prisma, table))) continue;
    const [{ n }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "${table}"`,
    )) as Array<{ n: number }>;
    console.log(`  ${table} ${n}행`);
    rows += n;
  }
  if (rows === 0) console.log("  행이 없다(빈 표거나 적용 전)");
  if (rows > 0 && !DROP_ROWS)
    throw new Error(
      "행이 쌓여 있다 — 지워도 되면 --drop-rows 를 같이 준다. 멈춘다.",
    );
  const statements = splitStatements(REVERT_SQL);
  console.log(`되돌리기: ${statements.length}문장`);
  if (!APPLY) {
    console.log(
      "드라이런이다. 실제로 되돌리려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
    );
    return;
  }
  await prisma.$transaction(async (tx) => {
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  });
  console.log("되돌렸다.");
}

async function main() {
  if (REVERT) return await revert();

  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const checksum = prismaChecksum(raw);
  const statements = splitStatements(raw);
  console.log(MIGRATION_PATH);
  console.log(`  문장 ${statements.length}개 · 체크섬 ${checksum}`);
  if (statements.length !== EXPECTED_STATEMENTS)
    throw new Error(
      `문장이 ${EXPECTED_STATEMENTS}(표 3 · 색인 3 · FK 3 · CHECK 8 · RLS 3)이 아니다: ${statements.length}`,
    );

  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    // 기록만 믿지 않는다(검토 C) — 손으로 표를 지운 뒤 «이미 적용»으로 조용히 넘어가지 않게 세 표를 같이 본다
    const missing: string[] = [];
    for (const table of TABLES)
      if (!(await tableExists(prisma, table))) missing.push(table);
    if (missing.length)
      throw new Error(
        `기록은 있는데 표가 없다: ${missing.join(", ")} — _prisma_migrations 와 실제 표가 어긋났다. 먼저 확인할 것`,
      );
    console.log(
      "이미 적용돼 있다(기록 · 표 셋 모두 있음). 아무것도 하지 않는다.",
    );
    return;
  }
  await checkPrecondition();

  await prisma
    .$transaction(
      async (tx) => {
        // FK 를 걸 때 user 표에 짧은 잠금이 선다 — 앱이 쓰는 중이면 10초에서 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const usersBefore = await userCount(tx);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx, usersBefore);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-english-studio-migration.ts --apply",
        );
        return;
      }
      throw error;
    });

  if (APPLY) console.log("\n적용 완료.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
