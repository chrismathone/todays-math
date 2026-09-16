/**
 * 시험지의 아침 회차 칸 마이그레이션(`20260917000000_test_auto_draft_run`)을 적용한다 (D-133 ⑴).
 *
 *   npx tsx scripts/qa/apply-test-auto-draft-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-test-auto-draft-migration.ts --apply
 *
 * 🔴 **이 워크트리(plan-screen-followup)는 드라이런조차 돌리지 않았다** — 브리프 «공유 DB 에 적용하지 마라»,
 *    `.env` 도 없다. 드라이런·적용은 **리드가 병합 뒤** main 에서 한다(원장님 확인 받음).
 * 🔴 **배포보다 먼저** 적용한다. Prisma 는 `test` 를 읽고 쓸 때마다 `auto_draft_run_id` 를 부른다 — 칸 없이
 *    배포되면 출제·검수·인쇄·메인 «오늘의 확인테스트»가 전부 500 이다.
 *
 * 본뜬 것: `scripts/qa/apply-progress-plan-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙이 남긴 미적용 마이그레이션까지 같이 적용한다). **이 마이그레이션 하나만** 적용하고
 * `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `auto_draft_run` 표와 그 마이그레이션 기록이 있다(없으면 FK 가 설 곳이 없다 — 손대지 않고 멈춘다)
 *   ⑵ 칸 — `test.auto_draft_run_id` 가 uuid · NULL 허용 · 기본값 없음
 *   ⑶ FK — `test_auto_draft_run_id_fkey` 가 `auto_draft_run(id)` 를 가리키고 **ON DELETE SET NULL**
 *   ⑷ 인덱스 — `test_auto_draft_run_id_idx` 가 그 칸 위에
 *   ⑸ 🔴 기존 행 무변경 — 적용 전후 `test` 행 수가 같고, 값이 있는 행이 **0**
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. 칸·인덱스·FK·기록 한 줄만 지운다.
 * 🔴 칸에 값이 **하나라도** 있으면(아침 회차가 이미 돌았으면) 되돌리지 않는다 — 지우면 «자동 출제» 표지의 근거가
 *    영영 사라진다. 그때는 값을 어떻게 할지 먼저 정한다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260917000000_test_auto_draft_run";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
/** FK 가 설 표를 만든 마이그레이션 — 공유 DB 에 2026-09-16 적용 끝(22번 문서 §5) */
const PREVIOUS_MIGRATION = "20260916120000_progress_plan_and_auto_draft";

const COLUMN = "auto_draft_run_id";
const FK_NAME = "test_auto_draft_run_id_fkey";
const INDEX_NAME = "test_auto_draft_run_id_idx";

const REVERT_SQL = `
ALTER TABLE "test" DROP CONSTRAINT IF EXISTS "${FK_NAME}";
DROP INDEX IF EXISTS "${INDEX_NAME}";
ALTER TABLE "test" DROP COLUMN IF EXISTS "${COLUMN}";
DELETE FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}';
`;

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

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

/** 주석을 걷고 `;` 로 나눈다. 이 파일에는 함수 본문($$)이 없어 단순 분할로 충분하다. */
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

async function testRowCount(tx: Tx): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "test"`,
  )) as Array<{ n: number }>;
  return n;
}

/** ⑴ 앞 조건 — 표와 기록. 하나라도 없으면 아무것도 안 하고 멈춘다. */
async function checkPrecondition(): Promise<void> {
  const [{ table }] = (await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.auto_draft_run') IS NOT NULL AS table`,
  )) as Array<{ table: boolean }>;
  const recorded = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
    PREVIOUS_MIGRATION,
  )) as unknown[];
  console.log(
    `  앞 조건 — auto_draft_run 표 ${table ? "있음" : "없음"} · ${PREVIOUS_MIGRATION} 기록 ${recorded.length ? "있음" : "없음"}`,
  );
  if (!table || recorded.length === 0)
    throw new Error(
      `앞 마이그레이션(${PREVIOUS_MIGRATION})이 적용돼 있지 않다 — 그것부터(apply-progress-plan-migration.ts)`,
    );
}

