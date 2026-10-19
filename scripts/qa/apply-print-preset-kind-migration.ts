/**
 * 내 시험지 종류 CHECK 넓히기(`20261016210000_workspace_document_print_preset`) — «내 양식»(`printPreset`).
 *
 *   npx tsx scripts/qa/apply-print-preset-kind-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-print-preset-kind-migration.ts --apply
 *
 * 바꾸는 것은 `workspace_document_kind_check` 의 허용 목록뿐이다 — 행은 안 만진다. 🔴 DB 먼저 · 코드 나중.
 * 본뜬 것: `apply-menu-arithmetic-migration.ts` — 이 마이그레이션 하나만 적용하고 `_prisma_migrations` 에 같은 방식으로 기록한다.
 * 확인(읽기만): ⑴ 앞 — 지금 목록이 기대 그대로 ⑵ 뒤 — printPreset 이 더해지고 빠진 값이 없다 ⑶ 기존 행 수(ADD CONSTRAINT 가 전부 검사).
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply` — 🔴 printPreset 행이 있으면 되돌리지 않는다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261016210000_workspace_document_print_preset";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const BEFORE = [
  "draft",
  "extraction",
  "conceptBlank",
  "arithmeticSheet",
  "examCondition",
];
const ADDED = "printPreset";

const REVERT_SQL = `
ALTER TABLE "workspace_document"
  DROP CONSTRAINT "workspace_document_kind_check",
  ADD CONSTRAINT "workspace_document_kind_check"
    CHECK ("kind" IN (${BEFORE.map((k) => `'${k}'`).join(", ")}));
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

async function allowed(tx: Tx): Promise<string[] | null> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'workspace_document_kind_check'`,
  )) as Array<{ def: string }>;
  if (rows.length !== 1) return null;
  return [
    ...rows[0].def.matchAll(/'([^']+)'::(?:character varying|text)/g),
  ].map((m) => m[1]);
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

async function main() {
  if (REVERT) {
    const [{ n }] = (await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM "workspace_document" WHERE kind = $1`,
      ADDED,
    )) as Array<{ n: number }>;
    console.log(`  ${ADDED} 행 ${n}개`);
    if (n > 0)
      throw new Error(
        "내 양식 행이 있다 — 되돌리면 그 행이 제약에 걸린다. 멈춘다.",
      );
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
  if (statements.length !== 1)
    throw new Error(`문장이 하나가 아니다: ${statements.length}`);
  const already = (await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as unknown[];
  if (already.length)
    return console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
  const now = await allowed(prisma);
  console.log(`  ⑴ 앞 — [${now?.join(", ") ?? "없음"}]`);
  if (!now || !sameSet(now, BEFORE))
    throw new Error("지금 목록이 기대와 다르다 — 손대지 않고 멈춘다.");
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
        const next = await allowed(tx);
        console.log(`  ⑵ 뒤 — [${next?.join(", ")}]`);
        if (!next || !sameSet(next, [...BEFORE, ADDED]))
          throw new Error("적용 뒤 목록이 기대와 다르다");
        const [{ n }] = (await tx.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM "workspace_document"`,
        )) as Array<{ n: number }>;
        console.log(`  ⑶ 기존 행 ${n}개 — ADD CONSTRAINT 가 전부 검사했다`);
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
