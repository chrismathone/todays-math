/**
 * 월말평가 성적표 확정 · PDF 보관(`20261018150000_exam_report_confirmation`) — 새 표 둘(편집 자리 · 보관본)과 그 표의 트리거.
 *
 *   npx tsx scripts/qa/apply-exam-report-migration.ts            # 드라이런 — 다 해 보고 ROLLBACK
 *   ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-exam-report-migration.ts --apply
 *
 * 새 표 둘만 더한다 — 기존 표(test · test_result)에는 칸 · 색인 · 트리거를 더하지 않는다. 🔴 DB 먼저 · 코드 나중.
 * 본뜬 것: `apply-exam-publication-migration.ts`. 트리거 · 제약의 동작은 PGlite 시험 `examReportMigration.test.ts` 가 잰다
 * (공유 DB 에는 발행본 · 채점 기록이 0건이라 여기서는 행을 못 만든다).
 * 확인(읽기만): ⑴ 앞 — 표가 없고 이력도 없다 ⑵ 뒤 — 표 둘 · CHECK · 트리거 둘 · RLS 켜짐 · 브라우저 역할 권한 없음 · 행 0
 *   ⑶ 제약이 실제로 막는다(모르는 상태 `weird` 는 상태 CHECK 의 이름으로 거절).
 * 되돌리기: `--revert`(드라이런) · `ALLOW_SHARED_IMPORT=1 … --revert --apply` — 두 표를 배타 잠금한 같은 거래 안에서 행을 세고,
 *   하나라도 있으면 되돌리지 않는다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20261018150000_exam_report_confirmation";
const MIGRATION_PATH = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const TABLES = ["exam_report_draft", "exam_report_artifact"] as const;
const CHECKS = [
  "exam_report_draft_note_check",
  "exam_report_draft_options_check",
  "exam_report_draft_revision_check",
  "exam_report_draft_state_check",
  "exam_report_draft_confirmed_check",
  "exam_report_artifact_revision_check",
  "exam_report_artifact_source_digest_check",
  "exam_report_artifact_pdf_sha256_check",
  "exam_report_artifact_pdf_size_check",
  "exam_report_artifact_snapshot_check",
  "exam_report_artifact_pdf_path_check",
];
const TRIGGERS = [
  "exam_report_draft_edit_invalidates",
  "exam_report_artifact_immutable",
];

const REVERT_STATEMENTS = [
  `ALTER TABLE "exam_report_draft" DROP CONSTRAINT "exam_report_draft_confirmed_artifact_fkey"`,
  `DROP TABLE "exam_report_artifact"`,
  `DROP TABLE "exam_report_draft"`,
  `DROP FUNCTION "exam_report_draft_invalidate_on_edit"()`,
  `DROP FUNCTION "exam_report_artifact_reject_mutation"()`,
  `DELETE FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}'`,
];

const STATEMENT_COUNT = 16;
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

/** `-- statement` 줄로 가른다 — DO 블록 안의 «;» 를 자르지 않으려고. 주석 줄은 뺀다. */
function splitStatements(sql: string): string[] {
  return sql
    .split(/^-- statement$/m)
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim()
        .replace(/;$/, ""),
    )
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
    await prisma
      .$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`);
          const now = await present(tx);
          console.log(`  있는 표 [${now.join(", ")}]`);
          if (now.length !== TABLES.length)
            throw new Error("표가 둘 다 있지 않다 — 손대지 않고 멈춘다.");
          // 세는 동안과 지우는 사이에 첫 행이 들어오지 않게 먼저 잠근다.
          await tx.$executeRawUnsafe(
            `LOCK TABLE "exam_report_draft", "exam_report_artifact" IN ACCESS EXCLUSIVE MODE`,
          );
          for (const table of TABLES) {
            const n = await rowCount(tx, table);
            console.log(`  ${table} 행 ${n}개`);
            if (n > 0)
              throw new Error(
                `${table} 에 행이 있다 — 되돌리면 사라진다. 멈춘다.`,
              );
          }
          for (const stmt of REVERT_STATEMENTS)
            await tx.$executeRawUnsafe(stmt);
          if (!APPLY) throw new DryRun();
        },
        { timeout: 60_000, maxWait: 30_000 },
      )
      .catch((error: unknown) => {
        if (error instanceof DryRun)
          return console.log("되돌리기 — 드라이런이다. ROLLBACK 했다.");
        throw error;
      });
    if (APPLY) console.log("되돌렸다.");
    return;
  }
  const raw = readFileSync(MIGRATION_PATH, "utf8");
  const statements = splitStatements(raw);
  console.log(
    `${MIGRATION_PATH}\n  문장 ${statements.length}개 · 체크섬 ${checksumOf(raw)}`,
  );
  if (statements.length !== STATEMENT_COUNT)
    throw new Error(`문장이 ${STATEMENT_COUNT}개가 아니다: ${statements.length}`);
  // 이력은 «끝났고 · 되돌려지지 않았고 · 체크섬이 같고 · 표가 다 있을 때»만 «이미 적용»이다. 그 밖의 이력은 멈춘다.
  const history = (await prisma.$queryRawUnsafe(
    `SELECT checksum, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1`,
    MIGRATION_NAME,
  )) as Array<{
    checksum: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }>;
  if (history.length) {
    const ok =
      history.length === 1 &&
      history[0]!.finished_at !== null &&
      history[0]!.rolled_back_at === null &&
      history[0]!.checksum === checksumOf(raw) &&
      (await present(prisma)).length === TABLES.length;
    if (ok) return console.log("이미 적용돼 있다. 아무것도 하지 않는다.");
    throw new Error(
      "이 마이그레이션의 이력이 있는데 적용된 꼴과 다르다(미완 · 되돌림 · 체크섬 · 표). 손대지 않고 멈춘다.",
    );
  }
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
        const rls = (await tx.$queryRawUnsafe(
          `SELECT relname FROM pg_class WHERE relname = ANY($1::text[]) AND relrowsecurity`,
          [...TABLES],
        )) as Array<{ relname: string }>;
        console.log(`     RLS 켜짐 ${rls.length}/${TABLES.length}`);
        if (rls.length !== TABLES.length) throw new Error("RLS 가 꺼져 있다");
        const grants = (await tx.$queryRawUnsafe(
          `SELECT grantee, table_name FROM information_schema.role_table_grants
            WHERE table_name = ANY($1::text[]) AND grantee IN ('anon', 'authenticated', 'PUBLIC')`,
          [...TABLES],
        )) as Array<{ grantee: string; table_name: string }>;
        console.log(`     브라우저 역할 권한 ${grants.length}개`);
        const triggers = (await tx.$queryRawUnsafe(
          `SELECT tgname FROM pg_trigger WHERE tgname = ANY($1::text[]) AND NOT tgisinternal`,
          TRIGGERS,
        )) as Array<{ tgname: string }>;
        console.log(`     트리거 ${triggers.length}/${TRIGGERS.length} · CHECK ${CHECKS.length}개 확인`);
        if (triggers.length !== TRIGGERS.length)
          throw new Error("트리거가 기대와 다르다");
        if (grants.length)
          throw new Error(
            `브라우저 역할에 권한이 남았다: ${grants.map((g) => `${g.grantee}/${g.table_name}`).join(", ")}`,
          );
        // ⑶ 제약이 실제로 막는가 — 저장점 안에서 모르는 상태를 넣어 본다. 없는 id 라 외래 키로도 거절되므로
        //    «거절됐다»가 아니라 «상태 CHECK 의 이름으로 거절됐다»를 본다(CHECK 가 외래 키보다 먼저 돈다).
        await tx.$executeRawUnsafe(`SAVEPOINT probe`);
        const refused = await tx
          .$executeRawUnsafe(
            `INSERT INTO "exam_report_draft" (publication_id, test_id, student_id, user_id, state)
             VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'weird')`,
          )
          .then(
            () => false,
            (error: unknown) =>
              String(error instanceof Error ? error.message : error).includes(
                "exam_report_draft_state_check",
              ),
          );
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT probe`);
        console.log(
          `  ⑶ 상태 weird 는 ${refused ? "CHECK 로 거절된다" : "🔴 CHECK 로 거절되지 않았다"}`,
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
