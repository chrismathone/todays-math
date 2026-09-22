/**
 * 오류 기록 표 마이그레이션(`20260922120000_error_log`)을 적용한다.
 *
 *   npx tsx scripts/qa/apply-error-log-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-error-log-migration.ts --apply
 *
 * 🔴 **이 워크트리(error-log)는 드라이런조차 돌리지 않았다** — 브리프 «운영 DB 에 적용하지 않는다», `.env` 도 없다.
 *    드라이런·적용은 **메인이 병합 뒤** 원장님 확인을 받고 main 에서 한다.
 * 순서: DB 먼저 · 코드 나중(24번 문서 §6.1)을 따른다. 다만 이 표는 코드가 먼저 나가도 요청이 깨지지 않는다 —
 *    쓰기가 실패를 삼키고(서버 기록에 `[오류 기록] 남기지 못했습니다: P2021` 한 줄), 읽는 화면이 없다.
 *
 * 본뜬 것: `scripts/qa/apply-test-auto-draft-migration.ts` — 같은 까닭으로 `prisma migrate deploy` 를 안 쓴다
 * (다른 트랙이 남긴 미적용 마이그레이션 — 예: 지점 분리 `20260921120000_tenant_wall_expand` — 까지 같이 적용한다).
 * **이 마이그레이션 하나만** 적용하고 `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 후 sha256)으로 기록한다.
 *
 * 무엇을 확인하나(읽기만 — 확인용 행을 넣지 않는다):
 *   ⑴ 앞 조건 — `user` 표가 있다(FK 가 설 곳), 두 표가 아직 없다
 *   ⑵ 표·칸 — `error_log` 15칸 · `error_log_image` 4칸, 형과 NULL 허용
 *   ⑶ FK — `error_log.user_id → user(id)` **ON DELETE SET NULL** · `error_log_image.error_log_id → error_log(id)` **CASCADE**
 *   ⑷ 색인 — 시각 · (경로, 시각) · (작업, 시각) · (사용자, 시각)
 *   ⑸ RLS — 두 표 모두 켜짐(Supabase 공개 API 로 새지 않게)
 *   ⑹ 🔴 기존 표 무변경 — 적용 전후 `user` 행 수가 같다
 *
 * 되돌리기: `--revert` (드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply`. 두 표와 기록 한 줄을 지운다.
 * 줄이 쌓여 있으면 `--drop-rows` 를 같이 줘야 지운다(기록은 90일짜리 진단 자료지만, 모르고 날리지 않게).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260922120000_error_log";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;

const EXPECTED_COLUMNS: Record<
  string,
  Record<string, [string, "YES" | "NO"]>
> = {
  error_log: {
    id: ["uuid", "NO"],
    created_at: ["timestamp with time zone", "NO"],
    source: ["character varying", "NO"],
    kind: ["character varying", "NO"],
    route: ["character varying", "YES"],
    method: ["character varying", "YES"],
    status: ["integer", "YES"],
    action: ["character varying", "YES"],
    message: ["text", "YES"],
    detail: ["text", "YES"],
    context: ["jsonb", "NO"],
    user_id: ["uuid", "YES"],
    release: ["character varying", "YES"],
    request_id: ["character varying", "YES"],
    duration_ms: ["integer", "YES"],
  },
  error_log_image: {
    error_log_id: ["uuid", "NO"],
    mime_type: ["character varying", "NO"],
    byte_size: ["integer", "NO"],
    data: ["bytea", "NO"],
  },
};
const EXPECTED_FKS: Record<
  string,
  { table: string; target: string; onDelete: string }
> = {
  error_log_user_id_fkey: { table: "error_log", target: "user", onDelete: "n" },
  error_log_image_error_log_id_fkey: {
    table: "error_log_image",
    target: "error_log",
    onDelete: "c",
  },
};
const EXPECTED_INDEXES = [
  "error_log_created_at_idx",
  "error_log_route_created_at_idx",
  "error_log_action_created_at_idx",
  "error_log_user_id_created_at_idx",
];

const REVERT_SQL = `
DROP TABLE IF EXISTS "error_log_image";
DROP TABLE IF EXISTS "error_log";
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
  const log = await tableExists(prisma, "error_log");
  const image = await tableExists(prisma, "error_log_image");
  console.log(
    `  ⑴ 앞 조건 — user 표 ${user ? "있음" : "없음"} · error_log ${log ? "이미 있음" : "없음"} · error_log_image ${image ? "이미 있음" : "없음"}`,
  );
  if (!user) throw new Error("user 표가 없다 — FK 가 설 곳이 없다");
  if (log || image)
    throw new Error(
      "표가 이미 있다 — 기록 없이 누가 만들었는지 먼저 확인할 것",
    );
}

/** ⑵~⑹ — 적용한 트랜잭션 안에서 읽기만 한다. */
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
      `  ⑶ FK ${name} — ${fk ? `${fk.source} → ${fk.target} · ON DELETE ${fk.on_delete === "n" ? "SET NULL" : fk.on_delete === "c" ? "CASCADE" : fk.on_delete}` : "없다"}`,
    );
    if (!fk) throw new Error(`${name} 가 없다`);
    if (
      fk.source.replaceAll('"', "") !== want.table ||
      fk.target.replaceAll('"', "") !== want.target
    )
      throw new Error(
        `${name} 가 다른 표를 잇는다: ${fk.source} → ${fk.target}`,
      );
    // 🔴 user FK 가 CASCADE 면 계정을 지울 때 진단 기록이 사라진다 · 이미지 FK 가 CASCADE 가 아니면 90일 정리가 막힌다
    if (fk.on_delete !== want.onDelete)
      throw new Error(`${name} 의 ON DELETE 가 다르다: ${fk.on_delete}`);
  }
  const indexes = (await tx.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'error_log'`,
  )) as Array<{ indexname: string }>;
  const names = new Set(indexes.map((i) => i.indexname));
  console.log(`  ⑷ 색인 — ${[...names].sort().join(", ")}`);
  for (const name of EXPECTED_INDEXES)
    if (!names.has(name)) throw new Error(`${name} 가 없다`);
  const rls = (await tx.$queryRawUnsafe(
    `SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('error_log', 'error_log_image') AND relkind = 'r'`,
  )) as Array<{ relname: string; relrowsecurity: boolean }>;
  console.log(
    `  ⑸ RLS — ${rls.map((r) => `${r.relname} ${r.relrowsecurity ? "켜짐" : "꺼짐"}`).join(" · ")}`,
  );
  if (rls.length !== 2 || rls.some((r) => !r.relrowsecurity))
    throw new Error("RLS 가 켜지지 않은 표가 있다");
  const usersAfter = await userCount(tx);
  console.log(`  ⑹ user ${usersBefore}행 → ${usersAfter}행 (같아야 한다)`);
  if (usersAfter !== usersBefore) throw new Error("user 행 수가 바뀌었다");
}

async function revert(): Promise<void> {
  if (await tableExists(prisma, "error_log")) {
    const [{ n }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "error_log"`,
    )) as Array<{ n: number }>;
    console.log(`  쌓인 오류 기록 ${n}줄`);
    if (n > 0 && !DROP_ROWS)
      throw new Error(
        "줄이 쌓여 있다 — 지워도 되면 --drop-rows 를 같이 준다. 멈춘다.",
      );
  } else console.log("  표가 없다(이미 되돌렸거나 적용 전)");
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
  if (statements.length !== 10)
    throw new Error(
      `문장이 열(표 2 · 색인 4 · FK 2 · RLS 2)이 아니다: ${statements.length}`,
    );

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
            "  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-error-log-migration.ts --apply",
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
