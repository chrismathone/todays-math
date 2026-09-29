/**
 * 학원 전체 설정 표 마이그레이션(`20260930020000_app_setting`)을 적용한다 — 진도판 테마(원장님 2026-09-30).
 *
 *   npx tsx scripts/qa/apply-app-setting-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-app-setting-migration.ts --apply
 *
 * 새 표 하나(`app_setting`)만 만든다 — 기존 표 · 행은 건드리지 않는다. 코드는 표가 없어도(P2021) 학생 판을 지금 판으로 띄우지만,
 * 관리자 테마 저장은 표가 있어야 된다 — 🔴 그래도 순서는 **DB 먼저 · 코드 나중**(24 §6.1 과 같은 습관).
 *
 * 본뜬 것: `apply-eywa-link-migration.ts` — `prisma migrate deploy` 를 안 쓴다(다른 트랙의 미적용 마이그레이션까지 적용한다).
 * **이 마이그레이션 하나만** 적용하고 `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 확인(읽기만): ⑴ 앞 조건 — 표가 아직 없다 ⑵ 칸 넷의 형 · NULL 허용 ⑶ 기본 키가 `key` 한 칸 ⑷ 빈 표(행 0).
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply` — 🔴 행이 있으면(관리자가 테마를 골랐으면) 되돌리지 않는다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260930020000_app_setting";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const TABLE = "app_setting";

const REVERT_SQL = `
DROP TABLE IF EXISTS "${TABLE}";
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

async function tableExists(tx: Tx): Promise<boolean> {
  const [{ exists }] = (await tx.$queryRawUnsafe(
    `SELECT to_regclass('public.${TABLE}') IS NOT NULL AS exists`,
  )) as Array<{ exists: boolean }>;
  return exists;
}

type ColumnRow = { column_name: string; udt_name: string; is_nullable: string };

async function check(tx: Tx): Promise<void> {
  const columns = (await tx.$queryRawUnsafe(
    `SELECT column_name, udt_name, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    TABLE,
  )) as ColumnRow[];
  const want: Record<string, [string, string]> = {
    key: ["varchar", "NO"],
    value: ["jsonb", "NO"],
    updated_at: ["timestamp", "NO"],
    updated_by_id: ["uuid", "YES"],
  };
  console.log(
    `  ⑵ 칸 — ${columns.map((c) => `${c.column_name} ${c.udt_name}${c.is_nullable === "YES" ? "?" : ""}`).join(" · ")}`,
  );
  if (columns.length !== 4) throw new Error(`칸이 넷이 아니다: ${columns.length}`);
  for (const c of columns) {
    const [udt, nullable] = want[c.column_name] ?? [];
    if (c.udt_name !== udt || c.is_nullable !== nullable)
      throw new Error(`${c.column_name} 형이 다르다: ${c.udt_name} ${c.is_nullable}`);
  }
  const keys = (await tx.$queryRawUnsafe(
    `SELECT a.attname AS name FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'public.${TABLE}'::regclass AND i.indisprimary`,
  )) as Array<{ name: string }>;
  console.log(`  ⑶ 기본 키 — ${keys.map((k) => k.name).join(", ")}`);
  if (keys.length !== 1 || keys[0].name !== "key")
    throw new Error("기본 키가 key 한 칸이 아니다");
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "${TABLE}"`,
  )) as Array<{ n: number }>;
  console.log(`  ⑷ 행 ${n} (0 이어야 한다)`);
  if (n !== 0) throw new Error("새 표에 행이 있다");
}

async function revert(): Promise<void> {
  if (await tableExists(prisma)) {
    const [{ n }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "${TABLE}"`,
    )) as Array<{ n: number }>;
    console.log(`  설정 행 ${n}`);
    if (n > 0)
      throw new Error(
        "관리자가 고른 설정이 있다 — 표를 지우면 기록 없이 사라진다. 멈춘다.",
      );
  } else console.log("  표가 없다(이미 되돌렸거나 적용 전)");
  const statements = splitStatements(REVERT_SQL);
  if (!APPLY) {
    console.log(`되돌리기 ${statements.length}문장 — 드라이런이다.`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  });
  console.log("되돌렸다.");
}

async function main() {
  if (REVERT) return await revert();
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const checksum = prismaChecksum(raw);
  const statements = splitStatements(raw);
  console.log(`${MIGRATION_PATH}\n  문장 ${statements.length}개 · 체크섬 ${checksum}`);
  if (statements.length !== 1)
    throw new Error(`문장이 하나(CREATE TABLE)가 아니다: ${statements.length}`);
  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length > 0) {
    console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    return;
  }
  const exists = await tableExists(prisma);
  console.log(`  ⑴ 앞 조건 — ${TABLE} 표 ${exists ? "🔴 이미 있음" : "없음(정상)"}`);
  if (exists) throw new Error("표가 이미 있다 — 손대지 않고 멈춘다.");

  await prisma
    .$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
        for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
           VALUES (gen_random_uuid()::text, $1, now(), $2, NULL, NULL, now(), 1)`,
          checksum,
          MIGRATION_NAME,
        );
        console.log("  적용됨. 확인:");
        await check(tx);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 되돌렸다(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-app-setting-migration.ts --apply",
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
