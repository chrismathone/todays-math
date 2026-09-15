/**
 * 학생 계정 마이그레이션(`20260915180000_student_account`)을 이 DB 에 적용한다 (D-124 ⑶⑷ · D-125 ⑶).
 *
 *   npx tsx scripts/qa/apply-student-account-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-student-account-migration.ts --apply
 *
 * 원장님 확인 2026-09-15: 「학생 계정 표 둘을 공유 DB 에 새로 만들까요?」 → 「지금 만든다」.
 * (만든 워크트리 student-auth 는 드라이런조차 돌리지 않았다 — 드라이런·적용은 리드가 main 에서 했다.)
 *
 * 본뜬 것: `scripts/qa/apply-concept-lecture-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를
 * 안 쓴다. 이 저장소에는 다른 트랙이 남긴 미적용 마이그레이션(`20260817120000_problem_created_at_indexes`)이
 * 있고 `deploy` 는 그것까지 같이 적용한다. 남의 결정을 대신 내리지 않으려고 **이 마이그레이션 하나만**
 * 적용하고 `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 확인은 **읽기만** 한다 — 확인용 행을 넣지 않는다(`--apply` 는 커밋되므로 넣은 행이 공유 DB 에 남은
 * 전례가 있다 — `tracks/reports/problem-code.md` §6-1).
 *
 * 되돌리기: `--revert --apply` (새 표 둘 · 기록 한 줄만 지운다. 기존 표는 건드리지 않는다 —
 * `student` 의 행은 외래 키가 사라질 뿐 그대로다).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260915180000_student_account";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;

const REVERT_SQL = `
DROP TABLE IF EXISTS "student_login_miss";
DROP TABLE IF EXISTS "student_account";
DELETE FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}';
`;

/** 마이그레이션 파일이 만드는 CHECK — 적용 뒤 이름으로 하나씩 찾는다. */
const EXPECTED_CHECKS = [
  "student_account_login_id_normalized",
  "student_account_failed_count_nonnegative",
  "student_login_miss_failed_count_nonnegative",
  "student_login_miss_key_is_hmac",
];

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error(
    "공유 DB 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

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

async function check(tx: PrismaClient) {
  const tables = (await tx.$queryRawUnsafe(
    `SELECT c.relname AS name, c.relrowsecurity AS rls,
            (SELECT count(*)::int FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'c') AS checks
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('student_account', 'student_login_miss')
      ORDER BY c.relname`,
  )) as Array<{ name: string; rls: boolean; checks: number }>;
  for (const t of tables)
    console.log(
      `  표 ${t.name} · RLS ${t.rls ? "켬" : "끔"} · CHECK ${t.checks}`,
    );
  if (tables.length !== 2)
    throw new Error(`새 표가 둘이 아니다: ${tables.length}`);
  if (tables.some((t) => !t.rls)) throw new Error("RLS 가 꺼진 표가 있다");

  const found = (await tx.$queryRawUnsafe(
    `SELECT conname FROM pg_constraint WHERE contype = 'c' AND conname = ANY($1::text[])`,
    EXPECTED_CHECKS,
  )) as Array<{ conname: string }>;
  const missing = EXPECTED_CHECKS.filter(
    (n) => !found.some((f) => f.conname === n),
  );
  console.log(
    `  CHECK 이름 대조 ${found.length}/${EXPECTED_CHECKS.length}${missing.length ? ` — 빠짐 ${missing.join(", ")}` : ""}`,
  );
  if (missing.length) throw new Error("CHECK 가 빠졌다");

  const [{ accounts, misses }] = (await tx.$queryRawUnsafe(
    `SELECT (SELECT count(*)::int FROM "student_account") AS accounts,
            (SELECT count(*)::int FROM "student_login_miss") AS misses`,
  )) as Array<{ accounts: number; misses: number }>;
  console.log(
    `  행 수 — 학생 계정 ${accounts} · 없는 아이디 실패 ${misses} (빈 표여야 한다)`,
  );
  if (accounts !== 0 || misses !== 0) throw new Error("새 표에 행이 있다");

  const [{ students }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS students FROM "student"`,
  )) as Array<{ students: number }>;
  console.log(`  기존 학생 표 ${students}행 — 손대지 않음`);
}

async function main() {
  if (REVERT) {
    console.log("되돌리기:", REVERT_SQL.trim().split("\n").length, "문장");
    if (!APPLY) {
      console.log(
        "드라이런이다. 실제로 되돌리려면 ALLOW_SHARED_IMPORT=1 … --revert --apply.",
      );
      return;
    }
    for (const stmt of splitStatements(REVERT_SQL))
      await prisma.$executeRawUnsafe(stmt);
    console.log("되돌렸다.");
    return;
  }

  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const checksum = prismaChecksum(raw);
  const statements = splitStatements(raw);
  console.log(MIGRATION_PATH);
  console.log(`  문장 ${statements.length}개 · 체크섬 ${checksum}`);

  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    return;
  }

  await prisma
    .$transaction(
      async (tx) => {
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx as unknown as PrismaClient);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-student-account-migration.ts --apply",
        );
        return;
      }
      throw error;
    });

  if (APPLY) console.log("\n적용 완료.");
}

class DryRun extends Error {}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
