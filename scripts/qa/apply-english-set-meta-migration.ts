/**
 * 오늘의 영어 세트의 «만든 조건» 칸(`20261001120000_english_set_meta`)을 적용한다 (D-151 · 원장님 2026-10-01
 * «수학 문제처럼 생성된 영어 문제도 입력할 수 있는 모든 메타데이터 기억되게»).
 *
 *   npx tsx scripts/qa/apply-english-set-meta-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-english-set-meta-migration.ts --apply
 *
 * 순서: DB 먼저 · 코드 나중(24번 문서 §6.1). 칸 하나를 **더하기만** 하므로 옛 코드는 이 칸을 모른 채 돈다 — 다만 새 코드가
 *    칸 없는 DB 에 먼저 나가면 세트 읽기 · 만들기가 «column does not exist»(P2022)로 전부 500 이다. 그래서 순서를 지킨다.
 * 본뜬 것: `apply-english-studio-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓰고(다른 트랙의 미적용
 * 마이그레이션까지 같이 적용한다) **이 마이그레이션 하나만** 적용해 `_prisma_migrations` 에 같은 방식으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `english_question_set` 표가 있다 · `meta` 칸은 아직 없다
 *   ⑵ 칸 — `meta` jsonb · NULL 허용 · 표의 칸 수가 하나 늘었다
 *   ⑶ CHECK — `english_question_set_meta_object` 의 정의문이 «NULL 이거나 객체»
 *   ⑷ 🔴 기존 행 무변경 — 적용 전후 세트 행 수가 같고, 모든 행의 meta 가 NULL
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. 칸과 기록 한 줄을 지운다
 * (칸에 값이 든 행이 있으면 `--drop-rows` 를 같이 줘야 지운다 — 기록된 조건을 모르고 날리지 않게).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261001120000_english_set_meta";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const TABLE = "english_question_set";
const CHECK_NAME = "english_question_set_meta_object";
/** 칸 1 · CHECK 1 */
const EXPECTED_STATEMENTS = 2;

const REVERT_SQL = `
ALTER TABLE "english_question_set" DROP CONSTRAINT IF EXISTS "english_question_set_meta_object";
ALTER TABLE "english_question_set" DROP COLUMN IF EXISTS "meta";
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

/** Prisma 체크섬 = 마이그레이션 파일에서 CR 을 뺀 뒤 sha256 */
function prismaChecksum(text: string): string {
  return createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");
}

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

async function columns(
  tx: Tx,
): Promise<
  Array<{ column_name: string; data_type: string; is_nullable: string }>
> {
  return (await tx.$queryRawUnsafe(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    TABLE,
  )) as Array<{ column_name: string; data_type: string; is_nullable: string }>;
}

async function rowCount(tx: Tx): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "${TABLE}"`,
  )) as Array<{ n: number }>;
  return n;
}

/** ⑴ 앞 조건 */
async function checkPrecondition(): Promise<number> {
  if (!(await tableExists(prisma, TABLE)))
    throw new Error(`${TABLE} 표가 없다 — 영어 표 셋 마이그레이션부터`);
  const before = await columns(prisma);
  const has = before.some((c) => c.column_name === "meta");
  console.log(
    `  ⑴ 앞 조건 — ${TABLE} ${before.length}칸 · meta ${has ? "이미 있음" : "없음"}`,
  );
  if (has)
    throw new Error(
      "meta 칸이 이미 있다 — 기록 없이 누가 만들었는지 먼저 확인할 것",
    );
  return before.length;
}

/** ⑵~⑷ — 적용한 트랜잭션 안에서 읽기만 한다 */
async function check(tx: Tx, columnsBefore: number, rowsBefore: number) {
  const after = await columns(tx);
  const meta = after.find((c) => c.column_name === "meta");
  console.log(
    `  ⑵ ${TABLE} ${columnsBefore}칸 → ${after.length}칸 · meta ${meta ? `${meta.data_type}/${meta.is_nullable}` : "없다"}`,
  );
  if (after.length !== columnsBefore + 1)
    throw new Error("칸이 정확히 하나 늘지 않았다");
  if (!meta || meta.data_type !== "jsonb" || meta.is_nullable !== "YES")
    throw new Error("meta 칸이 jsonb · NULL 허용이 아니다");
  const [check] = (await tx.$queryRawUnsafe(
    `SELECT pg_get_constraintdef(k.oid) AS def FROM pg_constraint k
      WHERE k.conrelid = $1::regclass AND k.conname = $2 AND k.contype = 'c'`,
    `public.${TABLE}`,
    CHECK_NAME,
  )) as Array<{ def: string }>;
  console.log(`  ⑶ CHECK ${CHECK_NAME} — ${check?.def ?? "없다"}`);
  if (
    !check ||
    !/meta IS NULL/i.test(check.def) ||
    !/jsonb_typeof\(meta\) = 'object'/i.test(check.def)
  )
    throw new Error("CHECK 정의문이 «NULL 이거나 객체»가 아니다");
  const rowsAfter = await rowCount(tx);
  const [{ filled }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS filled FROM "${TABLE}" WHERE meta IS NOT NULL`,
  )) as Array<{ filled: number }>;
  console.log(
    `  ⑷ 세트 ${rowsBefore}행 → ${rowsAfter}행 · meta 가 든 행 ${filled} (같아야 하고 0 이어야 한다)`,
  );
  if (rowsAfter !== rowsBefore || filled !== 0)
    throw new Error("기존 행이 바뀌었다");
}

async function revert(): Promise<void> {
  const has = (await columns(prisma)).some((c) => c.column_name === "meta");
  if (has) {
    const [{ filled }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS filled FROM "${TABLE}" WHERE meta IS NOT NULL`,
    )) as Array<{ filled: number }>;
    console.log(`  meta 가 든 행 ${filled}`);
    if (filled > 0 && !DROP_ROWS)
      throw new Error(
        "만든 조건이 기록된 세트가 있다 — 지워도 되면 --drop-rows 를 같이 준다. 멈춘다.",
      );
  } else console.log("  meta 칸이 없다(적용 전)");
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
      `문장이 ${EXPECTED_STATEMENTS}(칸 1 · CHECK 1)이 아니다: ${statements.length}`,
    );

  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    if (!(await columns(prisma)).some((c) => c.column_name === "meta"))
      throw new Error(
        "기록은 있는데 meta 칸이 없다 — _prisma_migrations 와 실제 표가 어긋났다. 먼저 확인할 것",
      );
    console.log("이미 적용돼 있다(기록 · 칸 모두 있음). 아무것도 하지 않는다.");
    return;
  }
  const columnsBefore = await checkPrecondition();

  await prisma
    .$transaction(
      async (tx) => {
        // 칸을 더할 때 표에 짧은 잠금이 선다 — 앱이 쓰는 중이면 10초에서 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const rowsBefore = await rowCount(tx);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx, columnsBefore, rowsBefore);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-english-set-meta-migration.ts --apply",
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
