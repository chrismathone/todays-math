/**
 * eywa 자동 로그인 2판의 연결 칸 마이그레이션(`20260926200000_user_eywa_link`)을 적용한다 (D-139 ⑹).
 *
 *   npx tsx scripts/qa/apply-eywa-link-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-eywa-link-migration.ts --apply
 *
 * 🔴 **이 워크트리(eywa-sso-link)는 드라이런조차 돌리지 않았다** — 브리프 «공유 DB 쓰기·드라이런 금지».
 *    드라이런·적용은 **리드가** main 에서 한다.
 * 🔴 **배포보다 먼저** 적용한다. 이메일 로그인의 `db.user.findUnique({ where: { email } })` 는 select 가 없어
 *    `user` 의 **모든 칸**을 부른다 — 칸 없이 배포되면 **원장 로그인이 전부 500** 이다(24 §6.1 과 같은 까닭).
 *
 * 본뜬 것: `scripts/qa/apply-grading-mode-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙이 남긴 미적용 마이그레이션까지 같이 적용한다). **이 마이그레이션 하나만** 적용하고
 * `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `user` 표가 있고, 적용 전에 `eywa_user_id`·`eywa_linked_at` 칸과 유일 색인이 **아직 없다**
 *   ⑵ 칸 형 — `eywa_user_id` 는 uuid · `eywa_linked_at` 은 timestamp(3)
 *   ⑶ NULL 허용 — 둘 다 `is_nullable = YES` 이고 **기본값이 없다**(기본값이 있으면 기존 행이 채워진다)
 *   ⑷ 유일 색인 — `user_eywa_user_id_key` 가 UNIQUE 이고 `eywa_user_id` 한 칸에 걸렸다
 *      (한 eywa 사람이 두 계정에 묶이지 않게 하는 마지막 벽 — 연결 API 가 이 위반도 거절로 받는다)
 *   ⑸ 기존 행 무변경 — 적용 전후 `user` 행 수가 같고, **기존 행이 전부** 두 칸 NULL 이다
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`.
 * 🔴 **연결된 행이 하나라도 있으면 되돌리지 않는다** — 칸을 지우면 그 원장들의 연결이 소리 없이 사라지고
 *    (다시 비밀번호로 연결해야 한다), 누가 어느 eywa 계정과 묶였는지도 감사 기록에만 남는다.
 *    그때는 먼저 해제(`DELETE /api/account/eywa-link` · 관리자 `DELETE /api/admin/users/[id]/eywa-link`)부터.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260926200000_user_eywa_link";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;

const TABLE = "user";
const ID_COLUMN = "eywa_user_id";
const AT_COLUMN = "eywa_linked_at";
const INDEX_NAME = "user_eywa_user_id_key";

const REVERT_SQL = `
DROP INDEX IF EXISTS "${INDEX_NAME}";
ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "${AT_COLUMN}";
ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "${ID_COLUMN}";
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

type ColumnRow = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  datetime_precision: number | null;
};

async function linkColumns(tx: Tx): Promise<ColumnRow[]> {
  return (await tx.$queryRawUnsafe(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default, datetime_precision
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
        AND column_name IN ($2, $3)`,
    TABLE,
    ID_COLUMN,
    AT_COLUMN,
  )) as ColumnRow[];
}

async function indexDef(tx: Tx): Promise<string | null> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
    INDEX_NAME,
  )) as Array<{ indexdef: string }>;
  return rows[0]?.indexdef ?? null;
}

async function rowCount(tx: Tx): Promise<number> {
  const [{ n }] = (await tx.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "${TABLE}"`,
  )) as Array<{ n: number }>;
  return n;
}

/** ⑴ 앞 조건 — 표가 있고 칸·색인이 아직 없다. 하나라도 어긋나면 손대지 않고 멈춘다. */
async function checkPrecondition(): Promise<void> {
  const [{ table }] = (await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.${TABLE}') IS NOT NULL AS table`,
  )) as Array<{ table: boolean }>;
  const columns = await linkColumns(prisma);
  const index = await indexDef(prisma);
  console.log(
    `  ⑴ 앞 조건 — ${TABLE} 표 ${table ? "있음" : "없음"} · 연결 칸 ${columns.length ? `🔴 이미 있음(${columns.map((c) => c.column_name).join(", ")})` : "없음(정상)"}` +
      ` · 색인 ${index ? "🔴 이미 있음" : "없음(정상)"}`,
  );
  if (!table) throw new Error(`${TABLE} 표가 없다`);
  if (columns.length > 0 || index)
    throw new Error(
      "연결 칸이나 색인이 이미 있다 — 다른 마이그레이션이 만들었을 수 있다. 손대지 않고 멈춘다.",
    );
}