/** ⑵~⑸ — 적용한 트랜잭션 안에서 읽기만 한다. */
async function check(tx: Tx, rowsBefore: number): Promise<void> {
  const columns = (await tx.$queryRawUnsafe(
    `SELECT data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'test' AND column_name = $1`,
    COLUMN,
  )) as Array<{
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  const col = columns[0];
  console.log(
    `  ⑵ 칸 test.${COLUMN} — ${col ? `${col.data_type} · NULL ${col.is_nullable} · 기본값 ${col.column_default ?? "없음"}` : "없다"}`,
  );
  if (!col) throw new Error("칸이 없다");
  if (col.data_type !== "uuid")
    throw new Error(`형이 uuid 가 아니다: ${col.data_type}`);
  if (col.is_nullable !== "YES") throw new Error("NULL 을 허용하지 않는다");
  if (col.column_default !== null) throw new Error("기본값이 있다");

  const fks = (await tx.$queryRawUnsafe(
    `SELECT c.confrelid::regclass::text AS target,
            c.confdeltype AS on_delete,
            (SELECT array_agg(a.attname::text) FROM pg_attribute a
              WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)) AS cols
       FROM pg_constraint c
      WHERE c.conname = $1 AND c.contype = 'f' AND c.conrelid = 'public.test'::regclass`,
    FK_NAME,
  )) as Array<{ target: string; on_delete: string; cols: string[] }>;
  const fk = fks[0];
  console.log(
    `  ⑶ FK ${FK_NAME} — ${fk ? `→ ${fk.target} · 칸 ${fk.cols.join(",")} · ON DELETE ${fk.on_delete === "n" ? "SET NULL" : fk.on_delete}` : "없다"}`,
  );
  if (!fk) throw new Error("FK 가 없다");
  if (fk.target !== "auto_draft_run")
    throw new Error(`FK 가 다른 표를 가리킨다: ${fk.target}`);
  if (fk.cols.length !== 1 || fk.cols[0] !== COLUMN)
    throw new Error(`FK 칸이 다르다: ${fk.cols.join(",")}`);
  // 🔴 SET NULL 이 아니면(CASCADE) 회차 기록을 지울 때 **시험지가 같이 지워진다**
  if (fk.on_delete !== "n")
    throw new Error(`ON DELETE 가 SET NULL 이 아니다: ${fk.on_delete}`);

  const [index] = (await tx.$queryRawUnsafe(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    INDEX_NAME,
  )) as Array<{ indexdef: string }>;
  console.log(`  ⑷ 인덱스 — ${index?.indexdef ?? "없다"}`);
  if (!index) throw new Error(`${INDEX_NAME} 가 없다`);
  // pg_indexes 모양: `CREATE INDEX test_auto_draft_run_id_idx ON public.test USING btree (auto_draft_run_id)`
  if (
    !/ ON (public\.)?"?test"? USING /.test(index.indexdef) ||
    !index.indexdef.includes(`(${COLUMN})`)
  )
    throw new Error("인덱스가 test.auto_draft_run_id 위가 아니다");

  const rowsAfter = await testRowCount(tx);
  const [{ filled }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS filled FROM "test" WHERE "${COLUMN}" IS NOT NULL`,
  )) as Array<{ filled: number }>;
  console.log(
    `  ⑸ 기존 시험지 ${rowsBefore}행 → ${rowsAfter}행 · 칸에 값이 있는 행 ${filled} (0 이어야 한다)`,
  );
  if (rowsAfter !== rowsBefore) throw new Error("test 행 수가 바뀌었다");
  if (filled !== 0) throw new Error("값이 채워진 행이 있다");
}

async function revert(): Promise<void> {
  const exists = (await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'test' AND column_name = $1`,
    COLUMN,
  )) as unknown[];
  if (exists.length > 0) {
    const [{ filled }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS filled FROM "test" WHERE "${COLUMN}" IS NOT NULL`,
    )) as Array<{ filled: number }>;
    console.log(`  칸에 값이 있는 시험지 ${filled}행`);
    if (filled > 0)
      throw new Error(
        "아침 회차가 이미 시험지에 이어져 있다 — 되돌리면 «자동 출제» 표지의 근거가 사라진다. 멈춘다.",
      );
  } else {
    console.log("  칸이 없다(이미 되돌렸거나 적용 전)");
  }
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
  if (statements.length !== 3)
    throw new Error(`문장이 셋(칸·인덱스·FK)이 아니다: ${statements.length}`);

  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    return;
  }
  await checkPrecondition();

  await prisma
    .$transaction(
      async (tx) => {
        // 앱이 `test` 를 쓰는 중이면 ALTER 가 뒤에서 한없이 기다리며 앱 쿼리까지 줄 세운다 — 10초면 포기한다
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        const rowsBefore = await testRowCount(tx);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx, rowsBefore);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-test-auto-draft-migration.ts --apply",
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
