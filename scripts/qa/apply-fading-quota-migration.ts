/**
 * «오늘의 기억» 하루 분량 손잡이 표 둘(`20261017140000_fading_quota_policy`) — 학생별 분량 · 상한에 닿은 날.
 *
 *   npx tsx scripts/qa/apply-fading-quota-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-fading-quota-migration.ts --apply
 *
 * 새 표 둘을 만들 뿐 지금 있는 표 · 행은 만지지 않는다. 🔴 DB 먼저 · 코드 나중(이 표를 읽는 코드가 나가기 전에 적용한다).
 * 본뜬 것: `apply-print-preset-kind-migration.ts` — 이 마이그레이션 하나만 적용하고 `_prisma_migrations` 에 같은 방식으로 기록한다.
 * 확인(읽기만): ⑴ 앞 — 두 표가 없다 ⑵ 뒤 — 두 표 · 칸 · 제약이 있고 행은 0 ⑶ 제약이 실제로 막는다(고를 수 없는 분량 12 는 거절).
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply` — 🔴 행이 하나라도 있으면 되돌리지 않는다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261017140000_fading_quota_policy";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const TABLES = ["fading_student_policy", "fading_relearn_cap_day"] as const;
const CHECKS = [
  "fading_student_policy_quota_check",
  "fading_student_policy_previous_quota_check",
  "fading_student_policy_revision_check",
];

const REVERT_SQL = `
DROP TABLE "fading_relearn_cap_day";
DROP TABLE "fading_student_policy";
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
class DryRun extends Error {}

const checksumOf = (text: string) =>
  createHash("sha256").update(text.replaceAll("\r", "")).digest("hex");

function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function present(tx: Tx): Promise<string[]> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
    [...TABLES],
  )) as Array<{ table_name: string }>;
  return rows.map((r) => r.table_name).sort();
}

async function rowCount(tx: Tx, table: string): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "${table}"`,
  )) as Array<{ n: number }>;
  return n;
}

async function main() {
  if (REVERT) {
    const now = await present(prisma);
    console.log(`  있는 표 [${now.join(", ")}]`);
    for (const table of now) {
      const n = await rowCount(prisma, table);
      console.log(`  ${table} 행 ${n}개`);
      if (n > 0)
        throw new Error(`${table} 에 행이 있다 — 되돌리면 사라진다. 멈춘다.`);
    }
    if (!APPLY) return console.log("되돌리기 — 드라이런이다.");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
      for (const stmt of splitStatements(REVERT_SQL))
        await tx.$executeRawUnsafe(stmt);
    });
    return console.log("되돌렸다.");
  }
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const statements = splitStatements(raw);
  console.log(
    `${MIGRATION_PATH}\n  문장 ${statements.length}개 · 체크섬 ${checksumOf(raw)}`,
  );
  if (statements.length !== 2)
    throw new Error(`문장이 둘이 아니다: ${statements.length}`);
  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length)
    return console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
  const before = await present(prisma);
  console.log(`  ⑴ 앞 — 있는 표 [${before.join(", ") || "없음"}]`);
  if (before.length) throw new Error("표가 이미 있다 — 손대지 않고 멈춘다.");
  await prisma
    .$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksumOf(raw),
          MIGRATION_NAME,
        );
        const after = await present(tx);
        console.log(`  ⑵ 뒤 — 있는 표 [${after.join(", ")}]`);
        if (after.length !== TABLES.length)
          throw new Error("적용 뒤 표가 기대와 다르다");
        for (const table of TABLES)
          console.log(`     ${table} 행 ${await rowCount(tx, table)}개`);
        const checks = (await tx.$queryRawUnsafe(
          `SELECT conname FROM pg_constraint WHERE conname = ANY($1::text[])`,
          CHECKS,
        )) as Array<{ conname: string }>;
        if (checks.length !== CHECKS.length)
          throw new Error(`CHECK 가 ${checks.length}/${CHECKS.length} 개다`);
        // ⑶ 제약이 실제로 막는가 — 저장점 안에서 고를 수 없는 분량을 넣어 본다. 학생이 없는 id 라 외래 키로도 거절되므로
        //    «거절됐다»가 아니라 «분량 CHECK 의 이름으로 거절됐다»를 본다.
        await tx.$executeRawUnsafe(`SAVEPOINT probe`);
        const refused = await tx
          .$executeRawUnsafe(
            `INSERT INTO "fading_student_policy" (student_id, quota, effective_on)
             VALUES (gen_random_uuid(), 12, CURRENT_DATE)`,
          )
          .then(
            () => false,
            (error: unknown) =>
              String(error instanceof Error ? error.message : error).includes(
                "fading_student_policy_quota_check",
              ),
          );
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT probe`);
        console.log(
          `  ⑶ 분량 12 는 ${refused ? "CHECK 로 거절된다" : "🔴 CHECK 로 거절되지 않았다"}`,
        );
        if (!refused) throw new Error("CHECK 가 막지 않는다");
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun)
        return console.log("드라이런 — ROLLBACK 했다. 공유 DB 는 그대로다.");
      throw error;
    });
  if (APPLY) console.log("적용했다.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