/** ⑵~⑸ — 적용한 트랜잭션 안에서 읽기만 한다. */
async function check(tx: Tx, rowsBefore: number): Promise<void> {
  const columns = await linkColumns(tx);
  const col = (name: string) => columns.find((c) => c.column_name === name);
  const id = col(ID_COLUMN);
  const at = col(AT_COLUMN);
  console.log(
    `  ⑵ 칸 형 — ${ID_COLUMN} ${id ? id.udt_name : "없다"} · ${AT_COLUMN} ${at ? `${at.data_type}(${at.datetime_precision})` : "없다"}`,
  );
  if (!id) throw new Error(`${ID_COLUMN} 칸이 없다`);
  if (id.udt_name !== "uuid")
    throw new Error(`${ID_COLUMN} 의 형이 uuid 가 아니다: ${id.udt_name}`);
  if (!at) throw new Error(`${AT_COLUMN} 칸이 없다`);
  if (
    at.data_type !== "timestamp without time zone" ||
    Number(at.datetime_precision) !== 3
  )
    throw new Error(
      `${AT_COLUMN} 의 형이 timestamp(3) 가 아니다: ${at.data_type}(${at.datetime_precision})`,
    );

  console.log(
    `  ⑶ NULL 허용 — ${ID_COLUMN} ${id.is_nullable} · 기본값 ${id.column_default ?? "없음"}` +
      ` · ${AT_COLUMN} ${at.is_nullable} · 기본값 ${at.column_default ?? "없음"}`,
  );
  for (const c of [id, at]) {
    if (c.is_nullable !== "YES")
      throw new Error(`${c.column_name} 가 NULL 을 허용하지 않는다`);
    // 🔴 기본값이 있으면 기존 원장 계정이 전부 무언가로 채워진다 — 연결은 사람이 누를 때만 생겨야 한다.
    if (c.column_default !== null)
      throw new Error(`${c.column_name} 에 기본값이 있다: ${c.column_default}`);
  }

  const def = await indexDef(tx);
  console.log(`  ⑷ 유일 색인 — ${def ?? "없다"}`);
  if (!def) throw new Error(`${INDEX_NAME} 색인이 없다`);
  if (!/^CREATE UNIQUE INDEX /.test(def))
    throw new Error(`${INDEX_NAME} 가 UNIQUE 가 아니다`);
  if (!def.endsWith(`(${ID_COLUMN})`))
    throw new Error(`${INDEX_NAME} 가 ${ID_COLUMN} 한 칸에 걸리지 않았다`);

  const rowsAfter = await rowCount(tx);
  const [{ filled }] = (await tx.$queryRawUnsafe(
    `SELECT count(*) FILTER (WHERE "${ID_COLUMN}" IS NOT NULL OR "${AT_COLUMN}" IS NOT NULL)::int AS filled
       FROM "${TABLE}"`,
  )) as Array<{ filled: number }>;
  console.log(
    `  ⑸ 기존 계정 ${rowsBefore}행 → ${rowsAfter}행 · 연결 칸이 채워진 행 ${filled} (0 이어야 한다)`,
  );
  if (rowsAfter !== rowsBefore) throw new Error(`${TABLE} 행 수가 바뀌었다`);
  if (filled !== 0) throw new Error("기존 행의 연결 칸이 채워졌다");
}

async function revert(): Promise<void> {
  const columns = await linkColumns(prisma);
  if (columns.length === 0) {
    console.log("  칸이 없다(이미 되돌렸거나 적용 전)");
  } else {
    const [{ linked }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*) FILTER (WHERE "${ID_COLUMN}" IS NOT NULL OR "${AT_COLUMN}" IS NOT NULL)::int AS linked
         FROM "${TABLE}"`,
    )) as Array<{ linked: number }>;
    console.log(`  eywa 와 연결된 계정 ${linked}`);
    // 🔴 되돌리면 이 연결이 소리 없이 사라진다. 해제는 API 로 먼저 — 그러면 감사 기록에 남는다.
    if (linked > 0)
      throw new Error(
        "eywa 와 연결된 계정이 있다 — 칸을 지우면 연결이 기록 없이 사라진다. 먼저 해제하고 다시 돌려라. 멈춘다.",
      );
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
  console.log(MIGRATION_PATH);
  console.log(`  문장 ${statements.length}개 · 체크섬 ${checksum}`);
  if (statements.length !== 3)
    throw new Error(`문장이 셋(칸 둘·색인)이 아니다: ${statements.length}`);

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
        // 로그인이 `user` 를 읽는 중이면 ALTER 가 뒤에서 한없이 기다리며 로그인까지 줄 세운다 — 10초면 포기한다
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
        await check(tx, rowsBefore);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120_000, maxWait: 30_000 },
    )
    .catch((error: unknown) => {
      if (error instanceof DryRun) {
        console.log(
          "\n드라이런이라 **되돌렸다**(ROLLBACK). 실제로 적용하려면:\n" +
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-eywa-link-migration.ts --apply",
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
